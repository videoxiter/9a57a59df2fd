/* Запись демонстрационных клипов: курсор, подсветка, зум на нужный элемент.
   Клип = шаги: move, click, scroll, zoom, unzoom, type, wait, open. */
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "video", "demo");
const FF = "C:/Users/Xiter/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe";
const SITE = path.join(ROOT, "team", "e5d35a6fc921");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MOCK = `window.OTP_AUTH = {
  session: async () => ({ ok: true, slug: "demo", admin: false }),
  staffList: async () => [], token: () => "mock", has: () => true, logout: function(){},
  login: async () => ({ ok: true }), selfUpdate: async () => ({ ok: true }),
  api: async () => [], contentList: async () => [],
};`;

const CURSOR = `
  if (!document.getElementById("demo-cursor")) {
    const c = document.createElement("div");
    c.id = "demo-cursor";
    c.innerHTML = '<svg width="44" height="44" viewBox="0 0 24 24"><path d="M3 2l16 8-7 2-3 7z" fill="#fff" stroke="#0b5f6b" stroke-width="1.3"/></svg>';
    c.style.cssText = "position:fixed;z-index:99999;pointer-events:none;left:0;top:0;transition:left .65s cubic-bezier(.2,.8,.2,1), top .65s cubic-bezier(.2,.8,.2,1);filter:drop-shadow(0 6px 18px rgba(0,0,0,.65))";
    document.body.appendChild(c);
  }
  if (!document.getElementById("demo-hl-style")) {
    const st = document.createElement("style");
    st.id = "demo-hl-style";
    st.textContent = ".demo-hl{outline:4px solid #22d3ee!important;outline-offset:5px;box-shadow:0 0 0 10px rgba(34,211,238,.2),0 0 60px rgba(34,211,238,.55)!important;transition:box-shadow .3s ease;position:relative;z-index:50}";
    document.head.appendChild(st);
  }
`;

const ANON = `
  (function () {
    const REPL = [[/Болгов Андрей Владимирович/g, "Иванов Иван Иванович"], [/Болгов/g, "Иванов"], [/Андрей/g, "Иван"], [/\\bБА\\b/g, "ИИ"]];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const n = []; while (w.nextNode()) n.push(w.currentNode);
    for (const x of n) { let t = x.nodeValue; for (const [re, to] of REPL) t = t.replace(re, to); x.nodeValue = t; }
    document.querySelectorAll(".avatar-xl, .avatar, .p-ava, .nav-ava").forEach((el) => { el.style.visibility = "hidden"; });
  })();
`;

const moveJs = (sel) => `(() => {
  const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return "нет";
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  setTimeout(() => {
    const r = el.getBoundingClientRect();
    const c = document.getElementById("demo-cursor");
    if (c) { c.style.left = (r.left + r.width / 2) + "px"; c.style.top = (r.top + r.height / 2) + "px"; }
    document.querySelectorAll(".demo-hl").forEach((x) => x.classList.remove("demo-hl"));
    el.classList.add("demo-hl");
  }, 350);
  return "ok"; })()`;

const zoomJs = (sel, k) => `(() => {
  const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return "нет";
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  setTimeout(() => {
    const r = el.getBoundingClientRect();
    document.body.style.transition = "transform .7s cubic-bezier(.2,.8,.2,1)";
    document.body.style.transformOrigin = (r.left + r.width / 2) + "px " + (r.top + r.height / 2) + "px";
    document.body.style.transform = "scale(${k})";
    document.querySelectorAll(".demo-hl").forEach((x) => x.classList.remove("demo-hl"));
    el.classList.add("demo-hl");
    const c = document.getElementById("demo-cursor");
    if (c) { c.style.left = (r.left + r.width / 2 + 40) + "px"; c.style.top = (r.top + r.height / 2 + 30) + "px"; }
  }, 350);
  return "ok"; })()`;

const unzoomJs = `(() => {
  document.body.style.transition = "transform .6s ease";
  document.body.style.transform = "scale(1)";
  document.querySelectorAll(".demo-hl").forEach((x) => x.classList.remove("demo-hl"));
  return "ok"; })()`;

const scrollJs = (y) => `(() => { window.scrollTo({ top: ${y}, behavior: "smooth" }); return "ok"; })()`;

async function recordClip(name, page, steps, opts = {}) {
  const dir = path.join(OUT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.route("**/auth.js*", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: MOCK }));
  const p = await ctx.newPage();
  await p.goto("file:///" + path.join(SITE, page, "index.html").replace(/\\/g, "/"));
  await sleep(3200);
  await p.evaluate(ANON);
  await p.evaluate(CURSOR);
  await sleep(400);
  const framesDir = path.join(dir, "frames");
  fs.mkdirSync(framesDir, { recursive: true });
  const FPS = 15;
  let running = true;
  const t0 = Date.now();
  let i = 0;
  const shoot = (async () => {
    while (running) {
      await p.screenshot({ path: path.join(framesDir, `f${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 82 });
      i++;
      const want = i * (1000 / FPS);
      const spent = Date.now() - t0;
      if (want > spent) await sleep(want - spent);
    }
  })();
  for (const st of steps) await st(p);
  await sleep(opts.tail || 700);
  running = false;
  await shoot;
  await ctx.close();
  await browser.close();
  const mp4 = path.join(OUT, name + ".mp4");
  execFileSync(FF, ["-y", "-framerate", String(FPS), "-i", path.join(framesDir, "f%05d.jpg"),
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-fps_mode", "cfr", "-r", "30", "-an", mp4], { stdio: "ignore" });
  fs.rmSync(framesDir, { recursive: true, force: true });
  console.log("клип:", name, (fs.statSync(mp4).size / 1024).toFixed(0) + " КБ");
}

const move = (sel) => async (p) => { await p.evaluate(moveJs(sel)); await sleep(900); };
const click = (sel) => async (p) => { await p.click(sel); await sleep(1200); };
const scroll = (y) => async (p) => { await p.evaluate(scrollJs(y)); await sleep(1000); };
const zoom = (sel, k = 1.7) => async (p) => { await p.evaluate(zoomJs(sel, k)); await sleep(1400); };
const unzoom = async (p) => { await p.evaluate(unzoomJs); await sleep(900); };
const type = (sel, text) => async (p) => { await p.fill(sel, text); await sleep(800); };
const wait = (ms) => async () => { await sleep(ms); };

module.exports = { recordClip, move, click, scroll, zoom, unzoom, type, wait, sleep };

if (require.main === module) {
  const CLIPS = require("./clips.js");
  const only = process.argv.slice(2);
  const list = only.length ? only : Object.keys(CLIPS);
  (async () => {
    fs.mkdirSync(OUT, { recursive: true });
    for (const id of list) {
      const c = CLIPS[id];
      if (!c) { console.log("нет клипа:", id); continue; }
      await recordClip(id, c.page, c.steps, c.opts);
    }
  })();
}
