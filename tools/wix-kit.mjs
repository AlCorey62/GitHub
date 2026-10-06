#!/usr/bin/env node
// Dossier de passation pour reconstruire le site dans Wix : node tools/wix-kit.mjs
// Source : les pages assemblées de site/ (lancer `node tools/build.mjs` avant).
// Produit dans wix/ :
//  - pages.csv : plan page par page (adresse Wix, action, titre et description SEO, H1, texte, images)
//  - textes/ : texte de chaque page en Markdown, liens convertis aux adresses Wix
//  - donnees-structurees/<page>/ : blocs JSON-LD adaptés aux adresses Wix (sans barre finale)
//  - llms.txt : résumé pour les IA, adapté aux adresses Wix
// La note wix/README.md est rédigée à la main et n'est pas modifiée par ce script.

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, NAV } from "./site.config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_DIR = join(ROOT, "site");
const OUT = join(ROOT, "wix");

// Correspondance avec le site Wix actuel (adresses relevées le 25/09/2026 sur www.darkside-energy.com).
// Les 8 articles existent déjà dans le blog Wix : on garde leur adresse, aucune redirection à créer.
const WIX = {
  "/": ["/", "Mettre à jour (page d'accueil existante)"],
  "/distribution-electrique/": ["/distribution-electrique", "Mettre à jour"],
  "/regie-technique/": ["/regie-technique", "Mettre à jour"],
  "/coordination-generale/": ["/coordination-generale", "Créer"],
  "/bureaudetude/": ["/bureaudetude", "Mettre à jour"],
  "/consulting/": ["/consulting", "Mettre à jour"],
  "/nos-produits/": ["/nos-produits", "Mettre à jour"],
  "/energie-responsable/": ["/energie-responsable", "Créer"],
  "/references/": ["/references", "Créer"],
  "/bilan-de-puissance/": ["/bilan-de-puissance", "Renommer la page /test-externe (redirection 301)"],
  "/calculette-electro/": ["/calculette-electro", "Mettre à jour"],
  "/news/": ["/news", "Mettre à jour (page du blog)"],
  "/faq/": ["/faq", "Créer"],
  "/lexique/": ["/lexique", "Créer"],
  "/entreprise/": ["/entreprise", "Créer"],
  "/contact/": ["/contact", "Mettre à jour (formulaire Wix)"],
  "/mentions-legales/": ["/mentions-legales", "Mettre à jour (compléter les mentions « à compléter »)"],
  "/news/distribution-electrique-evenementielle/": ["/single-post/saistucequestladistributionelectrique", "Mettre à jour l'article existant"],
  "/news/groupe-twin-zero-coupure/": ["/single-post/2017/05/08/le-sais-tu-quest-ce-quun-groupe-twin-zéro-coupure", "Mettre à jour l'article existant"],
  "/news/section-de-cable/": ["/single-post/2017/05/08/le-sais-tu-la-section-de-câble-dépend-de-lintensité-mais-aussi-de-la-longueur", "Mettre à jour l'article existant"],
  "/news/pourquoi-ca-saute/": ["/single-post/2017/05/08/le-sais-tu-pourquoi-ça-saute", "Mettre à jour l'article existant"],
  "/news/lille-grand-palais-2016/": ["/single-post/2016/10/06/lille-grand-palais", "Mettre à jour l'article existant"],
  "/news/repertoire-national-des-electros/": ["/single-post/2016/06/23/répertoire-national-des-électros", "Mettre à jour l'article existant"],
  "/news/fetes-maritimes-brest-2016/": ["/single-post/2016/05/26/fêtes-maritimes-internationales-de-brest-2016", "Mettre à jour l'article existant"],
  "/news/creation-dark-side-energy/": ["/single-post/2016/05/25/création-de-dark-side-energy-1", "Mettre à jour l'article existant"],
};
// Pages du nouveau site sans équivalent Wix
const SKIP = {
  "/contact/merci/": "Pas de page : message de confirmation du formulaire Wix",
  "/404.html": "Pas de page : page 404 de Wix (personnalisation facultative)",
};

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const text = (html) => decode(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== "assets") walk(p, out);
    } else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

function pageUrl(file) {
  const rel = relative(SITE_DIR, file).split(sep).join("/");
  if (rel === "index.html") return "/";
  return rel.endsWith("/index.html") ? "/" + rel.slice(0, -"index.html".length) : "/" + rel;
}

// Adresse absolue du site Wix (caractères accentués encodés, comme le fait le navigateur)
const wixUrl = (path) => SITE.url + (path === "/" ? "/" : encodeURI(path));

