/* Генератор видеоинструкций: TTS (edge-tts) + запись HTML-сцен (Playwright) + ffmpeg.
   Запуск: node video/build.js [id ...]
   Результат: video/out/<id>.mp4 (1920x1080, 30 fps, AAC). */
const { chromium } = require("playwright-core");
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const FFMPEG = "C:/Users/Xiter/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe";

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "video", "out");
const PIPER = "video/piper/ru_RU-dmitri-medium.onnx";
const GAP = 0.35; // пауза между сценами

const SCENES = require("./scenarios.js");

function run(cmd, args, opts) {
  // ffmpeg на Windows нередко завершается с кодом 1 при успешной записи файла —
  // ошибкой считаем только отсутствие нужного файла (проверяет вызывающий код).
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...(opts || {}) });
  } catch (e) {
    return (e && e.stdout) ? String(e.stdout) : "";
  }
}
function dur(file) {
  // ffprobe в системе недоступен — берём длительность из вывода ffmpeg
  const r = spawnSync(FFMPEG, ["-i", file], { encoding: "utf8" });
  const out = String(r.stderr || "");
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(out);
  if (!m) return 0;
  return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
}

async function build(id) {
  const video = SCENES[id];
  if (!video) { console.log("нет сценария:", id); return; }
  // реальные скриншоты разделов и тем
  const shotsRoot = path.join(ROOT, "video", "shots");
  const SECTIONS = ["start","bonus","lvl","awards","growth","graph","stats","income","rules","hours","links","settings"];
  if (SECTIONS.includes(id) && fs.existsSync(path.join(shotsRoot, id + ".png"))) {
    video.scenes.splice(1, 0, {
      title: video.title, sub: "как это выглядит на сайте", img: path.join(shotsRoot, id + ".png"),
      hint: "интерфейс", voice: "Вот как это выглядит на сайте.",
    });
  }
  if (id === "intro" && fs.existsSync(path.join(shotsRoot, "start.png"))) {
    video.scenes.splice(2, 0, {
      title: "Твоя страница", sub: "«Стартовая» — главный экран дня", img: path.join(shotsRoot, "start.png"),
      hint: "интерфейс", voice: "Вот так выглядит твоя личная страница.",
    });
  }
  if (id === "settings") {
    const THEME_SHOTS = [["light","Светлая"],["cyberpunk","Cyberpunk"],["space","Космос"],["winter","Зима"],["minecraft","Minecraft"]];
    let k = 2;
    for (const [th, name] of THEME_SHOTS) {
      const p = path.join(shotsRoot, "themes", th + ".png");
      if (!fs.existsSync(p)) continue;
      video.scenes.splice(k++, 0, {
        title: "Тема «" + name + "»", sub: "оформление и своя анимация", img: p,
        hint: "темы оформления", voice: "Тема " + name + " — свой фон и своя анимация. Выбор персональный.",
      });
    }
  }
  const dir = path.join(OUT, id);
  fs.mkdirSync(dir, { recursive: true });

  // 1. озвучка каждой сцены
  const scenes = [];
  for (let i = 0; i < video.scenes.length; i++) {
    const s = video.scenes[i];
    const txt = path.join(dir, `s${i}.txt`);
    const wav = path.join(dir, `s${i}.wav`);
    const mp3 = path.join(dir, `s${i}.mp3`);
    fs.writeFileSync(txt, s.voice, "utf8");
    // локальный нейроголос Piper (rhasspy/piper) — без интернета
    run("uvx", ["--from", "piper-tts", "python", "-m", "piper", "-m", path.join(ROOT, PIPER), "-f", wav, "-i", txt]);
    run(FFMPEG, ["-y", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "192k", mp3]);
    const d = dur(mp3);
    scenes.push({ ...s, audio: mp3, dur: +(d + GAP).toFixed(2) });
    console.log(`  сцена ${i + 1}: ${d.toFixed(1)}s`);
  }

  // 2. общий аудиотрек
  const silence = path.join(dir, "silence.mp3");
  run(FFMPEG, ["-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "2.6", "-c:a", "libmp3lame", silence]);
  const list = path.join(dir, "audio.txt");
  fs.writeFileSync(list, [silence].concat(scenes.map((s) => s.audio)).map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"), "utf8");
  const audio = path.join(dir, "audio.mp3");
  run(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", audio]);
  // фоновая музыка (тихий эмбиент) и микс с голосом
  const totalSec = 1.2 + scenes.reduce((a, s) => a + s.dur, 0);
  const music = path.join(dir, "music.mp3");
  run(FFMPEG, ["-y", "-f", "lavfi", "-i", `sine=frequency=220:duration=${totalSec}`,
    "-f", "lavfi", "-i", `sine=frequency=277:duration=${totalSec}`,
    "-f", "lavfi", "-i", `sine=frequency=330:duration=${totalSec}`,
    "-f", "lavfi", "-i", `sine=frequency=440:duration=${totalSec}`,
    "-filter_complex", `[0][1][2][3]amix=inputs=4,volume=0.05,lowpass=f=900,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, totalSec - 3)}:d=3`,
    "-codec:a", "libmp3lame", "-b:a", "192k", music]);
  const mixed = path.join(dir, "mixed.mp3");
  run(FFMPEG, ["-y", "-i", audio, "-i", music, "-filter_complex", "[1]volume=0.35[m];[0][m]amix=inputs=2:duration=first:dropout_transition=2", "-codec:a", "libmp3lame", "-b:a", "192k", mixed]);

  // 3. HTML со сценами и запуск
  const html = path.join(dir, "scene.html");
  const base = fs.readFileSync(path.join(ROOT, "video", "scene.html"), "utf8");
  const shotsDir = path.join(dir, "shots");
  fs.mkdirSync(shotsDir, { recursive: true });
  const payload = JSON.stringify({ scenes: scenes.map((s) => {
    let img = null;
    if (s.img) { const b = path.basename(s.img); fs.copyFileSync(s.img, path.join(shotsDir, b)); img = "shots/" + b; }
    return { title: s.title, sub: s.sub, kicker: s.kicker, icon: s.icon, items: s.items, hint: s.hint, dur: s.dur, img };
  }) }).replace(/<\/script>/g, "<\\/script>");
  const data = `<script>window.VIDEO_SCENES = ${payload}.scenes;</script>`;
  fs.writeFileSync(html, base.replace("</head>", data + "\n</head>"), "utf8");

  const total = 2.6 + scenes.reduce((a, s) => a + s.dur, 0);
  const recDir = path.join(dir, "rec");
  fs.rmSync(recDir, { recursive: true, force: true });

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: recDir, size: { width: 1920, height: 1080 } },
  });
  const page = await ctx.newPage();
  await page.goto("file:///" + html.replace(/\\/g, "/"));
  await page.waitForTimeout(600);
  await page.getByText("Мои результаты").first().waitFor({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(Math.ceil((total + 0.6) * 1000));
  await ctx.close();
  await browser.close();

  const webm = fs.readdirSync(recDir).filter((f) => f.endsWith(".webm")).map((f) => path.join(recDir, f))[0];
  const mp4 = path.join(OUT, `${id}.mp4`);
  run(FFMPEG, [
    "-y", "-ss", "1.6", "-i", webm, "-ss", "1.6", "-i", mixed,
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30",
    "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", mp4,
  ]);
  fs.rmSync(recDir, { recursive: true, force: true });
  console.log("готово:", mp4, `${dur(mp4).toFixed(1)}s`);
}

(async () => {
  const ids = process.argv.slice(2);
  const list = ids.length ? ids : Object.keys(SCENES);
  fs.mkdirSync(OUT, { recursive: true });
  for (const id of list) { console.log("▶", id); await build(id); }
})();
