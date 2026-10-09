// 오늘의 할 일 — 설정 창

const settingsDialog = {
  dialog: document.getElementById('settings'),
  form: document.getElementById('settings-form'),
  goldenStart: document.getElementById('s-golden-start'),
  goldenEnd: document.getElementById('s-golden-end'),
  routine: document.getElementById('s-routine'),
  weekHours: document.getElementById('s-week-hours'),
  error: document.getElementById('s-error'),
};

function setupSettings() {
  const s = settingsDialog;
  s.form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveSettingsForm();
  });
  document.getElementById('s-cancel').addEventListener('click', () => s.dialog.close());
  const fileInput = document.getElementById('backup-file');
  document.getElementById('backup-export').addEventListener('click', exportBackup);
  document.getElementById('backup-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    importBackup(fileInput.files[0]);
    fileInput.value = '';
  });
  const taskInput = document.getElementById('task-import-file');
  document.getElementById('task-import').addEventListener('click', () => taskInput.click());
  taskInput.addEventListener('change', () => {
    importTaskFile(taskInput.files[0]);
    taskInput.value = '';
  });
  s.dialog.addEventListener('close', () => restoreFocusAfterDialog('open-settings'));
  s.dialog.addEventListener('click', (event) => {
    if (event.target === s.dialog) s.dialog.close();
  });
}

// ===== 백업 =====
const BACKUP_APP = 'daily-todo';
const BACKUP_MAX_BYTES = 5 * 1024 * 1024;

// 지금 저장된 v2 키 이름 전체 (v1은 원본 보관용이라 건드리지 않는다)
function v2Keys() {
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key === KEYS.items || key.startsWith(`${KEYS.items}:`)) keys.push(key);
  }
  return keys;
}

