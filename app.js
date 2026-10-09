// 오늘의 할 일 — 앱 로직

// localStorage 저장 키
const STORAGE_KEY = 'daily-todo:v1';

// 할 일 텍스트 최대 길이
const MAX_TEXT_LENGTH = 100;

// 카테고리 저장 값 → 화면 표시 이름
const CATEGORY_LABELS = {
  work: '업무',
  personal: '개인',
  study: '공부',
};

// 앱 상태: 할 일 배열 하나로 관리
let todos = [];

// 현재 편집 중인 할 일 id (한 번에 하나만, 없으면 null)
let editingId = null;

// 현재 필터: 'all' | 'work' | 'personal' | 'study'
let currentFilter = 'all';

// 자주 쓰는 DOM 요소
const addForm = document.getElementById('add-form');
const addInput = document.getElementById('add-input');
const addCategory = document.getElementById('add-category');
const todoList = document.getElementById('todo-list');
const emptyMessage = document.getElementById('empty-message');
const filters = document.getElementById('filters');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const celebrate = document.getElementById('celebrate');
const clearButton = document.getElementById('clear-completed');

// ===== 데이터 =====

// localStorage에서 할 일 목록을 불러온다 (실패하거나 배열이 아니면 빈 배열)
function loadTodos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

// 할 일 목록을 localStorage에 저장한다
function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// 상태 변경 후 저장하고 화면을 다시 그린다
function commit() {
  saveTodos();
  render();
}

// 겹치지 않는 id를 만든다 (Date.now() 기반)
function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// 입력 텍스트를 정리한다 (앞뒤 공백 제거, 최대 100자)
function cleanText(text) {
  return String(text).trim().slice(0, MAX_TEXT_LENGTH);
}

// id로 할 일을 찾는다
function findTodo(id) {
  return todos.find((todo) => todo.id === id);
}

// 새 할 일을 추가한다 (빈 값·공백만 있으면 무시하고 false 반환)
function addTodo(text, category) {
  const cleaned = cleanText(text);
  if (!cleaned || !CATEGORY_LABELS[category]) return false;
  todos.push({
    id: createId(),
    text: cleaned,
    category,
    completed: false,
    createdAt: new Date().toISOString(),
  });
  commit();
  return true;
}

// 할 일의 텍스트·카테고리를 수정한다 (빈 텍스트면 원래 값 유지)
function updateTodo(id, changes) {
  const todo = findTodo(id);
  editingId = null;
  if (todo) {
    const text = cleanText(changes.text ?? todo.text);
    const category = changes.category ?? todo.category;
    if (text && CATEGORY_LABELS[category]) {
      todo.text = text;
      todo.category = category;
    }
  }
  commit();
}

// 할 일을 삭제한다 (확인 후)
function deleteTodo(id) {
  if (!confirm('이 할 일을 삭제할까요?')) return;
  todos = todos.filter((todo) => todo.id !== id);
  commit();
}

// 할 일의 완료 상태를 전환한다
function toggleTodo(id) {
  const todo = findTodo(id);
  if (!todo) return;
  todo.completed = !todo.completed;
  commit();
}

// 완료된 할 일을 한꺼번에 삭제한다 (확인 후)
function clearCompleted() {
  const count = todos.filter((todo) => todo.completed).length;
  if (count === 0 || !confirm(`완료한 할 일 ${count}개를 삭제할까요?`)) return;
  todos = todos.filter((todo) => !todo.completed);
  commit();
}

