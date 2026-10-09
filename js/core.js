// 오늘의 할 일 — 공통: 상수, 날짜, 저장소, 화면 도우미
// (일반 <script>로 가장 먼저 불러온다. 여기서 만든 상수·함수는 다른 파일에서 그대로 쓴다)

// ===== 저장 키 =====
// 'daily-todo:v2'로 시작하는 키 전체가 현재 데이터다. v1은 마이그레이션 원본으로만 읽고 지우지 않는다
const KEYS = {
  items: 'daily-todo:v2',
  settings: 'daily-todo:v2:settings',
  days: 'daily-todo:v2:days',
  ui: 'daily-todo:v2:ui',
  legacy: 'daily-todo:v1',
};

// ===== 상수 =====
const MAX_TITLE_LENGTH = 100;
const MAX_SUB_LENGTH = 30;
const MAX_MEMO_LENGTH = 200;
const MAX_ROUTINE_COUNT = 10;

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

// 빠른 추가: [카테고리, 세부 항목, 제목, 소요 시간(분)]
const QUICK_ADDS = [
  ['toeic', '단어 암기', '토익 단어 암기', 30],
  ['toeic', '문제 풀이', '토익 문제 풀이', 60],
  ['workout', '러닝', '러닝 5km', 40],
  ['workout', '등산', '등산', 180],
  ['workout', '홈트·턱걸이', '홈트·턱걸이', 20],
  ['workout', '홈트·팔굽혀펴기', '홈트·팔굽혀펴기', 20],
  ['blog', '네이버 포스팅', '네이버 블로그 포스팅', 60],
  ['blog', '티스토리 포스팅', '티스토리 포스팅', 60],
  ['stock', '기업 분석', '주식 공부', 45],
  ['reading', '', '독서', 30],
  ['speaking', '쉐도잉', '영어 회화 연습', 30],
  ['rest', '산책', '휴식·산책', 15],
];

// v1 카테고리 → 원래 이름 (마이그레이션 때 sub에 넣는다)
const LEGACY_CATEGORY_LABELS = { work: '업무', personal: '개인', study: '공부' };

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const DEFAULT_SETTINGS = {
  golden: ['06:00', '09:00'],
  routine: ['물 한 잔 마시기', '이불 정리', '오늘의 핵심 1가지 확인'],
  weekHours: 15,
};

// ===== 날짜 (모두 로컬 시간 기준, toISOString으로 날짜 문자열을 만들지 않는다) =====

function pad(number) {
  return String(number).padStart(2, '0');
}

