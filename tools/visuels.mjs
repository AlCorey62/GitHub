#!/usr/bin/env node
// Visuels des publications réseaux sociaux : node tools/visuels.mjs editorial/semaines/AAAA-MM-JJ
//
// Lit visuels.json dans le dossier de la semaine :
//   [{ "fichier": "2026-10-26-lundi.png", "rubrique": "Le sais-tu ?", "titre": "Pourquoi les *LED* …",
//      "sousTitre": "…", "photo": "site/assets/img/xxx.jpg" }]
// Les mots entre astérisques du titre ressortent en rouge. Le visuel fait 1200 × 1200 px.
// Nécessite Playwright et Chromium (variables PLAYWRIGHT_MODULE et CHROMIUM_PATH si besoin).

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(process.argv[2] || "");
const list = join(dir, "visuels.json");
if (!existsSync(list)) throw new Error(`visuels.json introuvable dans ${dir}`);
const items = JSON.parse(readFileSync(list, "utf8"));

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
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
const template = pathToFileURL(join(ROOT, "editorial", "modeles", "visuel.html")).href;

for (const it of items) {
  await page.goto(template);
  await page.evaluate(
    ({ it, photo }) => {
      // Typographie française : espaces insécables avant « : ; ? ! » et entre un nombre et son unité
      const typo = (s) =>
        String(s)
          .replace(/ ([?!;])/g, "\u202f$1")
          .replace(/ :/g, "\u00a0:")
          .replace(/(\d) (?=(?:A|V|W|kW|kVA|mA|m|mm²|%|Hz)(?![\p{L}\d]))/gu, "$1\u00a0");
      const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const title = esc(typo(it.titre)).replace(/\*([^*]+)\*/g, "<em>$1</em>");
      document.getElementById("kicker").textContent = typo(it.rubrique || "");
      const h1 = document.getElementById("title");
      h1.innerHTML = title;
      if (it.titre.replace(/\*/g, "").length > 60) h1.classList.add("long");
      document.getElementById("sub").textContent = typo(it.sousTitre || "");
      if (photo) {
        document.body.classList.add("has-photo");
        document.querySelector(".photo").style.backgroundImage = `url("${photo}")`;
      }
    },
    { it, photo: it.photo ? pathToFileURL(join(ROOT, it.photo)).href : null }
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(dir, it.fichier) });
  console.log(`visuel : ${join(dir, it.fichier)}`);
}
await browser.close();
