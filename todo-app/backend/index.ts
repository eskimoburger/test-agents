import { getAllTodos, createTodo, toggleTodo, deleteTodo } from "./db";

const PORT = 3000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
      return json(createTodo(text), 201);
    }

    // PUT /todos/:id
    const putMatch = path.match(/^\/todos\/(\d+)$/);
    if (req.method === "PUT" && putMatch) {
      const id = parseInt(putMatch[1]);
      const todo = toggleTodo(id);
      if (!todo) return json({ error: "not found" }, 404);
      return json(todo);
    }

    // DELETE /todos/:id
    const deleteMatch = path.match(/^\/todos\/(\d+)$/);
    if (req.method === "DELETE" && deleteMatch) {
      const id = parseInt(deleteMatch[1]);
      const ok = deleteTodo(id);
      if (!ok) return json({ error: "not found" }, 404);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return json({ error: "not found" }, 404);
  },
});

console.log(`Backend running on http://localhost:${PORT}`);
