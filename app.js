// 오늘의 할 일 — 앱 로직

// localStorage 저장 키 (v1은 이전 구조, 마이그레이션 원본으로만 읽고 지우지 않는다)
const STORAGE_KEY = 'daily-todo:v2';
const LEGACY_STORAGE_KEY = 'daily-todo:v1';

// 입력 최대 길이
const MAX_TITLE_LENGTH = 100;
const MAX_SUB_LENGTH = 30;
const MAX_MEMO_LENGTH = 200;

// 카테고리 8개 (저장 값, 화면 이름, 세부 항목). 색상은 style.css의 --cat-저장값 변수
const CATEGORIES = [
  { id: 'toeic', label: '토익', subs: ['단어 암기', '문제 풀이', 'LC', 'RC', '모의고사'] },
  { id: 'workout', label: '운동', subs: ['러닝', '등산', '홈트·턱걸이', '홈트·팔굽혀펴기', '홈트·기타'] },
  { id: 'blog', label: '블로그', subs: ['네이버 포스팅', '티스토리 포스팅'] },
  { id: 'stock', label: '주식 공부', subs: ['기업 분석', '시황 정리', '책·강의'] },
  { id: 'reading', label: '독서', subs: [] },
  { id: 'speaking', label: '영어 회화', subs: ['쉐도잉', '전화영어', '스터디'] },
  { id: 'rest', label: '휴식', subs: ['산책', '스트레칭', '낮잠'] },
  { id: 'etc', label: '기타', subs: [] },
];
const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((cat) => [cat.id, cat]));

// 예상 소요 시간 선택지 (분)
const DURATION_OPTIONS = [15, 20, 30, 40, 45, 60, 90, 120, 180];

// v1 카테고리 → 원래 이름 (마이그레이션 때 sub에 넣는다)
const LEGACY_CATEGORY_LABELS = { work: '업무', personal: '개인', study: '공부' };

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 앱 상태: 항목 배열 하나로 관리
let items = [];

// 지금 보고 있는 날짜 ('YYYY-MM-DD', 로컬 시간 기준)
let currentDate = '';

// 현재 필터: 'all' 또는 카테고리 저장 값
let currentFilter = 'all';

// 편집 창에서 다루는 항목 (새 항목이면 isNew: true)
let draft = null;

// 자주 쓰는 DOM 요소
const addForm = document.getElementById('add-form');
const addInput = document.getElementById('add-input');
const addCategory = document.getElementById('add-category');
const addDetail = document.getElementById('add-detail');
const todoList = document.getElementById('todo-list');
const emptyMessage = document.getElementById('empty-message');
const filters = document.getElementById('filters');
const miniProgress = document.getElementById('mini-progress');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const celebrate = document.getElementById('celebrate');
const clearButton = document.getElementById('clear-completed');
const currentDateLabel = document.getElementById('current-date');
const prevDayButton = document.getElementById('prev-day');
const nextDayButton = document.getElementById('next-day');
const todayButton = document.getElementById('go-today');

const editor = document.getElementById('editor');
const editorForm = document.getElementById('editor-form');
const editorTitle = document.getElementById('editor-title');
const editorSubmit = document.getElementById('f-submit');
const fieldTitle = document.getElementById('f-title');
const fieldCat = document.getElementById('f-cat');
const fieldSub = document.getElementById('f-sub');
const fieldSubList = document.getElementById('f-sub-list');
const fieldTime = document.getElementById('f-time');
const fieldDur = document.getElementById('f-dur');
const fieldMemo = document.getElementById('f-memo');
const fieldFixed = document.getElementById('f-fixed');
const fieldError = document.getElementById('f-error');

// ===== 날짜 (모두 로컬 시간 기준, toISOString 사용 금지) =====

// 숫자를 두 자리 문자열로 만든다
function pad(number) {
  return String(number).padStart(2, '0');
}

