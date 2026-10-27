// Publications des réseaux sociaux (editorial/semaines) : vérifiées avant validation, pour que la diffusion
// programmée (tools/diffusion.mjs) trouve chaque jour son texte, son visuel et son lien.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { lireSemaine, addDays, little } from "../tools/publications.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEEKS = join(ROOT, "editorial", "semaines");
const weeks = existsSync(WEEKS) ? readdirSync(WEEKS).filter((d) => existsSync(join(WEEKS, d, "publications.md"))) : [];

test("semaines : jours, textes, visuels et liens", () => {
  for (const dir of weeks) {
    assert.match(dir, /^\d{4}-\d{2}-\d{2}$/, `${dir} : nom attendu AAAA-MM-JJ`);
    assert.equal(new Date(`${dir}T12:00:00Z`).getUTCDay(), 1, `${dir} : le dossier doit porter la date du lundi`);
    const week = lireSemaine(join(WEEKS, dir));
    assert.ok(week.days.length, `${dir} : aucun jour trouvé`);
    const dates = new Set();
    for (const d of week.days) {
      const where = `${dir}, ${d.head}`;
      assert.ok(d.date >= dir && d.date <= addDays(dir, 6), `${where} : jour hors de la semaine`);
      assert.ok(!dates.has(d.date), `${where} : deux sections pour le même jour`);
      dates.add(d.date);
      assert.ok(d.linkedin, `${where} : texte LinkedIn manquant`);
      assert.ok(d.facebook, `${where} : texte Facebook manquant`);
      assert.ok(d.visual && existsSync(join(WEEKS, dir, d.visual)), `${where} : visuel manquant`);
      assert.match(d.link, /^https:\/\/www\.darkside-energy\.com\//, `${where} : lien vers le site attendu`);
      for (const text of [d.linkedin, d.facebook]) {
        assert.ok(!text.includes("\u2014"), `${where} : tiret cadratin`);
        assert.ok(!/\bDSE\b/.test(text), `${where} : abréviation interdite`);
      }
    }
    const journal = join(WEEKS, dir, "diffusion.json");
    if (existsSync(journal)) {
      for (const date of Object.keys(JSON.parse(readFileSync(journal, "utf8")))) assert.ok(dates.has(date), `${dir}/diffusion.json : ${date} inconnu`);
    }
  }
});

test("diffusion : essai à blanc sur chaque jour, sans rien envoyer", () => {
  for (const dir of weeks) {
    for (const d of lireSemaine(join(WEEKS, dir)).days) {
      const env = { ...process.env, FACEBOOK_PAGE_ID: "", FACEBOOK_PAGE_TOKEN: "", DIFFUSION_RESUME: "" };
      const run = spawnSync(process.execPath, [join(ROOT, "tools", "diffusion.mjs"), "--essai", "--date", d.date], { env, encoding: "utf8" });
      assert.equal(run.status, 0, `${dir}, ${d.head} : ${run.stderr}`);
      assert.match(run.stdout, /Facebook \(essai|déjà envoyé|non validée/, `${dir}, ${d.head} : ${run.stdout}`);
      assert.match(run.stdout, /LinkedIn (\(essai|: jusqu'au|: déjà envoyé)|non validée/, `${dir}, ${d.head} : ${run.stdout}`);
    }
  }
});

test("LinkedIn : texte au format little (caractères réservés, mots-clés)", () => {
  assert.equal(little("Prises bleues (230 V) : a_b *c* @d"), "Prises bleues \\(230 V\\) : a\\_b \\*c\\* \\@d");
  assert.equal(little("Lien\n#événementiel #P17"), "Lien\n{hashtag|\\#|événementiel} {hashtag|\\#|P17}");
  assert.equal(little("C# et https://exemple.fr/?v=1&u=A"), "C\\# et https://exemple.fr/?v=1&u=A");
  for (const dir of weeks) {
    for (const d of lireSemaine(join(WEEKS, dir)).days) {
      const rest = little(d.linkedin).replace(/\{hashtag\|\\#\|[^}]*\}/g, "").replace(/\\./g, "");
      assert.ok(!/[|{}@[\]()<>#\\*_~]/.test(rest), `${dir}, ${d.head} : caractère réservé non échappé`);
    }
  }
});
