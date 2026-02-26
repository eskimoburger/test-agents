import { getAllTodos, createTodo, toggleTodo, updateTodo, reorderTodos, deleteTodo } from "./db";

const PORT = 3000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // GET /todos
    if (req.method === "GET" && path === "/todos") {
      return json(getAllTodos());
    }

    // POST /todos
    if (req.method === "POST" && path === "/todos") {
      const body = await req.json();
      const text = (body?.text ?? "").trim();
      if (!text) return json({ error: "text is required" }, 400);
      const todo = createTodo(text, body?.due_date ?? null, body?.priority ?? "medium", body?.category ?? null);
      return json(todo, 201);
    }

    // PUT /todos/reorder  (must be before /:id)
    if (req.method === "PUT" && path === "/todos/reorder") {
      const body = await req.json();
      const ids: number[] = body?.ids;
      if (!Array.isArray(ids)) return json({ error: "ids array required" }, 400);
      reorderTodos(ids);
      return json({ ok: true });
    }

    const idMatch = path.match(/^\/todos\/(\d+)$/);

    // PUT /todos/:id  — toggle completed
    if (req.method === "PUT" && idMatch) {
      const id = parseInt(idMatch[1]);
      const todo = toggleTodo(id);
      if (!todo) return json({ error: "not found" }, 404);
      return json(todo);
    }

    // PATCH /todos/:id  — update fields
    if (req.method === "PATCH" && idMatch) {
      const id = parseInt(idMatch[1]);
      const body = await req.json();
      const fields: Record<string, unknown> = {};
      if (body.text !== undefined) fields.text = body.text;
      if (body.due_date !== undefined) fields.due_date = body.due_date;
      if (body.priority !== undefined) fields.priority = body.priority;
      if (body.category !== undefined) fields.category = body.category;
      const todo = updateTodo(id, fields);
      if (!todo) return json({ error: "not found" }, 404);
      return json(todo);
    }

    // DELETE /todos/:id
    if (req.method === "DELETE" && idMatch) {
      const id = parseInt(idMatch[1]);
      const ok = deleteTodo(id);
      if (!ok) return json({ error: "not found" }, 404);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return json({ error: "not found" }, 404);
  },
});

console.log(`Backend running on http://localhost:${PORT}`);
