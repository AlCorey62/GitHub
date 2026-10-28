// Module de déploiement Netlify : signale à IndexNow (Bing, et donc Copilot et la recherche de ChatGPT ;
// Yandex, Seznam, Naver) les pages nouvelles, modifiées ou retirées, après chaque mise en ligne en production.
//   onPreBuild : relève le sitemap encore en ligne (dates lastmod de la version précédente du site)
//   onSuccess  : une fois le déploiement réussi, le compare au nouveau sitemap et envoie la différence
// Aperçus de PR et autres branches : rien n'est envoyé. Un échec d'IndexNow n'empêche jamais la mise en ligne.
// La clé IndexNow n'est pas un secret : elle doit être publiée à la racine du site (site/<clé>.txt).
// Envoi à la main, si besoin : node tools/indexnow.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SITE } from "../../../tools/site.config.mjs";

const ENDPOINT = process.env.INDEXNOW_URL || "https://api.indexnow.org/indexnow"; // adresse modifiable pour les essais
const PREVIOUS = join(tmpdir(), "indexnow-sitemap-precedent.json");
const production = () => process.env.CONTEXT === "production";
const lastmods = (xml) => Object.fromEntries([...xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map((m) => [m[1], m[2]]));

export const onPreBuild = async () => {
  if (!production()) return;
  try {
    const res = await fetch(`${SITE.url}/sitemap.xml`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(PREVIOUS, JSON.stringify(lastmods(await res.text())));
  } catch (e) {
    console.log(`IndexNow : sitemap en ligne illisible (${e.message}), toutes les pages seront signalées.`);
  }
};

export const onSuccess = async ({ constants }) => {
  if (!production()) return console.log("IndexNow : déploiement hors production, rien n'est signalé.");
  try {
    const now = lastmods(readFileSync(join(constants.PUBLISH_DIR, "sitemap.xml"), "utf8"));
    const before = existsSync(PREVIOUS) ? JSON.parse(readFileSync(PREVIOUS, "utf8")) : null;
    const urls = before
      ? [...Object.keys(now).filter((u) => before[u] !== now[u]), ...Object.keys(before).filter((u) => !(u in now))]
      : Object.keys(now);
    if (!urls.length) return console.log("IndexNow : aucune page nouvelle, modifiée ou retirée.");
    const key = SITE.indexNowKey;
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(SITE.url).host, key, keyLocation: `${SITE.url}/${key}.txt`, urlList: urls }),
      signal: AbortSignal.timeout(15000),
    });
    console.log(`IndexNow : ${urls.length} page(s) signalée(s), réponse HTTP ${res.status}.`);
    for (const u of urls) console.log(`  ${u}`);
  } catch (e) {
    console.log(`IndexNow : envoi impossible (${e.message}). La mise en ligne n'est pas concernée.`);
  }
};
