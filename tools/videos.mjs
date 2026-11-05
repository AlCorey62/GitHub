#!/usr/bin/env node
// Vidéos des publications réseaux sociaux : node tools/videos.mjs editorial/semaines/AAAA-MM-JJ [--images t1,t2…]
//
// Pour chaque jour de publications.md qui porte une ligne « **Vidéo** : `nom.mp4` », la vidéo est fabriquée à partir
// de son animation editorial/videos/nom.html (gabarit commun _base.css et _base.js) : une image tous les 1/30 s,
// assemblées en MP4 H.264 carré 1080 × 1080, sans son, dans le dossier de la semaine.
// --images 2,6,10 : enregistre seulement ces instants en PNG (nom-2.png…) pour contrôler la mise en page.
// Nécessite Playwright, Chromium et ffmpeg (variables PLAYWRIGHT_MODULE, CHROMIUM_PATH et FFMPEG si besoin).

import { existsSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { lireSemaine } from "./publications.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FPS = 30;
const dir = resolve(process.argv[2] || "");
if (!existsSync(join(dir, "publications.md"))) throw new Error(`publications.md introuvable dans ${dir}`);
const i = process.argv.indexOf("--images");
const instants = i > -1 ? process.argv[i + 1].split(",").map(Number) : null;

const videos = [...new Set(lireSemaine(dir).days.map((d) => d.video).filter(Boolean))];
if (!videos.length) {
  console.log("Aucune vidéo dans cette semaine.");
  process.exit(0);
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (e) {
    const where = process.env.PLAYWRIGHT_MODULE || "/opt/node22/lib/node_modules/playwright/";
    return createRequire(where)("playwright");
  }
}

const { chromium } = await loadPlaywright();
const exe = process.env.CHROMIUM_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });

for (const file of videos) {
  const name = basename(file, ".mp4");
  const source = join(ROOT, "editorial", "videos", `${name}.html`);
  if (!existsSync(source)) throw new Error(`Animation introuvable pour ${file} : ${source}`);
  await page.goto(pathToFileURL(source).href);
  await page.evaluate(() => document.fonts.ready);
  const duration = await page.evaluate(() => window.DURATION);
  if (!(duration > 0)) throw new Error(`${source} : durée absente (window.VIDEO.duration)`);

  if (instants) {
    for (const t of instants) {
      await page.evaluate((t) => window.render(t), t);
      await page.screenshot({ path: join(dir, `${name}-${t}.png`) });
    }
    console.log(`images : ${name} (${instants.join(", ")} s)`);
    continue;
  }

  const out = join(dir, file);
  const ff = spawn(process.env.FFMPEG || "ffmpeg", [
    "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium", "-movflags", "+faststart", out,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => ff.on("close", (code) => (code ? rej(new Error(`ffmpeg a échoué (${code}) pour ${file}`)) : res())));
  const frames = Math.round(duration * FPS);
  for (let n = 0; n < frames; n++) {
    await page.evaluate((t) => window.render(t), n / FPS);
    const img = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(img)) await new Promise((res) => ff.stdin.once("drain", res));
  }
  ff.stdin.end();
  await done;
  console.log(`vidéo : ${out} (${duration} s)`);
}
await browser.close();
