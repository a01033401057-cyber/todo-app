// 오늘의 할 일 — 편집 창 (할 일·목표의 추가와 수정에 함께 사용)

// 기간 선택지. 목표는 연간 탭에서 상반기·하반기도 고를 수 있게 반기를 둘로 나눠 보여 준다
const GOAL_PICKS = [['year', '연간'], ['half1', '상반기'], ['half2', '하반기'], ['month', '월간'], ['week', '주간'], ['day', '일일']];
const PLAN_PICKS = [['day', '일일']];

const editor = {
  dialog: document.getElementById('editor'),
  form: document.getElementById('editor-form'),
  heading: document.getElementById('editor-title'),
  submit: document.getElementById('f-submit'),
  remove: document.getElementById('f-delete'),
  error: document.getElementById('f-error'),
  scopeField: document.getElementById('f-scope-field'),
  scopeSeg: document.getElementById('f-scope'),
  fields: {
    title: document.getElementById('f-title'),
    titleLabel: document.getElementById('f-title-label'),
    date: document.getElementById('f-date'),
    dateLabel: document.getElementById('f-date-label'),
    weekNote: document.getElementById('f-week-note'),
    year: document.getElementById('f-year'),
    month: document.getElementById('f-month'),
    planMonth: document.getElementById('f-plan-month'),
    cat: document.getElementById('f-cat'),
    sub: document.getElementById('f-sub'),
    subList: document.getElementById('f-sub-list'),
    time: document.getElementById('f-time'),
    dur: document.getElementById('f-dur'),
    memo: document.getElementById('f-memo'),
    fixed: document.getElementById('f-fixed'),
    target: document.getElementById('f-target'),
    unit: document.getElementById('f-unit'),
    current: document.getElementById('f-current'),
  },
  draft: null, // { id, type, pick, date, done }
  returnFocus: null,
};

const isDateText = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && !Number.isNaN(parseDate(value).getTime());

// 고정 선택지 채우기와 이벤트 연결 (앱 시작 때 한 번)
function setupEditor() {
  const f = editor.fields;
  CATEGORIES.forEach((category) => f.cat.add(new Option(category.label, category.id)));
  f.dur.add(new Option('모름', ''));
  DURATION_OPTIONS.forEach((minutes) => f.dur.add(new Option(formatDuration(minutes), String(minutes))));
  for (let month = 1; month <= 12; month += 1) f.month.add(new Option(`${month}월`, String(month)));
  f.planMonth.add(new Option('연중 (미지정)', ''));
  for (let month = 1; month <= 12; month += 1) f.planMonth.add(new Option(`${month}월`, String(month)));

  editor.form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitEditor();
  });
  document.getElementById('f-cancel').addEventListener('click', closeEditor);
  editor.remove.addEventListener('click', deleteFromEditor);
  f.cat.addEventListener('change', () => fillSubOptions(f.cat.value));
  f.title.addEventListener('input', () => { editor.error.hidden = true; });
  f.date.addEventListener('change', updateWeekNote);
  editor.scopeSeg.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-pick]');
    if (!button || !editor.draft) return;
    readPeriodIntoDraft();
    editor.draft.pick = button.dataset.pick;
    applyEditorMode();
  });
  // Esc로 닫힌 경우의 정리. close 이벤트는 늦게 오므로, 그 사이 다시 열렸으면 아무것도 하지 않는다
  editor.dialog.addEventListener('close', finishEditor);
  // 창 바깥(배경)을 누르면 닫는다
  editor.dialog.addEventListener('click', (event) => {
    if (event.target === editor.dialog) closeEditor();
  });
}

// 세부 항목 추천 목록을 카테고리에 맞게 채운다
function fillSubOptions(catId) {
  const subs = (CATEGORY_MAP[catId] ?? CATEGORY_MAP.etc).subs;
  editor.fields.subList.replaceChildren(...subs.map((sub) => new Option(sub)));
  editor.fields.sub.placeholder = subs[0] ?? '직접 입력';
}

