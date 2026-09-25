#!/usr/bin/env node
// Assemble les blocs communs dans chaque page HTML de site/ :
//   <!-- head:start --> ... <!-- head:end -->             balises <head> (SEO, favicons, CSS, JS)
//   <!-- header:start --> ... <!-- header:end -->         en-tête et navigation
//   <!-- breadcrumb:start --> ... <!-- breadcrumb:end --> fil d'Ariane
//   <!-- footer:start --> ... <!-- footer:end -->         pied de page
//   <svg data-icon="nom"></svg> / <svg data-logo="horizontal|stacked"></svg>
// puis applique les espaces insécables de la typographie française et régénère :
//   sitemap.xml, llms.txt, llms-full.txt et une version Markdown de chaque page (index.html.md)
//   destinées aux moteurs de recherche et aux assistants IA.
// Le script est idempotent : on peut le relancer autant de fois que nécessaire.
//
// Usage : node tools/build.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, sep } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { SITE, NAV, CTA, ENTITY, LLMS } from "./site.config.mjs";
import { pageToMarkdown } from "./markdown.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_DIR = join(ROOT, "site");
const ICONS = JSON.parse(readFileSync(join(ROOT, "tools/icons.json"), "utf8"));

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// --- Fichiers ---------------------------------------------------------------

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "assets") continue;
      walk(p, out);
    } else if (name.endsWith(".html")) {
      out.push(p);
    }
  }
  return out;
}

const hashOf = (p) => createHash("md5").update(readFileSync(p)).digest("hex").slice(0, 8);

