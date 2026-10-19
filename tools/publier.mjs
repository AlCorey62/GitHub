#!/usr/bin/env node
// Publication programmée des articles « Le sais-tu ? » : node tools/publier.mjs [--date AAAA-MM-JJ]
//
// Les articles validés attendent dans editorial/a-paraitre/<AAAA-MM-JJ>-<nom>/ :
//   fr.html  page française complète (obligatoire)
//   en.html  page anglaise (facultative)
// Chaque page porte dans sa configuration "path" (emplacement sous site/, par exemple "news/mon-article/")
// et "article" : date, readingTime, excerpt (résumé de la carte), kind (étiquette de la carte).
//
// Pour chaque dossier dont la date est arrivée (heure de Paris), le script :
//   - place les pages dans site/,
//   - relie l'article au précédent (navigation « article suivant / précédent »),
//   - ajoute sa carte en tête de la liste des articles et des trois derniers articles de l'accueil,
//   - l'ajoute à llms.txt (tools/site.config.mjs),
//   - supprime le dossier d'attente.
// Il faut ensuite lancer npm run build, npm run check et npm test (voir editorial/README.md).

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "site");
const QUEUE = join(ROOT, "editorial", "a-paraitre");

const L = {
  fr: { index: "news/index.html", home: "index.html", homePrefix: "news/", read: "Lire", kind: "Le sais-tu ?" },
  en: { index: "en/did-you-know/index.html", home: "en/index.html", homePrefix: "did-you-know/", read: "Read", kind: "Did you know?" },
};
const MONTHS = {
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

const arg = process.argv.indexOf("--date");
const today = arg > -1 ? process.argv[arg + 1] : new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`Date invalide : ${today}`);

const read = (rel) => readFileSync(join(SITE, rel), "utf8");
const write = (rel, s) => writeFileSync(join(SITE, rel), s);

function config(html, file) {
  const m = html.match(/<!--page\s*([\s\S]*?)-->/);
  if (!m) throw new Error(`Configuration absente : ${file}`);
  return { cfg: JSON.parse(m[1]), raw: m[0] };
}

function longDate(iso, lang) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[lang][m - 1]} ${y}`;
}

function card(page, lang, href, delay) {
  const a = page.cfg.article;
  return [
    `        <a class="card card--link post-card reveal"${delay ? ` data-delay="${delay}"` : ""} href="${href}">`,
    `          <p class="post-card__meta"><span class="kind">${a.kind || L[lang].kind}</span><time datetime="${a.date}">${longDate(a.date, lang)}</time><span>${a.readingTime}</span></p>`,
    `          <h3>${page.cfg.title}</h3>`,
    `          <p>${a.excerpt || page.cfg.description}</p>`,
    `          <span class="link-arrow">${L[lang].read}<svg data-icon="arrow-right"></svg></span>`,
    `        </a>`,
  ].join("\n");
}

// Première carte de la liste des articles : l'article le plus récent déjà publié
function newest(lang) {
  const html = read(L[lang].index);
  const grid = html.indexOf('<div class="grid grid--2">');
  const m = html.slice(grid).match(/<a class="card card--link post-card reveal"[^>]*href="([^"]+)">[\s\S]*?<h3>([\s\S]*?)<\/h3>/);
  return m ? { slug: m[1].replace(/\/$/, ""), title: m[2] } : null;
}

function publishPage(page, lang) {
  const slug = page.cfg.path.replace(/\/$/, "").split("/").pop();
  const prev = newest(lang);

  // 1. La page, avec sa navigation vers l'article précédent
  const cfg = { ...page.cfg };
  delete cfg.path;
  let html = page.html.replace(page.raw, `<!--page\n${JSON.stringify(cfg, null, 2)}\n-->`);
  const nav = [
    `<nav class="post-nav" aria-label="Articles">`,
    `        <span></span>`,
    prev ? `        <a class="link-arrow" href="../${prev.slug}/">${prev.title}<svg data-icon="arrow-right"></svg></a>` : "",
    `      </nav>`,
  ]
    .filter(Boolean)
    .join("\n");
  if (!/<nav class="post-nav"[^>]*>[\s\S]*?<\/nav>/.test(html)) throw new Error(`Navigation absente dans la page ${page.cfg.path}`);
  html = html.replace(/<nav class="post-nav"[^>]*>[\s\S]*?<\/nav>/, nav);
  const dest = join(SITE, page.cfg.path, "index.html");
  if (existsSync(dest)) throw new Error(`La page existe déjà : ${page.cfg.path}`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, html);

  // 2. L'article précédent pointe vers le nouveau
  if (prev) {
    const prevFile = join(dirname(L[lang].index), prev.slug, "index.html");
    let p = read(prevFile);
    const before = p;
    p = p.replace(
      /(<nav class="post-nav"[^>]*>\s*)<span><\/span>/,
      `$1<a class="link-arrow" href="../${slug}/"><svg data-icon="arrow-left"></svg>${page.cfg.title}</a>`
    );
    if (p === before) throw new Error(`Navigation de ${prevFile} : emplacement « article suivant » introuvable`);
    write(prevFile, p);
  }

  // 3. Carte en tête de la liste des articles
  let index = read(L[lang].index);
  const at = index.indexOf('<div class="grid grid--2">') + '<div class="grid grid--2">'.length;
  index = index.slice(0, at) + "\n" + card(page, lang, `${slug}/`) + index.slice(at);
  write(L[lang].index, index);

  // 4. Accueil : les trois derniers articles
  let home = read(L[lang].home);
  const re = new RegExp(`<a class="card card--link post-card reveal"[^>]*href="${L[lang].homePrefix}[^"]+">[\\s\\S]*?</a>`, "g");
  const cards = home.match(re) || [];
  if (cards.length !== 3) throw new Error(`Accueil ${L[lang].home} : 3 cartes d'articles attendues, ${cards.length} trouvées`);
  const start = home.indexOf(cards[0]);
  const end = home.indexOf(cards[2]) + cards[2].length;
  const kept = cards.slice(0, 2).map((c, i) => c.replace(/ data-delay="\d"/, "").replace('reveal"', `reveal" data-delay="${i + 1}"`));
  const fresh = card(page, lang, `${L[lang].homePrefix}${slug}/`).trimStart();
  home = home.slice(0, start) + [fresh, ...kept].join("\n        ") + home.slice(end);
  write(L[lang].home, home);
  return slug;
}

