// Supabase Edge Function `cron`: контроль опозданий и затянувшихся перерывов.
// Работает целиком в облаке — открытая вкладка сотрудника и чей-либо ПК не нужны.
//
// Деплой: Supabase → Edge Functions → New function → имя `cron` → вставить код.
// Расписание: Supabase → Edge Functions → выбрать `cron` → Schedules → добавить
//   `* * * * *` (каждую минуту). Либо pg_cron + pg_net с тем же URL.
// Секреты: YANDEX_BOT_TOKEN и DISCO_CHAT_ID (те же, что у notify).
//
// Что делает на каждом запуске:
//   1. берёт график с GitHub Pages (assets/data/schedule.json);
//   2. для сегодняшних смен, где человек не нажал «Начало» и прошло > 5 минут — «опоздание»;
//   3. для активного перерыва/обеда дольше 15/60 минут — «затянулся»;
//   4. пишет отправленные факты в otp_time_notices, чтобы не дублировать.

const SB = Deno.env.get("SUPABASE_URL") || "";
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
const BOT = Deno.env.get("YANDEX_BOT_TOKEN") || "";
const CHAT = Deno.env.get("DISCO_CHAT_ID") || "";
const SCHEDULE_URL = Deno.env.get("SCHEDULE_URL") || "https://videoxiter.github.io/9a57a59df2fd/assets/data/schedule.json";

const YANDEX = "https://botapi.messenger.yandex.net/bot/v1/messages/sendText/";
const TZ_OFFSET = 3 * 60 * 60 * 1000;              // Москва, UTC+3 (без перехода на летнее время)
const WORK_KINDS = new Set(["shift", "weekend", "duty", "extra"]);
const BREAK_MIN = { tech1: 15, tech2: 15, lunch: 60 };

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function sb(path: string, init?: RequestInit) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { ...(init || {}), headers });
  if (!r.ok) throw new Error(`supabase ${r.status}: ${await r.text()}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

async function send(text: string) {
  if (!BOT || !CHAT) return { ok: false, error: "secrets not set" };
  const r = await fetch(YANDEX, {
    method: "POST",
    headers: { Authorization: `OAuth ${BOT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT, text }),
  });
  return await r.json().catch(() => ({ ok: false }));
}

const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

Deno.serve(async () => {
  try {
    const nowMsk = new Date(Date.now() + TZ_OFFSET);        // «московские» поля читаем через getUTC*
    const today = nowMsk.toISOString().slice(0, 10);
    const monthKey = today.slice(0, 7);
    const dayNum = String(+today.slice(8, 10));
    const nowMs = Date.now();

    const schedRes = await fetch(SCHEDULE_URL, { cache: "no-store" });
    if (!schedRes.ok) return json({ ok: false, error: "schedule " + schedRes.status }, 502);
    const sched = (await schedRes.json()).schedule || {};
    const month = (sched.months || {})[monthKey];
    if (!month) return json({ ok: true, today, note: "нет графика на месяц" });

    const events = await sb(`otp_time_events?select=*&day=eq.${today}&order=at.asc`) || [];
    const sent = new Set((await sb(`otp_time_notices?select=id&day=eq.${today}`) || []).map((n: any) => n.id));

    const byEmp = new Map<string, any[]>();
    for (const e of events) {
      const k = String(e.empName || e.empSlug);
      if (!byEmp.has(k)) byEmp.set(k, []);
      byEmp.get(k)!.push(e);
    }

    const out: string[] = [];
    const notifyOnce = async (kind: string, emp: string, text: string) => {
      const id = `${today}:${kind}:${emp}`;
      if (sent.has(id)) return;
      const res: any = await send(text);
      if (res && res.ok !== false) {
        sent.add(id);
        await sb("otp_time_notices", {
          method: "POST", headers: { Prefer: "return=minimal" },
          body: JSON.stringify([{ id, day: today, kind, emp }]),
        }).catch(() => {});
        out.push(`${kind}: ${emp}`);
      }
    };

    // 1. опоздание: смена по графику началась, а «Начало» не нажато
    for (const [fio, days] of Object.entries(month.shifts || {})) {
      const sh: any = (days as any)[dayNum];
      if (!sh || !WORK_KINDS.has(String(sh.kind))) continue;
      const m = /^(\d{1,2}):(\d{2})/.exec(String(sh.time || ""));
      if (!m) continue;
      const startMs = new Date(`${today}T${String(m[1]).padStart(2, "0")}:${m[2]}:00+03:00`).getTime();
      const list = byEmp.get(fio) || [];
      const started = list.some((e) => e.type === "shift_start");
      if (!started && nowMs > startMs + 5 * 60000) {
        await notifyOnce("late", fio, `⚠️ Зафиксировано опоздание! — ${fio}`);
      }
    }

    // 2. затянувшийся перерыв/обед
    for (const [emp, list] of byEmp.entries()) {
      const last = list[list.length - 1];
      if (!last || last.type !== "break_start") continue;
      const limit = BREAK_MIN[last.slot as keyof typeof BREAK_MIN] || 15;
      const over = nowMs - Date.parse(last.at) > limit * 60000;
      if (!over) continue;
      const kind = last.slot === "lunch" ? "lunch_over" : "break_over";
      const text = last.slot === "lunch"
        ? `⚠️ Обед затянулся! — ${emp}`
        : `⚠️ Перерыв затянулся! — ${emp}`;
      await notifyOnce(kind, emp, text);
    }

    return json({ ok: true, today, sent: out, checked: Object.keys(month.shifts || {}).length });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
