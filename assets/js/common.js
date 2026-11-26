/* Общий слой: smooth-scroll, GSAP reveal/parallax, тема Chart.js, хелперы */
(function () {
  "use strict";
  const D = window.OTP_DATA || window.OTP_EMP || null;

  /* ---------- Lenis smooth scroll (Apple-подобный) ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
  }

  /* ---------- GSAP + ScrollTrigger ---------- */
  let gsapOK = false;
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsapOK = true;
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    gsap.utils.toArray("[data-parallax]").forEach((el) => {
      const sp = parseFloat(el.dataset.parallax || "0.15");
      gsap.to(el, {
        yPercent: sp * 100, ease: "none",
        scrollTrigger: {
          trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true,
        },
      });
    });
  }

  /* ---------- reveal (переиспользуемый) ---------- */
  function reveal(scope) {
    scope = scope || document;
    if (!gsapOK) {
      scope.querySelectorAll("[data-reveal]").forEach((el) => (el.style.opacity = 1));
      return;
    }
    // группы со стаггером
    gsap.utils.toArray("[data-stagger]", scope).forEach((wrap) => {
      const items = gsap.utils.toArray("[data-reveal]", wrap);
      if (items.length) {
        gsap.fromTo(items,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.08,
            scrollTrigger: { trigger: wrap, start: "top 82%", once: true },
          });
        items.forEach((el) => (el._revealed = true));
      }
    });
    // одиночные
    gsap.utils.toArray("[data-reveal]", scope).forEach((el) => {
      if (el._revealed || el.closest("[data-stagger]")) return;
      el._revealed = true;
      gsap.fromTo(el,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
    });
    // страховка: элементы в первом экране показываем сразу, затем анимация на скролле
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    // watchdog: любой блок, попавший в экран, показываем принудительно —
    // иначе при неудачном ScrollTrigger блок остаётся прозрачным навсегда
    const forceShow = () => {
      gsap.utils.toArray("[data-reveal]", scope).forEach((el) => {
        if (parseFloat(getComputedStyle(el).opacity) >= 0.05) return;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight - 20 && r.bottom > 0) {
          el._revealed = true;
          gsap.set(el, { opacity: 1, y: 0 });
        }
      });
    };
    window.addEventListener("scroll", forceShow, { passive: true });
    setTimeout(forceShow, 900);
    // Watchdog крутим ограниченно (30 с): дальше всё, что попадает в экран,
    // ловит слушатель scroll. Иначе таймер жил бы до закрытия вкладки и
    // каждые 700 мс пересчитывал getBoundingClientRect у всех блоков (батарея).
    clearInterval(window.__otpRevealWatch);
    window.__otpRevealWatch = setInterval(forceShow, 700);
    clearTimeout(window.__otpRevealWatchStop);
    window.__otpRevealWatchStop = setTimeout(() => {
      clearInterval(window.__otpRevealWatch);
      window.__otpRevealWatch = null;
    }, 30000);
  }

  /* ---------- nav ---------- */
  const nav = document.querySelector(".nav");
  if (nav) {
    const getY = () => (lenis && lenis.scroll != null ? lenis.scroll : window.scrollY);
    const onScroll = () => nav.classList.toggle("scrolled", getY() > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Chart.js тема ---------- */
  if (window.Chart) {
    const cs = getComputedStyle(document.body);
    Chart.defaults.font.family = cs.getPropertyValue("--font-display");
    Chart.defaults.color = cs.getPropertyValue("--muted");
    Chart.defaults.borderColor = "rgba(255,255,255,.06)";
    Chart.defaults.plugins.tooltip = Object.assign({}, Chart.defaults.plugins.tooltip, {
      backgroundColor: "rgba(13,18,25,.96)",
      borderColor: "#2a3543", borderWidth: 1,
      titleColor: "#e7ecf3", bodyColor: "#aeb9ca",
      titleFont: { weight: "600" },
      padding: 13, cornerRadius: 12, boxPadding: 5,
    });
    Chart.defaults.plugins.legend.labels = Object.assign({}, Chart.defaults.plugins.legend.labels, {
      usePointStyle: true, pointStyle: "circle", boxWidth: 8, boxHeight: 8,
    });
  }

  /* ---------- хелперы ---------- */
  window.otp = window.otp || {};
  const MKEYS = ["quality", "learnability", "initiative", "engagement", "discipline"];
  otp.MKEYS = MKEYS;
  otp.css = (name) => getComputedStyle(document.body).getPropertyValue(name).trim();
  otp.metric = (k) => (D && D.metrics ? D.metrics[k] : null);
  otp.metricColor = (k) => (D && D.metrics && D.metrics[k] ? D.metrics[k].color : "#22d3ee");
  otp.avgOf = (row) => {
    const vals = MKEYS.map((k) => row[k]).filter((v) => typeof v === "number");
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  otp.trend = (emp) => {
    const h = (emp.history || []).filter((row) => row.quality != null);
    if (h.length < 2) return { dir: "flat", delta: 0 };
    const a = otp.avgOf(h[0]);
    const b = otp.avgOf(h[h.length - 1]);
    const delta = +(b - a).toFixed(1);
    return { dir: delta > 0.15 ? "up" : delta < -0.15 ? "down" : "flat", delta };
  };
  otp.fmt = (n) => new Intl.NumberFormat("ru-RU").format(Math.round(n));
  otp.rub = (n) => otp.fmt(n) + " ₽";
  otp.byId = (id) => (D && D.employees ? D.employees.find((e) => e.id === id) : null);
  otp.initials = (name) => {
    const p = name.trim().split(/\s+/);
    return ((p[0] ? p[0][0] : "") + (p[1] ? p[1][0] : "")).toUpperCase();
  };
  otp.lineGradient = (chart, color) => {
    const { ctx, chartArea } = chart || {};
    if (!ctx || !chartArea) return otp.hexA(color, 0.15);
    const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, otp.hexA(color, 0.28));
    g.addColorStop(1, otp.hexA(color, 0.0));
    return g;
  };
  otp.hexA = (hex, a) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };
  otp.toast = (msg) => {
    let t = document.getElementById("otp-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "otp-toast";
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 3200);
  };
  /* ---------- часы: единое правило для дашборда и личных страниц ----------
     Решение о списании принимает только руководитель — галкой «не списывать»
     на заявке (или галочкой в форме решения). Никаких автоматических исключений
     по показателям нет.
     • Увольнительная (до 4 ч) списывается, если не стоит «не списывать».
     • Корректировка руководителя — по знаку: плюс начисляет, минус списывает.
     • Отгул за выходную смену (8 ч) — всегда 0: компенсация выходной смены не
       записывается переработкой, поэтому и отгул её не тратит.
     • Переработка — плюс. */
  otp.LEAVE_MAX = 4;
  /** «Сырые» часы заявки: из интервала времени, из hours или 8 ч за отгул. */
  otp.reqHours = (r) => {
    if (!r) return 0;
    if (r.type === "adjust") return +r.hours || 0;
    if (r.type === "dayoff") return +r.hours || 8;
    const p = (x) => { const m = /^(\d{1,2}):(\d{2})$/.exec(x || ""); return m ? +m[1] + +m[2] / 60 : null; };
    const a = p(r.from), b = p(r.to);
    return a == null || b == null ? 0 : Math.max(0, Math.round((b - a) * 10) / 10);
  };
  /** Влияние заявки на остаток часов. */
  otp.reqDelta = (r) => {
    if (!r) return 0;
    if (r.type === "overtime") return otp.reqHours(r);
    if (r.type === "leave") {
      if (r.noDeduct && !r.forceDeduct) return 0;          // решение руководителя «не списывать»
      return -Math.min(otp.reqHours(r), otp.LEAVE_MAX);
    }
    if (r.type === "adjust") return +r.hours || 0;        // знак задаёт руководитель
    return 0;                                            // dayoff и всё прочее
  };
  /** Подсказка, почему подтверждённая заявка не изменила часы. */
  otp.reqDeltaNote = (r) => {
    if (!r || r.status !== "approved" || otp.reqDelta(r) !== 0) return "";
    if (r.type === "dayoff") return "отгул за выходную смену — часы не двигает";
    if (r.type === "leave") return "увольнительная не списывается — решение руководителя";
    return "";
  };
  /** Что руководитель решил по этой заявке — словами, для журналов и отчётов. */
  otp.reqDecision = (r) => {
    if (!r) return "";
    if (r.status === "pending") return "ждёт решения";
    if (r.status !== "approved") return "";
    const d = otp.reqDelta(r);
    const h = (x) => (Math.round(Math.abs(x) * 10) / 10).toString().replace(".", ",");
    if (r.type === "dayoff") return "часы не двигает";
    if (r.type === "leave") return d < 0 ? `руководитель списал ${h(d)} ч` : "руководитель не списывал";
    if (r.type === "adjust") return d < 0 ? `руководитель списал ${h(d)} ч` : `руководитель начислил ${h(d)} ч`;
    if (r.type === "overtime") return `начислено ${h(d)} ч`;
    return "";
  };
  /* ---------- Supabase Realtime (push-события вместо опроса) ----------
     Подписка на изменения таблицы через WebSocket Supabase. Нужен публичный
     apikey и включённый Realtime на таблице (scripts/supabase_v6_realtime.sql).
     Если Realtime выключен/недоступен, вызов просто ничего не делает —
     страницы продолжают работать на обычном опросе (fallback).
     onChange(data) вызывается на INSERT/UPDATE/DELETE; сам решает, что делать. */
  function realtime(table, onChange, cfg) {
    try {
      if (typeof WebSocket === "undefined") return;
      const c = cfg || (window.OTP_DATA && window.OTP_DATA.hrRules && window.OTP_DATA.hrRules.cloud);
      if (!c || !c.url || !c.key) return;
      let ws = null, ref = 0, hb = 0, closed = false, retry = 0;
      const url = c.url.replace(/^http/, "ws").replace(/\/$/, "") +
        "/realtime/v1/websocket?apikey=" + encodeURIComponent(c.key) + "&vsn=1.0.0";
      const send = (obj) => { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch (e) {} };
      const connect = () => {
        try { ws = new WebSocket(url); } catch (e) { return; }
        ws.onopen = () => {
          retry = 0;
          send({
            topic: "realtime:" + table, event: "phx_join",
            payload: { config: { broadcast: { self: false }, presence: { key: "" },
              postgres_changes: [{ event: "*", schema: "public", table: table }] } },
            ref: String(++ref),
          });
          clearInterval(hb);
          hb = setInterval(() => send({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(++ref) }), 25000);
        };
        ws.onmessage = (ev) => {
          try {
            const m = JSON.parse(ev.data);
            if (m && m.event === "postgres_changes") onChange(m.payload && m.payload.data);
          } catch (e) {}
        };
        ws.onclose = () => {
          clearInterval(hb);
          if (closed) return;
          retry = Math.min(retry + 1, 6);
          setTimeout(connect, 3000 * retry);   // 3…18 с, потом ровно 18 с
        };
      };
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && ws && ws.readyState !== 1) { try { ws.close(); } catch (e) {} connect(); }
      });
      window.addEventListener("beforeunload", () => { closed = true; try { ws && ws.close(); } catch (e) {} });
      connect();
    } catch (e) {}
  }
  otp.realtime = realtime;
  otp.reveal = reveal;

  /* первичное раскрытие статики */
  reveal(document);

  /* ---------- свежесть страницы ----------
     Браузер может показать закэшированную копию и человек думает, что «ничего
     не изменилось». Сверяем версию сборки с version.txt на сайте и, если она
     другая, один раз перезагружаемся с обходом кэша. */
  function checkFresh() {
    var boot = window.OTP_BOOT || {};
    var mine = boot.v || "";
    var root = boot.prefix || "";
    if (!mine) return;
    var key = "otp_reloaded_" + mine;
    try { if (sessionStorage.getItem(key)) return; } catch (e) {}
    fetch(root + "version.txt?cb=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : ""; })
      .then(function (t) {
        var actual = String(t || "").trim().slice(0, 12);
        if (!actual || actual === mine) return;
        try { sessionStorage.setItem(key, "1"); } catch (e) {}
        var url = location.pathname + location.search.replace(/([?&])cb=[^&]*/g, "$1") + (location.search ? "&" : "?") + "cb=" + Date.now();
        location.replace(url);
      })
      .catch(function () {});
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkFresh);
  } else {
    checkFresh();
  }
})();