function pageUrl(file) {
  const rel = relative(SITE_DIR, file).split(sep).join("/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return "/" + rel.slice(0, -"index.html".length);
  return "/" + rel;
}

function rootPrefix(file, cfg) {
  if (cfg.absoluteRoot) return "/";
  const depth = relative(SITE_DIR, dirname(file)).split(sep).filter(Boolean).length;
  return depth === 0 ? "./" : "../".repeat(depth);
}

// --- SVG --------------------------------------------------------------------

function icon(name, extraAttrs = "") {
  const ic = ICONS[name];
  if (!ic) throw new Error(`Icône inconnue : ${name}`);
  const base =
    ic.type === "fill"
      ? `viewBox="0 0 24 24" fill="currentColor"`
      : `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
  return `<svg data-icon="${name}"${extraAttrs} ${base} aria-hidden="true" focusable="false">${ic.body}</svg>`;
}

function loadLogo(file) {
  const svg = readFileSync(join(SITE_DIR, "assets/img", file), "utf8");
  return {
    viewBox: svg.match(/viewBox="([^"]+)"/)[1],
    d: svg.match(/ d="([^"]+)"/)[1],
  };
}

const LOGOS = {
  horizontal: loadLogo("logo-dark-side-energy.svg"),
  stacked: loadLogo("logo-dark-side-energy-empile.svg"),
};

function logo(kind, extraAttrs = "") {
  const l = LOGOS[kind];
  if (!l) throw new Error(`Logo inconnu : ${kind}`);
  return `<svg data-logo="${kind}"${extraAttrs} viewBox="${l.viewBox}" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="${l.d}"/></svg>`;
}

const GENERATED_ATTRS = /\s(viewBox|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|aria-hidden|focusable)="[^"]*"/g;

function expandSvgs(html) {
  html = html.replace(/<svg data-icon="([a-z0-9-]+)"([^>]*)>[\s\S]*?<\/svg>/g, (_, name, attrs) =>
    icon(name, attrs.replace(GENERATED_ATTRS, ""))
  );
  html = html.replace(/<svg data-logo="([a-z]+)"([^>]*)>[\s\S]*?<\/svg>/g, (_, kind, attrs) =>
    logo(kind, attrs.replace(GENERATED_ATTRS, ""))
  );
  return html;
}

// --- Blocs communs ------------------------------------------------------------

function head(cfg, ctx) {
  const { root, url, v } = ctx;
  const isHome = url === "/";
  const title = isHome ? `${SITE.name} | Distribution électrique événementielle` : `${cfg.title} | ${SITE.name}`;
  const canonical = SITE.url + url;
  const ogImage = `${SITE.url}/${cfg.image || SITE.ogImage}`;
  const lines = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(cfg.description)}">`,
    cfg.noindex ? `<meta name="robots" content="noindex, follow">` : `<link rel="canonical" href="${canonical}">`,
    cfg.noindex ? "" : `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">`,
    cfg.noindex || cfg.absoluteRoot ? "" : `<link rel="alternate" type="text/markdown" href="index.html.md" title="Version Markdown de la page">`,
    `<meta name="theme-color" content="${SITE.themeColor}">`,
    `<meta name="color-scheme" content="dark">`,
    `<meta property="og:type" content="${cfg.type === "article" ? "article" : "website"}">`,
    `<meta property="og:site_name" content="${SITE.name}">`,
    `<meta property="og:locale" content="fr_FR">`,
    `<meta property="og:title" content="${esc(cfg.ogTitle || (isHome ? SITE.name : cfg.title))}">`,
    `<meta property="og:description" content="${esc(cfg.description)}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${ogImage}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    cfg.type === "article" && cfg.article ? `<meta property="article:published_time" content="${cfg.article.date}">` : "",
    cfg.type === "article" && cfg.updated ? `<meta property="article:modified_time" content="${cfg.updated}">` : "",
    `<link rel="icon" href="${root}assets/img/favicon.svg" type="image/svg+xml">`,
    `<link rel="icon" href="${root}assets/img/favicon-32.png" sizes="32x32" type="image/png">`,
    `<link rel="apple-touch-icon" href="${root}assets/img/apple-touch-icon.png">`,
    `<link rel="manifest" href="${root}site.webmanifest">`,
    `<link rel="preload" href="${root}assets/fonts/archivo-latin-wdth-normal.woff2" as="font" type="font/woff2" crossorigin>`,
    `<link rel="stylesheet" href="${root}assets/css/main.css?v=${v.css}">`,
    `<script>document.documentElement.classList.add("js")</script>`,
    `<script src="${root}assets/js/main.js?v=${v.js}" defer></script>`,
  ];
  for (const s of cfg.scripts || []) {
    const h = hashOf(join(SITE_DIR, s));
    lines.push(`<script type="module" src="${root}${s}?v=${h}"></script>`);
  }
  for (const ld of jsonLd(cfg, ctx)) {
    lines.push(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
  }
  return lines.filter(Boolean).join("\n");
}

const ORG_ID = `${SITE.url}/#organisation`;
const SITE_ID = `${SITE.url}/#website`;

function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organisation`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: `${SITE.url}/`,
    logo: `${SITE.url}/assets/img/logo-dark-side-energy.png`,
    slogan: SITE.slogan,
    email: SITE.email,
    telephone: SITE.phoneIntl,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      postalCode: SITE.address.postalCode,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.region,
      addressCountry: SITE.address.country,
    },
    identifier: [
      { "@type": "PropertyValue", propertyID: "SIREN", value: SITE.siren.replace(/\s/g, "") },
      { "@type": "PropertyValue", propertyID: "SIRET", value: SITE.siret.replace(/\s/g, "") },
    ],
    description: ENTITY.description,
    foundingDate: ENTITY.foundingDate,
    image: `${SITE.url}/${SITE.ogImage}`,
    areaServed: ENTITY.areaServed.map((name) => ({ "@type": "Country", name })),
    knowsAbout: ENTITY.knowsAbout,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: SITE.email,
        telephone: SITE.phoneIntl,
        areaServed: "FR",
        availableLanguage: ENTITY.languages,
        url: `${SITE.url}/contact/`,
      },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Métiers et services",
      itemListElement: [
        ...NAV.find((n) => n.key === "metiers").children.map((c) => ({ label: c.label, href: c.href })),
        { label: "Location et vente de matériel de distribution électrique", href: "nos-produits/" },
      ].map((c) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: c.label, url: `${SITE.url}/${c.href}` } })),
    },
    sameAs: [...SITE.socials.map((s) => s.href), ...ENTITY.sameAs],
  };
}

const orgRef = () => ({ "@type": "Organization", "@id": ORG_ID, name: SITE.name, url: `${SITE.url}/`, logo: `${SITE.url}/assets/img/logo-dark-side-energy.png` });

const plain = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#8239;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&shy;/g, "")
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,)])/g, "$1")
    .trim();

function faqFrom(html) {
  return [...html.matchAll(/<div class="faq-item"[^>]*>\s*<h3[^>]*>([\s\S]*?)<\/h3>\s*<div class="faq-answer">([\s\S]*?)<\/div>\s*<\/div>/g)].map((m) => ({
    "@type": "Question",
    name: plain(m[1]),
    acceptedAnswer: { "@type": "Answer", text: plain(m[2]) },
  }));
}

function glossaryFrom(html, url) {
  return [...html.matchAll(/<div class="glossary__item">\s*<dt id="([^"]+)">([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>\s*<\/div>/g)].map((m) => ({
    "@type": "DefinedTerm",
    "@id": `${url}#${m[1]}`,
    name: plain(m[2]),
    description: plain(m[3]),
    inDefinedTermSet: `${url}#lexique`,
  }));
}

