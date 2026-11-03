/* Темы и фоновые анимации. Настройки — персональные, в localStorage браузера.
 *
 * Темы: classic | light | dark | matrix | minecraft | mk | skyrim | anime | cs16
 * Анимации: robots | matrix | minecraft | mk | skyrim | anime | cs16 | aurora | particles | synthwave
 */
window.OTP_THEME = (function () {
  "use strict";
  const KEY = "otp_theme_v1";
  const DEFAULTS = { theme: "classic", animOn: true, animType: "aurora" };

  const THEMES = [
    { id: "classic",   label: "Классическая", hint: "как сейчас" },
    { id: "light",     label: "Светлая",      hint: "светлый фон" },
    { id: "dark",      label: "Тёмная",       hint: "глубокий тёмный фон" },
    { id: "matrix",    label: "Матрица",      hint: "зелёный цифровой дождь" },
    { id: "minecraft", label: "Minecraft",    hint: "кубики и травяные блоки" },
    { id: "mk",        label: "Mortal Kombat",hint: "огонь и кровь арены" },
    { id: "skyrim",    label: "TES Skyrim",   hint: "снег и северные руны" },
    { id: "anime",     label: "Аниме",        hint: "сакура и пастель" },
    { id: "cs16",      label: "CS 1.6",       hint: "dust и прицел" },
  ];
  const ANIMS = [
    { id: "robots",    label: "Роботы",        hint: "летающие дроиды и искры" },
    { id: "matrix",    label: "Матрица",       hint: "падающие символы" },
    { id: "minecraft", label: "Minecraft",     hint: "падающие кубики" },
    { id: "mk",        label: "Mortal Kombat", hint: "искры и файрболы" },
    { id: "skyrim",    label: "TES Skyrim",    hint: "снег и туман" },
    { id: "anime",     label: "Аниме",         hint: "лепестки сакуры" },
    { id: "cs16",      label: "CS 1.6",        hint: "трассеры и пыль" },
    { id: "aurora",    label: "Северное сияние", hint: "волны света" },
    { id: "particles", label: "Созвездия",     hint: "точки и линии" },
    { id: "synthwave", label: "Synthwave",     hint: "сетка и закат" },
  ];

  const get = () => {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch (e) { return Object.assign({}, DEFAULTS); }
  };
  const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };

  let state = null;
  let canvas = null, ctx = null, raf = 0, t0 = 0;
  let items = [], w = 0, h = 0, lastType = "";

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.id = "otp-bg-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
  }
  function resize() {
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed(lastType);
  }

  /* ---------- генераторы частиц ---------- */
  const rnd = (a, b) => a + Math.random() * (b - a);

  function seed(type) {
    lastType = type; items = [];
    if (!type) return;
    const n = type === "particles" ? 70 : type === "matrix" ? 140 : 55;
    for (let i = 0; i < n; i++) {
      if (type === "robots") items.push({ x: rnd(0, w), y: rnd(0, h), s: rnd(10, 26), vx: rnd(-.25, .25), vy: rnd(-.5, -.12), ph: rnd(0, 6.28) });
      else if (type === "matrix") items.push({ x: Math.random() * w, y: Math.random() * h, s: rnd(10, 18), v: rnd(1.2, 4.2), ch: Math.random() * 40 });
      else if (type === "minecraft") items.push({ x: rnd(0, w), y: rnd(-h, h), s: rnd(14, 34), v: rnd(.4, 1.4), rot: rnd(0, 6.28), vr: rnd(-.01, .01) });
      else if (type === "mk") items.push({ x: rnd(0, w), y: rnd(0, h), s: rnd(1.2, 3.6), vx: rnd(-.7, .7), vy: rnd(-1.4, -.3), life: rnd(.4, 1) });
      else if (type === "skyrim") items.push({ x: rnd(0, w), y: rnd(-h, h), r: rnd(1, 3.2), vx: rnd(-.4, .4), vy: rnd(.3, 1.1), ph: rnd(0, 6.28) });
      else if (type === "anime") items.push({ x: rnd(0, w), y: rnd(-h, h), s: rnd(4, 9), vx: rnd(.15, .8), vy: rnd(.25, .9), rot: rnd(0, 6.28), vr: rnd(-.02, .02), hue: rnd(320, 350) });
      else if (type === "cs16") items.push({ x: rnd(0, w), y: rnd(0, h), len: rnd(30, 110), a: rnd(-.25, .25), v: rnd(6, 16), ph: rnd(0, 6.28) });
      else if (type === "aurora") items.push({ x: rnd(0, w), y: rnd(0, h * .55), amp: rnd(20, 90), sp: rnd(.0004, .0013), ph: rnd(0, 6.28), hue: rnd(140, 205) });
      else if (type === "particles") items.push({ x: rnd(0, w), y: rnd(0, h), vx: rnd(-.22, .22), vy: rnd(-.22, .22) });
      else if (type === "synthwave") items.push({ x: rnd(0, w), y: rnd(0, h), s: rnd(1, 2.4), v: rnd(.3, 1.2) });
    }
  }

  /* ---------- отрисовка ---------- */
  function glow(color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }

  function drawRobots(dt) {
    for (const o of items) {
      o.x += o.vx; o.y += o.vy; o.ph += dt * .002;
      if (o.y < -40) { o.y = h + 30; o.x = rnd(0, w); }
      const s = o.s, bob = Math.sin(o.ph) * 3;
      ctx.save(); ctx.translate(o.x, o.y + bob);
      glow("#67e8f9", 12);
      // корпус
      ctx.fillStyle = "rgba(103,232,249,.16)"; ctx.strokeStyle = "rgba(103,232,249,.55)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.roundRect(-s * .5, -s * .38, s, s * .76, s * .16); ctx.fill(); ctx.stroke();
      // глаза
      ctx.shadowBlur = 14; ctx.fillStyle = "#a5f3fc";
      ctx.beginPath(); ctx.arc(-s * .18, -s * .08, s * .09, 0, 6.28); ctx.arc(s * .18, -s * .08, s * .09, 0, 6.28); ctx.fill();
      // антенна
      ctx.strokeStyle = "rgba(103,232,249,.7)"; ctx.beginPath();
      ctx.moveTo(0, -s * .38); ctx.lineTo(0, -s * .62); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -s * .66, s * .06, 0, 6.28); ctx.fillStyle = "#22d3ee"; ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  function drawMatrix(dt) {
    ctx.font = "14px 'JetBrains Mono', monospace";
    for (const o of items) {
      o.y += o.v; o.ch += .35;
      if (o.y > h + 20) { o.y = -20; o.x = Math.random() * w; }
      const ch = String.fromCharCode(0x30A0 + Math.floor((o.ch + o.x) % 96));
      ctx.fillStyle = `rgba(34,197,94,${.25 + (o.y / h) * .55})`;
      ctx.fillText(ch, o.x, o.y);
    }
  }

  function drawMinecraft(dt) {
    for (const o of items) {
      o.y += o.v; o.rot += o.vr;
      if (o.y > h + 40) { o.y = -40; o.x = rnd(0, w); }
      const s = o.s;
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
      ctx.fillStyle = "rgba(74,222,128,.10)"; ctx.strokeStyle = "rgba(74,222,128,.45)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(-s / 2, -s / 2, s, s); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(74,222,128,.22)";
      ctx.beginPath(); ctx.moveTo(-s / 2, 0); ctx.lineTo(s / 2, 0);
      ctx.moveTo(0, -s / 2); ctx.lineTo(0, s / 2); ctx.stroke();
      ctx.restore();
    }
  }

  function drawMk(dt) {
    for (const o of items) {
      o.x += o.vx; o.y += o.vy; o.vy += .006; o.life -= .004;
      if (o.life <= 0 || o.y > h) { o.x = rnd(0, w); o.y = h + 10; o.vy = rnd(-2.2, -.8); o.life = rnd(.5, 1); }
      const a = Math.max(0, o.life) * .8;
      glow("#f97316", 14);
      ctx.fillStyle = `rgba(249,115,22,${a})`;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.s, 0, 6.28); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawSkyrim(dt) {
    for (const o of items) {
      o.x += o.vx + Math.sin((o.y + o.ph) * .01) * .4; o.y += o.vy;
      if (o.y > h + 5) { o.y = -5; o.x = rnd(0, w); }
      ctx.fillStyle = `rgba(226,232,240,${.25 + o.r * .12})`;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.28); ctx.fill();
    }
  }

  function drawAnime(dt) {
    for (const o of items) {
      o.x += o.vx; o.y += o.vy; o.rot += o.vr;
      if (o.y > h + 12) { o.y = -12; o.x = rnd(0, w); }
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
      ctx.fillStyle = `hsla(${o.hue}, 90%, 78%, .45)`;
      ctx.beginPath(); ctx.ellipse(0, 0, o.s, o.s * .55, 0, 0, 6.28); ctx.fill();
      ctx.restore();
    }
  }

  function drawCs16(dt) {
    for (const o of items) {
      o.x += Math.cos(o.a) * o.v; o.y += Math.sin(o.a) * o.v;
      if (o.x < -120 || o.x > w + 120 || o.y < -120 || o.y > h + 120) {
        o.x = rnd(-40, w + 40); o.y = rnd(0, h); o.a = rnd(-.25, .25);
      }
      ctx.strokeStyle = "rgba(250,204,21,.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x - Math.cos(o.a) * o.len, o.y - Math.sin(o.a) * o.len); ctx.stroke();
    }
  }

  function drawAurora(dt, t) {
    for (const o of items) {
      const x = (o.x + t * 0.02 * o.sp * 1000) % (w + 200) - 100;
      const y = o.y + Math.sin(t * o.sp + o.ph) * o.amp;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 220);
      g.addColorStop(0, `hsla(${o.hue}, 90%, 65%, .16)`);
      g.addColorStop(1, "hsla(200, 90%, 60%, 0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, 260, 120, 0, 0, 6.28); ctx.fill();
    }
  }

  function drawParticles(dt) {
    for (const o of items) {
      o.x += o.vx; o.y += o.vy;
      if (o.x < 0 || o.x > w) o.vx *= -1;
      if (o.y < 0 || o.y > h) o.vy *= -1;
    }
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) {
          ctx.strokeStyle = `rgba(148,163,184,${(1 - d / 120) * .18})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const o of items) {
      ctx.fillStyle = "rgba(226,232,240,.5)";
      ctx.beginPath(); ctx.arc(o.x, o.y, 1.6, 0, 6.28); ctx.fill();
    }
  }

  function drawSynthwave(dt, t) {
    const horizon = h * .62;
    // солнце
    const g = ctx.createLinearGradient(0, horizon - 220, 0, horizon);
    g.addColorStop(0, "rgba(244,114,182,.35)");
    g.addColorStop(1, "rgba(251,146,60,.05)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(w * .5, horizon - 40, 180, 0, 6.28); ctx.fill();
    // сетка
    ctx.strokeStyle = "rgba(168,85,247,.20)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 24; i++) {
      const x = w * .5 + (i - 12) * (w / 12);
      ctx.beginPath(); ctx.moveTo(w * .5 + (i - 12) * 6, horizon); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let j = 0; j < 14; j++) {
      const p = ((t * .00006 + j / 14) % 1);
      const y = horizon + Math.pow(p, 2.2) * (h - horizon);
      ctx.strokeStyle = `rgba(168,85,247,${.05 + p * .22})`;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (const o of items) { o.y += o.v; if (o.y > h) o.y = horizon; ctx.fillStyle = "rgba(244,114,182,.35)"; ctx.fillRect(o.x, o.y, o.s, o.s); }
  }

  function frame(ts) {
    if (!ctx) return;
    if (!t0) t0 = ts;
    const dt = Math.min(48, ts - (frame.last || ts)); frame.last = ts;
    ctx.clearRect(0, 0, w, h);
    switch (lastType) {
      case "robots": drawRobots(dt); break;
      case "matrix": drawMatrix(dt); break;
      case "minecraft": drawMinecraft(dt); break;
      case "mk": drawMk(dt); break;
      case "skyrim": drawSkyrim(dt); break;
      case "anime": drawAnime(dt); break;
      case "cs16": drawCs16(dt); break;
      case "aurora": drawAurora(dt, ts); break;
      case "particles": drawParticles(dt); break;
      case "synthwave": drawSynthwave(dt, ts); break;
    }
    raf = requestAnimationFrame(frame);
  }

  function startAnim(type) {
    ensureCanvas();
    lastType = type;
    seed(type);
    cancelAnimationFrame(raf);
    frame.last = 0;
    raf = requestAnimationFrame(frame);
    document.documentElement.dataset.anim = type;
    document.documentElement.classList.add("otp-anim-on");
  }
  function stopAnim() {
    cancelAnimationFrame(raf); raf = 0;
    document.documentElement.classList.remove("otp-anim-on");
    document.documentElement.removeAttribute("data-anim");
    if (canvas) { ctx && ctx.clearRect(0, 0, w, h); canvas.remove(); canvas = null; ctx = null; }
  }

  /* ---------- публичное API ---------- */
  function apply(next) {
    state = Object.assign({}, state || get(), next || {});
    save(state);
    document.documentElement.dataset.theme = state.theme || "classic";
    document.body.dataset.theme = state.theme || "classic";
    if (state.animOn) startAnim(state.animType || "aurora");
    else stopAnim();
    window.dispatchEvent(new CustomEvent("otp-theme", { detail: state }));
    return state;
  }
  function init() {
    state = get();
    apply(state);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { get: () => Object.assign({}, state || get()), apply, themes: THEMES, anims: ANIMS,
           setTheme: (id) => apply({ theme: id }), setAnim: (on, type) => apply({ animOn: on, animType: type }) };
})();
