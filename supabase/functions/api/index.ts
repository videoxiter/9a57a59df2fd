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
  // v8: флаг «синхронизировать график» — читают и пишут только админ/главный
  // специалист (can_sync). Анонимные политики на таблице закрыты.
  otp_sync_flags: ["GET", "PATCH"],
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
  const a = await fetch(`${SB}/rest/v1/otp_staff?select=is_admin,active,can_sync,page_hash,only_app&slug=eq.${slug}`, {
    headers: { apikey: SRV, Authorization: `Bearer ${SRV}` },
  });
  const st = a.ok ? await a.json() : [];
  const admin = !!(st && st[0] && st[0].is_admin);
  const active = !(st && st[0] && st[0].active === false);
  // v8: право запрашивать синхронизацию графика (главный специалист)
  const canSync = !!(st && st[0] && st[0].can_sync);
  // v12: вторая форма идентификатора (внутренний id ↔ код страницы)
  const pageHash = (st && st[0] && st[0].page_hash) ? String(st[0].page_hash) : "";
  // v17: «старт смены только из приложения»
  const onlyApp = !!(st && st[0] && st[0].only_app);
  return { slug, admin, active, canSync, pageHash, onlyApp };
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

  // v4: владение строками. Сотрудник пишет события только о себе (админ — о ком угодно);
  // заявки решает только админ. (Без этого любой вошедший мог «завершить смену» коллеги
  // или сам себе подтвердить переработку/увольнительную.)
  if (table === "otp_time_events" && method === "POST") {
    const rows: any[] = Array.isArray(p.body) ? p.body : [p.body];
    for (const r of rows) {
      if (!r || typeof r !== "object") return json({ ok: false, error: "bad row" }, 400);
      // v12: принимаем обе формы идентификатора — внутренний id и код страницы,
      // иначе «Стартовая» с данными по hash получала 403 «профиль не совпадает».
      const own = String(r.empSlug || "");
      if (!s.admin && own !== s.slug && !(s.pageHash && own === s.pageHash)) {
        return json({ ok: false, error: "not your event" }, 403);
      }
    }
    // v17: «старт смены только из приложения». Проверяем токен устройства,
    // который приложение получает через otp_device_claim и присылает в p.device.
    if (s.onlyApp && !s.admin && rows.some((r) => r && r.type === "shift_start")) {
      const dev = String(p.device || "");
      if (!dev) return json({ ok: false, error: "start_only_from_app" }, 403);
      const dq = await fetch(
        `${SB}/rest/v1/otp_devices?select=device&slug=eq.${s.slug}&device=eq.${encodeURIComponent(dev)}`,
        { headers: { apikey: SRV, Authorization: `Bearer ${SRV}` } },
      );
      const dr = dq.ok ? await dq.json() : [];
      if (!Array.isArray(dr) || !dr.length) {
        return json({ ok: false, error: "start_only_from_app" }, 403);
      }
      await fetch(`${SB}/rest/v1/otp_devices?slug=eq.${s.slug}&device=eq.${encodeURIComponent(dev)}`, {
        method: "PATCH",
        headers: { apikey: SRV, Authorization: `Bearer ${SRV}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ last_seen: new Date().toISOString() }),
      });
    }
  }
  // v5 (P1.2): правка журнала через прокси — только админ. До этого любая
  // вошедшая сессия могла PATCH-нуть чужое событие (подменить время `at`).
  if (table === "otp_time_events" && method === "PATCH" && !s.admin) {
    return json({ ok: false, error: "admin only" }, 403);
  }
  // v8: флаг синхронизации графика — только админ или главный специалист
  // с правом can_sync. Кнопка на его странице работает без админ-пароля.
  if (table === "otp_sync_flags") {
    if (!s.admin && !s.canSync) return json({ ok: false, error: "sync not allowed" }, 403);
    // пишем только служебные поля, чужие данные не принимаем
    if (method === "PATCH") {
      const row: any = Array.isArray(p.body) ? p.body[0] : (p.body || {});
      p.body = {
        requested_at: row.requested_at ?? null,
        requested_by: row.requested_by ?? null,
        done_at: row.done_at ?? null,
        ok: row.ok ?? null,
        message: row.message ?? null,
      };
    }
  }
  if (table === "otp_requests" && method !== "GET" && !s.admin) {
    // Сотрудник может PATCH только СВОЮ заявку: фильтр empSlug=eq.<свой slug>
    // должен стоять в запросе — тогда PostgREST физически не тронет чужие строки.
    const m = String(path).match(/empSlug=eq\.([^&]+)/);
    if (!m || decodeURIComponent(m[1]) !== s.slug) {
      return json({ ok: false, error: "not your request" }, 403);
    }
  }

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
