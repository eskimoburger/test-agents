import { Database } from "bun:sqlite";

const db = new Database("todos.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  created_at: number;
}

export function getAllTodos(): Todo[] {
  return db
    .query("SELECT id, text, completed, created_at FROM todos ORDER BY created_at ASC")
    .all() as Todo[];
}

export function createTodo(text: string): Todo {
  const stmt = db.prepare("INSERT INTO todos (text) VALUES (?) RETURNING id, text, completed, created_at");
  return stmt.get(text) as Todo;
}

export function toggleTodo(id: number): Todo | null {
  const stmt = db.prepare(
    "UPDATE todos SET completed = 1 - completed WHERE id = ? RETURNING id, text, completed, created_at"
  );
  return stmt.get(id) as Todo | null;
}

export function deleteTodo(id: number): boolean {
  const result = db.prepare("DELETE FROM todos WHERE id = ?").run(id);
  return result.changes > 0;
}
