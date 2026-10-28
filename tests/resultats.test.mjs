// Page privée des résultats du questionnaire (/resultats/) : jamais indexée ni reliée au reste du site,
// sans mesure d'audience ; la fonction Netlify « resultats » exige la clé du lien secret et ne renvoie ni
// adresse IP ni navigateur ; les trois formats de réponse du formulaire « satisfaction » sont lus.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normaliser } from "../netlify/functions/resultats/normaliser.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "site");
const read = (rel) => readFileSync(join(SITE, rel), "utf8");

test("résultats : page non indexée, sans Google Analytics, absente du sitemap, de llms et des liens", () => {
  const html = read("resultats/index.html");
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.ok(!/<link rel="canonical"/.test(html), "pas d'adresse canonique");
  assert.ok(!/name="ga4"/.test(html), "pas de mesure d'audience sur la page privée");
  assert.ok(!existsSync(join(SITE, "resultats", "index.html.md")), "pas de version Markdown");
  for (const f of ["sitemap.xml", "llms.txt", "llms-full.txt"]) assert.ok(!read(f).includes("/resultats/"), `${f} cite la page privée`);
  const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : n.endsWith(".html") ? [join(d, n)] : []));
  for (const file of walk(SITE)) {
    if (file.endsWith(join("resultats", "index.html"))) continue;
    assert.ok(!/href="[^"]*resultats\//.test(readFileSync(file, "utf8")), `${file} renvoie vers la page privée`);
  }
  assert.match(readFileSync(join(ROOT, "netlify.toml"), "utf8"), /for = "\/resultats\/\*"\s+\[headers\.values\]\s+X-Robots-Tag = "noindex, nofollow"/);
});

test("résultats : la fonction exige la clé et ne transmet pas les données techniques", async () => {
  const src = readFileSync(join(ROOT, "netlify/functions/resultats/resultats.mjs"), "utf8");
  assert.match(src, /timingSafeEqual/, "comparaison de clé à temps constant");
  assert.match(src, /cle\.length < 24/, "clé trop courte refusée");
  const { default: fonction } = await import("../netlify/functions/resultats/resultats.mjs");
  const env = { ...process.env };
  try {
    delete process.env.RESULTATS_CLE;
    assert.equal((await fonction(new Request("https://x/"), { site: { id: "s" } })).status, 503, "non configurée");
    process.env.RESULTATS_CLE = "cle-de-test-0123456789abcdef";
    process.env.RESULTATS_NETLIFY_TOKEN = "jeton";
    const sans = await fonction(new Request("https://x/"), { site: { id: "s" } });
    assert.equal(sans.status, 401, "sans clé");
    const fausse = await fonction(new Request("https://x/", { headers: { Authorization: "Bearer cle-de-test-0123456789abcdeX" } }), { site: { id: "s" } });
    assert.equal(fausse.status, 401, "mauvaise clé");
    assert.equal((await fonction(new Request("https://x/", { method: "POST" }), {})).status, 405);
  } finally {
    process.env = env;
  }
  const r = normaliser({ id: "1", created_at: "2026-10-28T12:38:10Z", data: { nom: "A", ip: "1.2.3.4", user_agent: "UA", referrer: "https://x/?nom=A" } });
  assert.ok(!JSON.stringify(r).match(/1\.2\.3\.4|UA|referrer/), "ni IP, ni navigateur, ni provenance");
});

test("résultats : les trois formats de réponse donnent les mêmes notes", () => {
  const ancien = normaliser({ created_at: "2026-10-28T10:17:04Z", data: { note_globale: "5", note_reactivite: "5", note_budget: "4", note_regie: "", recommandation: "oui", presta_distribution: "oui", presta_bureau: "" } });
  assert.deepEqual(ancien.notes, { note_globale: 5, note_reactivite: 5, note_budget: 4 });
  assert.equal(ancien.recommandation, "oui");
  assert.deepEqual(ancien.prestations, ["distribution"]);
  const texte = normaliser({ data: { notes: "Note globale : 4/5\nRégie technique (qualité du personnel mis à disposition) : 3/5\nRespect du budget et des délais : sans note", recommandation: "Peut-être" } });
  assert.deepEqual(texte.notes, { note_globale: 4, note_regie: 3 });
  assert.equal(texte.recommandation, "peut-etre");
  const anglais = normaliser({ data: { notes: "Overall rating: 2/5\nEngineering office (quality of studies and plans): 5/5", recommandation: "No" } });
  assert.deepEqual(anglais.notes, { note_globale: 2, note_etudes: 5 });
  assert.equal(anglais.recommandation, "non");
  const valeurs = normaliser({ data: { notes: "Note globale : 1/5", valeurs: "note_globale=4; note_consulting=5; note_budget=9; recommandation=oui" } });
  assert.deepEqual(valeurs.notes, { note_globale: 4, note_consulting: 5 }, "« valeurs » prime, note hors échelle ignorée");
  assert.equal(valeurs.recommandation, "oui");
});

test("questionnaire : le champ « valeurs » est envoyé pour la page des résultats", () => {
  for (const rel of ["avis/index.html", "en/review/index.html"]) assert.match(read(rel), /<input type="hidden" name="valeurs" value="">/, rel);
  assert.match(read("assets/js/avis.js"), /form\.elements\.valeurs\.value = /);
});