// 모든 v2 키를 JSON 파일 하나로 내려받는다
function exportBackup() {
  const data = {};
  try {
    v2Keys().forEach((key) => { data[key] = JSON.parse(localStorage.getItem(key)); });
  } catch (error) {
    toast('저장된 데이터를 읽지 못했어요.');
    return;
  }
  const backup = { app: BACKUP_APP, version: 2, exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `daily-todo-backup-${todayString()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast('백업 파일을 내려받았어요');
}

// 백업 파일 검사: 올바르면 { 키: 값 }을, 아니면 null을 돌려준다
function validateBackup(backup) {
  if (!isPlainObject(backup) || backup.app !== BACKUP_APP || !isPlainObject(backup.data)) return null;
  const entries = Object.entries(backup.data);
  if (!entries.length) return null;
  const objectKeys = [KEYS.settings, KEYS.days, KEYS.weeks, KEYS.ui, KEYS.cinema];
  for (const [key, value] of entries) {
    if (key !== KEYS.items && !key.startsWith(`${KEYS.items}:`)) return null;
    if (key === KEYS.items && !(Array.isArray(value) && value.every((item) => isPlainObject(item) && typeof item.id === 'string' && typeof item.title === 'string'))) return null;
    if (objectKeys.includes(key) && !isPlainObject(value)) return null;
  }
  if (!Array.isArray(backup.data[KEYS.items])) return null;
  return backup.data;
}

// 백업 파일 불러오기 (덮어쓰기 전 확인, 형식이 틀리면 아무것도 바꾸지 않는다)
function importBackup(file) {
  const invalid = () => alert('올바른 백업 파일이 아니에요. 아무것도 바꾸지 않았어요.');
  if (!file) return;
  if (file.size > BACKUP_MAX_BYTES) {
    invalid();
    return;
  }
  const reader = new FileReader();
  reader.onerror = invalid;
  reader.onload = () => {
    let data = null;
    try {
      data = validateBackup(JSON.parse(String(reader.result)));
    } catch (error) {
      data = null;
    }
    if (!data) {
      invalid();
      return;
    }
    const count = data[KEYS.items].length;
    if (!confirm(`지금 이 브라우저의 데이터를 백업 파일 내용(항목 ${count}개)으로 바꿀까요? 지금 데이터는 사라져요.`)) return;

    // 실패하면 되돌릴 수 있게 지금 값을 보관해 두고 쓴다
    const previous = {};
    v2Keys().forEach((key) => { previous[key] = localStorage.getItem(key); });
    try {
      Object.keys(previous).forEach((key) => localStorage.removeItem(key));
      Object.entries(data).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
    } catch (error) {
      v2Keys().forEach((key) => localStorage.removeItem(key));
      Object.entries(previous).forEach(([key, value]) => localStorage.setItem(key, value));
      alert('불러오지 못했어요. 저장 공간이 부족할 수 있어요. 원래 데이터는 그대로예요.');
      return;
    }
    loadStore();
    if (VIEWS.includes(store.ui.view)) state.view = store.ui.view;
    settingsDialog.dialog.close();
    render();
    toast('백업 파일을 불러왔어요');
  };
  reader.readAsText(file);
}

// ===== 블로그 도구에서 보낸 할 일 가져오기 (기존 데이터는 그대로, 추가만) =====
// 형식: { app: 'daily-todo-import', version: 1, source, items: [{ importId, date, title, cat, sub, memo, dur }] }
// 같은 importId를 다시 받으면 새로 만들지 않고, 끝나지 않은 할 일의 날짜·메모만 갱신한다
const IMPORT_APP = 'daily-todo-import';
const MAX_IMPORT_ITEMS = 500;
const BLOG_TOOL_URL = 'http://localhost:8501';

// 받은 내용 검사 (틀리면 null, 하나라도 틀리면 전부 거절)
function validateTaskImport(payload) {
  if (!isPlainObject(payload) || payload.app !== IMPORT_APP || !Array.isArray(payload.items)) return null;
  if (!payload.items.length || payload.items.length > MAX_IMPORT_ITEMS) return null;
  const items = [];
  for (const raw of payload.items) {
    if (!isPlainObject(raw) || typeof raw.importId !== 'string' || !raw.importId.trim() || !isDateText(raw.date)) return null;
    const fields = normalizePlanFields({ cat: 'blog', ...raw });
    if (!fields) return null;
    items.push({ importId: cleanText(raw.importId, 200), date: raw.date, fields });
  }
  return { source: cleanText(payload.source, 40) || '다른 앱', items };
}

// 가져오면 무엇이 바뀌는지 미리 센다
function previewImport(items) {
  const counts = { added: 0, updated: 0, kept: 0 };
  items.forEach(({ importId, date, fields }) => {
    const existing = store.items.find((item) => item.importId === importId);
    if (!existing) counts.added += 1;
    else if (!existing.done && (existing.key !== date || existing.memo !== fields.memo)) counts.updated += 1;
    else counts.kept += 1;
  });
  return counts;
}

// 실제로 추가·갱신한다 (사용자가 고친 제목·카테고리·시간은 건드리지 않는다)
function applyImport(items) {
  items.forEach(({ importId, date, fields }) => {
    const existing = store.items.find((item) => item.importId === importId);
    if (!existing) {
      store.items.push({
        id: createId(), type: 'plan', scope: 'day', key: date, ...fields, done: false, importId, createdAt: new Date().toISOString(),
      });
    } else if (!existing.done) {
      existing.key = date;
      existing.memo = fields.memo;
    }
  });
  saveItems();
}

// 가져오기 대기: 화면 위 안내 띠에서 확인을 받는다 (확인 창 대신 — 다른 앱 안에 넣어 열어도 동작하게)
function queueImport(payload) {
  const valid = validateTaskImport(payload);
  if (!valid) {
    state.pendingImport = null;
    toast('가져올 할 일 형식이 올바르지 않아요. 아무것도 바꾸지 않았어요.');
    render();
    return;
  }
  state.pendingImport = { ...valid, counts: previewImport(valid.items) };
  render();
  document.querySelector('[data-act="import-accept"]')?.focus();
}

function acceptImport() {
  const pending = state.pendingImport;
  if (!pending) return;
  applyImport(pending.items);
  state.pendingImport = null;
  const { added, updated } = pending.counts;
  toast(added || updated ? `새로 ${added}개 추가, ${updated}개 날짜 갱신했어요` : '이미 모두 들어 있어요');
  // 가장 가까운 날짜로 이동해서 바로 보이게
  const today = todayString();
  const dates = pending.items.map((item) => item.date).sort();
  state.date = dates.find((date) => date >= today) ?? dates[dates.length - 1];
  setView('day');
}

function cancelImport() {
  state.pendingImport = null;
  render();
}

// 가져오기 안내 띠
function importBanner() {
  const pending = state.pendingImport;
  if (!pending) return null;
  const { added, updated, kept } = pending.counts;
  const parts = [`새로 ${added}개`];
  if (updated) parts.push(`날짜 바뀜 ${updated}개`);
  if (kept) parts.push(`이미 있음 ${kept}개`);
  return h('div', { class: 'banner banner-import', role: 'alert' },
    h('span', {}, h('b', { text: pending.source }), `에서 보낸 할 일 ${pending.items.length}개 · ${parts.join(' · ')}`),
    h('span', { class: 'banner-actions' },
      h('button', { type: 'button', class: 'btn btn-primary', text: '가져오기', data: actData('import-accept') }),
      h('button', { type: 'button', class: 'btn', text: '취소', data: actData('import-cancel') })));
}

// base64url → 바이트
function base64UrlToBytes(encoded) {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// 주소의 #importz=…(raw deflate 압축) 또는 #import=…(압축 없음) 읽기. 읽은 뒤 주소에서 지운다
async function readImportFromHash() {
  const match = location.hash.match(/^#(importz?)=(.+)$/);
  if (!match) return;
  const [, kind, encoded] = match;
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  if (kind === 'importz' && typeof DecompressionStream === 'undefined') {
    toast('이 브라우저는 링크로 가져오기를 지원하지 않아요. 설정에서 파일로 가져와 주세요.');
    return;
  }
  try {
    let bytes = base64UrlToBytes(encoded);
    if (kind === 'importz') {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    }
    queueImport(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    queueImport(null);
  }
}

// 파일로 가져오기
function importTaskFile(file) {
  if (!file) return;
  if (file.size > BACKUP_MAX_BYTES) {
    queueImport(null);
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => queueImport(null);
  reader.onload = () => {
    let payload = null;
    try { payload = JSON.parse(String(reader.result)); } catch (error) { payload = null; }
    settingsDialog.dialog.close();
    queueImport(payload);
  };
  reader.readAsText(file);
}

// 블로그 도구 바로가기: PC(마우스)에서만, 블로그 도구 안에 넣어 열었을 때는 숨긴다
function setupBlogLink() {
  const link = document.getElementById('blog-tool-link');
  let embedded = true;
  try { embedded = window.self !== window.top; } catch (error) { embedded = true; }
  link.href = BLOG_TOOL_URL;
  link.hidden = embedded;
}

// ===== 시간관리 4단계 안내 =====
function setupGuide() {
  const dialog = document.getElementById('guide');
  document.getElementById('guide-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => restoreFocusAfterDialog('open-guide'));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

function openGuide() {
  document.getElementById('guide').showModal();
  document.getElementById('guide-close').focus();
}

function openSettings() {
  const s = settingsDialog;
  const { golden, routine, weekHours } = store.settings;
  s.goldenStart.value = golden[0];
  s.goldenEnd.value = golden[1];
  s.routine.value = routine.join('\n');
  s.weekHours.value = String(weekHours);
  s.error.hidden = true;
  s.dialog.showModal();
  s.goldenStart.focus();
}

function saveSettingsForm() {
  const s = settingsDialog;
  const start = s.goldenStart.value;
  const end = s.goldenEnd.value;
  if (!isTime(start) || !isTime(end) || start >= end) {
    s.error.textContent = '골든 타임은 시작이 끝보다 빨라야 해요.';
    s.error.hidden = false;
    s.goldenStart.focus();
    return;
  }
  const hours = Number(s.weekHours.value);
  if (!(hours >= 1 && hours <= 120)) {
    s.error.textContent = '한 주 가용 시간은 1~120시간 사이로 적어 주세요.';
    s.error.hidden = false;
    s.weekHours.focus();
    return;
  }
  store.settings = normalizeSettings({
    golden: [start, end],
    routine: s.routine.value.split('\n'),
    weekHours: hours,
  });
  saveSettings();
  s.dialog.close();
  toast('설정을 저장했어요');
  render();
}