// 완료 개수·전체 개수·완료율을 계산한다 (0으로 나누지 않음)
function getProgress(list) {
  const total = list.length;
  const done = list.filter((todo) => todo.completed).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

// ===== 편집 모드 =====

// 편집 모드로 전환한다
function startEdit(id) {
  editingId = id;
  render();
}

// 편집을 취소하고 원래 내용으로 되돌린다
function cancelEdit() {
  editingId = null;
  render();
}

// 편집 중인 li의 입력값으로 저장한다
function saveEdit(li) {
  updateTodo(li.dataset.id, {
    text: li.querySelector('.edit-input').value,
    category: li.querySelector('.edit-category').value,
  });
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

// 카테고리 배지 요소를 만든다
function createBadge(category) {
  const badge = document.createElement('span');
  badge.className = `badge badge-${category}`;
  badge.textContent = CATEGORY_LABELS[category] ?? category;
  return badge;
}

// 카테고리 select 요소를 만든다
function createCategorySelect(selected) {
  const select = document.createElement('select');
  select.className = 'edit-category';
  select.setAttribute('aria-label', '카테고리');
  Object.entries(CATEGORY_LABELS).forEach(([value, label]) => {
    select.add(new Option(label, value, false, value === selected));
  });
  return select;
}

// 보기 모드 li 내용을 만든다
function fillViewItem(li, todo) {
  const checkArea = document.createElement('label');
  checkArea.className = 'check-area';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-check';
  checkbox.checked = todo.completed;
  checkbox.setAttribute('aria-label', `완료: ${todo.text}`);
  checkArea.append(checkbox);

  const text = document.createElement('span');
  text.className = 'todo-text';
  text.textContent = todo.text;

  li.append(
    checkArea,
    createBadge(todo.category),
    text,
    createButton('todo-edit', '수정', `수정: ${todo.text}`),
    createButton('btn-danger todo-delete', '삭제', `삭제: ${todo.text}`),
  );
}

// 편집 모드 li 내용을 만든다
function fillEditItem(li, todo) {
  li.classList.add('is-editing');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit-input';
  input.maxLength = MAX_TEXT_LENGTH;
  input.value = todo.text;
  input.setAttribute('aria-label', '할 일 수정');

  li.append(
    input,
    createCategorySelect(todo.category),
    createButton('btn-primary edit-save', '저장'),
    createButton('edit-cancel', '취소'),
  );
}

// 할 일 1개의 li 요소를 만든다
function createTodoItem(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item';
  li.dataset.id = todo.id;
  if (todo.completed) li.classList.add('is-completed');

  if (todo.id === editingId) {
    fillEditItem(li, todo);
  } else {
    fillViewItem(li, todo);
  }
  return li;
}

// ===== 화면 그리기 =====

// 막대 하나의 너비를 퍼센트로 맞춘다
function setBarWidth(fill, percent) {
  fill.style.width = `${percent}%`;
}

// 진행률 영역을 그린다 (필터와 무관하게 항상 전체 기준)
function renderProgress() {
  const { done, total, percent } = getProgress(todos);
  setBarWidth(progressFill, percent);
  progressBar.setAttribute('aria-valuenow', String(percent));
  progressText.textContent = `${done}/${total} 완료 (${percent}%)`;
  celebrate.hidden = !(total > 0 && done === total);

  document.querySelectorAll('.mini').forEach((mini) => {
    const category = mini.dataset.category;
    const progress = getProgress(todos.filter((todo) => todo.category === category));
    setBarWidth(mini.querySelector('.mini-fill'), progress.percent);
    mini.querySelector('.mini-text').textContent = `${progress.done}/${progress.total} (${progress.percent}%)`;
  });
}

// 필터 탭을 그린다 (선택 강조 + 남은 개수)
function renderFilters() {
  filters.querySelectorAll('.filter').forEach((tab) => {
    const filter = tab.dataset.filter;
    const label = filter === 'all' ? '전체' : CATEGORY_LABELS[filter];
    const remaining = todos.filter(
      (todo) => !todo.completed && (filter === 'all' || todo.category === filter),
    ).length;
    const isActive = filter === currentFilter;
    tab.textContent = `${label} (${remaining})`;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-pressed', String(isActive));
  });
}

// 빈 상태 안내 문구를 그린다
function renderEmpty(visibleCount) {
  if (todos.length === 0) {
    emptyMessage.textContent = '할 일을 추가해보세요';
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
  const isEditControl = li.classList.contains('is-editing');
  const selector = isEditControl ? '.todo-edit' : `.${[...active.classList].pop()}`;
  return { id: li.dataset.id, selector };
}

// 다시 그린 뒤 포커스를 복원한다 (키보드 사용자가 위치를 잃지 않게)
function restoreFocus(saved) {
  const editInput = todoList.querySelector('.edit-input');
  if (editInput) {
    editInput.focus();
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);
    return;
  }
  if (!saved) return;
  const li = [...todoList.children].find((item) => item.dataset.id === saved.id);
  const target = li ? li.querySelector(saved.selector) : null;
  (target ?? addInput).focus();
}

// 현재 상태로 화면을 다시 그린다 (필터 적용, 미완료 위, 완료 아래)
function render() {
  renderProgress();
  renderFilters();
  clearButton.disabled = !todos.some((todo) => todo.completed);

  const savedFocus = rememberFocus();
  const visible = currentFilter === 'all'
    ? todos
    : todos.filter((todo) => todo.category === currentFilter);
  const sorted = [...visible].sort((a, b) => Number(a.completed) - Number(b.completed));
  const fragment = document.createDocumentFragment();
  sorted.forEach((todo) => fragment.appendChild(createTodoItem(todo)));
  todoList.replaceChildren(fragment);

  renderEmpty(sorted.length);
  restoreFocus(savedFocus);
}

// 헤더에 오늘 날짜를 표시한다 (예: 2026년 10월 3일 (토))
function renderToday() {
  const now = new Date();
  const date = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const weekday = now.toLocaleDateString('ko-KR', { weekday: 'short' });
  document.getElementById('today').textContent = `${date} (${weekday})`;
}

// ===== 이벤트 =====

// 추가: 버튼 클릭과 Enter 모두 form submit으로 처리
addForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (addTodo(addInput.value, addCategory.value)) {
    addInput.value = '';
  }
  addInput.focus();
});

// 목록 이벤트 위임: 체크박스 변경
todoList.addEventListener('change', (event) => {
  if (!event.target.matches('.todo-check')) return;
  toggleTodo(event.target.closest('li').dataset.id);
});

// 목록 이벤트 위임: 버튼 클릭 (삭제·수정·저장·취소)
todoList.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  const li = button ? button.closest('li') : null;
  if (!li) return;
  if (button.matches('.todo-delete')) deleteTodo(li.dataset.id);
  else if (button.matches('.todo-edit')) startEdit(li.dataset.id);
  else if (button.matches('.edit-save')) saveEdit(li);
  else if (button.matches('.edit-cancel')) cancelEdit();
});

// 목록 이벤트 위임: 텍스트 더블클릭으로 편집 시작
todoList.addEventListener('dblclick', (event) => {
  if (!event.target.matches('.todo-text')) return;
  startEdit(event.target.closest('li').dataset.id);
});

// 목록 이벤트 위임: 편집 중 Enter = 저장, Esc = 취소
todoList.addEventListener('keydown', (event) => {
  const li = event.target.closest('li.is-editing');
  if (!li || event.isComposing) return;
  if (event.key === 'Enter' && event.target.matches('.edit-input')) {
    event.preventDefault();
    saveEdit(li);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelEdit();
  }
});

// 필터 탭 클릭
filters.addEventListener('click', (event) => {
  const tab = event.target.closest('.filter');
  if (!tab) return;
  currentFilter = tab.dataset.filter;
  render();
});

// 완료 항목 일괄 삭제
clearButton.addEventListener('click', clearCompleted);

// ===== 앱 시작 =====
renderToday();
todos = loadTodos();
render();
