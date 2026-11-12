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
// С какой даты вообще сообщать об опозданиях (при запуске системы люди ещё не начали
// пользоваться кнопкой — иначе канал завалит сообщениями в первый же день).
const LATE_FROM = Deno.env.get("LATE_FROM") || "2026-11-13";
// Личные сообщения: {"Фамилия Имя Отчество": "login"} — логины в Яндекс Мессенджере.
// Без них напоминания уходят в общий канал.
const LOGINS: Record<string, string> = (() => {
  try { return JSON.parse(Deno.env.get("TEAM_LOGINS") || "{}"); } catch { return {}; }
})();

const YANDEX = "https://botapi.messenger.yandex.net/bot/v1/messages/sendText/";
const TZ_OFFSET = 3 * 60 * 60 * 1000;              // Москва, UTC+3 (без перехода на летнее время)
const WORK_KINDS = new Set(["shift", "weekend", "duty", "extra"]);
const BREAK_MIN = { tech1: 15, tech2: 15, lunch: 60 };

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const T = (ms: number) => AbortSignal.timeout(ms);
const TIMEOUT = 8000;

async function sb(path: string, init?: RequestInit) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { ...(init || {}), headers, signal: T(TIMEOUT) });
  if (!r.ok) throw new Error(`supabase ${r.status}: ${await r.text()}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

async function send(text: string, login?: string) {
  if (!BOT) return { ok: false, error: "secrets not set" };
  const body: Record<string, unknown> = { text };
  if (login) body.login = login;        // личное сообщение сотруднику
  else {
    if (!CHAT) return { ok: false, error: "DISCO_CHAT_ID не задан" };
    body.chat_id = CHAT;               // в общий канал «ДисКо»
  }
  const r = await fetch(YANDEX, {
    method: "POST",
    headers: { Authorization: `OAuth ${BOT}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: T(TIMEOUT),
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

    const schedRes = await fetch(SCHEDULE_URL, { cache: "no-store", signal: T(TIMEOUT) });
    if (!schedRes.ok) return json({ ok: false, error: "schedule " + schedRes.status }, 502);
    const schedDoc = await schedRes.json();
    const sched = schedDoc.schedule || {};
    // только действующие сотрудники нашего сайта — посторонние из выгрузки Confluence
    // (уволенные, другие отделы) в уведомления не попадают
    const team = new Set((schedDoc.team || []).map((t: any) => String(t.fio || "").trim()));
    const onlyTeam = (fio: string) => (team.size ? team.has(String(fio).trim()) : true);
    const month = (sched.months || {})[monthKey];
    if (!month) return json({ ok: true, today, note: "нет графика на месяц" });

    const events = await sb(`otp_time_events?select=*&day=eq.${today}&order=at.asc`) || [];
    const sent = new Set((await sb(`otp_time_notices?select=id&day=eq.${today}`) || []).map((n: any) => n.id));
    // кто вообще пользуется системой: если человек ещё ни разу ничего не нажимал,
    // «опоздание» по нему не шлём (иначе в первые дни канал получает шквал)
    const usedRows = await sb(
      `otp_time_events?select=empName&at=gte.${new Date(Date.now() - 14 * 86400000).toISOString()}&limit=2000`,
    ).catch(() => []) || [];
    const used = new Set((usedRows as any[]).map((e) => String(e.empName || "").trim()));

    const byEmp = new Map<string, any[]>();
    for (const e of events) {
      const k = String(e.empName || e.empSlug);
      if (!byEmp.has(k)) byEmp.set(k, []);
      byEmp.get(k)!.push(e);
    }

    const out: string[] = [];
    const errors: string[] = [];
    const notifyOnce = async (kind: string, emp: string, text: string, personal = false) => {
      const id = `${today}:${kind}:${emp}`;
      if (sent.has(id)) return;
      const login = personal ? LOGINS[String(emp).trim()] : undefined;
      const res: any = await send(text, login);
      if (res && res.ok !== false) {
        sent.add(id);
        await sb("otp_time_notices", {
          method: "POST", headers: { Prefer: "return=minimal" },
          body: JSON.stringify([{ id, day: today, kind, emp }]),
        }).catch(() => {});
        out.push(`${kind}: ${emp}${login ? " (личное " + login + ")" : " (канал)"}`);
      } else {
        // не молчим: видно, почему Яндекс отклонил (например, неверный логин)
        errors.push(`${kind}: ${emp}${login ? " [" + login + "]" : " [канал]"}: ${JSON.stringify(res).slice(0, 160)}`);
        // страховка: личное не доставлено (логин не найден) — пишем в канал, чтобы не потерять
        if (login) {
          const res2: any = await send(text);
          if (res2 && res2.ok !== false) {
            sent.add(id);
            await sb("otp_time_notices", {
              method: "POST", headers: { Prefer: "return=minimal" },
              body: JSON.stringify([{ id, day: today, kind, emp }]),
            }).catch(() => {});
            out.push(`${kind}: ${emp} (канал — личное не доставлено)`);
          }
        }
      }
    };

    // 1. опоздание: смена по графику началась, а «Начало» не нажато
    for (const [fio, days] of Object.entries(month.shifts || {})) {
      if (!onlyTeam(fio)) continue;
      if (today < LATE_FROM) continue;
      if (!used.has(String(fio).trim())) continue;      // человек ещё не пользуется системой
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
      // 3. напоминание о конце смены — через 5 минут после её окончания
      const endM = /[–-]\s*(\d{1,2}):(\d{2})/.exec(String(sh.time || ""));
      if (endM && started) {
        const endMs = new Date(`${today}T${String(endM[1]).padStart(2, "0")}:${endM[2]}:00+03:00`).getTime();
        const passed = nowMs - endMs;
        const stopped = list.some((e) => e.type === "shift_stop");
        if (!stopped && passed >= 5 * 60000) {
          await notifyOnce("shift_late_end", fio,
            `⏰ Смена закончилась ${Math.max(1, Math.round(passed / 60000))} мин назад — не забудь нажать «Завершить смену».`, true);
        }
      }
    }

    // 2. затянувшийся перерыв/обед + напоминание за 2 минуты до конца
    for (const [emp, list] of byEmp.entries()) {
      const last = list[list.length - 1];
      if (!last || last.type !== "break_start") continue;
      const limit = BREAK_MIN[last.slot as keyof typeof BREAK_MIN] || 15;
      const endMs = Date.parse(last.at) + limit * 60000;
      // сообщение только через 5 минут после того, как перерыв должен был закончиться
      const overMs = nowMs - endMs;
      if (overMs >= 5 * 60000) {
        const kind = last.slot === "lunch" ? "lunch_over" : "break_over";
        const text = last.slot === "lunch" ? `⚠️ Обед затянулся! — ${emp}` : `⚠️ Перерыв затянулся! — ${emp}`;
        await notifyOnce(kind, emp, text);
        const name = last.slot === "lunch" ? "Обед" : "Перерыв";
        await notifyOnce(`back_${last.slot}`, emp,
          `⏳ ${name} идёт уже ${Math.round(overMs / 60000)} мин — пора возвращаться к работе.`, true);
      }
    }

    // 4. автозакрытие смены в конце дня (если сотрудник забыл нажать «Завершить»)
    const minsNow = nowMsk.getUTCHours() * 60 + nowMsk.getUTCMinutes();
    if (minsNow >= 23 * 60 + 50) {
      for (const [emp, list] of byEmp.entries()) {
        const started = list.some((e) => e.type === "shift_start");
        const stopped = list.some((e) => e.type === "shift_stop");
        if (!started || stopped) continue;
        const id = `${today}:auto_stop:${emp}`;
        if (sent.has(id)) continue;
        const first = list.find((e) => e.type === "shift_start");
        const slug = first ? first.empSlug : "";
        await sb("otp_time_events", {
          method: "POST", headers: { Prefer: "return=minimal" },
          body: JSON.stringify([{
            id: "auto-" + today + "-" + String(slug || emp).slice(0, 12),
            empSlug: slug, empName: emp, day: today, type: "shift_stop", slot: null,
            at: new Date().toISOString(), reason: "автозакрытие",
          }]),
        }).catch(() => {});
        await notifyOnce("auto_stop", emp, `🏁 Смена закрыта автоматически (забыли нажать «Завершить») — ${emp}`, true);
      }
    }

    return json({ ok: true, today, sent: out, errors, checked: Object.keys(month.shifts || {}).length });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
