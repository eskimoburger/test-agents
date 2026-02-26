import { useState, useEffect, FormEvent } from "react";

interface Todo {
  id: number;
  text: string;
  completed: number;
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    fetch("/api/todos")
      .then((r) => r.json())
      .then(setTodos);
  }, []);

  async function addTodo(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const todo = await res.json();
    setTodos((prev) => [...prev, todo]);
    setInput("");
  }

  async function toggleTodo(id: number) {
    const res = await fetch(`/api/todos/${id}`, { method: "PUT" });
    const updated = await res.json();
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function deleteTodo(id: number) {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="container">
      <h1>Todo App</h1>
      <form onSubmit={addTodo} className="add-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit">Add</button>
      </form>
      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id} className={todo.completed ? "completed" : ""}>
            <span onClick={() => toggleTodo(todo.id)}>{todo.text}</span>
            <button onClick={() => deleteTodo(todo.id)} className="delete-btn">
              ✕
            </button>
          </li>
        ))}
      </ul>
      {todos.length === 0 && <p className="empty">No todos yet. Add one above!</p>}
    </div>
  );
}
