/* Озвучка через Speech Studio (MCP): проект → синтез → по-блочный экспорт → wav на фразу.
   Использование: node video/ss_synth.js phrases.json outDir [voice] [engine] [direction] */
const fs = require("fs");
const path = require("path");

const MCP = "http://127.0.0.1:8797/mcp";

async function call(name, args, timeoutMs = 300000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(MCP, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
      signal: ctl.signal,
    });
    const txt = await r.text();
    const line = txt.split("\n").filter((l) => l.trim().startsWith('{"jsonrpc"')).pop();
    const o = JSON.parse(line);
    if (o.result && o.result.content) return o.result.content[0].text;
    return line;
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitJob(jobId) {
  for (let i = 0; i < 240; i++) {
    const t = await call("studio_wait", { job_id: jobId, seconds: 50 });
    try {
      const j = JSON.parse(t);
      if (j.done) return j;
    } catch (e) {}
    await sleep(500);
  }
  return null;
}

(async () => {
  const [phrasesFile, outDir, voice, engine, direction] = process.argv.slice(2);
  const phrases = JSON.parse(fs.readFileSync(phrasesFile, "utf8"));
  fs.mkdirSync(outDir, { recursive: true });
  const text = phrases.map((p) => p.text).join("\n\n");

  const created = JSON.parse(await call("project_create", {
    name: "video-" + Date.now(), text, voice: voice || "Диктор Ляпунов",
    engine: engine || "higgs", lang: "ru",
  }));
  const pid = created.project_id;
  const proj = created.project;
  const dir = direction || "Calm professional narrator, measured pace, slight pauses between sentences";
  for (const ch of proj.chapters) for (const b of ch.blocks) b.direction = dir;
  proj.settings.qc.asr_check = true;
  proj.settings.qc.takes = 1;
  await call("project_update", { pid, project: proj });

  const synth = JSON.parse(await call("project_synth", { pid }));
  if (synth.job_id) await waitJob(synth.job_id);

  console.log("синтез завершён");

  const exp = JSON.parse(await call("project_export", { pid, format: "wav", per_block: true, allow_unvoiced: true }));
  let jobRes = null;
  if (exp.job_id) jobRes = await waitJob(exp.job_id);
  if (jobRes && jobRes.state && jobRes.state.result) {
    const folder = jobRes.state.result.folder || "";
    const list = jobRes.state.result.files || [];
    const files = list.map((x) => path.join(folder ? path.dirname(folder) : "", x));
    console.log("файлов:", files.length);
    if (files.length === phrases.length) {
      files.forEach((f, i) => { if (fs.existsSync(f)) fs.copyFileSync(f, path.join(outDir, path.basename(phrases[i].out))); });
      console.log("ok: сохранено", files.length);
    } else console.log("несовпадение:", files.length, "vs", phrases.length);
    return;
  }
  let files = (exp.files || (exp.export && exp.export.files) || []).map((f) => (typeof f === "string" ? f : f.path)).filter(Boolean);
  if (!files.length) {
    const lst = JSON.parse(await call("project_exports", { pid }));
    files = (lst.exports || lst.files || []).map((f) => (typeof f === "string" ? f : (f.path || f.file))).filter(Boolean);
    console.log("exports:", JSON.stringify(lst).slice(0, 300));
  }
  console.log("экспорт:", files.length, "файлов");

  if (files.length === phrases.length) {
    files.forEach((f, i) => fs.copyFileSync(f, path.join(outDir, path.basename(phrases[i].out))));
    console.log("ok: сохранено", files.length);
  } else {
    console.log("несовпадение:", files.length, "vs", phrases.length, JSON.stringify(exp).slice(0, 400));
  }
})();