function jsonLd(cfg, ctx) {
  const out = [];
  const canonical = SITE.url + ctx.url;
  if (ctx.url === "/" || cfg.nav === "entreprise") {
    out.push(organizationLd());
  }
  if (ctx.url === "/") {
    out.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": SITE_ID,
      name: SITE.name,
      url: `${SITE.url}/`,
      description: ENTITY.description,
      inLanguage: "fr-FR",
      publisher: { "@id": ORG_ID },
    });
  }
  if (!cfg.noindex) {
    const page = {
      "@context": "https://schema.org",
      "@type": cfg.webPageType || "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: cfg.title,
      description: cfg.description,
      inLanguage: "fr-FR",
      isPartOf: { "@type": "WebSite", "@id": SITE_ID, name: SITE.name, url: `${SITE.url}/` },
      about: orgRef(),
      publisher: orgRef(),
      primaryImageOfPage: `${SITE.url}/${cfg.image || SITE.ogImage}`,
    };
    if (cfg.updated) page.dateModified = cfg.updated;
    if (cfg.breadcrumb && cfg.breadcrumb.length) page.breadcrumb = { "@id": `${canonical}#breadcrumb` };
    if (cfg.webPageType === "FAQPage") {
      page.mainEntity = faqFrom(ctx.html);
      page.about = orgRef();
    }
    out.push(page);
  }
  if (cfg.service) {
    out.push({
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${canonical}#service`,
      name: cfg.service.name,
      serviceType: cfg.service.type,
      description: cfg.description,
      url: canonical,
      provider: orgRef(),
      areaServed: ENTITY.areaServed.map((name) => ({ "@type": "Country", name })),
      availableChannel: {
        "@type": "ServiceChannel",
        serviceUrl: `${SITE.url}/contact/`,
        servicePhone: { "@type": "ContactPoint", telephone: SITE.phoneIntl, email: SITE.email, contactType: "sales" },
        availableLanguage: ENTITY.languages,
      },
    });
  }
  if (cfg.app) {
    out.push({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "@id": `${canonical}#application`,
      name: cfg.app.name,
      description: cfg.description,
      url: canonical,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Tout navigateur web",
      inLanguage: "fr-FR",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      featureList: cfg.app.features,
      provider: orgRef(),
    });
  }
  if (cfg.glossary) {
    out.push({
      "@context": "https://schema.org",
      "@type": "DefinedTermSet",
      "@id": `${canonical}#lexique`,
      name: cfg.title,
      description: cfg.description,
      url: canonical,
      inLanguage: "fr-FR",
      publisher: orgRef(),
      hasDefinedTerm: glossaryFrom(ctx.html, canonical),
    });
  }
  if (cfg.nav === "entreprise") {
    const p = ENTITY.person;
    out.push({
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `${canonical}#${p.id}`,
      name: p.name,
      jobTitle: p.jobTitle,
      description: p.description,
      worksFor: orgRef(),
    });
  }
  if (cfg.breadcrumb && cfg.breadcrumb.length) {
    const items = [["Accueil", ""], ...cfg.breadcrumb];
    out.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `${canonical}#breadcrumb`,
      itemListElement: items.map(([name, href], i) => ({
        "@type": "ListItem",
        position: i + 1,
        name,
        item: i === items.length - 1 ? SITE.url + ctx.url : `${SITE.url}/${href || ""}`,
      })),
    });
  }
  if (cfg.type === "article" && cfg.article) {
    out.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: cfg.title,
      description: cfg.description,
      datePublished: cfg.article.date,
      ...(cfg.updated ? { dateModified: cfg.updated } : {}),
      isPartOf: { "@id": SITE_ID },
      inLanguage: "fr-FR",
      mainEntityOfPage: SITE.url + ctx.url,
      image: `${SITE.url}/${cfg.image || SITE.ogImage}`,
      author: { "@type": "Organization", name: SITE.name, url: `${SITE.url}/` },
      publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: `${SITE.url}/assets/img/logo-dark-side-energy.png` } },
    });
  }
  return out;
}