// Date → 'YYYY-MM-DD'
function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 'YYYY-MM-DD' → Date (로컬 자정)
function parseDate(text) {
  const [year, month, day] = text.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// 날짜에 n일을 더한 새 Date를 만든다
function addDays(date, days) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

// 그 주의 월요일
function getMonday(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

// 오늘 날짜 문자열
function todayString() {
  return formatDate(new Date());
}

// scope에 맞는 기간 키를 만든다 (day='2026-10-10', week=월요일, month='2026-10', half='2026-H2', year='2026')
function keyFor(scope, dateText) {
  const date = parseDate(dateText);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (scope === 'year') return String(year);
  if (scope === 'half') return `${year}-H${month <= 6 ? 1 : 2}`;
  if (scope === 'month') return `${year}-${pad(month)}`;
  if (scope === 'week') return formatDate(getMonday(date));
  return formatDate(date);
}

// 소요 시간(분)을 읽기 쉬운 문자열로 (예: 90 → '1시간 30분')
function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

// ===== 데이터 =====

// 저장된 배열을 읽는다 (없으면 null, 깨졌으면 빈 배열)
function readArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

// v1 할 일 하나를 v2 항목으로 바꾼다
function migrateLegacyTodo(todo) {
  const created = new Date(todo.createdAt);
  const validDate = !Number.isNaN(created.getTime());
  const legacyLabel = LEGACY_CATEGORY_LABELS[todo.category] ?? '';
  return {
    id: String(todo.id ?? createId()),
    type: 'plan',
    scope: 'day',
    key: validDate ? formatDate(created) : todayString(),
    title: cleanText(todo.text ?? '', MAX_TITLE_LENGTH) || '(제목 없음)',
    cat: 'etc',
    sub: legacyLabel,
    time: '',
    dur: '',
    memo: '',
    fixed: false,
    done: Boolean(todo.completed),
    createdAt: validDate ? todo.createdAt : new Date().toISOString(),
  };
}

// 항목 목록을 불러온다. v2가 없고 v1이 있으면 한 번만 옮긴다 (v1 키는 그대로 둔다)
function loadItems() {
  const current = readArray(STORAGE_KEY);
  if (current !== null) return current;

  const legacy = readArray(LEGACY_STORAGE_KEY);
  const migrated = legacy ? legacy.map(migrateLegacyTodo) : [];
  items = migrated;
  saveItems();
  return migrated;
}

// 항목 목록을 localStorage에 저장한다
function saveItems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    alert('저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');
  }
}

// 상태 변경 후 저장하고 화면을 다시 그린다
function commit() {
  saveItems();
  render();
}

// 겹치지 않는 id를 만든다 (Date.now() 기반)
function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// 입력 텍스트를 정리한다 (앞뒤 공백 제거, 최대 길이)
function cleanText(text, maxLength) {
  return String(text).trim().slice(0, maxLength);
}

// id로 항목을 찾는다
function findItem(id) {
  return items.find((item) => item.id === id);
}

// 보고 있는 날짜의 할 일 목록
function getDayPlans() {
  return items.filter((item) => item.type === 'plan' && item.scope === 'day' && item.key === currentDate);
}

// 편집 창 값 등 입력을 검사해 저장 가능한 필드로 만든다 (제목이 비면 null)
function normalizeFields(fields) {
  const title = cleanText(fields.title ?? '', MAX_TITLE_LENGTH);
  if (!title) return null;
  const dur = Number(fields.dur);
  return {
    title,
    cat: CATEGORY_MAP[fields.cat] ? fields.cat : 'etc',
    sub: cleanText(fields.sub ?? '', MAX_SUB_LENGTH),
    time: /^\d{2}:\d{2}$/.test(fields.time ?? '') ? fields.time : '',
    dur: DURATION_OPTIONS.includes(dur) ? dur : '',
    memo: cleanText(fields.memo ?? '', MAX_MEMO_LENGTH),
    fixed: Boolean(fields.fixed),
  };
}

// 보고 있는 날짜에 새 할 일을 추가한다 (제목이 비면 false)
function addPlan(fields) {
  const normalized = normalizeFields(fields);
  if (!normalized) return false;
  items.push({
    id: createId(),
    type: 'plan',
    scope: 'day',
    key: currentDate,
    ...normalized,
    done: false,
    createdAt: new Date().toISOString(),
  });
  commit();
  return true;
}

// 항목 내용을 수정한다 (제목이 비면 false)
function updateItem(id, fields) {
  const item = findItem(id);
  const normalized = normalizeFields(fields);
  if (!item || !normalized) return false;
  Object.assign(item, normalized);
  commit();
  return true;
}

// 항목을 삭제한다 (확인 후)
function deleteItem(id) {
  if (!confirm('이 할 일을 삭제할까요?')) return;
  items = items.filter((item) => item.id !== id);
  commit();
}

// 완료 상태를 전환한다
function toggleItem(id) {
  const item = findItem(id);
  if (!item) return;
  item.done = !item.done;
  commit();
}

// 보고 있는 날짜의 완료 항목만 한꺼번에 삭제한다 (확인 후)
function clearCompleted() {
  const targets = getDayPlans().filter((item) => item.done);
  if (targets.length === 0 || !confirm(`이 날짜의 완료한 할 일 ${targets.length}개를 삭제할까요?`)) return;
  const ids = new Set(targets.map((item) => item.id));
  items = items.filter((item) => !ids.has(item.id));
  commit();
}

