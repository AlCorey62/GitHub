// Articles en attente de publication (editorial/a-paraitre) : vérifiés avant validation, pour que la publication
// programmée (tools/publier.mjs) ne puisse pas échouer le jour venu.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QUEUE = join(ROOT, "editorial", "a-paraitre");
const folders = existsSync(QUEUE) ? readdirSync(QUEUE).filter((d) => !d.startsWith(".")) : [];

function config(file) {
  const m = readFileSync(file, "utf8").match(/<!--page\s*([\s\S]*?)-->/);
  assert.ok(m, `${file} : configuration absente`);
  return JSON.parse(m[1]);
}

test("articles en attente : dossiers, configuration et emplacements", () => {
  const paths = new Set();
  for (const dir of folders) {
    assert.match(dir, /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/, `${dir} : nom attendu AAAA-MM-JJ-nom`);
    const date = dir.slice(0, 10);
    assert.ok(!Number.isNaN(Date.parse(date)), `${dir} : date invalide`);
    const fr = join(QUEUE, dir, "fr.html");
    assert.ok(existsSync(fr), `${dir} : fr.html manquant`);
    const pages = { fr: config(fr) };
    const en = join(QUEUE, dir, "en.html");
    if (existsSync(en)) pages.en = config(en);
    for (const [lang, cfg] of Object.entries(pages)) {
      const where = `${dir}/${lang}.html`;
      for (const k of ["path", "title", "description", "breadcrumb", "updated"]) assert.ok(cfg[k], `${where} : champ "${k}" manquant`);
      for (const k of ["date", "readingTime", "excerpt", "kind"]) assert.ok(cfg.article?.[k], `${where} : champ "article.${k}" manquant`);
      assert.equal(cfg.type, "article", `${where} : "type" doit valoir "article"`);
      assert.equal(cfg.article.date, date, `${where} : date de l'article différente de celle du dossier`);
      const base = lang === "fr" ? "news/" : "en/did-you-know/";
      assert.match(cfg.path, new RegExp(`^${base}[a-z0-9-]+/$`), `${where} : "path" doit être de la forme ${base}nom/`);
      assert.ok(!existsSync(join(ROOT, "site", cfg.path)), `${where} : la page ${cfg.path} existe déjà sur le site`);
      assert.ok(!paths.has(cfg.path), `${where} : emplacement ${cfg.path} déjà prévu par un autre article`);
      paths.add(cfg.path);
      const html = readFileSync(join(QUEUE, dir, `${lang}.html`), "utf8");
      assert.match(html, /<nav class="post-nav"[^>]*>[\s\S]*?<\/nav>/, `${where} : navigation entre articles absente`);
      assert.ok(!html.includes("—"), `${where} : tiret cadratin interdit`);
      assert.ok(!/\bDSE\b/.test(html), `${where} : abréviation du nom de l'entreprise interdite`);
    }
    if (pages.en) assert.equal(pages.en.alternate, `/${pages.fr.path}`, `${dir}/en.html : "alternate" doit pointer vers /${pages.fr.path}`);
  }
});