// Réécrit une adresse du nouveau site vers son équivalent Wix.
// Les images n'ont pas d'adresse connue avant leur import dans Wix : on laisse un repère à remplacer.
const unknown = new Set();
function rewrite(url) {
  if (!url.startsWith(SITE.url + "/")) return url;
  // Le paramètre ?objet= (objet présélectionné dans le formulaire) n'a pas d'équivalent dans les formulaires Wix
  const [pathQuery, hash = ""] = url.slice(SITE.url.length).split("#");
  const path = pathQuery.split("?")[0];
  if (path.startsWith("/assets/img/")) return `{{URL_WIX:${path.slice("/assets/img/".length)}}}`;
  const target = WIX[path];
  if (!target) {
    unknown.add(path);
    return url;
  }
  return wixUrl(target[0]) + (hash ? `#${hash}` : "");
}
const deep = (v) =>
  typeof v === "string" ? rewrite(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v;
const rewriteText = (s) => s.replace(/https:\/\/www\.darkside-energy\.com\/[^\s)>\]"]*/g, (u) => rewrite(u));

// Ordre du plan : celui de la navigation, puis le reste du site, puis les articles
const navOrder = ["/", ...NAV.flatMap((n) => (n.children ? n.children.map((c) => "/" + c.href) : ["/" + n.href]))];
const order = [...navOrder, ...Object.keys(WIX).filter((u) => !navOrder.includes(u))];

const pages = new Map();
for (const file of walk(SITE_DIR)) {
  const url = pageUrl(file);
  if (SKIP[url]) continue;
  if (!WIX[url]) throw new Error(`Page sans correspondance Wix : ${url} (compléter WIX dans tools/wix-kit.mjs)`);
  const html = readFileSync(file, "utf8");
  const cfg = JSON.parse(html.match(/<!--page\s*([\s\S]*?)-->/)[1]);
  const title = text(html.match(/<title>([\s\S]*?)<\/title>/)[1]);
  const h1 = text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1]);
  const images = [...new Set([...html.matchAll(/assets\/img\/([\w.-]+?)(?:-\d+)?\.(?:jpg|png|webp)/g)].map((m) => m[1]))].filter(
    (n) => !/^(logo|og-image|icon|favicon|apple-touch)/.test(n)
  );
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  pages.set(url, { url, file, cfg, title, h1, images, ld });
}
for (const u of Object.keys(WIX)) if (!pages.has(u)) throw new Error(`Page absente du site : ${u}`);

rmSync(join(OUT, "donnees-structurees"), { recursive: true, force: true });
mkdirSync(join(OUT, "donnees-structurees"), { recursive: true });

// Données structurées : pas pour les articles (Wix Blog produit son propre balisage d'article)
const isPost = (u) => u.startsWith("/news/") && u !== "/news/";
let blocks = 0;
const ldDir = (u) => (u === "/" ? "accueil" : u.replace(/^\/|\/$/g, "").replace(/\//g, "-"));
for (const p of pages.values()) {
  if (isPost(p.url)) continue;
  const dir = join(OUT, "donnees-structurees", ldDir(p.url));
  mkdirSync(dir, { recursive: true });
  p.ld.forEach((obj, i) => {
    const out = deep(obj);
    writeFileSync(join(dir, `${i + 1}-${out["@type"]}.json`), JSON.stringify(out, null, 2) + "\n");
    blocks++;
  });
}

// Textes : version Markdown de chaque page, sans les lignes de métadonnées (description, source),
// liens convertis aux adresses Wix
rmSync(join(OUT, "textes"), { recursive: true, force: true });
mkdirSync(join(OUT, "textes"), { recursive: true });
const textFile = (u, i) => `${String(i + 1).padStart(2, "0")}-${ldDir(u)}.md`;
order.forEach((u, i) => {
  const p = pages.get(u);
  const md = readFileSync(join(dirname(p.file), "index.html.md"), "utf8")
    .split("\n")
    .filter((l) => l !== `> ${p.cfg.description}` && !l.startsWith("Source : "))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  writeFileSync(join(OUT, "textes", textFile(u, i)), rewriteText(md));
});

// Plan des pages (CSV point-virgule, UTF-8 avec BOM pour Excel)
const csv = (v) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const rows = [
  ["Ordre", "Page du nouveau site", "Adresse Wix", "Action", "Titre SEO (balise title)", "Description SEO", "Titre H1", "Texte à reprendre", "Images", "Données structurées"],
];
order.forEach((u, i) => {
  const p = pages.get(u);
  const [wix, action] = WIX[u];
  rows.push([
    String(i + 1),
    u,
    wix,
    action,
    p.title,
    p.cfg.description,
    p.h1,
    `wix/textes/${textFile(u, i)}`,
    p.images.join(", "),
    isPost(u) ? "Aucune (balisage du blog Wix)" : `wix/donnees-structurees/${ldDir(u)}/`,
  ]);
});
for (const [u, why] of Object.entries(SKIP)) rows.push(["", u, "", why, "", "", "", "", "", ""]);
writeFileSync(join(OUT, "pages.csv"), "\ufeff" + rows.map((r) => r.map(csv).join(";")).join("\r\n") + "\r\n");

// llms.txt adapté : adresses Wix, sans les versions Markdown ni llms-full.txt (absentes sur Wix)
const llms = readFileSync(join(SITE_DIR, "llms.txt"), "utf8")
  .split("\n")
  .filter((l) => !l.startsWith("Chaque page existe aussi en Markdown"))
  .join("\n")
  .replace(/\n{3,}/g, "\n\n");
writeFileSync(join(OUT, "llms.txt"), rewriteText(llms));

if (unknown.size) console.warn(`Adresses sans équivalent Wix laissées telles quelles : ${[...unknown].join(", ")}`);
console.log(`wix/ : ${pages.size} pages dans pages.csv, ${blocks} blocs de données structurées et llms.txt`);