function addToLlms(path) {
  const file = join(ROOT, "tools", "site.config.mjs");
  const s = readFileSync(file, "utf8");
  const anchor = '"/news/", ';
  if (!s.includes(anchor)) throw new Error("site.config.mjs : liste des articles de llms.txt introuvable");
  writeFileSync(file, s.replace(anchor, `${anchor}"/${path}", `));
}

const due = existsSync(QUEUE)
  ? readdirSync(QUEUE)
      .filter((d) => /^\d{4}-\d{2}-\d{2}-/.test(d) && d.slice(0, 10) <= today)
      .sort()
  : [];

const published = [];
for (const dir of due) {
  const folder = join(QUEUE, dir);
  const pages = {};
  for (const lang of ["fr", "en"]) {
    const file = join(folder, `${lang}.html`);
    if (!existsSync(file)) continue;
    const html = readFileSync(file, "utf8");
    const { cfg, raw } = config(html, file);
    if (!cfg.path || !cfg.article?.date) throw new Error(`${dir}/${lang}.html : "path" et "article.date" sont obligatoires`);
    if (cfg.article.date !== dir.slice(0, 10)) throw new Error(`${dir}/${lang}.html : la date de l'article (${cfg.article.date}) diffère de celle du dossier`);
    pages[lang] = { html, cfg, raw };
  }
  if (!pages.fr) throw new Error(`${dir} : fr.html manquant`);
  const slug = publishPage(pages.fr, "fr");
  addToLlms(pages.fr.cfg.path);
  if (pages.en) publishPage(pages.en, "en");
  rmSync(folder, { recursive: true });
  published.push(`${dir.slice(0, 10)} ${pages.fr.cfg.title} (/${pages.fr.cfg.path})`);
  console.log(`publié : ${slug}${pages.en ? " (FR et EN)" : " (FR)"}`);
}

if (!published.length) console.log(`Aucun article à publier au ${today}.`);
// Résumé pour le message de commit de la tâche GitHub (fichier indiqué par PUBLICATION_RESUME)
if (process.env.PUBLICATION_RESUME) writeFileSync(process.env.PUBLICATION_RESUME, published.join("\n"));
