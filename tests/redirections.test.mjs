// Redirections de netlify.toml (anciennes adresses Wix) : chaque règle est permanente (301), mène à une page
// qui existe dans site/ (donc sans chaîne de redirections), et les règles génériques passent en dernier.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const rules = readFileSync(join(ROOT, "netlify.toml"), "utf8")
  .split("[[redirects]]")
  .slice(1)
  .map((block) => ({
    from: block.match(/from = "([^"]+)"/)[1],
    to: block.match(/to = "([^"]+)"/)[1],
    status: Number(block.match(/status = (\d+)/)[1]),
  }));

// Une adresse correspond-elle au motif d'une règle (* = tout le reste de l'adresse) ?
const matches = (pattern, path) => {
  const strip = (p) => p.replace(/\/$/, "") || "/";
  if (!pattern.includes("*")) return strip(pattern) === strip(path);
  return path.startsWith(pattern.slice(0, pattern.indexOf("*")));
};
const fileFor = (path) => {
  const p = path.split(/[?#]/)[0];
  return join(ROOT, "site", p.endsWith("/") ? `${p}index.html` : p);
};

test("redirections : 301 vers une page existante, sans chaîne", () => {
  for (const r of rules.filter((r) => r.status !== 404)) {
    assert.equal(r.status, 301, `${r.from} : redirection ${r.status}, 301 attendu`);
    // Netlify sert un fichier existant avant toute redirection non forcée : une destination qui existe
    // ne peut pas être redirigée à son tour.
    assert.ok(existsSync(fileFor(r.to)), `${r.from} -> ${r.to} : page introuvable dans site/`);
    assert.ok(!/force\s*=\s*true/.test(readFileSync(join(ROOT, "netlify.toml"), "utf8")), "règle forcée : vérifier les chaînes à la main");
  }
});

test("redirections : anciennes pages Wix de l'audit SEO du 28/10/2026", () => {
  const attendues = {
    "/trouver-un-electro": "/news/repertoire-national-des-electros/",
    "/inscription-electro": "/contact/?objet=candidature",
    "/bilan-de-puissance-exposant": "/bilan-de-puissance/",
    "/bilan-de-puissance-prod": "/bilan-de-puissance/",
    "/calculs-electriques-tetra": "/calculette-electro/",
    "/calculs-electriques-mono": "/calculette-electro/",
    "/copie-de-calculette-tetra": "/calculette-electro/",
    "/projecteur-led-dimmable": "/nos-produits/",
    "/test": "/",
    "/test-externe": "/bilan-de-puissance/",
    "/100w": "/nos-produits/",
    "/single-post/2017/05/08/le-sais-tu-quest-ce-quun-groupe-twin-zéro-coupure": "/news/groupe-twin-zero-coupure/",
    "/single-post/2017/05/08/le-sais-tu-la-section-de-câble-dépend-de-lintensité-mais-aussi-de-la-longueur": "/news/section-de-cable/",
    "/single-post/2017/05/08/le-sais-tu-pourquoi-ça-saute": "/news/pourquoi-ca-saute/",
    "/single-post/saistucequestladistributionelectrique": "/news/distribution-electrique-evenementielle/",
    "/single-post/2016/06/23/répertoire-national-des-électros": "/news/repertoire-national-des-electros/",
    "/single-post/2016/05/25/création-de-dark-side-energy-1": "/news/creation-dark-side-energy/",
    "/single-post/2016/01/01/article-inconnu": "/news/",
    "/post/article-inconnu": "/news/",
  };
  for (const [from, to] of Object.entries(attendues)) {
    for (const path of [from, `${from}/`]) {
      const first = rules.find((r) => matches(r.from, path));
      assert.ok(first, `${path} : aucune redirection`);
      assert.equal(first.to, to, `${path} : redirigée vers ${first.to}, ${to} attendu`);
      assert.equal(first.status, 301, `${path} : statut ${first.status}`);
    }
  }
});

test("redirections : les règles génériques passent après les règles précises", () => {
  for (const generic of ["/single-post/*", "/post/*", "/blog/*", "/en/*"]) {
    const at = rules.findIndex((r) => r.from === generic);
    assert.ok(at > -1, `${generic} : règle absente`);
    const prefix = generic.slice(0, -1);
    const later = rules.slice(at + 1).find((r) => r.from.startsWith(prefix));
    assert.ok(!later, `${later?.from} est masquée par ${generic}, placée avant`);
  }
});

test("sitemap : aucune adresse redirigée", () => {
  const locs = [...readFileSync(join(ROOT, "site/sitemap.xml"), "utf8").matchAll(/<loc>https:\/\/[^/]+([^<]*)<\/loc>/g)].map((m) => m[1]);
  for (const loc of locs) {
    const r = rules.find((o) => o.status === 301 && matches(o.from, loc));
    assert.ok(!r, `${loc} est dans le sitemap mais redirigée par ${r?.from}`);
  }
});