function header(cfg, ctx) {
  const { root } = ctx;
  const active = cfg.nav || "";
  const item = (it) => {
    if (it.children) {
      const isActive = it.children.some((c) => c.key === active);
      const subId = `sub-${it.key}`;
      const links = it.children
        .map(
          (c) =>
            `<li><a href="${root}${c.href}"${c.key === active ? ` aria-current="page"` : ""}>${esc(c.label)}<span>${esc(c.desc)}</span></a></li>`
        )
        .join("");
      return `<li class="has-sub${isActive ? " is-active" : ""}"><button class="nav-link" type="button" aria-expanded="false" aria-controls="${subId}">${esc(it.label)}${icon("chevron-down", ` class="chevron"`)}</button><div class="subnav" id="${subId}"><ul>${links}</ul></div></li>`;
    }
    return `<li><a class="nav-link" href="${root}${it.href}"${it.key === active ? ` aria-current="page"` : ""}>${esc(it.label)}</a></li>`;
  };
  return [
    `<a class="skip-link" href="#contenu">Aller au contenu</a>`,
    `<header class="site-header" data-header>`,
    `<div class="container header-inner">`,
    `<a class="brand" href="${root}" aria-label="${SITE.name}, retour à l'accueil">${logo("horizontal")}</a>`,
    `<nav class="main-nav" id="main-nav" aria-label="Navigation principale">`,
    `<ul class="nav-list">${NAV.map(item).join("")}</ul>`,
    `<a class="btn btn--sm nav-cta" href="${root}${CTA.href}">${esc(CTA.label)}${icon("arrow-right", ` class="arrow"`)}</a>`,
    `</nav>`,
    `<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav"><span class="visually-hidden">Ouvrir le menu</span><span class="burger" aria-hidden="true"></span></button>`,
    `</div>`,
    `</header>`,
  ].join("\n");
}

function breadcrumb(cfg, ctx) {
  if (!cfg.breadcrumb || !cfg.breadcrumb.length) return "";
  const items = [["Accueil", ""], ...cfg.breadcrumb];
  const lis = items
    .map(([label, href], i) =>
      i === items.length - 1
        ? `<li><span aria-current="page">${esc(label)}</span></li>`
        : `<li><a href="${ctx.root}${href || ""}">${esc(label)}</a></li>`
    )
    .join("");
  return `<nav class="breadcrumb" aria-label="Fil d'Ariane"><ol>${lis}</ol></nav>`;
}

function footer(cfg, ctx) {
  const { root } = ctx;
  const metiers = NAV.find((n) => n.key === "metiers").children;
  const outils = NAV.find((n) => n.key === "outils").children;
  const a = SITE.address;
  const socials = SITE.socials
    .map((s) => `<li><a href="${s.href}" rel="noopener" target="_blank" aria-label="${esc(s.label)} (nouvelle fenêtre)">${icon(s.icon)}</a></li>`)
    .join("");
  return [
    `<footer class="site-footer">`,
    `<div class="container footer-grid">`,
    `<div class="footer-brand">`,
    `<a class="brand" href="${root}" aria-label="${SITE.name}, retour à l'accueil">${logo("horizontal")}</a>`,
    `<p>${esc(SITE.slogan)}</p>`,
    `<ul class="social">${socials}</ul>`,
    `</div>`,
    `<nav aria-label="Métiers"><p class="footer-title">Métiers</p><ul class="footer-links">${metiers
      .map((m) => `<li><a href="${root}${m.href}">${esc(m.label)}</a></li>`)
      .join("")}</ul></nav>`,
    `<nav aria-label="Ressources"><p class="footer-title">Ressources</p><ul class="footer-links">`,
    `<li><a href="${root}nos-produits/">Matériel, location et vente</a></li>`,
    `<li><a href="${root}energie-responsable/">Énergie responsable</a></li>`,
    `<li><a href="${root}references/">Références</a></li>`,
    ...outils.map((o) => `<li><a href="${root}${o.href}">${esc(o.label)}</a></li>`),
    `<li><a href="${root}entreprise/">L'entreprise</a></li>`,
    `</ul></nav>`,
    `<div><p class="footer-title">Contact</p>`,
    `<address class="footer-contact">`,
    `<p>${SITE.name}<br>${esc(a.street)}<br>${a.postalCode} ${esc(a.city)}</p>`,
    `<p><a href="mailto:${SITE.email}">${SITE.email}</a><br><a href="tel:${SITE.phoneIntl}">${SITE.phone.replace(/ /g, "\u00A0")}</a></p>`,
    `</address>`,
    `<a class="btn btn--sm" href="${root}${CTA.href}">${esc(CTA.label)}${icon("arrow-right", ` class="arrow"`)}</a>`,
    `</div>`,
    `</div>`,
    `<div class="container"><div class="footer-bottom">`,
    `<p>© <span data-year>${new Date().getFullYear()}</span> ${SITE.name}, ${SITE.legalForm}. SIREN ${SITE.siren}.</p>`,
    `<ul><li><a href="${root}mentions-legales/">Mentions légales et confidentialité</a></li><li><a href="${root}faq/">Questions fréquentes</a></li><li><a href="${root}llms.txt">Infos pour les IA</a></li><li><a href="${root}contact/">Contact</a></li></ul>`,
    `</div></div>`,
    `</footer>`,
  ].join("\n");
}

