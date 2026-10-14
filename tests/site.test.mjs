// Contrôles du site construit : `node --test`
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const SITE = new URL("../site/", import.meta.url).pathname;
const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".html")) pages.push(p);
  }
})(SITE);

test("chaque script intégré aux pages est autorisé par la politique de sécurité (CSP)", () => {
  const toml = readFileSync(new URL("../netlify.toml", import.meta.url), "utf8");
  const csp = toml.match(/Content-Security-Policy = "([^"]+)"/)[1];
  const seen = new Set();
  for (const file of pages) {
    const html = readFileSync(file, "utf8");
    for (const m of html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)) {
      const hash = createHash("sha256").update(m[1]).digest("base64");
      if (seen.has(hash)) continue;
      seen.add(hash);
      assert.ok(csp.includes(`'sha256-${hash}'`), `${file.replace(SITE, "")} : script intégré non autorisé (sha256-${hash})`);
    }
  }
  assert.ok(seen.size >= 1);
});

test("calculette : les réseaux de la page correspondent au moteur de calcul", async () => {
  const { NETWORKS } = await import("../site/assets/js/elec.js");
  for (const [file, lang] of [["calculette-electro/index.html", "fr"], ["en/electrical-calculator/index.html", "en"]]) {
    // Espaces insécables de la typographie française ramenées à des espaces simples
    const html = readFileSync(join(SITE, file), "utf8").replace(/[\u00a0\u202f]/g, " ");
    for (const n of NETWORKS) {
      assert.ok(html.includes(`<option value="${n.id}"`), `${file} : réseau ${n.id} absent du menu`);
      assert.ok(html.includes(`${n.mono}/${n.tri} V`), `${file} : ${n.mono}/${n.tri} V absent`);
      assert.ok(html.includes(n[lang]), `${file} : libellé « ${n[lang]} » absent`);
    }
  }
});
