// Questionnaire de satisfaction (/avis/ et /en/review/) : pages non indexées et absentes du reste du site,
// formulaire Netlify « satisfaction » présent en dur (détecté au déploiement), mêmes champs en FR et en EN.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "site");
const PAGES = { fr: "avis/index.html", en: "en/review/index.html" };
const read = (rel) => readFileSync(join(SITE, rel), "utf8");
const GOOGLE = "https://g.page/r/CcCzqeaJRRAwEBM/review";

test("avis : noindex, nofollow, hreflang entre les deux langues, pas de version Markdown", () => {
  for (const [lang, rel] of Object.entries(PAGES)) {
    const html = read(rel);
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/, `${rel} : noindex, nofollow attendu`);
    assert.ok(!/<link rel="canonical"/.test(html), `${rel} : pas d'adresse canonique sur une page non indexée`);
    assert.match(html, /hreflang="fr" href="https:\/\/www\.darkside-energy\.com\/avis\/"/, `${rel} : hreflang fr`);
    assert.match(html, /hreflang="en" href="https:\/\/www\.darkside-energy\.com\/en\/review\/"/, `${rel} : hreflang en`);
    assert.match(html, new RegExp(`<html lang="${lang}">`));
    assert.ok(!existsSync(join(SITE, dirname(rel), "index.html.md")), `${rel} : version Markdown à ne pas publier`);
  }
});

test("avis : absent du sitemap, de llms.txt, de llms-full.txt et des liens du site", () => {
  for (const f of ["sitemap.xml", "llms.txt", "llms-full.txt"]) {
    const txt = read(f);
    assert.ok(!/\/avis\/|\/en\/review\//.test(txt), `${f} cite le questionnaire`);
  }
  const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : n.endsWith(".html") ? [join(d, n)] : []));
  for (const file of walk(SITE)) {
    if (Object.values(PAGES).some((rel) => file === join(SITE, rel))) continue;
    assert.ok(!/href="[^"]*(\/|\.\.\/|^)(avis|review)\/"/.test(readFileSync(file, "utf8")), `${file} renvoie vers le questionnaire`);
  }
});

test("avis : formulaire Netlify « satisfaction » en dur, mêmes champs en FR et en EN", () => {
  const names = {};
  for (const [lang, rel] of Object.entries(PAGES)) {
    const html = read(rel);
    const form = html.match(/<form [^>]*name="satisfaction"[^>]*>([\s\S]*?)<\/form>/);
    assert.ok(form, `${rel} : formulaire satisfaction absent du HTML`);
    assert.match(form[0], /data-netlify="true"/, `${rel} : data-netlify`);
    assert.match(form[0], /netlify-honeypot="bot-field"/, `${rel} : piège anti-robots`);
    assert.match(form[1], /<input type="hidden" name="form-name" value="satisfaction">/, `${rel} : form-name`);
    assert.match(form[1], new RegExp(`<input type="hidden" name="langue" value="${lang}">`), `${rel} : langue`);
    assert.match(form[1], /name="bot-field"/, `${rel} : champ piège`);
    for (const n of ["nom", "structure", "evenement"]) assert.match(form[1], new RegExp(`name="${n}"[^>]*required`), `${rel} : ${n} obligatoire`);
    for (let v = 1; v <= 5; v++) assert.match(form[1], new RegExp(`name="note_globale" value="${v}"`), `${rel} : note ${v}`);
    names[lang] = [...new Set([...form[1].matchAll(/name="([^"]+)"/g)].map((m) => m[1]))].sort();
    assert.ok(!html.includes("—"), `${rel} : tiret cadratin`);
    assert.ok(!/\bDSE\b/.test(html), `${rel} : abréviation interdite`);
  }
  assert.deepEqual(names.fr, names.en, "les deux pages doivent envoyer les mêmes champs");
});

test("avis : invitation Google montrée à tous, quelle que soit la note", () => {
  for (const rel of Object.values(PAGES)) {
    const html = read(rel);
    const merci = html.match(/<div class="panel avis-merci"[\s\S]*?<\/div>\s*<\/div>/)[0];
    assert.equal(merci.split(`href="${GOOGLE}"`).length - 1, 2, `${rel} : deux liens vers l'avis Google`);
    assert.match(merci, /target="_blank" rel="noopener"/);
  }
  // Le remerciement ne dépend que du commentaire public, jamais de la note
  const js = read("assets/js/avis.js");
  const remercier = js.slice(js.indexOf("function remercier"), js.indexOf("function copier"));
  assert.ok(remercier.length > 0 && !/note/.test(remercier), "le remerciement ne doit pas dépendre de la note");
  assert.match(js, /remercier\(commentaire\)/);
});
