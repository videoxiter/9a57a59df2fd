// Supabase Edge Function: уведомления в канал «ДисКо» (Яндекс Мессенджер).
//
// Деплой: Supabase → Edge Functions → New function → имя `notify` → вставить этот код.
// Секреты: Supabase → Edge Functions → Secrets (или Project Settings → Edge Functions):
//   YANDEX_BOT_TOKEN — OAuth-токен бота из https://oauth.yandex.ru/
//   DISCO_CHAT_ID    — id канала «ДисКо», например 0/0/4f24b544-697c-4e18-a9c1-b39432ee9bf9
// Бот должен состоять в этом канале, иначе API ответит «Bot is not a member of the chat».
//
// Вызов из браузера: POST {SUPABASE_URL}/functions/v1/notify
//   headers: apikey: <publishable>, Authorization: Bearer <publishable>
//   body:    {"kind":"shift_start","fio":"Иванов Иван"}
// Явный текст можно передать полем "text" — тогда шаблон не используется.

const TOKEN = Deno.env.get("YANDEX_BOT_TOKEN") || "";
const CHAT = Deno.env.get("DISCO_CHAT_ID") || "";
const API = "https://botapi.messenger.yandex.net/bot/v1/messages/sendText/";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

type Ctx = { fio: string; meta?: Record<string, unknown> };

const TEMPLATES: Record<string, (c: Ctx) => string> = {
  late:        (c) => `⚠️ Зафиксировано опоздание! — ${c.fio}`,
  shift_start: (c) => `🚀 ${c.fio} — начало смены`,
  break1:      (c) => `☕ Тех.перерыв №1 — ${c.fio}`,
  break2:      (c) => `☕ Тех.перерыв №2 — ${c.fio}`,
  lunch:       (c) => `🍽️ Обеденный перерыв — ${c.fio}, приятного аппетита!`,
  absence:     (c) => `🚶 Временное отсутствие — ${c.fio}${c.meta?.reason ? ` (${c.meta.reason})` : ""}`,
  break_over:  (c) => `⚠️ Перерыв затянулся! — ${c.fio}`,
  lunch_over:  (c) => `⚠️ Обед затянулся! — ${c.fio}`,
  return:      (c) => `👊 ${c.fio} — снова в деле!`,
  shift_stop:  (c) => `🏁 Завершение смены — ${c.fio}`,
  leave_end:   (c) => `⏱ Увольнительная завершена досрочно${c.meta?.to ? ` (${c.meta.to})` : ""} — ${c.fio}`,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  if (!TOKEN || !CHAT) return json({ ok: false, error: "YANDEX_BOT_TOKEN / DISCO_CHAT_ID не заданы" }, 500);

  let payload: { kind?: string; fio?: string; text?: string; meta?: Record<string, unknown> } = {};
  try { payload = await req.json(); } catch { /* пустое тело */ }

  const fio = String(payload.fio || "").trim();
  const kind = String(payload.kind || "").trim();
  const tpl = TEMPLATES[kind];
  const msg = String(payload.text || (tpl ? tpl({ fio, meta: payload.meta }) : "")).trim();
  if (!msg) return json({ ok: false, error: "unknown kind" }, 400);

  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { Authorization: `OAuth ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT, text: msg }),
    });
    const data = await r.json().catch(() => ({}));
    return json({ ok: r.ok && data.ok !== false, sent: msg, yandex: data }, r.ok ? 200 : 502);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
