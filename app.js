const API_URL = 'https://jsonplaceholder.typicode.com/todos';
const STORAGE_KEY = 'todos-app';
let todoState = [];
let currentFilter = 'all';

const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const submitButton = document.getElementById('submitButton');
const todoList = document.getElementById('todoList');
const todoCount = document.getElementById('todoCount');
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');

const DEFAULT_RECURRING_TASKS = [
    { id: 'rec-1', title: "Excel", completed: false, isRecurring: true },
    { id: 'rec-2', title: "أذكار المساء", completed: false, isRecurring: true },
    { id: 'rec-3', title: "PixelByte", completed: false, isRecurring: true },
    { id: 'rec-4', title: "صلاة العشاء", completed: false, isRecurring: true },
    { id: 'rec-5', title: "صلاة المغرب", completed: false, isRecurring: true },
    { id: 'rec-6', title: "صلاة العصر", completed: false, isRecurring: true },
    { id: 'rec-7', title: "صلاة الظهر", completed: false, isRecurring: true },
    { id: 'rec-8', title: "path to quran", completed: false, isRecurring: true },
    { id: 'rec-9', title: "JS review", completed: false, isRecurring: true },
    { id: 'rec-10', title: "أذكار الصباح", completed: false, isRecurring: true },
    { id: 'rec-11', title: "صلاة الفجر", completed: false, isRecurring: true },
    { id: 'rec-12', title: "الورد اليومي", completed: false, isRecurring: true }
];

function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todoState));
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

function checkAndResetNewDay() {
    const lastResetDate = localStorage.getItem('todos-last-reset-date');
    const todayStr = new Date().toDateString();

    if (lastResetDate !== todayStr) {
        todoState = todoState.map(todo => {
            if (todo.isRecurring) {
                return { ...todo, completed: false };
            }
            return todo;
        });
        localStorage.setItem('todos-last-reset-date', todayStr);
        saveToLocalStorage();
    }
}

async function fetchTodos() {
    showLoading();
    hideError();
    try {
        let todos = loadFromLocalStorage();

        if (todos.length === 0) {
            todoState = [...DEFAULT_RECURRING_TASKS];
            localStorage.setItem('todos-last-reset-date', new Date().toDateString());
            saveToLocalStorage();
        } else {
            todoState = todos;
            checkAndResetNewDay();
        }
        return todoState;
    } catch (error) {
        console.error('Failed to load todos:', error);
        showError('Sync failed. Please refresh the page.');
        return [];
    } finally {
        hideLoading();
        updateTodoCount();
    }
}

async function createTodo(todoText) {
    try {
        if (submitButton) submitButton.disabled = true;

        const newTodo = {
            id: Date.now(),
            title: todoText,
            completed: false,
            isRecurring: false,
            userId: 1
        };

        todoState.unshift(newTodo);
        saveToLocalStorage();
        updateTodoCount();
        filterTodos();

        if (todoForm) todoForm.reset();

        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTodo)
        }).catch(err => console.log('Mock API Sync completed locally'));

    } catch (error) {
        console.error('Error creating todo:', error);
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

async function toggleTodoStatus(todo) {
    try {
        todo.completed = !todo.completed;
        saveToLocalStorage();
        updateTodoCount();

        if (currentFilter !== 'all') {
            filterTodos();
        } else {
            updateTodoElement(todo);
        }

        fetch(`${API_URL}/1`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: todo.completed })
        }).catch(err => console.log('Mock API Sync completed locally'));

    } catch (error) {
        console.error('Error updating todo:', error);
    }
}

async function deleteTodo(todo) {
    try {
        todoState = todoState.filter(t => t.id !== todo.id);
        saveToLocalStorage();

        const todoElement = document.getElementById(`todo-${todo.id}`);
        if (todoElement) {
            todoElement.style.opacity = '0';
            todoElement.style.transform = 'scale(0.9) translateY(-10px)';
            setTimeout(() => {
                todoElement.remove();
                if (todoState.length === 0) {
                    todoList.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:2rem;">No tasks inside this view.</p>';
                }
            }, 300);
        }

        updateTodoCount();

        fetch(`${API_URL}/1`, {
            method: 'DELETE'
        }).catch(err => console.log('Mock API Sync completed locally'));

    } catch (error) {
        console.error('Error deleting todo:', error);
    }
}

async function clearCompleted() {
    const completedTodos = todoState.filter(todo => todo.completed && !todo.isRecurring);
    const deletePromises = completedTodos.map(todo => deleteTodo(todo));
    await Promise.all(deletePromises);

    todoState = todoState.map(todo => {
        return todo;
    });
    saveToLocalStorage();
    filterTodos();
}

function createTodoElement(todo) {
    const todoElement = document.createElement('div');
    todoElement.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    todoElement.id = `todo-${todo.id}`;

    todoElement.innerHTML = `
        <span class="todo-text">${escapeHTML(todo.title)} ${todo.isRecurring ? '🔄' : ''}</span>
        <div class="todo-actions">
            <button class="btn btn-toggle" data-action="toggle">
                ${todo.completed ? 'Undo' : 'Complete'}
            </button>
            <button class="btn btn-delete" data-action="delete">
                Delete
            </button>
        </div>
    `;
    return todoElement;
}

function updateTodoElement(todo) {
    const todoElement = document.getElementById(`todo-${todo.id}`);
    if (todoElement) {
        const newTodoElement = createTodoElement(todo);
        todoElement.replaceWith(newTodoElement);
    }
}

function renderTodoList(todos = todoState) {
    todoList.innerHTML = '';

    if (todos.length === 0) {
        todoList.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:2rem;">No tasks inside this view.</p>';
        return;
    }

    todos.forEach(todo => {
        const todoElement = createTodoElement(todo);
        todoList.appendChild(todoElement);
    });
}

function filterTodos(filter = currentFilter) {
    currentFilter = filter;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    const filteredTodos = todoState.filter(todo => {
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
        return true;
    });

    renderTodoList(filteredTodos);
}

function updateTodoCount() {
    const activeCount = todoState.filter(todo => !todo.completed).length;
    if (todoCount) {
        todoCount.textContent = `${activeCount} item${activeCount !== 1 ? 's' : ''} left`;
    }
}

function handleTodoAction(event) {
    const button = event.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const todoElement = button.closest('.todo-item');
    if (!todoElement) return;

    const todoId = todoElement.id.replace('todo-', '');

    let todo;
    if (todoId.startsWith('rec-')) {
        todo = todoState.find(t => t.id === todoId);
    } else {
        todo = todoState.find(t => t.id === parseInt(todoId));
    }

    if (!todo) return;

    if (action === 'toggle') {
        toggleTodoStatus(todo);
    } else if (action === 'delete') {
        deleteTodo(todo);
    }
}

function showLoading() { if (loadingMessage) loadingMessage.style.display = 'flex'; }
function hideLoading() { if (loadingMessage) loadingMessage.style.display = 'none'; }
function showError(msg) { if (errorMessage) { errorMessage.textContent = msg; errorMessage.style.display = 'flex'; } }
function hideError() { if (errorMessage) errorMessage.style.display = 'none'; }

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function initializeApp() {
    if (todoForm) {
        todoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = todoInput.value.trim();
            if (text.length >= 3) {
                createTodo(text);
            }
        });
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterTodos(btn.dataset.filter));
    });

    const clearBtn = document.getElementById('clearCompleted');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCompleted);
    }

    if (todoList) {
        todoList.addEventListener('click', handleTodoAction);
    }

    fetchTodos().then(() => {
        filterTodos('all');
        updateTodoCount();
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);