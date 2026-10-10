// 오늘의 할 일 — 앱 시작, 화면 전환, 이벤트 연결 (js/ 파일들을 먼저 불러온 뒤 마지막에 실행)

// 화면 상태
const VIEWS = ['year', 'month', 'week', 'day'];
const VIEW_RENDERERS = { year: () => renderYear(), month: () => renderMonth(), week: () => renderWeek(), day: () => renderDay() };
const NAV_LABELS = { year: ['이전 해', '다음 해'], month: ['이전 달', '다음 달'], week: ['이전 주', '다음 주'], day: ['이전 날', '다음 날'] };

const state = {
  view: 'day',
  date: todayString(), // 보고 있는 날짜 'YYYY-MM-DD'
  filter: 'all', // 'all' 또는 카테고리 저장 값
  addText: '', // 추가 입력칸에 적는 중인 글
  addCat: 'toeic',
  pendingImport: null, // 다른 앱에서 보낸 할 일 (확인 전)
};

const sideEl = document.getElementById('side');
const mainEl = document.getElementById('main');
const filtersEl = document.getElementById('filters');

// 기간 제목
function setPeriod(title, sub) {
  document.getElementById('period-title').textContent = title;
  document.getElementById('period-sub').textContent = sub ?? '';
}

// ===== 포커스 유지 =====

// 다시 그리기 전에 포커스 위치를 기억한다 (id 또는 data-fk)
function rememberFocus() {
  const active = document.activeElement;
  if (!active || active === document.body || active.closest('dialog')) return null;
  const key = active.id || active.dataset.fk;
  if (!key) return null;
  let selection = null;
  try { selection = [active.selectionStart, active.selectionEnd]; } catch (error) { selection = null; }
  return { key, selection };
}

function focusByKey(key) {
  if (!key) return false;
  const target = document.getElementById(key) || document.querySelector(`[data-fk="${CSS.escape(key)}"]`);
  if (!target) return false;
  target.focus();
  return true;
}

function restoreFocus(saved) {
  if (!saved || !focusByKey(saved.key)) return;
  const active = document.activeElement;
  if (saved.selection && saved.selection[0] !== null && typeof active.setSelectionRange === 'function') {
    try { active.setSelectionRange(saved.selection[0], saved.selection[1]); } catch (error) { /* 선택 범위가 없는 입력 */ }
  }
}

// 창을 닫은 뒤 포커스를 둘 곳 (없으면 기간 제목 근처로)
function restoreFocusAfterDialog(key) {
  if (focusByKey(key)) return;
  const todayButton = document.getElementById('go-today');
  (todayButton.disabled ? document.getElementById('next') : todayButton).focus();
}

// ===== 그리기 =====

function renderFilters() {
  const options = [{ id: 'all', label: '전체' }, ...CATEGORIES];
  filtersEl.replaceChildren(...options.map((option) => h('button', {
    type: 'button',
    class: `filter${state.filter === option.id ? ' is-active' : ''}`,
    'aria-pressed': String(state.filter === option.id),
    data: actData('filter', { v: option.id }),
    cat: option.id !== 'all' ? option.id : null,
  }, icon(option.id === 'all' ? 'layers' : option.id, 14), option.label)));
}

// 기간 이동 줄, 탭, 예시 안내
function renderNav() {
  const todayButton = document.getElementById('go-today');
  todayButton.disabled = keyFor(state.view, state.date) === keyFor(state.view, todayString());
  const [prevLabel, nextLabel] = NAV_LABELS[state.view];
  document.getElementById('prev').setAttribute('aria-label', prevLabel);
  document.getElementById('next').setAttribute('aria-label', nextLabel);
  document.querySelectorAll('#tabs button').forEach((button) => {
    const selected = button.dataset.view === state.view;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-active', selected);
  });
  document.getElementById('banner').replaceChildren(...[importBanner(), exampleBanner()].filter(Boolean));
}

// 현재 상태로 화면 전체를 다시 그린다
function render() {
  const saved = rememberFocus();
  const { side, main } = VIEW_RENDERERS[state.view]();
  sideEl.replaceChildren(...[side].flat(Infinity).filter(Boolean));
  mainEl.replaceChildren(...[main].flat(Infinity).filter(Boolean));
  renderFilters();
  renderNav();
  restoreFocus(saved);
}

