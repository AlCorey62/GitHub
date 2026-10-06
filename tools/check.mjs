#!/usr/bin/env node
// Contrôle qualité du site : node tools/check.mjs
//  - liens internes, ancres, images et scripts qui pointent vers des fichiers existants
//  - un seul <h1>, <title> et meta description présents, attribut alt sur chaque image
//  - pas de tiret cadratin ni d'abréviation du nom de l'entreprise
//  - liste des mentions « à compléter » / « to be completed » restantes (avertissement)
//  - langue déclarée (fr, ou en sous /en/) et liens hreflang réciproques entre les deux versions
//  - données structurées JSON-LD valides, version Markdown présente, liens de llms.txt valides

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "site");
const errors = [];
const warnings = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

const pages = walk(ROOT);
const cache = new Map();
const read = (f) => {
  if (!cache.has(f)) cache.set(f, readFileSync(f, "utf8"));
  return cache.get(f);
};
const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const urlOf = (rel) => "/" + rel.replace(/(^|\/)index\.html$/, "$1");
const hreflangs = new Map(); // adresse de la page -> { fr, en, x-default }

function resolveTarget(fromFile, url) {
  const [pathPart] = url.split(/[?#]/);
  let target;
  if (pathPart === "") target = fromFile;
  else if (pathPart.startsWith("/")) target = join(ROOT, pathPart);
  else target = join(dirname(fromFile), pathPart);
  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, "index.html");
  return target;
}

for (const file of pages) {
  const rel = relative(ROOT, file).split(sep).join("/");
  const html = read(file);
  const body = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");

  const h1 = (body.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) errors.push(`${rel} : ${h1} balise(s) <h1>`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${rel} : <title> manquant`);
  if (!/<meta name="description" content="[^"]+">/.test(html)) errors.push(`${rel} : meta description manquante`);
  if (!/<main id="contenu">/.test(html)) errors.push(`${rel} : <main id="contenu"> manquant`);

  for (const m of body.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(m[0])) errors.push(`${rel} : image sans alt ${m[0].slice(0, 80)}`);
  }
  if (body.includes("\u2014")) errors.push(`${rel} : tiret cadratin présent`);
  if (/\bDSE\b/.test(body)) errors.push(`${rel} : abréviation « DSE » présente`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1]);
      if (!data["@context"] || !data["@type"]) errors.push(`${rel} : JSON-LD sans @context ou @type`);
    } catch (e) {
      errors.push(`${rel} : JSON-LD invalide (${e.message})`);
    }
  }
  if (/<link rel="canonical"/.test(html) && !existsSync(join(dirname(file), "index.html.md"))) {
    errors.push(`${rel} : version Markdown index.html.md absente`);
  }
  const todo = (body.match(/à compléter|to be completed/gi) || []).length;
  if (todo) warnings.push(`${rel} : ${todo} mention(s) « à compléter »`);

  const lang = (html.match(/<html lang="([^"]+)"/) || [])[1];
  const expected = rel.startsWith("en/") ? "en" : "fr";
  if (lang !== expected) errors.push(`${rel} : langue déclarée « ${lang || "absente"} » au lieu de « ${expected} »`);
  const alt = {};
  for (const m of html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="https:\/\/www\.darkside-energy\.com(\/[^"]*)">/g)) {
    alt[m[1]] = m[2];
    if (!existsSync(resolveTarget(join(ROOT, "index.html"), m[2]))) errors.push(`${rel} : hreflang ${m[1]} vers une page absente ${m[2]}`);
  }
  if (Object.keys(alt).length) hreflangs.set(urlOf(rel), alt);

  for (const m of body.matchAll(/\s(?:href|src|srcset)="([^"]+)"/g)) {
    const values = m[0].includes("srcset") ? m[1].split(",").map((s) => s.trim().split(/\s+/)[0]) : [m[1]];
    for (const url of values) {
      if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(url)) continue;
      const target = resolveTarget(file, url);
      if (!existsSync(target)) {
        errors.push(`${rel} : lien cassé ${url}`);
        continue;
      }
      const hash = url.split("#")[1];
      if (hash && target.endsWith(".html") && !ids(read(target)).has(hash)) {
        errors.push(`${rel} : ancre introuvable ${url}`);
      }
    }
  }
}

// hreflang : chaque version doit pointer vers l'autre, et l'autre en retour
for (const [url, alt] of hreflangs) {
  if (alt[expectedLang(url)] !== url) errors.push(`${url} : hreflang ne se cite pas elle-même`);
  for (const lang of ["fr", "en"]) {
    const other = hreflangs.get(alt[lang]);
    if (!other || other.fr !== alt.fr || other.en !== alt.en) errors.push(`${url} : hreflang ${lang} non réciproque (${alt[lang]})`);
  }
}
function expectedLang(url) {
  return url.startsWith("/en/") ? "en" : "fr";
}

// Liens du fichier llms.txt
const llmsPath = join(ROOT, "llms.txt");
if (!existsSync(llmsPath)) errors.push("llms.txt absent");
else {
  for (const m of readFileSync(llmsPath, "utf8").matchAll(/\]\((https:\/\/www\.darkside-energy\.com)(\/[^)]*)\)/g)) {
    const target = resolveTarget(join(ROOT, "index.html"), m[2]);
    if (!existsSync(target)) errors.push(`llms.txt : lien cassé ${m[2]}`);
  }
}

for (const w of warnings) console.warn(`avertissement  ${w}`);
for (const e of errors) console.error(`erreur         ${e}`);
console.log(`${pages.length} pages contrôlées, ${errors.length} erreur(s), ${warnings.length} avertissement(s)`);
process.exit(errors.length ? 1 : 0);
