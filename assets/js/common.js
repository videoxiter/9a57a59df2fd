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
    const h = emp.history || [];
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
  otp.reveal = reveal;

  /* первичное раскрытие статики */
  reveal(document);
})();