function cta(cfg, ctx) {
  const c = cfg.cta || {};
  const title = c.title || "Un projet ? Parlons puissance.";
  const text = c.text || "Lieu, dates, besoins connus : décrivez-nous votre événement, nous revenons vers vous rapidement.";
  const href = `${ctx.root}${CTA.href}${c.objet ? `?objet=${encodeURIComponent(c.objet)}` : ""}`;
  return [
    `<section class="section" aria-label="Contact">`,
    `<div class="container">`,
    `<div class="cta-band reveal">`,
    `<div class="cta-band__inner">`,
    `<div>`,
    `<h2>${esc(title)}</h2>`,
    `<p>${esc(text)}</p>`,
    `</div>`,
    `<div class="btn-row">`,
    `<a class="btn btn--light" href="${href}">${esc(c.button || CTA.label)}${icon("arrow-right", ` class="arrow"`)}</a>`,
    `<a class="btn btn--ghost btn--case" href="mailto:${SITE.email}">${SITE.email}</a>`,
    `</div>`,
    `</div>`,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join("\n");
}

function replaceBlock(html, name, content, file) {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(html)) {
    if (name === "breadcrumb" || name === "cta") return html;
    throw new Error(`Bloc "${name}" introuvable dans ${file}`);
  }
  return html.replace(re, `$1\n${content}\n$2`);
}

// --- Typographie française ------------------------------------------------------

const NBSP = " ";
const NNBSP = " ";
const UNITS = "A|V|W|kW|kVA|kWh|MW|MWh|mA|kA|mm²|mm|m|km|%|Hz|°C|L|kg|h|min|ans|jours|€";

function frenchTypo(html) {
  const parts = html.split(
    /(<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<textarea[\s\S]*?<\/textarea>|<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<[^>]+>)/
  );
  const unitRe = new RegExp(`(\\d) (?=(?:${UNITS})(?![\\p{L}\\d]))`, "gu");
  for (let i = 0; i < parts.length; i += 2) {
    let t = parts[i];
    if (!t || !/\S/.test(t)) continue;
    t = t
      .replace(/ ([?!;])/g, `${NNBSP}$1`)
      .replace(/ :/g, `${NBSP}:`)
      .replace(/« /g, `«${NBSP}`)
      .replace(/ »/g, `${NBSP}»`)
      .replace(/(\d) (?=\d{3}(?!\d))/g, `$1${NNBSP}`)
      .replace(unitRe, `$1${NBSP}`);
    parts[i] = t;
  }
  return parts.join("");
}

// --- Construction -------------------------------------------------------------------

const v = {
  css: hashOf(join(SITE_DIR, "assets/css/main.css")),
  js: hashOf(join(SITE_DIR, "assets/js/main.js")),
};

const files = walk(SITE_DIR).sort();
const sitemap = [];
const pagesMd = [];
let count = 0;

