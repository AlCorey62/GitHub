#!/usr/bin/env node
// Signale toutes les pages du sitemap aux moteurs compatibles IndexNow (Bing, et donc Copilot et
// la recherche de ChatGPT qui s'appuie sur l'index Bing ; Yandex, Seznam, Naver).
// À lancer APRÈS chaque mise en ligne du site sur son domaine définitif :
//   node tools/indexnow.mjs            (toutes les URL du sitemap)
//   node tools/indexnow.mjs /faq/      (seulement certaines pages)

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "./site.config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const key = SITE.indexNowKey;
if (!key || !existsSync(join(ROOT, "site", `${key}.txt`))) {
  console.error("Clé IndexNow absente : vérifier SITE.indexNowKey et le fichier site/<clé>.txt");
  process.exit(1);
}

const host = new URL(SITE.url).host;
const args = process.argv.slice(2);
const urls = args.length
  ? args.map((p) => new URL(p, SITE.url).toString())
  : [...readFileSync(join(ROOT, "site/sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation: `${SITE.url}/${key}.txt`, urlList: urls }),
});
console.log(`IndexNow : ${urls.length} URL envoyées, réponse HTTP ${res.status} ${res.statusText}`);
if (res.status >= 400) process.exit(1);