// 항목 → 기간 선택 값
function pickOf(item) {
  return item.scope === 'half' ? `half${String(item.key).slice(-1)}` : item.scope;
}

// 항목 → 그 기간 안의 날짜
function dateOf(item) {
  if (item.scope === 'day' || item.scope === 'week') return item.key;
  if (item.scope === 'month') return `${item.key}-01`;
  if (item.scope === 'half') return `${String(item.key).slice(0, 4)}-${String(item.key).endsWith('1') ? '01' : '07'}-01`;
  return `${item.key}-${pad(Number(item.month) || 1)}-01`;
}

// 기간 입력칸 값 → draft.date
function readPeriodIntoDraft() {
  const { draft } = editor;
  const f = editor.fields;
  const pick = draft.pick;
  if ((pick === 'day' || pick === 'week') && isDateText(f.date.value)) {
    draft.date = f.date.value;
    return;
  }
  const year = Number(f.year.value);
  if (!(year >= 2000 && year <= 2100)) return;
  if (pick === 'month') draft.date = `${year}-${pad(Number(f.month.value) || 1)}-01`;
  else if (pick === 'half1') draft.date = `${year}-01-01`;
  else if (pick === 'half2') draft.date = `${year}-07-01`;
  else if (pick === 'year') draft.date = `${year}-${pad(Number(f.planMonth.value) || parseDate(draft.date).getMonth() + 1)}-01`;
}

// 기간 선택 값 → 저장할 scope·key
function editorBase() {
  const { draft } = editor;
  const f = editor.fields;
  readPeriodIntoDraft();
  const scope = draft.pick.startsWith('half') ? 'half' : draft.pick;
  const base = { type: draft.type, scope, key: keyFor(scope, draft.date) };
  if (draft.pick === 'half1' || draft.pick === 'half2') base.key = `${parseDate(draft.date).getFullYear()}-H${draft.pick === 'half1' ? 1 : 2}`;
  if (scope === 'year' && draft.type === 'plan') base.month = Number(f.planMonth.value) || '';
  return base;
}

function updateWeekNote() {
  const f = editor.fields;
  f.weekNote.textContent = isDateText(f.date.value) ? `${weekLabel(mondayOf(f.date.value))} · ${weekRange(mondayOf(f.date.value))}` : '';
}

// 할 일/목표, 기간에 맞는 입력칸만 보여 준다
function applyEditorMode() {
  const { draft } = editor;
  const f = editor.fields;
  const isGoal = draft.type === 'goal';
  const picks = isGoal ? GOAL_PICKS : PLAN_PICKS;
  if (!picks.some(([value]) => value === draft.pick)) draft.pick = picks[0][0];
  const { pick } = draft;
  const date = parseDate(draft.date);

  editor.scopeField.hidden = picks.length < 2;
  editor.scopeSeg.replaceChildren(...picks.map(([value, label]) => h('button', {
    type: 'button', 'aria-pressed': String(pick === value), text: label, data: { pick: value },
  })));

  // 기간 입력
  const usesDate = pick === 'day' || pick === 'week';
  f.date.closest('.field').hidden = !usesDate;
  f.dateLabel.textContent = pick === 'week' ? '주 선택 (그 주의 아무 날)' : '날짜';
  f.date.value = draft.date;
  f.weekNote.hidden = pick !== 'week';
  updateWeekNote();
  f.year.closest('.field').hidden = usesDate;
  f.year.value = String(date.getFullYear());
  f.month.closest('.field').hidden = pick !== 'month';
  f.month.value = String(date.getMonth() + 1);
  f.planMonth.closest('.field').hidden = !(pick === 'year' && !isGoal);

  // 종류별 입력
  editor.form.querySelectorAll('[data-for="plan"]').forEach((element) => { element.hidden = isGoal; });
  editor.form.querySelectorAll('[data-for="goal"]').forEach((element) => { element.hidden = !isGoal; });
  editor.form.querySelectorAll('[data-for="plan-day"]').forEach((element) => { element.hidden = isGoal || pick !== 'day'; });
}