for (const file of files) {
  let html = readFileSync(file, "utf8");
  const m = html.match(/<!--page\s*([\s\S]*?)-->/);
  if (!m) {
    console.warn(`(ignoré, pas de configuration) ${relative(ROOT, file)}`);
    continue;
  }
  let cfg;
  try {
    cfg = JSON.parse(m[1]);
  } catch (e) {
    throw new Error(`Configuration JSON invalide dans ${file} : ${e.message}`);
  }
  for (const k of ["title", "description"]) {
    if (!cfg[k]) throw new Error(`Champ "${k}" manquant dans ${file}`);
  }
  const url = pageUrl(file);
  const ctx = { root: rootPrefix(file, cfg), url, v, html };

  html = replaceBlock(html, "head", head(cfg, ctx), file);
  html = replaceBlock(html, "header", header(cfg, ctx), file);
  html = replaceBlock(html, "breadcrumb", breadcrumb(cfg, ctx), file);
  html = replaceBlock(html, "cta", cta(cfg, ctx), file);
  html = replaceBlock(html, "footer", footer(cfg, ctx), file);
  html = expandSvgs(html);
  html = frenchTypo(html);
  writeFileSync(file, html);
  count++;

  if (!cfg.noindex && !cfg.absoluteRoot) {
    const canonical = SITE.url + url;
    let md = pageToMarkdown(html, canonical);
    const meta = [`> ${cfg.description}`, "", `Source : ${canonical} · ${SITE.name}${cfg.updated ? ` · Mise à jour : ${cfg.updated}` : ""}`];
    const lines = md.split("\n");
    md = lines[0].startsWith("# ") ? [lines[0], "", ...meta, "", ...lines.slice(1)].join("\n") : [`# ${cfg.title}`, "", ...meta, "", md].join("\n");
    md = md.replace(/\n{3,}/g, "\n\n");
    writeFileSync(join(dirname(file), "index.html.md"), md);
    pagesMd.push({ url, title: cfg.title, description: cfg.description, md });
  }

  if (!cfg.noindex && cfg.sitemap !== false) sitemap.push({ url, lastmod: cfg.updated || cfg.article?.date });
}

const today = new Date().toISOString().slice(0, 10);
const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...sitemap
    .sort((a, b) => a.url.localeCompare(b.url))
    .map((p) => `  <url><loc>${SITE.url}${p.url}</loc><lastmod>${p.lastmod || today}</lastmod></url>`),
  `</urlset>`,
  ``,
].join("\n");
writeFileSync(join(SITE_DIR, "sitemap.xml"), xml);

// --- llms.txt (format https://llmstxt.org) et llms-full.txt -------------------------------
const byUrl = new Map(pagesMd.map((p) => [p.url, p]));
const listed = new Set();
const llms = [
  `# ${SITE.name}`,
  "",
  `> ${ENTITY.description}`,
  "",
  "Informations clés :",
  "",
  ...LLMS.facts.map((f) => `- ${f}`),
  "",
  `Chaque page existe aussi en Markdown : ajouter \`index.html.md\` à son adresse. Contenu complet du site : ${SITE.url}/llms-full.txt`,
  "",
];
for (const [title, urls] of LLMS.sections) {
  llms.push(`## ${title}`, "");
  for (const u of urls) {
    const p = byUrl.get(u);
    if (!p) throw new Error(`llms.txt : page introuvable ${u}`);
    listed.add(u);
    llms.push(`- [${p.title}](${SITE.url}${u}): ${p.description}`);
  }
  llms.push("");
}
const missing = pagesMd.filter((p) => !listed.has(p.url) && p.url !== "/").map((p) => p.url);
if (missing.length) console.warn(`llms.txt : pages non listées ${missing.join(", ")}`);
writeFileSync(join(SITE_DIR, "llms.txt"), llms.join("\n"));

const order = ["/", ...LLMS.sections.flatMap(([, urls]) => urls)];
const full = [
  `# ${SITE.name} : contenu complet du site`,
  "",
  `> ${ENTITY.description}`,
  "",
  `Site : ${SITE.url}/ · Généré le ${today}`,
  "",
  ...order
    .map((u) => byUrl.get(u))
    .filter(Boolean)
    .flatMap((p) => ["---", "", p.md.trim(), ""]),
];
writeFileSync(join(SITE_DIR, "llms-full.txt"), full.join("\n"));

console.log(`${count} pages assemblées, ${sitemap.length} URL dans sitemap.xml, ${pagesMd.length} versions Markdown, llms.txt et llms-full.txt`);
