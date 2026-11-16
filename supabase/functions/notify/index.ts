// Supabase Edge Function `notify` — ОТКЛЮЧЕНА.
//
// Уведомления в канал «ДисКо» теперь отправляет функция `cron` (раз в минуту)
// по событиям из таблицы otp_time_events: это работает даже при свёрнутой
// вкладке и не даёт дублей. Эта функция оставлена как заглушка, чтобы старые
// закэшированные страницы сайта не могли отправить сообщение повторно.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  return new Response(
    JSON.stringify({ ok: true, disabled: true, note: "уведомления отправляет функция cron" }),
    { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
  );
});
