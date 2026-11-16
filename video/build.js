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
const SILERO_VOICE = process.env.SILERO_VOICE || "aidar"; // aidar | eugene | baya | xenia | kseniya
const TTS_ENGINE = process.env.TTS_ENGINE || "silero";  // silero | xtts | ss (Speech Studio)
const SS_VOICE = process.env.SS_VOICE || "Евгений Яковлев";
const SS_ENGINE = process.env.SS_ENGINE || "higgs";
const SS_DIRECTION = process.env.SS_DIRECTION || "Calm professional narrator, measured pace, slight pauses between sentences";
const XTTS_SPEAKER = process.env.XTTS_SPEAKER || "video/voice/dictor.wav";  // короткий образец даёт меньше артефактов
const LENGTH_SCALE = "1.08";  // чуть медленнее — дикторская манера
const NOISE_SCALE = "0.72";   // чуть больше вариативности — выразительнее
const NOISE_W = "0.9";
const GAP = 1.7;    // пауза между сценами
const PHRASE_PAUSE = 0.8;  // пауза между фразами внутри реплики // пауза между сценами

const SCENES = require("./scenarios2.js");

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
  if (id === "deep") {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, "video", "awards-data.json"), "utf8"));
    const LVL_ICONS = ["🌱","📗","⚔️","🛡","🎖","🔧","🧠","💎","👑","🏆"];
    const out = [];
    out.push({ kicker: "Подробно", title: "Награды и LVL", sub: "Каждая награда и каждый уровень — отдельным блоком", icon: "🏆", hint: "Подробно", voice: "Теперь подробно: разберём каждую награду и каждый уровень отдельно." });
    data.awards.forEach((a, i) => {
      out.push({ single: { cnt: (i + 1) + " / " + data.awards.length, icon: a.glyph || "🏅", title: a.title, cond: a.desc || "", color: a.color || "", motive: a.motive || "" }, hint: "награда", voice: a.title + ". " + (a.desc || "") + (a.motive ? " " + a.motive : "") });
    });
    out.push({ kicker: "Уровни", title: "10 уровней", sub: "шаг уровня — 10 звёзд", icon: "⭐", hint: "LVL", voice: "Теперь уровни. Их десять, шаг уровня — десять звёзд." });
    data.levels.forEach((l) => {
      out.push({ single: { cnt: l.lvl + " / " + data.levels.length, lvlno: "Уровень " + l.lvl, icon: LVL_ICONS[l.lvl - 1] || "⭐", title: l.title, cond: "10 звёзд на уровень", motive: l.lvl >= 9 ? "Высшая ступень отдела" : "" }, hint: "уровень", voice: "Уровень " + l.lvl + " — " + l.title + "." });
    });
    out.push({ kicker: "Итог", title: "Что это даёт", items: ["Статус в отделе", "Влияние на очередь задач", "Влияние на премию", "Путь к «Легенде отдела»"], hint: "Зачем", voice: "Награды и уровень дают статус в отделе, влияют на очередь задач и премию, и ведут к высшей ступени — Легенде отдела." });
    video.scenes = out;
  }

  // демонстрации реальных действий (клипы с курсором)
  const DEMO_MAP = {
    start: [["start-begin", "Нажимаем «Начало смены» — время пошло."], ["start-break", "Отмечаем перерыв кнопкой."], ["start-lunch", "Обед — отдельная кнопка."], ["start-stop", "В конце дня завершаем смену."]],
    settings: [["settings-theme", "Выбираем тему — интерфейс меняется сразу."]],
    lvl: [["lvl-progress", "Листаем прогресс и звёзды."]],
    awards: [["awards-catalog", "Смотрим каталог наград."]],
    graph: [["graph-scroll", "Листаем график смен."]],
    stats: [["stats-metrics", "Смотрим метрики по месяцам."]],
    hours: [["hours-journal", "Листаем журнал часов."]],
    links: [["links-hover", "Открываем рабочие системы."]],
    bonus: [["bonus-parts", "Разбираем, из чего премия."]],
    income: [["income-map", "Смотрим карту доходов."]],
    rules: [["rules-text", "Читаем правила расчёта."]],
  };
  if (DEMO_MAP[id]) {
    const demoDir = path.join(ROOT, "video", "demo");
    for (const [clip, text] of DEMO_MAP[id]) {
      const cp = path.join(demoDir, clip + ".mp4");
      if (fs.existsSync(cp)) video.scenes.push({ video: cp, hint: "демонстрация", voice: text, caption: clip });
    }
  }

  // аутро как сцена в общем таймлайне
  video.scenes.push({
    outro: { title: "Мои результаты", sub: "Твоя страница — по ссылке от руководителя" },
    hint: "спасибо",
    voice: "Спасибо за просмотр. Твоя страница всегда под рукой, по ссылке от руководителя.",
  });

  if (!video.scenes.some((s) => s.kind === "outro")) video.scenes.push({ kind: "outro", hint: "конец" });

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

  // 1. озвучка Silero по фразам (один запуск на видео), с паузами между фразами
  const pauseWav = path.join(dir, "pause.wav");
  const SR = (TTS_ENGINE === "xtts" || TTS_ENGINE === "ss") ? 24000 : 48000;
  const SR_SS = 48000;
  run(FFMPEG, ["-y", "-f", "lavfi", "-i", `anullsrc=r=${SR}:cl=mono`, "-t", String(PHRASE_PAUSE), "-c:a", "pcm_s16le", pauseWav]);
  const sentences = [];
  const PY = path.join(ROOT, ".venv-silero", "Scripts", "python.exe");
  const XTTS_PY = path.join(ROOT, ".venv-xtts3", "Scripts", "python.exe");
  const phrasesJson = path.join(dir, "phrases.json");
  const queue = [];
  video.scenes.forEach((s, i) => {
    const phrases = (() => {
      const out = [];
      for (const sent of String(s.voice || "").split(/(?<=[.!?…])\s+/)) {
        const t = sent.trim();
        if (!t) continue;
        if (t.length > 110) {
          const chunks = t.split(/,\s+|\s+—\s+/).map((x) => x.trim()).filter(Boolean);
          let buf = "";
          for (const ch of chunks) {
            if ((buf + " " + ch).trim().length <= 90) buf = (buf ? buf + ", " : "") + ch;
            else { if (buf) out.push(buf); buf = ch; }
          }
          if (buf) out.push(buf);
        } else out.push(t);
      }
      return out;
    })();
    const files = [];
    phrases.forEach((ph, k) => {
      const w = path.join(dir, `s${i}-${k}.wav`);
      queue.push({ text: ph, out: w });
      files.push(w);
    });
    sentences.push({ files, phrases });
  });
  fs.writeFileSync(phrasesJson, JSON.stringify(queue), "utf8");
  if (TTS_ENGINE === "ss") {
    run("node", [path.join(ROOT, "video", "ss_synth.js"), phrasesJson, dir, SS_VOICE, SS_ENGINE, SS_DIRECTION]);
  } else if (TTS_ENGINE === "xtts") {
    run(XTTS_PY, [path.join(ROOT, "video", "synth_xtts.py"), path.join(ROOT, XTTS_SPEAKER), phrasesJson], { env: { ...process.env, COQUI_TOS_AGREED: "1" } });
  } else {
    run(PY, [path.join(ROOT, "video", "synth_silero.py"), SILERO_VOICE, "48000", phrasesJson]);
  }

  // проверка распознаванием: если голос «буркнул» — перегенерируем фразу
  if (TTS_ENGINE === "xtts") {
    const checkJson = path.join(dir, "check.json");
    run(PY, [path.join(ROOT, "video", "check_tts.py"), phrasesJson, "small", "--json-out", checkJson]);
    try {
      const res = JSON.parse(fs.readFileSync(checkJson, "utf8"));
      if (res.bad && res.bad.length) {
        const retry = res.bad.map((i) => queue[i]);
        const retryJson = path.join(dir, "retry.json");
        fs.writeFileSync(retryJson, JSON.stringify(retry), "utf8");
        console.log(`  перегенерация ${retry.length} фраз`);
        run(XTTS_PY, [path.join(ROOT, "video", "synth_xtts.py"), path.join(ROOT, XTTS_SPEAKER), retryJson], { env: { ...process.env, COQUI_TOS_AGREED: "1" } });
      }
    } catch (e) { console.log("  проверка не удалась:", String(e).slice(0, 80)); }
  }

  const scenes = [];
  for (let i = 0; i < video.scenes.length; i++) {
    const sc0 = video.scenes[i];
    if (sc0.kind) {
      const kindDur = sc0.kind === "intro" ? 4.5 : 3.5;
      const silWav = path.join(dir, `k${i}.wav`);
      const silMp3 = path.join(dir, `k${i}.mp3`);
      run(FFMPEG, ["-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", String(kindDur), "-c:a", "pcm_s16le", silWav]);
      run(FFMPEG, ["-y", "-i", silWav, "-codec:a", "libmp3lame", "-b:a", "192k", silMp3]);
      scenes.push({ ...sc0, audio: silMp3, dur: kindDur });
      continue;
    }
    const s = video.scenes[i];
    const wav = path.join(dir, `s${i}.wav`);
    const mp3 = path.join(dir, `s${i}.mp3`);
    const parts = [];
    sentences[i].files.forEach((f, k) => {
      parts.push(f);
      if (k < sentences[i].files.length - 1) parts.push(pauseWav);
    });
    if (!parts.length) parts.push(pauseWav);
    const listF = path.join(dir, `s${i}-list.txt`);
    fs.writeFileSync(listF, parts.map((f) => "file '" + f.replace(/\\/g, "/") + "'").join("\n"), "utf8");
    run(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", listF, "-c", "copy", wav]);
    run(FFMPEG, ["-y", "-i", wav, "-ar", String(SR), "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "192k", mp3]);
    const d = dur(mp3);
    scenes.push({ ...s, audio: mp3, dur: +(d + GAP).toFixed(2) });
    console.log(`  сцена ${i + 1}: ${d.toFixed(1)}s (${sentences[i].phrases.length} фраз)`);
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
    "-filter_complex", `[0][1][2][3]amix=inputs=4:normalize=0,volume=0.42,lowpass=f=1200,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, totalSec - 1.2)}:d=1.2`,
    "-codec:a", "libmp3lame", "-b:a", "192k", music]);
  const mixed = path.join(dir, "mixed.mp3");
  run(FFMPEG, ["-y", "-i", audio, "-i", music, "-filter_complex", "[0][1]amix=inputs=2:duration=first:dropout_transition=2:normalize=0", "-codec:a", "libmp3lame", "-b:a", "192k", mixed]);

  // 3. HTML со сценами и запуск
  const html = path.join(dir, "scene.html");
  const base = fs.readFileSync(path.join(ROOT, "video", "scene.html"), "utf8");
  const shotsDir = path.join(dir, "shots");
  fs.mkdirSync(shotsDir, { recursive: true });
  const payload = JSON.stringify({ scenes: scenes.map((s) => {
    let img = null, clip = null;
    if (s.img) { const b = path.basename(s.img); fs.copyFileSync(s.img, path.join(shotsDir, b)); img = "shots/" + b; }
    if (s.video) { const b = path.basename(s.video); fs.copyFileSync(s.video, path.join(shotsDir, b)); clip = "shots/" + b; }
    return { title: s.title, sub: s.sub, kicker: s.kicker, icon: s.icon, items: s.items, cards: s.cards, single: s.single, outro: s.outro, kind: s.kind, hint: s.hint, dur: s.dur, img, video: clip };
  }) }).replace(/<\/script>/g, "<\\/script>");
  const data = `<script>window.VIDEO_SCENES = ${payload}.scenes;</script>`;
  fs.writeFileSync(html, base.replace("</head>", data + "\n</head>"), "utf8");

  const total = dur(mixed) + 0.3;   // строго по длине аудио: картинка и звук совпадают
  const FPS = 20;
  const framesDir = path.join(dir, "frames");
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await page.goto("file:///" + html.replace(/\\/g, "/"));
  await page.waitForTimeout(500);
  // покадровая запись: надёжнее recordVideo (тот пропускает статичные участки)
  const totalFrames = Math.ceil(total * FPS);
  console.log("  кадров:", totalFrames, "из", total.toFixed(1) + "с");
  const t0 = Date.now();
  for (let i = 0; i < totalFrames; i++) {
    await page.screenshot({ path: path.join(framesDir, `f${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 82 });
    const want = (i + 1) * (1000 / FPS);
    const spent = Date.now() - t0;
    if (want > spent) await page.waitForTimeout(want - spent);
  }
  await ctx.close();
  await browser.close();

  const mp4 = path.join(OUT, process.env.NO_SUFFIX ? `${id}.mp4` : `${id}-${SILERO_VOICE}.mp4`);
  run(FFMPEG, [
    "-y", "-framerate", String(FPS), "-i", path.join(framesDir, "f%05d.jpg"),
    "-ss", "1.6", "-i", mixed,
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
    "-fps_mode", "cfr", "-r", "30",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", mp4,
  ]);
  fs.rmSync(framesDir, { recursive: true, force: true });
  // копия в нумерованную папку для раздачи
  const FINAL = path.join(ROOT, "video", "final");
  const ORDER = { intro: "01", start: "02", graph: "03", stats: "04", bonus: "05", income: "06", lvl: "07", awards: "08", growth: "09", hours: "10", rules: "11", links: "12", settings: "13", deep: "14" };
  if (ORDER[id]) {
    fs.mkdirSync(FINAL, { recursive: true });
    const names = { intro: "О сайте, авторизация, смена пароля", start: "Стартовая — смена, перерывы, таймер", graph: "Мой график — смены и линии", stats: "Статистика — метрики и тренд", bonus: "Бонусы — из чего складывается премия", income: "Карта доходов — суммы за KPI и SLA", lvl: "Мой LVL — уровни и звёзды", awards: "Награды — категории и как получить", growth: "Мой рост — зоны развития", hours: "Журнал часов — увольнительные и решения", rules: "Правила — как всё считается", links: "Ссылки — рабочие системы", settings: "Настройки — профиль, пароль, темы", deep: "Подробно о наградах и LVL" };
    fs.copyFileSync(mp4, path.join(FINAL, ORDER[id] + " - " + (names[id] || id) + ".mp4"));
  }
  // ---- аутро рисуется как обычная сцена (надёжнее внешней склейки) ----
  fs.rmSync(path.join(dir, "final.mp4"), { force: true });
  console.log("готово:", mp4, `${dur(mp4).toFixed(1)}s`);
}

(async () => {
  const ids = process.argv.slice(2);
  const list = ids.length ? ids : Object.keys(SCENES);
  fs.mkdirSync(OUT, { recursive: true });
  for (const id of list) { console.log("▶", id); await build(id); }
})();