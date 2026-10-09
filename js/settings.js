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
