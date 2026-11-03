/* Темы + постоянные фоновые анимации + эмблемы тем (v2).
 *
 * Каждая тема = свой фон, акцент, эмблема и СВОЯ анимация (включается/выключается галкой).
 * Настройки персональные: localStorage `otp_theme_v1` → { theme, animOn }.
 */
window.OTP_THEME = (function () {
  "use strict";
  const KEY = "otp_theme_v1";
  const IMG = (name) => {
    const s = document.querySelector('script[src*="assets/js/themes.js"]') || document.querySelector('script[src*="assets/js/theme.js"]');
    const base = s ? s.src.replace(/assets\/js\/themes?\.js.*$/, "") : "/";
    return base + "assets/img/themes/" + name;
  };

  const THEMES = [
    { id: "classic",   label: "Классическая",  hint: "как сейчас",              anim: null,     accent: "#fbbf24" },
    { id: "light",     label: "Светлая",       hint: "белый фон, тёмный текст", anim: null,     accent: "#b45309" },
    { id: "dark",      label: "Тёмная",        hint: "глубокий космос",         anim: "stars",  accent: "#a5b4fc" },
    { id: "robots",    label: "Роботы",        hint: "дроиды и искры",          anim: "robots", accent: "#67e8f9", figures: ["fig-robots-1.png", "fig-robots-2.png", "fig-robots-3.png", "fig4-robots-1.svg", "fig4-robots-2.svg", "fig4-robots-3.svg", "fig4-robots-4.svg", "fig4-robots-5.svg", "fig4-robots-6.svg", "fig4-robots-7.svg", "fig4-robots-8.svg", "fig4-robots-9.svg"] },
    { id: "matrix",    label: "Матрица",       hint: "видео-заставка",          anim: null, video: "matrix.mp4", accent: "#22c55e", figures: ["fig-matrix-1.gif", "fig4-matrix-1.svg", "fig4-matrix-2.svg", "fig4-matrix-3.svg", "fig4-matrix-4.svg", "fig4-matrix-5.svg", "fig4-matrix-6.svg", "fig4-matrix-7.svg", "fig4-matrix-8.svg", "fig4-matrix-9.svg"] },
    { id: "minecraft", label: "Minecraft",     hint: "блоки и крипер",          anim: "blocks", accent: "#4ade80", figures: ["fig4-minecraft-1.svg", "fig4-minecraft-2.svg", "fig4-minecraft-3.svg", "fig4-minecraft-4.svg", "fig4-minecraft-5.svg", "fig4-minecraft-6.svg", "fig4-minecraft-7.svg", "fig4-minecraft-8.svg", "fig4-minecraft-9.svg"] },
    { id: "mk",        label: "Mortal Kombat", hint: "арена и дракон",          anim: "fire",   accent: "#f97316", figures: ["mk-dragon.png", "fig4-mk-1.svg", "fig4-mk-2.svg", "fig4-mk-3.svg", "fig4-mk-4.svg", "fig4-mk-5.svg", "fig4-mk-6.svg", "fig4-mk-7.svg", "fig4-mk-8.svg", "fig4-mk-9.svg"] },
    { id: "skyrim",    label: "TES Skyrim",    hint: "снег и руны",             anim: "snow",   accent: "#93c5fd", figures: ["fig4-skyrim-1.svg", "fig4-skyrim-2.svg", "fig4-skyrim-3.svg", "fig4-skyrim-4.svg", "fig4-skyrim-5.svg", "fig4-skyrim-6.svg", "fig4-skyrim-7.svg", "fig4-skyrim-8.svg", "fig4-skyrim-9.svg"] },
    { id: "anime",     label: "Аниме",         hint: "сакура и чиби",           anim: "petals", accent: "#f9a8d4", figures: ["fig-anime-1.png", "fig-anime-2.svg", "fig-anime-3.svg", "fig4-anime-1.svg", "fig4-anime-2.svg", "fig4-anime-3.svg", "fig4-anime-4.svg", "fig4-anime-5.svg", "fig4-anime-6.svg", "fig4-anime-7.svg", "fig4-anime-8.svg", "fig4-anime-9.svg"] },
    { id: "cs16",      label: "CS 1.6",        hint: "dust и прицел",           anim: "tracer", accent: "#facc15", figures: ["fig4-cs16-1.svg", "fig4-cs16-2.svg", "fig4-cs16-3.svg", "fig4-cs16-4.svg", "fig4-cs16-5.svg", "fig4-cs16-6.svg", "fig4-cs16-7.svg", "fig4-cs16-8.svg", "fig4-cs16-9.svg"] },
    { id: "synthwave", label: "Synthwave",     hint: "сетка и закат",           anim: "grid",   accent: "#f472b6", figures: ["fig4-synthwave-1.svg", "fig4-synthwave-2.svg", "fig4-synthwave-3.svg", "fig4-synthwave-4.svg", "fig4-synthwave-5.svg", "fig4-synthwave-6.svg", "fig4-synthwave-7.svg", "fig4-synthwave-8.svg", "fig4-synthwave-9.svg"] },
    { id: "cyberpunk", label: "Cyberpunk",     hint: "неон и дождь",            anim: "neon",   accent: "#22d3ee", figures: ["fig4-cyberpunk-1.svg", "fig4-cyberpunk-2.svg", "fig4-cyberpunk-3.svg", "fig4-cyberpunk-4.svg", "fig4-cyberpunk-5.svg", "fig4-cyberpunk-6.svg", "fig4-cyberpunk-7.svg", "fig4-cyberpunk-8.svg", "fig4-cyberpunk-9.svg"] },
    { id: "space",     label: "Космос",        hint: "звёзды и туманности",     anim: "stars",  accent: "#c4b5fd", figures: ["fig4-space-1.svg", "fig4-space-2.svg", "fig4-space-3.svg", "fig4-space-4.svg", "fig4-space-5.svg", "fig4-space-6.svg", "fig4-space-7.svg", "fig4-space-8.svg", "fig4-space-9.svg"] },
    { id: "winter",    label: "Зима",          hint: "снегопад",                anim: "snow",   accent: "#bae6fd", figures: ["fig4-winter-1.svg", "fig4-winter-2.svg", "fig4-winter-3.svg", "fig4-winter-4.svg", "fig4-winter-5.svg", "fig4-winter-6.svg", "fig4-winter-7.svg", "fig4-winter-8.svg", "fig4-winter-9.svg"] },
    { id: "ocean",     label: "Океан",         hint: "волны и блики",           anim: "waves",  accent: "#38bdf8", figures: ["fig4-ocean-1.svg", "fig4-ocean-2.svg", "fig4-ocean-3.svg", "fig4-ocean-4.svg", "fig4-ocean-5.svg", "fig4-ocean-6.svg", "fig4-ocean-7.svg", "fig4-ocean-8.svg", "fig4-ocean-9.svg"] },
  ];

  const get = () => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      return { theme: s.theme || "classic", animOn: s.animOn !== false };
    } catch (e) { return { theme: "classic", animOn: true }; }
  };
  const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
  const themeOf = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

  let state = get();
  let canvas = null, ctx = null, raf = 0, w = 0, h = 0, parts = [], type = null, lastTs = 0;

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
    seed();
  }

  const rnd = (a, b) => a + Math.random() * (b - a);

  function seed() {
    parts = [];
    if (!type) return;
    const n = type === "matrix" ? Math.ceil(w / 8) : type === "stars" ? 190 : type === "snow" ? 150 : 70;
    for (let i = 0; i < n; i++) {
      const c = { x: rnd(0, w), y: rnd(0, h) };
      if (type === "matrix") parts.push({ x: Math.floor(rnd(0, w / 8)) * 8, y: rnd(-h, h), v: rnd(2.2, 9), ch: Math.random() * 70 });
      else if (type === "blocks") parts.push({ ...c, s: rnd(12, 30), v: rnd(.5, 1.8), rot: rnd(0, 6.28), vr: rnd(-.012, .012) });
      else if (type === "fire") parts.push({ ...c, r: rnd(.8, 2.6), vx: rnd(-.5, .5), vy: rnd(-2.4, -.6), life: rnd(.3, 1) });
      else if (type === "snow") parts.push({ ...c, y: rnd(-h, h), r: rnd(1, 3.4), vx: rnd(-.5, .5), vy: rnd(.5, 1.8), ph: rnd(0, 6.28) });
      else if (type === "petals") parts.push({ ...c, y: rnd(-h, h), s: rnd(4, 9), vx: rnd(.2, 1), vy: rnd(.4, 1.2), rot: rnd(0, 6.28), vr: rnd(-.03, .03), hue: rnd(320, 350) });
      else if (type === "tracer") parts.push({ ...c, len: rnd(40, 140), a: rnd(-.22, .22), v: rnd(7, 18) });
      else if (type === "stars") parts.push({ ...c, r: rnd(.6, 1.9), tw: rnd(0, 6.28), vx: rnd(-.06, .06), vy: rnd(-.06, .06) });
      else if (type === "neon") parts.push({ x: rnd(0, w), y: rnd(-h, h), len: rnd(20, 90), v: rnd(4, 12) });
      else if (type === "waves") parts.push({ x: rnd(0, w), y: rnd(h * .35, h), amp: rnd(10, 40), sp: rnd(.0006, .0018), ph: rnd(0, 6.28) });
      else if (type === "robots") parts.push({ ...c, s: rnd(12, 28), vx: rnd(-.3, .3), vy: rnd(-.6, -.15), ph: rnd(0, 6.28) });
      else if (type === "grid") parts.push({ ...c, s: rnd(1, 2.6), v: rnd(.4, 1.4) });
    }
  }

  function drawRobots(dt) {
    for (const o of parts) {
      o.x += o.vx; o.y += o.vy; o.ph += .0018 * dt;
      if (o.y < -50) { o.y = h + 40; o.x = rnd(0, w); }
      const s = o.s, bob = Math.sin(o.ph) * 3;
      ctx.save(); ctx.translate(o.x, o.y + bob);
      ctx.shadowColor = "#67e8f9"; ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(103,232,249,.14)"; ctx.strokeStyle = "rgba(103,232,249,.5)"; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.roundRect(-s * .5, -s * .38, s, s * .76, s * .18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#a5f3fc";
      ctx.beginPath(); ctx.arc(-s * .17, -s * .08, s * .085, 0, 6.28); ctx.arc(s * .17, -s * .08, s * .085, 0, 6.28); ctx.fill();
      ctx.strokeStyle = "rgba(103,232,249,.6)"; ctx.beginPath(); ctx.moveTo(0, -s * .38); ctx.lineTo(0, -s * .6); ctx.stroke();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  function drawMatrix(dt) {
    // шлейф: не стираем кадр полностью, а заливаем полупрозрачной «тьмой» — символы тянутся вниз
    ctx.fillStyle = type === "matrix" ? "rgba(1,7,4,.14)" : "rgba(0,0,0,0)";
    if (type === "matrix") ctx.fillRect(0, 0, w, h);
    ctx.font = "17px 'JetBrains Mono', monospace";
    for (const o of parts) {
      o.y += o.v * (dt / 16);
      if (o.y > h + 26) { o.y = -26; o.x = Math.floor(rnd(0, w / 8)) * 8; o.v = rnd(2.2, 9); }
      const a = Math.min(.95, .22 + (o.y / h) * .85);
      ctx.fillStyle = `rgba(52,211,153,${a})`;
      ctx.fillText(String.fromCharCode(0x30A0 + Math.floor((o.ch + o.y * .12) % 96)), o.x, o.y);
      // яркая «голова» потока
      ctx.fillStyle = `rgba(220,255,235,${Math.min(.9, a)})`;
      ctx.fillText(String.fromCharCode(0x30A0 + Math.floor((o.ch + o.y * .12 + 3) % 96)), o.x, o.y + 17);
    }
  }

  function drawBlocks(dt) {
    for (const o of parts) {
      o.y += o.v * (dt / 16); o.rot += o.vr;
      if (o.y > h + 44) { o.y = -44; o.x = rnd(0, w); }
      const s = o.s;
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
      ctx.fillStyle = "rgba(74,222,128,.10)"; ctx.strokeStyle = "rgba(74,222,128,.42)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(-s / 2, -s / 2, s, s); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(74,222,128,.2)";
      ctx.beginPath(); ctx.moveTo(-s / 2, 0); ctx.lineTo(s / 2, 0); ctx.moveTo(0, -s / 2); ctx.lineTo(0, s / 2); ctx.stroke();
      ctx.restore();
    }
  }

  function drawFire(dt) {
    for (const o of parts) {
      o.x += o.vx; o.y += o.vy; o.life -= .0035 * (dt / 16);
      if (o.life <= 0 || o.y < -20) { o.x = rnd(0, w); o.y = h + 10; o.vy = rnd(-2.6, -.9); o.life = rnd(.5, 1); o.vx = rnd(-.5, .5); }
      const a = Math.max(0, o.life) * .7;
      ctx.shadowColor = "#f97316"; ctx.shadowBlur = 12;
      ctx.fillStyle = `rgba(249,${115 + Math.random() * 40},22,${a})`;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.28); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawSnow(dt) {
    for (const o of parts) {
      o.x += o.vx + Math.sin((o.y + o.ph) * .01) * .5; o.y += o.vy * (dt / 16);
      if (o.y > h + 6) { o.y = -6; o.x = rnd(0, w); }
      ctx.fillStyle = `rgba(226,232,240,${.2 + o.r * .14})`;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.28); ctx.fill();
    }
  }

  function drawPetals(dt) {
    for (const o of parts) {
      o.x += o.vx; o.y += o.vy; o.rot += o.vr;
      if (o.y > h + 14) { o.y = -14; o.x = rnd(0, w); }
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
      ctx.fillStyle = `hsla(${o.hue}, 92%, 80%, .5)`;
      ctx.beginPath(); ctx.ellipse(0, 0, o.s, o.s * .55, 0, 0, 6.28); ctx.fill();
      ctx.restore();
    }
  }

  function drawTracer(dt) {
    for (const o of parts) {
      o.x += Math.cos(o.a) * o.v; o.y += Math.sin(o.a) * o.v;
      if (o.x < -160 || o.x > w + 160 || o.y < -160 || o.y > h + 160) { o.x = rnd(-60, w + 60); o.y = rnd(0, h); o.a = rnd(-.22, .22); }
      ctx.strokeStyle = "rgba(250,204,21,.28)"; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x - Math.cos(o.a) * o.len, o.y - Math.sin(o.a) * o.len); ctx.stroke();
    }
  }

  function drawStars(dt, t) {
    for (const o of parts) {
      o.x += o.vx; o.y += o.vy;
      if (o.x < 0 || o.x > w) o.vx *= -1;
      if (o.y < 0 || o.y > h) o.vy *= -1;
      const tw = .3 + .3 * Math.sin(t * .001 + o.tw);
      ctx.fillStyle = `rgba(226,232,240,${tw})`;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.28); ctx.fill();
    }
  }

  function drawNeon(dt) {
    for (const o of parts) {
      o.y += o.v * (dt / 16);
      if (o.y > h + 40) { o.y = -40; o.x = rnd(0, w); }
      const g = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.len);
      g.addColorStop(0, "rgba(34,211,238,0)"); g.addColorStop(.5, "rgba(34,211,238,.5)"); g.addColorStop(1, "rgba(232,121,249,0)");
      ctx.strokeStyle = g; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x, o.y + o.len); ctx.stroke();
    }
  }

  function drawWaves(dt, t) {
    for (const o of parts) {
      const y = o.y + Math.sin(t * o.sp + o.ph) * o.amp;
      const g = ctx.createLinearGradient(0, y - 40, 0, y + 40);
      g.addColorStop(0, "rgba(56,189,248,0)"); g.addColorStop(.5, "rgba(56,189,248,.045)"); g.addColorStop(1, "rgba(14,116,144,0)");
      ctx.fillStyle = g; ctx.fillRect(0, y - 40, w, 80);
    }
  }

  function drawGrid(dt, t) {
    const horizon = h * .62;
    for (let j = 0; j < 16; j++) {
      const p = ((t * .00005 + j / 16) % 1);
      const y = horizon + Math.pow(p, 2.2) * (h - horizon);
      ctx.strokeStyle = `rgba(244,114,182,${.03 + p * .16})`;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let i = 0; i <= 26; i++) {
      ctx.strokeStyle = "rgba(168,85,247,.12)";
      ctx.beginPath(); ctx.moveTo(w * .5 + (i - 13) * 8, horizon); ctx.lineTo(w * .5 + (i - 13) * (w / 10), h); ctx.stroke();
    }
  }

  function frame(ts) {
    if (!ctx) return;
    const dt = Math.min(48, ts - (lastTs || ts)); lastTs = ts;
    if (type !== "matrix") ctx.clearRect(0, 0, w, h);
    switch (type) {
      case "robots": drawRobots(dt); break;
      case "matrix": drawMatrix(dt); break;
      case "blocks": drawBlocks(dt); break;
      case "fire": drawFire(dt); break;
      case "snow": drawSnow(dt); break;
      case "petals": drawPetals(dt); break;
      case "tracer": drawTracer(dt); break;
      case "stars": drawStars(dt, ts); break;
      case "neon": drawNeon(dt); break;
      case "waves": drawWaves(dt, ts); break;
      case "grid": drawGrid(dt, ts); break;
    }
    raf = requestAnimationFrame(frame);
  }

  function startAnim(t) {
    type = t; ensureCanvas(); seed();
    cancelAnimationFrame(raf); lastTs = 0;
    raf = requestAnimationFrame(frame);
    document.documentElement.classList.add("otp-anim-on");
    document.documentElement.dataset.anim = t;
  }
  function stopAnim() {
    cancelAnimationFrame(raf); raf = 0;
    document.documentElement.classList.remove("otp-anim-on");
    document.documentElement.removeAttribute("data-anim");
    if (canvas) { canvas.remove(); canvas = null; ctx = null; }
  }

  /* видео-фон для темы (лежит в assets/video/) */
  function setVideo(name) {
    let v = document.getElementById("otp-bg-video");
    if (name) {
      if (!v) {
        v = document.createElement("video");
        v.id = "otp-bg-video";
        v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
        v.setAttribute("aria-hidden", "true");
        document.body.appendChild(v);
      }
      const src = IMG(name).replace("assets/img/themes/", "assets/video/");
      if (v.dataset.src !== src) { v.src = src; v.dataset.src = src; }
      v.play().catch(() => {});
      document.documentElement.classList.add("otp-video-on");
    } else if (v) {
      v.pause(); v.remove();
      document.documentElement.classList.remove("otp-video-on");
    }
  }

  /* Фигура темы на фоне: на каждой странице — своя (выбор по адресу страницы) */
  const SECTIONS = ["", "bonus", "income", "lvl", "awards", "growth", "stats", "rules", "settings", "graph"];
  function figureFor(th) {
    const list = th.figures || [];
    if (!list.length) return null;
    const m = location.pathname.match(/\/team\/[0-9a-f]+\/([a-z]*)\/?$/i);
    let sec = m ? m[1].toLowerCase() : "";
    let idx = SECTIONS.indexOf(sec);
    if (idx < 0) {
      let h = 0;
      for (let i = 0; i < location.pathname.length; i++) h = (h * 31 + location.pathname.charCodeAt(i)) % 1000;
      idx = h;
    }
    return list[idx % list.length];
  }
  function setEmblem(th) {
    let el = document.getElementById("otp-theme-figure");
    const file = figureFor(th);
    if (!file) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("img");
      el.id = "otp-theme-figure";
      el.setAttribute("aria-hidden", "true");
      el.alt = "";
      document.body.appendChild(el);
    }
    const src = IMG(file);
    if (el.dataset.src !== src) { el.src = src; el.dataset.src = src; }
    el.dataset.theme = th.id;
  }

  function apply(next) {
    state = Object.assign({}, state, next || {});
    save(state);
    const th = themeOf(state.theme);
    document.documentElement.dataset.theme = th.id;
    document.body.dataset.theme = th.id;
    document.documentElement.style.setProperty("--th-accent", th.accent || "#fbbf24");
    setEmblem(th);
    if (state.animOn && th.video) { setVideo(th.video); stopAnim(); }
    else {
      setVideo(null);
      if (state.animOn && th.anim) startAnim(th.anim);
      else stopAnim();
    }
    window.dispatchEvent(new CustomEvent("otp-theme", { detail: state }));
    return state;
  }

  const init = () => { state = get(); apply(state); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return {
    get: () => Object.assign({}, state),
    apply,
    themes: THEMES,
    themeOf,
    setTheme: (id) => apply({ theme: id }),
    setAnim: (on) => apply({ animOn: !!on }),
    img: IMG,
  };
})();
