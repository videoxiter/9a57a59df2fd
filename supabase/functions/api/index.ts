// Прокси к Supabase: держит service-role ключ на сервере, проверяет сессию.
// Клиент больше не знает публичный ключ — только адрес этой функции и свой токен.
//
// POST /functions/v1/api
// { "token": "<uuid сессии>", "path": "otp_time_events?select=*&day=eq.2026-11-12",
//   "method": "GET" | "POST" | "PATCH", "body": [...] }

const SB = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || SRV;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

// белый список таблиц и разрешённые методы
const ALLOWED: Record<string, string[]> = {
  otp_time_events: ["GET", "POST", "PATCH"],
  otp_requests: ["GET", "PATCH"],
  otp_content: ["GET"],
  otp_staff: ["GET"],
};

async function session(token: string) {
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return null;
  const r = await fetch(`${SB}/rest/v1/otp_sessions?select=slug&token=eq.${token}&expires=gt.now()`, {
    headers: { apikey: SRV, Authorization: `Bearer ${SRV}` },
  });
  if (!r.ok) return null;
  const rows = await r.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  const slug = rows[0].slug;
  const a = await fetch(`${SB}/rest/v1/otp_staff?select=is_admin,active&slug=eq.${slug}`, {
    headers: { apikey: SRV, Authorization: `Bearer ${SRV}` },
  });
  const st = a.ok ? await a.json() : [];
  const admin = !!(st && st[0] && st[0].is_admin);
  const active = !(st && st[0] && st[0].active === false);
  return { slug, admin, active };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  if (!SB || !SRV) return json({ ok: false, error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY не заданы" }, 500);

  let p: any;
  try { p = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }

  const s = await session(String(p.token || ""));
  if (!s) return json({ ok: false, error: "unauthorized" }, 401);
  if (!s.active) return json({ ok: false, error: "inactive" }, 403);

  const path = String(p.path || "");
  const table = path.split("?")[0].split("/")[0];
  const method = String(p.method || "GET").toUpperCase();
  if (!ALLOWED[table]) return json({ ok: false, error: "table not allowed" }, 403);
  if (!ALLOWED[table].includes(method)) return json({ ok: false, error: "method not allowed for table" }, 403);

  const h: Record<string, string> = {
    apikey: SRV,
    Authorization: `Bearer ${SRV}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  const r = await fetch(`${SB}/rest/v1/${path}`, {
    method,
    headers: h,
    body: method === "GET" ? undefined : JSON.stringify(p.body === undefined ? [] : p.body),
  });
  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
