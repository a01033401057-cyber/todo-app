// 오늘의 할 일 — 앱 시작, 화면 전환, 이벤트 연결 (js/ 파일들을 먼저 불러온 뒤 마지막에 실행)

// 화면 상태
const state = {
  view: 'day',
  date: todayString(), // 보고 있는 날짜 'YYYY-MM-DD'
  filter: 'all', // 'all' 또는 카테고리 저장 값
  addText: '', // 추가 입력칸에 적는 중인 글
  addCat: 'toeic',
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
  if (!focusByKey(key)) document.getElementById('go-today').focus();
}

// ===== 그리기 =====

function renderFilters() {
  const options = [{ id: 'all', label: '전체' }, ...CATEGORIES];
  filtersEl.replaceChildren(...options.map((option) => h('button', {
    type: 'button',
    class: `filter${state.filter === option.id ? ' is-active' : ''}`,
    'aria-pressed': String(state.filter === option.id),
    data: actData('filter', { v: option.id }),
  }, option.id !== 'all' && h('span', { class: 'dot', cat: option.id }), option.label)));
}

function renderNav() {
  const isToday = state.date === todayString();
  const todayButton = document.getElementById('go-today');
  todayButton.disabled = isToday;
  todayButton.textContent = isToday ? '오늘' : '오늘로';
}

// 현재 상태로 화면 전체를 다시 그린다
function render() {
  const saved = rememberFocus();
  const { side, main } = renderDay();
  sideEl.replaceChildren(...[side].flat(Infinity).filter(Boolean));
  mainEl.replaceChildren(...[main].flat(Infinity).filter(Boolean));
  renderFilters();
  renderNav();
  restoreFocus(saved);
}

// 날짜 이동
function moveDate(days) {
  state.date = addDays(state.date, days);
  render();
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
  document.getElementById('prev').addEventListener('click', () => moveDate(-1));
  document.getElementById('next').addEventListener('click', () => moveDate(1));
  document.getElementById('go-today').addEventListener('click', () => {
    state.date = todayString();
    render();
  });
  document.getElementById('open-settings').addEventListener('click', openSettings);

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

  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'add-form') return;
    event.preventDefault();
    if (addPlan(state.date, { title: state.addText, cat: state.addCat })) state.addText = '';
    render();
    document.getElementById('add-input')?.focus();
  });

  document.addEventListener('input', (event) => {
    if (event.target.id === 'add-input') state.addText = event.target.value;
  });

  document.addEventListener('change', (event) => {
    const { target } = event;
    if (target.id === 'add-category') state.addCat = target.value;
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
  navigator.serviceWorker.register('./sw.js').catch(() => {
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
setupEditor();
setupSettings();
setupEvents();
render();
setupWebApp();
requestPersistentStorage();
