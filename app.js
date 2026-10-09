// 오늘의 할 일 — 앱 로직

// localStorage 저장 키
const STORAGE_KEY = 'daily-todo:v1';

// 앱 상태: 할 일 배열 하나로 관리
let todos = [];

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

// 할 일 1개의 li 요소를 만든다 (사용자 입력은 textContent로만 출력)
function createTodoItem(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item';
  li.dataset.id = todo.id;
  if (todo.completed) li.classList.add('is-completed');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-check';
  checkbox.checked = todo.completed;

  const text = document.createElement('span');
  text.className = 'todo-text';
  text.textContent = todo.text;

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'todo-delete';
  deleteButton.textContent = '삭제';

  li.append(checkbox, text, deleteButton);
  return li;
}

// 현재 상태로 목록을 다시 그린다 (미완료 위, 완료 아래)
function render() {
  const sorted = [...todos].sort((a, b) => Number(a.completed) - Number(b.completed));
  const fragment = document.createDocumentFragment();
  sorted.forEach((todo) => fragment.appendChild(createTodoItem(todo)));
  todoList.replaceChildren(fragment);
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

// 목록 이벤트 위임: 삭제 버튼 클릭
todoList.addEventListener('click', (event) => {
  if (!event.target.matches('.todo-delete')) return;
  deleteTodo(event.target.closest('li').dataset.id);
});

// 앱 시작
todos = loadTodos();
render();