// Date → 'YYYY-MM-DD'
function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 'YYYY-MM-DD' → Date (로컬 자정)
function parseDate(text) {
  const [year, month, day] = String(text).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

// 날짜 문자열에 n일을 더한다
function addDays(dateText, days) {
  const date = parseDate(dateText);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

// 그 주의 월요일 날짜 문자열
function mondayOf(dateText) {
  const date = parseDate(dateText);
  return addDays(dateText, -((date.getDay() + 6) % 7));
}

function todayString() {
  return formatDate(new Date());
}

// scope에 맞는 기간 키 (day='2026-10-10', week=월요일, month='2026-10', half='2026-H2', year='2026')
function keyFor(scope, dateText) {
  const date = parseDate(dateText);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (scope === 'year') return String(year);
  if (scope === 'half') return `${year}-H${month <= 6 ? 1 : 2}`;
  if (scope === 'month') return `${year}-${pad(month)}`;
  if (scope === 'week') return mondayOf(dateText);
  return formatDate(date);
}

// '10월 10일 토요일'
function dayLabel(dateText) {
  const date = parseDate(dateText);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일`;
}

// 소요 시간(분) → '1시간 30분'
function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

// 분 → '2.5' (시간, 소수 첫째 자리)
function formatHours(minutes) {
  return String(Math.round((minutes / 60) * 10) / 10);
}

// ===== 저장소 =====

const store = {
  items: [],
  settings: { ...DEFAULT_SETTINGS },
  days: {},
  ui: { sort: 'time' },
};

// JSON 읽기 (없거나 깨졌으면 fallback)
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = JSON.parse(raw);
    return value ?? fallback;
  } catch (error) {
    return fallback;
  }
}

// JSON 쓰기 (실패하면 안내)
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    toast('저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');
    return false;
  }
}

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isTime = (value) => /^\d{2}:\d{2}$/.test(value ?? '');

// 입력 텍스트 정리 (앞뒤 공백 제거, 최대 길이)
function cleanText(text, maxLength) {
  return String(text ?? '').trim().slice(0, maxLength);
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// v1 할 일 하나 → v2 항목
function migrateLegacyTodo(todo) {
  const created = new Date(todo.createdAt);
  const validDate = !Number.isNaN(created.getTime());
  return {
    id: String(todo.id ?? createId()),
    type: 'plan',
    scope: 'day',
    key: validDate ? formatDate(created) : todayString(),
    title: cleanText(todo.text, MAX_TITLE_LENGTH) || '(제목 없음)',
    cat: 'etc',
    sub: LEGACY_CATEGORY_LABELS[todo.category] ?? '',
    time: '',
    dur: '',
    memo: '',
    fixed: false,
    done: Boolean(todo.completed),
    createdAt: validDate ? todo.createdAt : new Date().toISOString(),
  };
}

// 설정값 검사: 잘못된 값은 기본값으로
function normalizeSettings(raw) {
  const value = isPlainObject(raw) ? raw : {};
  const golden = Array.isArray(value.golden) && isTime(value.golden[0]) && isTime(value.golden[1])
    && value.golden[0] < value.golden[1] ? [value.golden[0], value.golden[1]] : [...DEFAULT_SETTINGS.golden];
  const routine = Array.isArray(value.routine)
    ? value.routine.map((line) => cleanText(line, MAX_TITLE_LENGTH)).filter(Boolean).slice(0, MAX_ROUTINE_COUNT)
    : [...DEFAULT_SETTINGS.routine];
  const weekHours = Number(value.weekHours) >= 1 && Number(value.weekHours) <= 120
    ? Number(value.weekHours) : DEFAULT_SETTINGS.weekHours;
  return { golden, routine, weekHours };
}

// 모든 데이터를 불러온다. v2 항목이 없고 v1이 있으면 한 번만 옮긴다 (v1 키는 그대로 둔다)
function loadStore() {
  const items = readJSON(KEYS.items, null);
  if (Array.isArray(items)) {
    store.items = items.filter(isPlainObject);
  } else {
    const legacy = readJSON(KEYS.legacy, []);
    store.items = Array.isArray(legacy) ? legacy.filter(isPlainObject).map(migrateLegacyTodo) : [];
    saveItems();
  }
  store.settings = normalizeSettings(readJSON(KEYS.settings, null));
  const days = readJSON(KEYS.days, {});
  store.days = isPlainObject(days) ? days : {};
  const ui = readJSON(KEYS.ui, {});
  store.ui = { ...store.ui, ...(isPlainObject(ui) ? ui : {}) };
}

const saveItems = () => writeJSON(KEYS.items, store.items);
const saveSettings = () => writeJSON(KEYS.settings, store.settings);
const saveDays = () => writeJSON(KEYS.days, store.days);
const saveUi = () => writeJSON(KEYS.ui, store.ui);

// 날짜별 정보: 썸네일 id, 루틴 체크
function getDay(dateText) {
  const saved = store.days[dateText];
  return { thumb: '', routine: {}, ...(isPlainObject(saved) ? saved : {}) };
}

function updateDay(dateText, changes) {
  store.days[dateText] = { ...getDay(dateText), ...changes };
  saveDays();
}

// ===== 항목 =====

function findItem(id) {
  return store.items.find((item) => item.id === id);
}

// 일일 할 일 목록 (필터 미적용)
function dayPlans(dateText) {
  return store.items.filter((item) => item.type === 'plan' && item.scope === 'day' && item.key === dateText);
}

// 편집 창·빠른 추가 값 검사 (제목이 비면 null)
function normalizePlanFields(fields) {
  const title = cleanText(fields.title, MAX_TITLE_LENGTH);
  if (!title) return null;
  const dur = Number(fields.dur);
  return {
    title,
    cat: CATEGORY_MAP[fields.cat] ? fields.cat : 'etc',
    sub: cleanText(fields.sub, MAX_SUB_LENGTH),
    time: isTime(fields.time) ? fields.time : '',
    dur: DURATION_OPTIONS.includes(dur) ? dur : '',
    memo: cleanText(fields.memo, MAX_MEMO_LENGTH),
    fixed: Boolean(fields.fixed),
  };
}

// 일일 할 일 추가 (제목이 비면 null, 성공하면 새 항목)
function addPlan(dateText, fields) {
  const normalized = normalizePlanFields(fields);
  if (!normalized) return null;
  const item = {
    id: createId(),
    type: 'plan',
    scope: 'day',
    key: dateText,
    ...normalized,
    done: false,
    createdAt: new Date().toISOString(),
  };
  store.items.push(item);
  saveItems();
  return item;
}

// 항목 수정 (제목이 비면 false)
function updatePlan(id, fields, dateText) {
  const item = findItem(id);
  const normalized = normalizePlanFields(fields);
  if (!item || !normalized) return false;
  Object.assign(item, normalized);
  if (dateText) item.key = dateText;
  saveItems();
  return true;
}

function removeItem(id) {
  store.items = store.items.filter((item) => item.id !== id);
  saveItems();
}

function toggleItem(id) {
  const item = findItem(id);
  if (!item) return;
  item.done = !item.done;
  saveItems();
}

// 골든 타임에 시작하는 할 일인지
function isGolden(item) {
  const [start, end] = store.settings.golden;
  return Boolean(item.time) && item.time >= start && item.time < end;
}

// 정렬: 시간 있는 할 일은 시간순, 없는 할 일은 그 뒤에 추가한 순서로
function sortPlans(list) {
  return [...list].sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time) || String(a.createdAt).localeCompare(String(b.createdAt));
    if (a.time) return -1;
    if (b.time) return 1;
    return String(a.createdAt).localeCompare(String(b.createdAt));
  });
}

// 완료 개수·전체 개수·완료율 (0으로 나누지 않음)
function getProgress(list) {
  const total = list.length;
  const done = list.filter((item) => item.done).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

// ===== 화면 도우미 (사용자 입력은 항상 텍스트 노드로만 들어간다) =====

// 카테고리 색상을 요소에 연결한다 (--c 변수)
function setCategoryColor(element, catId) {
  element.style.setProperty('--c', `var(--cat-${CATEGORY_MAP[catId] ? catId : 'etc'})`);
}

// 요소 만들기: h('button', { class, text, data, cat, ... }, 자식...)
// 문자열 자식과 text는 텍스트 노드로만 들어가므로 innerHTML을 쓰지 않는다
const PROPERTY_KEYS = new Set(['value', 'checked', 'selected', 'disabled', 'hidden', 'type', 'id', 'htmlFor']);
function h(tag, props, ...children) {
  const element = document.createElement(tag);
  Object.entries(props ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === 'class') element.className = value;
    else if (key === 'text') element.textContent = value;
    else if (key === 'data') Object.entries(value).forEach(([k, v]) => { if (v !== undefined && v !== null) element.dataset[k] = v; });
    else if (key === 'cat') setCategoryColor(element, value);
    else if (key === 'width') element.style.width = `${value}%`;
    else if (PROPERTY_KEYS.has(key)) element[key] = value;
    else element.setAttribute(key, value === true ? '' : String(value));
  });
  children.flat(Infinity).forEach((child) => {
    if (child === null || child === undefined || child === false || child === '') return;
    element.append(child instanceof Node ? child : String(child));
  });
  return element;
}

// 안내 토스트
let toastTimer = null;
function toast(message) {
  const element = document.getElementById('toast');
  if (!element) return;
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element.hidden = true; }, 2200);
}
