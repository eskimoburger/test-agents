import { useState, useEffect, useMemo, useRef, FormEvent, KeyboardEvent } from "react";

interface Todo {
  id: number;
  text: string;
  completed: number;
  created_at: number;
  due_date: number | null;
  priority: "low" | "medium" | "high";
  category: string | null;
  sort_order: number;
}

const API = "/api/todos";

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isOverdue(ts: number | null): boolean {
  if (!ts) return false;
  return ts * 1000 < Date.now();
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "1");

  // Add form state
  const [input, setInput] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newCategory, setNewCategory] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  // Search / filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Inline edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  // Drag state (ref to avoid re-renders)
  const dragSourceId = useRef<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  // Dark mode effect
  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", darkMode ? "1" : "0");
  }, [darkMode]);

  useEffect(() => {
    fetch(API).then((r) => r.json()).then(setTodos);
  }, []);

  // Derived
  const allCategories = useMemo(
    () => Array.from(new Set(todos.map((t) => t.category).filter(Boolean))) as string[],
    [todos]
  );

  const filteredTodos = useMemo(() => {
    return todos.filter((t) => {
      if (searchQuery && !t.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterCategory && t.category !== filterCategory) return false;
      if (filterStatus === "active" && t.completed) return false;
      if (filterStatus === "done" && !t.completed) return false;
      return true;
    });
  }, [todos, searchQuery, filterPriority, filterCategory, filterStatus]);

  // Stats
  const remaining = todos.filter((t) => !t.completed).length;
  const done = todos.filter((t) => t.completed).length;

  // --- Actions ---
  async function addTodo(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const due_date = newDueDate ? Math.floor(new Date(newDueDate).getTime() / 1000) : null;
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, priority: newPriority, category: newCategory.trim() || null, due_date }),
    });
    const todo = await res.json();
    setTodos((prev) => [...prev, todo]);
    setInput("");
    setNewCategory("");
    setNewDueDate("");
    setNewPriority("medium");
  }

  async function toggleTodo(id: number) {
    const res = await fetch(`${API}/${id}`, { method: "PUT" });
    const updated = await res.json();
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function deleteTodo(id: number) {
    await fetch(`${API}/${id}`, { method: "DELETE" });
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function startEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditText(todo.text);
  }

  async function saveEdit(id: number) {
    const text = editText.trim();
    if (!text) { setEditingId(null); return; }
    const res = await fetch(`${API}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const updated = await res.json();
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  // --- Drag handlers ---
  function onDragStart(id: number) {
    dragSourceId.current = id;
  }

  function onDragOver(e: React.DragEvent, id: number) {
    e.preventDefault();
    setDragOverId(id);
  }

  async function onDrop(targetId: number) {
    const sourceId = dragSourceId.current;
    if (sourceId === null || sourceId === targetId) {
      dragSourceId.current = null;
      setDragOverId(null);
      return;
    }
    // Reorder in state
    const newOrder = [...todos];
    const fromIdx = newOrder.findIndex((t) => t.id === sourceId);
    const toIdx = newOrder.findIndex((t) => t.id === targetId);
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    setTodos(newOrder);
    dragSourceId.current = null;
    setDragOverId(null);
    await fetch(`${API}/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: newOrder.map((t) => t.id) }),
    });
  }

  return (
    <>
      {/* Dark mode toggle */}
      <button className="dark-toggle" onClick={() => setDarkMode((d) => !d)} title="Toggle dark mode">
        {darkMode ? "☀️" : "🌙"}
      </button>

      <div className="container">
        <h1>Todo App</h1>

        {/* Add form */}
        <form onSubmit={addTodo} className="add-form">
          <div className="add-row-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What needs to be done?"
            />
            <button type="submit">Add</button>
          </div>
          <div className="add-row-2">
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as "low" | "medium" | "high")}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category (optional)"
            />
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
            />
          </div>
        </form>

        {/* Search / filter bar */}
        <div className="filter-bar">
          <input
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
          />
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All categories</option>
            {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="done">Done</option>
          </select>
        </div>

        {/* Todo list */}
        <ul className="todo-list">
          {filteredTodos.map((todo) => (
            <li
              key={todo.id}
              className={[
                todo.completed ? "completed" : "",
                dragOverId === todo.id ? "drag-over" : "",
              ].join(" ").trim()}
              draggable
              onDragStart={() => onDragStart(todo.id)}
              onDragOver={(e) => onDragOver(e, todo.id)}
              onDrop={() => onDrop(todo.id)}
              onDragLeave={() => setDragOverId(null)}
            >
              {/* Drag handle */}
              <span className="drag-handle" title="Drag to reorder">⠿</span>

              {/* Checkbox */}
              <input
                type="checkbox"
                checked={!!todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />

              {/* Text / inline edit */}
              <div className="todo-body">
                {editingId === todo.id ? (
                  <input
                    className="edit-input"
                    value={editText}
                    autoFocus
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => saveEdit(todo.id)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") saveEdit(todo.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                  />
                ) : (
                  <span className="todo-text" onDoubleClick={() => startEdit(todo)}>
                    {todo.text}
                  </span>
                )}
                <div className="todo-meta">
                  <span className={`priority-badge priority-${todo.priority}`}>{todo.priority}</span>
                  {todo.category && <span className="category-chip">{todo.category}</span>}
                  {todo.due_date && (
                    <span className={`due-date${isOverdue(todo.due_date) && !todo.completed ? " overdue" : ""}`}>
                      📅 {formatDate(todo.due_date)}
                    </span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button onClick={() => deleteTodo(todo.id)} className="delete-btn">✕</button>
            </li>
          ))}
        </ul>

        {filteredTodos.length === 0 && (
          <p className="empty">{todos.length === 0 ? "No todos yet. Add one above!" : "No results match your filters."}</p>
        )}

        {/* Footer */}
        {todos.length > 0 && (
          <p className="footer-stats">{remaining} remaining · {done} done</p>
        )}
      </div>
    </>
  );
}
