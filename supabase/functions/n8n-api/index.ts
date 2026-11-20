// Read-only integration endpoint. The token is stored in Supabase Edge Function secrets.
const url = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const integrationToken = Deno.env.get("N8N_API_TOKEN") || "";
const logins: Record<string, string> = {
  frolov: "p.frolov", bolgov: "a.bolgov", melnikov: "a.melnikov",
  khasanov: "r.khasanov", pestovsky: "g.pestovskii", eliseev: "a.eliseev",
  zavyalov: "m.zavialov", yuryev: "s.iurev", agarov: "v.agarkov",
  pospelova: "e.pospelova",
};

const reply = (body: unknown, status: number) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply({ error: "method not allowed" }, 405);
  if (!url || !serviceKey || integrationToken.length < 32) return reply({ error: "integration not configured" }, 500);

  let input: any;
  try { input = await req.json(); } catch { return reply({ error: "bad json" }, 400); }
  if (!input || typeof input.token !== "string" || input.token !== integrationToken) return reply({ error: "unauthorized" }, 401);
  if (input.method !== "GET" || typeof input.path !== "string") return reply({ error: "only GET is allowed" }, 403);

  if (input.path === "schedule" || input.path === "status") {
    try {
      const scheduleResponse = await fetch("https://videoxiter.github.io/9a57a59df2fd/assets/data/schedule.json", { cache: "no-store" });
      if (!scheduleResponse.ok) return reply({ error: "schedule unavailable" }, 502);
      const schedule = await scheduleResponse.json();
      const people = schedule.team.slice().sort((a: any, b: any) => a.fio.localeCompare(b.fio, "ru"));
      if (input.path === "status") {
        const response = await fetch(`${url}/rest/v1/rpc/otp_current_status`, {
          method: "POST", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" }, body: "{}",
        });
        if (!response.ok) return reply({ error: "status unavailable" }, 502);
        const statuses = await response.json();
        return reply(people.map((person: any) => {
          const status = statuses.find((row: any) => row.emp_name === person.fio);
          return { fio: person.fio, login: logins[person.id] || null, status: status?.status || "idle", worked_seconds: status?.worked_sec || 0,
            since: status?.since ? new Date(Date.parse(status.since) + 10800000).toISOString().replace("Z", "+03:00") : null };
        }), 200);
      }
      const today = new Date(Date.now() + 10800000);
      const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
      const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * 86400000));
      if (days.some((day) => !schedule.schedule.months[day.toISOString().slice(0, 7)])) return reply({ error: "schedule month unavailable" }, 503);
      return reply(people.map((person: any) => ({ fio: person.fio, login: logins[person.id] || null, days: days.map((day) => {
        const date = day.toISOString().slice(0, 10);
        const month = schedule.schedule.months[date.slice(0, 7)];
        const previous = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
        const candidates = [month, schedule.schedule.months[previous]].filter(Boolean);
        const lines = [...new Map(candidates.flatMap((item: any) => Object.entries(item.lines || {})).filter(([, line]: [string, any]) => (line.labels || []).some((label: string, i: number) => {
          const m = label.match(/^(\d{1,2})\.(\d{1,2})\s*[-–]\s*(\d{1,2})\.(\d{1,2})$/);
          if (!m || !(line.weeks?.[i] || []).includes(person.fio)) return false;
          return [day.getUTCFullYear() - 1, day.getUTCFullYear()].some((year) => {
            const start = Date.UTC(year, +m[2] - 1, +m[1]);
            const end = Date.UTC(year + (+m[4] < +m[2] ? 1 : 0), +m[4] - 1, +m[3]);
            return day.getTime() >= start && day.getTime() <= end;
          });
        })).map(([id, line]: [string, any]) => [id, { id, title: line.title }])).values()];
        return { date, shift: month.shifts?.[person.fio]?.[String(day.getUTCDate())] || null, lines };
      }) })), 200);
    } catch { return reply({ error: "data unavailable" }, 502); }
  }

  const [table, query = "", extra] = input.path.split("?");
  if (extra !== undefined || !["otp_requests", "otp_time_events"].includes(table)) return reply({ error: "table not allowed" }, 403);
  const params = new URLSearchParams(query);
  const allowed = table === "otp_requests" ? ["status", "date", "type"] : ["day", "type"];
  for (const [key, value] of params) {
    if (key === "select" && value === "*") continue;
    if (key === "limit" && /^\d+$/.test(value) && +value >= 1 && +value <= 1000) continue;
    if (key === "offset" && /^\d+$/.test(value) && +value <= 1000000) continue;
    if (key === "order" && /^(date|day|at|created)\.(asc|desc)$/.test(value)) continue;
    if (allowed.includes(key) && /^(eq|gte|lte)\.[a-zA-Z0-9_-]+$/.test(value)) continue;
    return reply({ error: "filter not allowed" }, 400);
  }
  if (!params.has("limit")) params.set("limit", "1000");
  try {
    const response = await fetch(`${url}/rest/v1/${table}?${params}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json" } });
  } catch {
    return reply({ error: "database unavailable" }, 502);
  }
});