// 기간 이동: 보고 있는 탭의 단위(년/월/주/일)로
function move(direction) {
  if (state.view === 'day') state.date = addDays(state.date, direction);
  else if (state.view === 'week') state.date = addDays(state.date, 7 * direction);
  else if (state.view === 'month') state.date = addMonths(state.date, direction);
  else state.date = addMonths(state.date, 12 * direction);
  render();
}

// 탭 바꾸기 (마지막으로 본 탭 기억)
function setView(view, dateText) {
  if (!VIEWS.includes(view)) return;
  state.view = view;
  if (dateText) state.date = dateText;
  store.ui.view = view;
  saveUi();
  render();
  window.scrollTo(0, 0);
}

// ===== 동작 =====

function clearDone(dateText) {
  const targets = dayPlans(dateText).filter((item) => item.done);
  if (!targets.length || !confirm(`이 날짜의 완료한 할 일 ${targets.length}개를 삭제할까요?`)) return;
  const ids = new Set(targets.map((item) => item.id));
  store.items = store.items.filter((item) => !ids.has(item.id));
  saveItems();
  render();
}

function quickAdd(index) {
  const [cat, sub, title, dur] = QUICK_ADDS[index];
  if (addPlan(state.date, { title, cat, sub, dur })) toast(`‘${title}’ 추가됨`);
  render();
}

// data-act 버튼 처리
function handleAction(element) {
  const { act, id } = element.dataset;
  const item = id ? findItem(id) : null;
  switch (act) {
    case 'toggle':
      if (item) toggleItem(item.id);
      render();
      break;
    case 'edit':
      if (item) openEditor(item);
      break;
    case 'inc':
    case 'dec':
      if (item) stepGoal(item.id, act === 'inc' ? 1 : -1);
      render();
      break;
    case 'new-goal':
      openEditor(null, {
        type: 'goal', pick: element.dataset.pick, date: element.dataset.date, cat: state.filter === 'all' ? 'etc' : state.filter, returnFocus: element.dataset.fk,
      });
      break;
    case 'import-accept':
      acceptImport();
      break;
    case 'import-cancel':
      cancelImport();
      break;
    case 'clear-examples':
      if (confirm('예시 목표를 모두 지울까요?')) {
        clearExamples();
        toast('예시를 모두 지웠어요');
        render();
      }
      break;
    case 'wcheck': {
      const week = getWeek(element.dataset.wk);
      updateWeek(element.dataset.wk, { checks: { ...week.checks, [element.dataset.k]: element.checked } });
      render();
      break;
    }
    case 'goto-day':
      setView('day', element.dataset.date);
      break;
    case 'goto-month':
      setView('month', element.dataset.date);
      break;
    case 'goto-week':
      setView('week', element.dataset.date);
      break;
    case 'new-plan':
      openEditor(null, {
        type: 'plan', pick: element.dataset.pick, date: element.dataset.date, cat: state.filter === 'all' ? 'etc' : state.filter, returnFocus: element.dataset.fk,
      });
      break;
    case 'focus':
      if (item && !item.done) openCinema(item);
      break;
    case 'thumb':
      if (item) {
        const day = getDay(item.key);
        updateDay(item.key, { thumb: day.thumb === item.id ? '' : item.id });
        render();
      }
      break;
    case 'thumb-clear':
      updateDay(element.dataset.date, { thumb: '' });
      render();
      break;
    case 'routine': {
      const day = getDay(element.dataset.date);
      updateDay(element.dataset.date, { routine: { ...day.routine, [element.dataset.i]: element.checked } });
      render();
      break;
    }
    case 'settings':
      openSettings();
      break;
    case 'quote-next':
      nextQuote(element.dataset.date);
      render();
      break;
    case 'quick':
      quickAdd(Number(element.dataset.i));
      break;
    case 'sort':
      store.ui.sort = element.dataset.v === 'group' ? 'group' : 'time';
      saveUi();
      render();
      break;
    case 'filter':
      state.filter = element.dataset.v;
      render();
      break;
    case 'clear-done':
      clearDone(element.dataset.date);
      break;
    default:
      break;
  }
}

