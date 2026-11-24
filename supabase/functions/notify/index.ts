// Supabase Edge Function `notify` — мгновенная отправка события в канал «ДисКо».
// Клиент вызывает её сразу после записи события в базу, поэтому сообщение уходит
// в моменте. Функция `cron` остаётся страховкой (если вкладка была свёрнута),
// и обе пишут отметку в otp_time_notices — дублей не бывает.
//
// Вызов: POST /functions/v1/notify  {"event": {"id","type","slot","reason","empName","empSlug","day","at"}}
// Совместимость: {"kind":"shift_start","fio":"Иванов Иван"} — тоже работает.

const SB = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
const BOT = Deno.env.get("YANDEX_BOT_TOKEN") || "";
const CHAT = Deno.env.get("DISCO_CHAT_ID") || "";
// v4: секрет доступа. Сайт шлёт его в заголовке x-otp-key (берётся из hrRules.cloud.key).
// Пока секрет не задан в Secrets — проверка выключена (для плавного деплоя).
const SECRET = Deno.env.get("NOTIFY_KEY") || "";
const API = "https://botapi.messenger.yandex.net/bot/v1/messages/sendText/";
const TZ = 3 * 60 * 60 * 1000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  // x-otp-key обязателен: без него браузер режет preflight, и мгновенное
  // уведомление молча не уходит — сообщение доходило только через cron
  // каждую минуту (те самые 30-50 секунд задержки).
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-otp-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const T = (ms: number) => AbortSignal.timeout(ms);

async function sb(path: string, init?: RequestInit) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { ...(init || {}), headers, signal: T(8000) });
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

async function send(text: string, threadId?: number) {
  if (!BOT || !CHAT) return { ok: false, error: "secrets not set" };
  const body: Record<string, unknown> = { chat_id: CHAT, text };
  if (threadId) body.thread_id = threadId;
  const r = await fetch(API, {
    method: "POST",
    headers: { Authorization: `OAuth ${BOT}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: T(8000),
  });
  return await r.json().catch(() => ({ ok: false }));
}

const SLOT: Record<string, string> = { tech1: "технологический перерыв №1", tech2: "технологический перерыв №2", lunch: "обед" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  // v4: без секрета не принимаем (кроме периода, пока NOTIFY_KEY не задан в Secrets).
  if (SECRET && req.headers.get("x-otp-key") !== SECRET) {
    return json({ ok: false, error: "bad key" }, 401);
  }

  let payload: any = {};
  try { payload = await req.json(); } catch { /* пусто */ }

  const ev = payload.event || null;
  // день по Москве
  const day = String((ev && ev.day) || payload.day || new Date(Date.now() + TZ).toISOString().slice(0, 10));
  const type = String((ev && ev.type) || payload.kind || "");
  const fio = String((ev && (ev.empName || ev.fio)) || payload.fio || "").trim();
  const slot = String((ev && ev.slot) || "");
  const reason = String((ev && ev.reason) || "").trim();

  let text = "";
  if (type === "shift_start") text = `🚀 ${fio} — начало смены`;
  else if (type === "shift_stop") text = `🏁 ${fio} — смена завершена`;
  else if (type === "break_start" && slot === "lunch") text = `🍽️ Обеденный перерыв — ${fio}, приятного аппетита!`;
  else if (type === "break_start") text = `☕ ${fio} — ${SLOT[slot] || "перерыв"}`;
  else if (type === "break_end") text = `✅ ${fio} — снова в деле`;
  else if (type === "absence_start") text = `🚶 ${fio} — временное отсутствие${reason ? ": " + reason : ""}`;
  else if (type === "absence_end") text = `✅ ${fio} — вернулся`;
  else if (payload.text) text = String(payload.text);
  if (!text) return json({ ok: true, skipped: "unknown event" });

  // отметка об отправке: тот же ключ, что у cron — дублей не будет
  const evId = ev && ev.id ? String(ev.id) : "";
  const key = evId ? `${day}:ev:${evId}:${type}:${fio}` : `${day}:${type}:${fio}:${Date.now()}`;
  const sentRows = await sb(`otp_time_notices?select=id&id=eq.${encodeURIComponent(key)}`).catch(() => []) || [];
  if (Array.isArray(sentRows) && sentRows.length) return json({ ok: true, skipped: "already sent" });

  // тред смены этого сотрудника
  let threadId = 0;
  try {
    const th = await sb(`otp_shift_threads?select=*&day=eq.${day}&emp=eq.${encodeURIComponent(fio)}`).catch(() => []);
    if (Array.isArray(th) && th.length) threadId = Number(th[0].message_id) || 0;
  } catch { /* нет треда — отправим в канал */ }

  const res: any = await send(text, threadId || undefined);
  if (!res || res.ok === false) return json({ ok: false, error: res, text }, 502);

  await sb("otp_time_notices", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{ id: key, day, kind: type, emp: fio }]),
  }).catch(() => {});

  // начало смены открывает тред: запоминаем его message_id
  if (type === "shift_start" && res.message_id) {
    await sb("otp_shift_threads", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ emp: fio, day, message_id: Number(res.message_id) }]),
    }).catch(() => {});
  }

  return json({ ok: true, sent: text, message_id: res.message_id || null, thread_id: threadId || null });
});
