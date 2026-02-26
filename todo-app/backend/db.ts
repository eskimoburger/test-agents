import { Database } from "bun:sqlite";

const db = new Database("todos.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    due_date INTEGER,
    priority TEXT NOT NULL DEFAULT 'medium',
    category TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`);

// Migrate existing databases
for (const col of [
  "ALTER TABLE todos ADD COLUMN due_date INTEGER",
  "ALTER TABLE todos ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'",
  "ALTER TABLE todos ADD COLUMN category TEXT",
  "ALTER TABLE todos ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
]) {
  try { db.exec(col); } catch {}
}

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  created_at: number;
  due_date: number | null;
  priority: "low" | "medium" | "high";
  category: string | null;
  sort_order: number;
}

const SELECT_COLS = "id, text, completed, created_at, due_date, priority, category, sort_order";

export function getAllTodos(): Todo[] {
  return db
    .query(`SELECT ${SELECT_COLS} FROM todos ORDER BY sort_order ASC, id ASC`)
    .all() as Todo[];
}

export function createTodo(
  text: string,
  due_date?: number | null,
  priority: "low" | "medium" | "high" = "medium",
  category?: string | null
): Todo {
  const maxOrder = (db.query("SELECT COALESCE(MAX(sort_order), -1) as m FROM todos").get() as { m: number }).m;
  const stmt = db.prepare(
    `INSERT INTO todos (text, due_date, priority, category, sort_order)
     VALUES (?, ?, ?, ?, ?)
     RETURNING ${SELECT_COLS}`
  );
  return stmt.get(text, due_date ?? null, priority, category ?? null, maxOrder + 1) as Todo;
}

export function toggleTodo(id: number): Todo | null {
  const stmt = db.prepare(
    `UPDATE todos SET completed = 1 - completed WHERE id = ? RETURNING ${SELECT_COLS}`
  );
  return stmt.get(id) as Todo | null;
}

export function updateTodo(
  id: number,
  fields: Partial<{ text: string; due_date: number | null; priority: string; category: string | null }>
): Todo | null {
  const keys = Object.keys(fields);
  if (keys.length === 0) return null;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (fields as Record<string, unknown>)[k]);
  const stmt = db.prepare(
    `UPDATE todos SET ${sets} WHERE id = ? RETURNING ${SELECT_COLS}`
  );
  return stmt.get(...values, id) as Todo | null;
}

export function reorderTodos(ids: number[]): void {
  const update = db.prepare("UPDATE todos SET sort_order = ? WHERE id = ?");
  db.transaction(() => {
    ids.forEach((id, index) => update.run(index, id));
  })();
}

export function deleteTodo(id: number): boolean {
  const result = db.prepare("DELETE FROM todos WHERE id = ?").run(id);
  return result.changes > 0;
}
