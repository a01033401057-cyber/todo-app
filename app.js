// 오늘의 할 일 — 앱 로직

// localStorage 저장 키
const STORAGE_KEY = 'daily-todo:v1';

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

// 자주 쓰는 DOM 요소
const addForm = document.getElementById('add-form');
const addInput = document.getElementById('add-input');
const addCategory = document.getElementById('add-category');
const todoList = document.getElementById('todo-list');

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

// 새 할 일을 추가한다 (빈 값·공백만 있으면 무시)
function addTodo(text, category) {
  const trimmed = text.trim().slice(0, 100);
  if (!trimmed) return false;
  todos.push({
    id: createId(),
    text: trimmed,
    category,
    completed: false,
    createdAt: new Date().toISOString(),
  });
  commit();
  return true;
}

// 할 일의 텍스트·카테고리를 수정한다 (빈 텍스트면 저장하지 않음)
function updateTodo(id, changes) {
  const todo = todos.find((item) => item.id === id);
  editingId = null;
  if (!todo) return render();
  const text = (changes.text ?? todo.text).trim().slice(0, 100);
  if (text && CATEGORY_LABELS[changes.category ?? todo.category]) {
    todo.text = text;
    todo.category = changes.category ?? todo.category;
  }
  commit();
}

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

// 할 일을 삭제한다 (확인 후)
function deleteTodo(id) {
  if (!confirm('이 할 일을 삭제할까요?')) return;
  todos = todos.filter((todo) => todo.id !== id);
  commit();
}

// 할 일의 완료 상태를 전환한다
function toggleTodo(id) {
  const todo = todos.find((item) => item.id === id);
  if (!todo) return;
  todo.completed = !todo.completed;
  commit();
}

// 버튼 요소를 만든다
function createButton(className, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
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
  Object.entries(CATEGORY_LABELS).forEach(([value, label]) => {
    select.add(new Option(label, value, false, value === selected));
  });
  return select;
}

// 보기 모드 li 내용을 만든다 (사용자 입력은 textContent로만 출력)
function fillViewItem(li, todo) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-check';
  checkbox.checked = todo.completed;

  const text = document.createElement('span');
  text.className = 'todo-text';
  text.textContent = todo.text;

  li.append(
    checkbox,
    createBadge(todo.category),
    text,
    createButton('todo-edit', '수정'),
    createButton('todo-delete', '삭제'),
  );
}

// 편집 모드 li 내용을 만든다
function fillEditItem(li, todo) {
  li.classList.add('is-editing');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit-input';
  input.maxLength = 100;
  input.value = todo.text;

  li.append(
    input,
    createCategorySelect(todo.category),
    createButton('edit-save', '저장'),
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

// 현재 상태로 목록을 다시 그린다 (미완료 위, 완료 아래)
function render() {
  const sorted = [...todos].sort((a, b) => Number(a.completed) - Number(b.completed));
  const fragment = document.createDocumentFragment();
  sorted.forEach((todo) => fragment.appendChild(createTodoItem(todo)));
  todoList.replaceChildren(fragment);

  // 편집 모드 진입 시 입력창에 자동 포커스
  const editInput = todoList.querySelector('.edit-input');
  if (editInput) {
    editInput.focus();
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);
  }
}

// 편집 중인 li의 입력값으로 저장한다
function saveEdit(li) {
  updateTodo(li.dataset.id, {
    text: li.querySelector('.edit-input').value,
    category: li.querySelector('.edit-category').value,
  });
}

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
  const li = event.target.closest('li');
  if (!li) return;
  if (event.target.matches('.todo-delete')) deleteTodo(li.dataset.id);
  else if (event.target.matches('.todo-edit')) startEdit(li.dataset.id);
  else if (event.target.matches('.edit-save')) saveEdit(li);
  else if (event.target.matches('.edit-cancel')) cancelEdit();
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

// 앱 시작
todos = loadTodos();
render();