// 편집 창 열기
// item이 없으면 새 항목. defaults: { type, pick, date, title, cat, fixed, month, returnFocus }
function openEditor(item, defaults = {}) {
  const f = editor.fields;
  const type = item ? item.type : (defaults.type ?? 'plan');
  const source = item ?? {
    title: '', cat: 'etc', sub: '', time: '', dur: '', memo: '', fixed: false, target: '', unit: '', current: 0, month: '', ...defaults,
  };
  editor.draft = {
    id: item ? item.id : null,
    type,
    pick: item ? pickOf(item) : (defaults.pick ?? 'day'),
    date: item ? dateOf(item) : (isDateText(defaults.date) ? defaults.date : state.date),
    done: Boolean(item && item.done),
  };
  editor.returnFocus = item ? `edit:${item.id}` : (defaults.returnFocus ?? 'add-input');

  const noun = type === 'goal' ? '목표' : '할 일';
  editor.heading.textContent = item ? `${noun} 수정` : `${noun} 추가`;
  f.titleLabel.textContent = type === 'goal' ? '목표 (결과물로)' : '할 일 (끝났는지 알 수 있게)';
  f.title.placeholder = type === 'goal' ? '예: 러닝 100km' : '예: 토익 단어 100개 암기 + 복습 테스트';
  editor.submit.textContent = item ? '저장' : '추가';
  editor.remove.hidden = !item;
  f.title.value = source.title ?? '';
  f.cat.value = CATEGORY_MAP[source.cat] ? source.cat : 'etc';
  f.sub.value = source.sub ?? '';
  f.time.value = source.time ?? '';
  f.dur.value = source.dur ? String(source.dur) : '';
  f.memo.value = source.memo ?? '';
  f.fixed.checked = Boolean(source.fixed);
  f.target.value = source.target ? String(source.target) : '';
  f.unit.value = source.unit ?? '';
  f.current.value = String(Number(source.current) || 0);
  f.planMonth.value = source.month ? String(source.month) : '';
  editor.error.hidden = true;
  fillSubOptions(f.cat.value);
  applyEditorMode();

  editor.dialog.showModal();
  f.title.focus();
}

function closeEditor() {
  if (editor.dialog.open) editor.dialog.close();
  finishEditor();
}

// 닫힌 뒤 정리: draft를 비우고 포커스를 연 자리로 돌려준다 (한 번만)
function finishEditor() {
  if (editor.dialog.open || !editor.draft) return;
  editor.draft = null;
  restoreFocusAfterDialog(editor.returnFocus);
}

// 편집 창 값 읽기
function readEditor() {
  const f = editor.fields;
  return {
    title: f.title.value,
    cat: f.cat.value,
    sub: f.sub.value,
    time: f.time.value,
    dur: f.dur.value,
    memo: f.memo.value,
    fixed: f.fixed.checked,
    target: f.target.value,
    unit: f.unit.value,
    current: f.current.value,
    done: editor.draft.done,
  };
}

// 저장
function submitEditor() {
  const { draft } = editor;
  const base = editorBase();
  const isNew = !draft.id;
  if (!saveFromEditor(draft.id, base, readEditor())) {
    editor.error.hidden = false;
    editor.fields.title.focus();
    return;
  }
  if (isNew && draft.type === 'plan' && editor.returnFocus === 'add-input') state.addText = '';
  // 일일 화면에서 다른 날짜로 옮긴 할 일은 그 날짜에서 계속 볼 수 있게 이동
  if (state.view === 'day' && base.scope === 'day' && base.key !== state.date) state.date = base.key;
  closeEditor();
  toast(isNew ? '추가했어요' : '저장했어요');
  render();
}

// 편집 창에서 삭제
function deleteFromEditor() {
  const { draft } = editor;
  if (!draft || !draft.id || !confirm(draft.type === 'goal' ? '이 목표를 삭제할까요?' : '이 할 일을 삭제할까요?')) return;
  removeItem(draft.id);
  editor.returnFocus = 'add-input';
  closeEditor();
  toast('삭제했어요');
  render();
}