// 완료 개수·전체 개수·완료율을 계산한다 (0으로 나누지 않음)
function getProgress(list) {
  const total = list.length;
  const done = list.filter((item) => item.done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

// ===== 요소 만들기 (사용자 입력은 항상 textContent로만 출력) =====

// 버튼 요소를 만든다
function createButton(className, label, ariaLabel) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn ${className}`;
  button.textContent = label;
  if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
  return button;
}

// 카테고리 색상을 요소에 연결한다 (--c 변수)
function setCategoryColor(element, catId) {
  element.style.setProperty('--c', `var(--cat-${CATEGORY_MAP[catId] ? catId : 'etc'})`);
}

// 카테고리 태그 요소를 만든다
function createTag(catId) {
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = (CATEGORY_MAP[catId] ?? CATEGORY_MAP.etc).label;
  setCategoryColor(tag, catId);
  return tag;
}

// 작은 글자 조각을 만든다
function createSpan(className, text) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

// 할 일 아래 보조 줄: 카테고리 태그, 세부 항목, 소요 시간, 고정 배지, 메모
function createMetaLine(item) {
  const line = document.createElement('div');
  line.className = 'todo-meta';
  line.append(createTag(item.cat));
  if (item.sub) line.append(createSpan('meta-sub', item.sub));
  if (item.dur) line.append(createSpan('meta-dur', formatDuration(item.dur)));
  if (item.fixed) line.append(createSpan('fixed-badge', '고정'));
  if (item.memo) line.append(createSpan('meta-memo', item.memo));
  return line;
}

// 할 일 1개의 li 요소를 만든다
function createTodoItem(item) {
  const li = document.createElement('li');
  li.className = 'todo-item';
  li.dataset.id = item.id;
  if (item.done) li.classList.add('is-completed');

  const checkArea = document.createElement('label');
  checkArea.className = 'check-area';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-check';
  checkbox.checked = item.done;
  checkbox.setAttribute('aria-label', `완료: ${item.title}`);
  checkArea.append(checkbox);

  const body = document.createElement('div');
  body.className = 'todo-body';
  const title = document.createElement('button');
  title.type = 'button';
  title.className = 'todo-title';
  title.setAttribute('aria-label', `수정: ${item.title}`);
  if (item.time) title.append(createSpan('todo-time', item.time));
  title.append(createSpan('todo-text', item.title));
  body.append(title, createMetaLine(item));

  li.append(checkArea, body, createButton('btn-danger todo-delete', '삭제', `삭제: ${item.title}`));
  return li;
}

// 카테고리 select의 선택지를 채운다
function fillCategoryOptions(select) {
  CATEGORIES.forEach((cat) => select.add(new Option(cat.label, cat.id)));
}

// ===== 화면 그리기 =====

// 막대 하나의 너비를 퍼센트로 맞춘다
function setBarWidth(fill, percent) {
  fill.style.width = `${percent}%`;
}

// 헤더 날짜를 그린다 (예: 10월 10일 토요일)
function renderDateHeader() {
  const date = parseDate(currentDate);
  const isToday = currentDate === todayString();
  currentDateLabel.textContent = `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일`;
  if (date.getFullYear() !== new Date().getFullYear()) {
    currentDateLabel.prepend(`${date.getFullYear()}년 `);
  }
  todayButton.disabled = isToday;
  todayButton.textContent = isToday ? '오늘' : '오늘로';
}

// 진행률 영역을 그린다 (필터와 무관하게 보고 있는 날짜 전체 기준)
function renderProgress(dayPlans) {
  const { done, total, percent } = getProgress(dayPlans);
  setBarWidth(progressFill, percent);
  progressBar.setAttribute('aria-valuenow', String(percent));
  progressText.textContent = `${done}/${total} 완료 (${percent}%)`;
  celebrate.hidden = !(total > 0 && done === total);
  celebrate.textContent = currentDate === todayString()
    ? '오늘 할 일을 모두 끝냈어요!'
    : '이 날의 할 일을 모두 끝냈어요!';

  const fragment = document.createDocumentFragment();
  CATEGORIES.forEach((cat) => {
    const progress = getProgress(dayPlans.filter((item) => item.cat === cat.id));
    const li = document.createElement('li');
    li.className = 'mini';
    if (progress.total === 0) li.classList.add('is-empty');
    setCategoryColor(li, cat.id);

    const bar = document.createElement('div');
    bar.className = 'mini-bar';
    const fill = document.createElement('div');
    fill.className = 'mini-fill';
    setBarWidth(fill, progress.percent);
    bar.append(fill);

    li.append(
      createSpan('mini-label', cat.label),
      bar,
      createSpan('mini-text', `${progress.done}/${progress.total}`),
    );
    fragment.append(li);
  });
  miniProgress.replaceChildren(fragment);
}

// 필터 칩을 그린다 (선택 강조 + 이 날짜의 남은 개수)
function renderFilters(dayPlans) {
  const options = [{ id: 'all', label: '전체' }, ...CATEGORIES];
  const hadFocus = filters.contains(document.activeElement);
  const fragment = document.createDocumentFragment();
  options.forEach((option) => {
    const remaining = dayPlans.filter(
      (item) => !item.done && (option.id === 'all' || item.cat === option.id),
    ).length;
    const isActive = option.id === currentFilter;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'filter';
    chip.dataset.filter = option.id;
    chip.setAttribute('aria-pressed', String(isActive));
    if (isActive) chip.classList.add('is-active');
    if (option.id !== 'all') {
      const dot = createSpan('dot', '');
      setCategoryColor(dot, option.id);
      chip.append(dot);
    }
    chip.append(`${option.label} (${remaining})`);
    fragment.append(chip);
  });
  filters.replaceChildren(fragment);
  if (hadFocus) filters.querySelector('.is-active')?.focus();
}

// 빈 상태 안내 문구를 그린다
function renderEmpty(dayCount, visibleCount) {
  if (dayCount === 0) {
    emptyMessage.textContent = currentDate === todayString()
      ? '할 일을 추가해보세요'
      : '이 날의 할 일이 없어요';
  } else if (visibleCount === 0) {
    emptyMessage.textContent = '이 카테고리에 할 일이 없어요';
  }
  emptyMessage.hidden = visibleCount > 0;
}

// 다시 그리기 전에 목록 안의 포커스 위치를 기억한다
function rememberFocus() {
  const active = document.activeElement;
  const li = active && todoList.contains(active) ? active.closest('li') : null;
  if (!li) return null;
  return { id: li.dataset.id, selector: `.${[...active.classList].pop()}` };
}

// 다시 그린 뒤 포커스를 복원한다 (키보드 사용자가 위치를 잃지 않게)
function restoreFocus(saved) {
  if (!saved) return;
  const li = [...todoList.children].find((item) => item.dataset.id === saved.id);
  const target = li ? li.querySelector(saved.selector) : null;
  (target ?? addInput).focus();
}

// 정렬: 미완료 위, 완료 아래. 같은 그룹 안에서는 시작 시간순(시간 없는 항목은 뒤), 그다음 추가한 순서
function sortPlans(list) {
  return [...list].sort((a, b) => (
    Number(a.done) - Number(b.done)
    || (a.time || '99:99').localeCompare(b.time || '99:99')
  ));
}

// 현재 상태로 화면을 다시 그린다
function render() {
  const dayPlans = getDayPlans();
  renderDateHeader();
  renderProgress(dayPlans);
  renderFilters(dayPlans);
  clearButton.disabled = !dayPlans.some((item) => item.done);

  const savedFocus = rememberFocus();
  const visible = currentFilter === 'all'
    ? dayPlans
    : dayPlans.filter((item) => item.cat === currentFilter);
  const fragment = document.createDocumentFragment();
  sortPlans(visible).forEach((item) => fragment.append(createTodoItem(item)));
  todoList.replaceChildren(fragment);

  renderEmpty(dayPlans.length, visible.length);
  restoreFocus(savedFocus);
}

// 보고 있는 날짜를 바꾼다
function setCurrentDate(dateText) {
  currentDate = dateText;
  render();
}

// ===== 편집 창 =====

// 세부 항목 추천 목록을 카테고리에 맞게 채운다
function fillSubOptions(catId) {
  const subs = (CATEGORY_MAP[catId] ?? CATEGORY_MAP.etc).subs;
  fieldSubList.replaceChildren(...subs.map((sub) => new Option(sub)));
  fieldSub.placeholder = subs[0] ?? '직접 입력';
}

// 편집 창을 연다 (item이 없으면 새 항목)
function openEditor(item, defaults = {}) {
  const source = item ?? { title: '', cat: 'etc', sub: '', time: '', dur: '', memo: '', fixed: false, ...defaults };
  draft = { id: item ? item.id : null, isNew: !item };

  editorTitle.textContent = item ? '할 일 수정' : '할 일 자세히 추가';
  editorSubmit.textContent = item ? '저장' : '추가';
  fieldTitle.value = source.title;
  fieldCat.value = CATEGORY_MAP[source.cat] ? source.cat : 'etc';
  fieldSub.value = source.sub ?? '';
  fieldTime.value = source.time ?? '';
  fieldDur.value = source.dur ? String(source.dur) : '';
  fieldMemo.value = source.memo ?? '';
  fieldFixed.checked = Boolean(source.fixed);
  fieldError.hidden = true;
  fillSubOptions(fieldCat.value);

  editor.showModal();
  fieldTitle.focus();
}

// 편집 창을 닫는다
function closeEditor() {
  if (editor.open) editor.close();
}

// 편집 창이 닫힌 뒤 (취소·Esc·저장 모두) 포커스를 알맞은 곳에 둔다
function handleEditorClosed() {
  const saved = draft;
  draft = null;
  if (!saved) return;
  const li = saved.id ? [...todoList.children].find((item) => item.dataset.id === saved.id) : null;
  const target = li ? li.querySelector('.todo-title') : addInput;
  target.focus();
}

// 편집 창의 값을 읽는다
function readEditor() {
  return {
    title: fieldTitle.value,
    cat: fieldCat.value,
    sub: fieldSub.value,
    time: fieldTime.value,
    dur: fieldDur.value,
    memo: fieldMemo.value,
    fixed: fieldFixed.checked,
  };
}

// 편집 창 저장
function submitEditor() {
  const fields = readEditor();
  const ok = draft.isNew ? addPlan(fields) : updateItem(draft.id, fields);
  if (!ok) {
    fieldError.hidden = false;
    fieldTitle.focus();
    return;
  }
  if (draft.isNew) {
    addInput.value = '';
    draft.id = null;
  }
  closeEditor();
}

// ===== 이벤트 =====

// 추가: 버튼 클릭과 Enter 모두 form submit으로 처리
addForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (addPlan({ title: addInput.value, cat: addCategory.value })) {
    addInput.value = '';
  }
  addInput.focus();
});

// '자세히': 입력한 제목·카테고리를 가지고 편집 창을 연다
addDetail.addEventListener('click', () => {
  openEditor(null, { title: cleanText(addInput.value, MAX_TITLE_LENGTH), cat: addCategory.value });
});

// 날짜 이동
prevDayButton.addEventListener('click', () => setCurrentDate(formatDate(addDays(parseDate(currentDate), -1))));
nextDayButton.addEventListener('click', () => setCurrentDate(formatDate(addDays(parseDate(currentDate), 1))));
todayButton.addEventListener('click', () => setCurrentDate(todayString()));

// 목록 이벤트 위임: 체크박스 변경
todoList.addEventListener('change', (event) => {
  if (!event.target.matches('.todo-check')) return;
  toggleItem(event.target.closest('li').dataset.id);
});

// 목록 이벤트 위임: 제목 클릭 → 편집 창, 삭제 버튼
todoList.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  const li = button ? button.closest('li') : null;
  if (!li) return;
  if (button.matches('.todo-delete')) deleteItem(li.dataset.id);
  else if (button.matches('.todo-title')) {
    const item = findItem(li.dataset.id);
    if (item) openEditor(item);
  }
});

// 필터 칩 클릭
filters.addEventListener('click', (event) => {
  const chip = event.target.closest('.filter');
  if (!chip) return;
  currentFilter = chip.dataset.filter;
  render();
});

// 완료 항목 일괄 삭제 (보고 있는 날짜만)
clearButton.addEventListener('click', clearCompleted);

// 편집 창 이벤트
editorForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitEditor();
});
document.getElementById('f-cancel').addEventListener('click', closeEditor);
fieldCat.addEventListener('change', () => fillSubOptions(fieldCat.value));
fieldTitle.addEventListener('input', () => { fieldError.hidden = true; });
editor.addEventListener('close', handleEditorClosed);
// 창 바깥(배경)을 누르면 닫는다
editor.addEventListener('click', (event) => {
  if (event.target === editor) closeEditor();
});

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

// 편집 창의 고정 선택지를 채운다
function setupStaticOptions() {
  fillCategoryOptions(addCategory);
  fillCategoryOptions(fieldCat);
  fieldDur.add(new Option('모름', ''));
  DURATION_OPTIONS.forEach((minutes) => fieldDur.add(new Option(formatDuration(minutes), String(minutes))));
}

// ===== 앱 시작 =====
setupStaticOptions();
items = loadItems();
currentDate = todayString();
render();
setupWebApp();
requestPersistentStorage();
