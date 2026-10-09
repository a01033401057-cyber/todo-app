// 오늘의 할 일 — 편집 창 (할 일 추가 '자세히'와 수정에 함께 사용)

const editor = {
  dialog: document.getElementById('editor'),
  form: document.getElementById('editor-form'),
  heading: document.getElementById('editor-title'),
  submit: document.getElementById('f-submit'),
  remove: document.getElementById('f-delete'),
  error: document.getElementById('f-error'),
  fields: {
    title: document.getElementById('f-title'),
    date: document.getElementById('f-date'),
    cat: document.getElementById('f-cat'),
    sub: document.getElementById('f-sub'),
    subList: document.getElementById('f-sub-list'),
    time: document.getElementById('f-time'),
    dur: document.getElementById('f-dur'),
    memo: document.getElementById('f-memo'),
    fixed: document.getElementById('f-fixed'),
  },
  draft: null, // { id, isNew }
  returnFocus: null,
};

// 고정 선택지 채우기 (앱 시작 때 한 번)
function setupEditor() {
  const { cat, dur } = editor.fields;
  CATEGORIES.forEach((category) => cat.add(new Option(category.label, category.id)));
  dur.add(new Option('모름', ''));
  DURATION_OPTIONS.forEach((minutes) => dur.add(new Option(formatDuration(minutes), String(minutes))));

  editor.form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitEditor();
  });
  document.getElementById('f-cancel').addEventListener('click', closeEditor);
  editor.remove.addEventListener('click', deleteFromEditor);
  cat.addEventListener('change', () => fillSubOptions(cat.value));
  editor.fields.title.addEventListener('input', () => { editor.error.hidden = true; });
  editor.dialog.addEventListener('close', () => {
    editor.draft = null;
    restoreFocusAfterDialog(editor.returnFocus);
  });
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

// 편집 창 열기. item이 없으면 새 할 일 (defaults: title, cat, date)
function openEditor(item, defaults = {}) {
  const f = editor.fields;
  const source = item ?? { title: '', cat: 'etc', sub: '', time: '', dur: '', memo: '', fixed: false, key: state.date, ...defaults };
  editor.draft = { id: item ? item.id : null, isNew: !item };
  editor.returnFocus = item ? `edit:${item.id}` : 'add-input';

  editor.heading.textContent = item ? '할 일 수정' : '할 일 자세히 추가';
  editor.submit.textContent = item ? '저장' : '추가';
  editor.remove.hidden = !item;
  f.title.value = source.title ?? '';
  f.date.value = source.key || state.date;
  f.cat.value = CATEGORY_MAP[source.cat] ? source.cat : 'etc';
  f.sub.value = source.sub ?? '';
  f.time.value = source.time ?? '';
  f.dur.value = source.dur ? String(source.dur) : '';
  f.memo.value = source.memo ?? '';
  f.fixed.checked = Boolean(source.fixed);
  editor.error.hidden = true;
  fillSubOptions(f.cat.value);

  editor.dialog.showModal();
  f.title.focus();
}

function closeEditor() {
  if (editor.dialog.open) editor.dialog.close();
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
  };
}

// 저장
function submitEditor() {
  const fields = readEditor();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(editor.fields.date.value) ? editor.fields.date.value : state.date;
  const { draft } = editor;
  let ok;
  if (draft.isNew) {
    ok = Boolean(addPlan(date, fields));
    if (ok) state.addText = '';
  } else {
    ok = updatePlan(draft.id, fields, date);
  }
  if (!ok) {
    editor.error.hidden = false;
    editor.fields.title.focus();
    return;
  }
  // 다른 날짜로 옮겼으면 그 날짜에서 계속 볼 수 있게 이동
  if (date !== state.date && state.view === 'day') state.date = date;
  closeEditor();
  toast(draft.isNew ? '추가했어요' : '저장했어요');
  render();
}

// 편집 창에서 삭제
function deleteFromEditor() {
  const { draft } = editor;
  if (!draft || draft.isNew || !confirm('이 할 일을 삭제할까요?')) return;
  removeItem(draft.id);
  editor.returnFocus = 'add-input';
  closeEditor();
  toast('삭제했어요');
  render();
}
