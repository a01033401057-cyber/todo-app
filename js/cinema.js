// 오늘의 할 일 — 영화관 모드 (화면 전체를 덮는 집중 화면)
// 진행 중에는 { id, startedAt }을 저장해 두어 새로고침해도 이어진다

const cinema = {
  dialog: document.getElementById('cinema'),
  title: document.getElementById('cinema-title'),
  clock: document.getElementById('cinema-clock'),
  goal: document.getElementById('cinema-goal'),
  bar: document.getElementById('cinema-bar'),
  fill: document.getElementById('cinema-fill'),
  session: null, // { id, startedAt }
  timer: null,
  wakeLock: null,
};

function setupCinema() {
  document.getElementById('cinema-done').addEventListener('click', () => closeCinema(true));
  document.getElementById('cinema-stop').addEventListener('click', () => closeCinema(false));
  // Esc = 그만하기 (기본 동작 대신 몰입 시간을 기록하고 닫는다)
  cinema.dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeCinema(false);
  });
  // 다른 탭에 갔다 오면 화면 꺼짐 방지를 다시 요청
  document.addEventListener('visibilitychange', () => {
    if (cinema.session && document.visibilityState === 'visible') requestWakeLock();
  });
}

// 경과 시간 표시 (분:초, 1시간 넘으면 시:분:초)
function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function tickCinema() {
  const { session } = cinema;
  if (!session) return;
  const item = findItem(session.id);
  const elapsed = Date.now() - session.startedAt;
  cinema.clock.textContent = formatElapsed(elapsed);
  if (item && item.dur) {
    const percent = Math.min(100, Math.round((elapsed / (item.dur * 60000)) * 100));
    cinema.fill.style.width = `${percent}%`;
    cinema.bar.setAttribute('aria-valuenow', String(percent));
  }
}

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) cinema.wakeLock = await navigator.wakeLock.request('screen');
  } catch (error) {
    cinema.wakeLock = null; // 지원하지 않거나 거부되면 그냥 진행
  }
}

// 영화관 모드 열기 (startedAt이 있으면 이어서)
function openCinema(item, startedAt = Date.now()) {
  if (!item || cinema.dialog.open) return;
  cinema.session = { id: item.id, startedAt };
  writeJSON(KEYS.cinema, cinema.session);

  cinema.title.textContent = item.title;
  cinema.goal.textContent = item.dur ? `예상 ${formatDuration(item.dur)}` : '';
  cinema.bar.hidden = !item.dur;
  cinema.fill.style.width = '0%';
  tickCinema();
  clearInterval(cinema.timer);
  cinema.timer = setInterval(tickCinema, 1000);
  requestWakeLock();

  cinema.dialog.showModal();
  document.getElementById('cinema-done').focus();
}

// 영화관 모드 닫기: 집중한 분을 그날 몰입 시간에 더한다
function closeCinema(markDone) {
  const { session } = cinema;
  if (!session) return;
  clearInterval(cinema.timer);
  cinema.timer = null;
  if (cinema.wakeLock) {
    cinema.wakeLock.release().catch(() => {});
    cinema.wakeLock = null;
  }

  const item = findItem(session.id);
  const minutes = Math.floor((Date.now() - session.startedAt) / 60000);
  const dateText = item && item.scope === 'day' ? item.key : formatDate(new Date(session.startedAt));
  if (minutes > 0) {
    const day = getDay(dateText);
    updateDay(dateText, { focusMin: (Number(day.focusMin) || 0) + minutes });
  }
  if (markDone && item && !item.done) toggleItem(item.id);

  cinema.session = null;
  try { localStorage.removeItem(KEYS.cinema); } catch (error) { /* 저장소를 쓸 수 없으면 무시 */ }
  if (cinema.dialog.open) cinema.dialog.close();
  render();
  restoreFocusAfterDialog(item ? `edit:${item.id}` : null);
  toast(minutes > 0 ? `${minutes}분 몰입했어요` : '영화관 모드를 마쳤어요');
}

// 새로고침 전에 진행 중이던 영화관 모드를 이어서 연다
function resumeCinema() {
  const saved = readJSON(KEYS.cinema, null);
  if (!isPlainObject(saved)) return;
  const item = findItem(saved.id);
  const startedAt = Number(saved.startedAt);
  if (!item || item.done || !(startedAt > 0) || startedAt > Date.now()) {
    try { localStorage.removeItem(KEYS.cinema); } catch (error) { /* 무시 */ }
    return;
  }
  openCinema(item, startedAt);
}
