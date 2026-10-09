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
  s.dialog.addEventListener('close', () => restoreFocusAfterDialog('open-settings'));
  s.dialog.addEventListener('click', (event) => {
    if (event.target === s.dialog) s.dialog.close();
  });
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