function setupEvents() {
  document.getElementById('prev').addEventListener('click', () => move(-1));
  document.getElementById('next').addEventListener('click', () => move(1));
  document.getElementById('tabs').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-view]');
    if (button) setView(button.dataset.view);
  });
  document.getElementById('go-today').addEventListener('click', () => {
    state.date = todayString();
    render();
  });
  document.getElementById('open-settings').addEventListener('click', openSettings);
  document.getElementById('open-guide').addEventListener('click', openGuide);

  // 화면 안의 버튼은 모두 위임으로 처리 (창 안의 버튼은 각 창이 처리)
  document.addEventListener('click', (event) => {
    if (event.target.closest('dialog')) return;
    if (event.target.id === 'add-detail') {
      openEditor(null, { title: cleanText(state.addText, MAX_TITLE_LENGTH), cat: state.addCat });
      return;
    }
    const element = event.target.closest('[data-act]');
    if (element) handleAction(element);
  });

  // 열려 있는 앱에 새 #import= 링크가 들어와도 처리
  window.addEventListener('hashchange', readImportFromHash);

  // 다른 탭(예: 링크로 연 새 탭)에서 데이터가 바뀌면 다시 읽는다. 안 그러면 이 탭이 옛 데이터로 덮어쓴다
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== KEYS.items && !event.key.startsWith(`${KEYS.items}:`)) return;
    loadStore();
    if (state.pendingImport) state.pendingImport.counts = previewImport(state.pendingImport.items);
    render();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.pendingImport && !document.querySelector('dialog[open]')) cancelImport();
  });

  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'add-form') return;
    event.preventDefault();
    if (addPlan(state.date, { title: state.addText, cat: state.addCat })) state.addText = '';
    render();
    document.getElementById('add-input')?.focus();
  });

  document.addEventListener('input', (event) => {
    const { target } = event;
    if (target.id === 'add-input') state.addText = target.value;
    if (target.id === 'wk-reflect') updateWeek(target.dataset.wk, { reflect: target.value.slice(0, 300) });
    if (target.id === 'fb-good' || target.id === 'fb-change') {
      updateDay(target.dataset.date, { [target.id === 'fb-good' ? 'good' : 'change']: target.value.slice(0, 300) });
    }
  });

  document.addEventListener('change', (event) => {
    const { target } = event;
    if (target.id === 'add-category') state.addCat = target.value;
    if (target.id === 'wk-hours') {
      const hours = Number(target.value);
      updateWeek(target.dataset.wk, { hours: hours >= 1 && hours <= 120 ? hours : '' });
      render();
    }
    if (target.id === 'thumb-pick' && target.value) {
      updateDay(target.dataset.date, { thumb: target.value });
      render();
    }
  });
}

// 웹 앱 설치·오프라인 기능을 켠다 (http/https에서만, file://에서는 건너뜀)
function setupWebApp() {
  const isWeb = location.protocol === 'http:' || location.protocol === 'https:';
  if (!isWeb) return;

  const manifest = document.createElement('link');
  manifest.rel = 'manifest';
  manifest.href = 'manifest.json';
  document.head.append(manifest);

  if (!('serviceWorker' in navigator)) return;

  // 새 버전 서비스 워커가 자리를 잡으면 한 번 새로고침해서 새 화면을 보여 준다
  // (처음 설치할 때는 이미 새 화면이므로 새로고침하지 않는다)
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });

  // sw.js는 HTTP 캐시를 거치지 않고 확인, 앱으로 돌아올 때마다 업데이트 확인
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      });
    })
    .catch(() => {
      // 등록 실패해도 앱은 그대로 동작한다
    });
}

// 브라우저에 저장 데이터를 지우지 말아 달라고 요청한다 (지원할 때만)
function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

// ===== 앱 시작 =====
loadStore();
seedExamplesIfEmpty();
if (VIEWS.includes(store.ui.view)) state.view = store.ui.view;
setupEditor();
setupSettings();
applyStaticIcons();
setupGuide();
setupBlogLink();
setupCinema();
setupEvents();
render();
readImportFromHash();
resumeCinema();
setupWebApp();
requestPersistentStorage();
