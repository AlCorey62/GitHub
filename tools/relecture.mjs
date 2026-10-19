#!/usr/bin/env node
// Page de relecture d'une semaine éditoriale : node tools/relecture.mjs editorial/semaines/AAAA-MM-JJ <dossier de sortie>
//
// Rassemble sur une seule page, jour par jour : le visuel, les textes LinkedIn et Facebook (avec bouton Copier),
// le lien, et le texte complet des articles du site en attente (editorial/a-paraitre). La page est publiée comme
// page privée pour que Damien relise la semaine sur son téléphone avant validation.
// Sortie : <dossier>/index.html et les visuels copiés ; la liste des fichiers est affichée en JSON.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const week = resolve(process.argv[2] || "");
const out = resolve(process.argv[3] || "");
if (!existsSync(join(week, "publications.md"))) throw new Error(`publications.md introuvable dans ${week}`);
mkdirSync(out, { recursive: true });

const SITE = "https://www.darkside-energy.com";
const monday = basename(week); // AAAA-MM-JJ
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

// --- publications.md --------------------------------------------------------------------
const md = readFileSync(join(week, "publications.md"), "utf8");
const parts = md.split(/\n## /);
const title = parts[0].match(/^# (.+)$/m)?.[1] || `Semaine du ${monday}`;
const status = (parts[0].match(/^Statut : (.+)$/m)?.[1] || "").replace(/\s*Visuels dans ce dossier[^.]*\./, "");
const notes = [];
const days = [];
for (const part of parts.slice(1)) {
  const [head, ...rest] = part.split("\n");
  const body = rest.join("\n");
  if (!/^(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche) /.test(head)) {
    notes.push({ head, items: body.split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2)) });
    continue;
  }
  const quote = (label) => {
    const m = body.match(new RegExp(`\\*\\*${label}\\*\\*\\s*\\n\\n((?:>.*\\n?)+)`));
    return m ? m[1].split("\n").map((l) => l.replace(/^> ?/, "")).join("\n").trim() : "";
  };
  days.push({
    head,
    visual: body.match(/\*\*Visuel\*\* : `([^`]+)`(.*)/),
    link: body.match(/\*\*Lien\*\*[^:]*: (\S+)/)?.[1] || "",
    linkedin: quote("LinkedIn"),
    facebook: quote("Facebook"),
  });
}

// --- Articles en attente de la semaine ---------------------------------------------------
const QUEUE = join(ROOT, "editorial", "a-paraitre");
const addDays = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const weekDates = new Set([0, 1, 2, 3, 4, 5, 6].map((n) => addDays(monday, n)));
const articles = new Map();
for (const dir of existsSync(QUEUE) ? readdirSync(QUEUE) : []) {
  const date = dir.slice(0, 10);
  const file = join(QUEUE, dir, "fr.html");
  if (!weekDates.has(date) || !existsSync(file)) continue;
  const html = readFileSync(file, "utf8");
  const cfg = JSON.parse(html.match(/<!--page\s*([\s\S]*?)-->/)[1]);
  const abs = (s) => s.replace(/href="\.\.\/\.\.\//g, `href="${SITE}/`).replace(/href="\.\.\//g, `href="${SITE}/news/`);
  articles.set(date, {
    title: cfg.title,
    url: `${SITE}/${cfg.path}`,
    readingTime: cfg.article.readingTime,
    takeaways: abs(html.match(/<ul class="check-list">([\s\S]*?)<\/ul>/)?.[1] || ""),
    prose: abs(html.match(/<article class="prose">([\s\S]*?)<\/article>/)?.[1] || ""),
    hasEn: existsSync(join(QUEUE, dir, "en.html")),
  });
}

// --- Page -------------------------------------------------------------------------------
const DAYS = { Lundi: 0, Mardi: 1, Mercredi: 2, Jeudi: 3, Vendredi: 4, Samedi: 5, Dimanche: 6 };
const files = {};
const cards = days.map((d, i) => {
  const [dayName] = d.head.split(" ");
  const date = addDays(monday, DAYS[dayName] ?? 0);
  const [when, ...fmt] = d.head.split(" · ");
  const art = articles.get(date);
  let img = "";
  if (d.visual) {
    const name = d.visual[1];
    if (existsSync(join(week, name))) {
      copyFileSync(join(week, name), join(out, name));
      files[name] = name;
      img = `<img class="visual" src="${esc(name)}" width="1200" height="1200" alt="Visuel de la publication du ${esc(when)}" loading="${i < 2 ? "eager" : "lazy"}">`;
    }
  }
  const block = (label, text, id) =>
    text
      ? `<section class="post" aria-label="${label}">
          <header><h3>${label}</h3><button type="button" class="copy" data-copy="${id}">Copier</button></header>
          <pre id="${id}">${esc(text)}</pre>
        </section>`
      : "";
  const article = art
    ? `<details class="article">
        <summary><span>Article du site</span> ${esc(art.title)} <small>${esc(art.readingTime)} de lecture${art.hasEn ? " · version anglaise prête" : ""}</small></summary>
        <div class="prose">
          <p class="eyebrow">À retenir</p><ul class="takeaways">${art.takeaways}</ul>
          ${art.prose}
          <p class="future">Adresse le jour de la publication : <span>${esc(art.url)}</span></p>
        </div>
      </details>`
    : "";
  return `<article class="day" id="j${i + 1}">
      <header class="day-head"><p class="when">${esc(when)}</p><p class="fmt">${esc(fmt.join(" · "))}</p></header>
      <div class="day-body">
        <div class="media">${img}</div>
        <div class="texts">
          ${block("LinkedIn", d.linkedin, `li-${i}`)}
          ${block("Facebook", d.facebook, `fb-${i}`)}
          ${d.link ? `<p class="link">Lien : <a href="${esc(d.link)}">${esc(d.link.replace(/^https:\/\//, ""))}</a></p>` : ""}
        </div>
      </div>
      ${article}
    </article>`;
});

const page = `<title>Relecture Le sais-tu ?</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,400..800&display=swap">
<style>
/* Mise en page : une colonne de jours ; sur grand écran, visuel à gauche et textes à droite. Charte Dark Side Energy. */
:root {
  --bg: #f6f4f3; --surface: #ffffff; --ink: #17161a; --muted: #5e5a62; --line: #e2dcdc;
  --accent: #b30000; --accent-soft: #fbe9e7; --ok: #1d7a46;
  --display: "Archivo", "Helvetica Neue", Arial, sans-serif; --body: "Archivo", "Helvetica Neue", Arial, sans-serif;
  --mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0b0b0c; --surface: #151417; --ink: #f2f1f3; --muted: #a8a3ab; --line: #2a272d;
  --accent: #ff4a3d; --accent-soft: #2a1311; --ok: #4cc98a; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #0b0b0c; --surface: #151417; --ink: #f2f1f3; --muted: #a8a3ab; --line: #2a272d;
  --accent: #ff4a3d; --accent-soft: #2a1311; --ok: #4cc98a; color-scheme: dark }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); font: 400 16px/1.55 var(--body); padding-block: 28px 64px;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.wrap { max-width: 1080px; margin: 0 auto; display: grid; gap: 28px; }
h1, h2, h3 { font-family: var(--display); font-stretch: 110%; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(1.7rem, 1.2rem + 2.2vw, 2.6rem); font-weight: 800; letter-spacing: -0.02em; line-height: 1.08; }
.kicker { margin: 0 0 8px; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); }
.status { margin: 12px 0 0; color: var(--muted); }
.status strong { color: var(--ink); }
.how { display: grid; gap: 6px; padding: 16px 18px; border-radius: 12px; background: var(--accent-soft); }
.how p { margin: 0; }
.notes { display: grid; gap: 10px; }
.notes h2 { font-size: 1.05rem; }
.notes ul { margin: 0; padding-left: 1.1em; color: var(--muted); display: grid; gap: 6px; }
.toc { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.toc a { display: inline-block; padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; color: var(--ink); text-decoration: none; font-size: 0.9rem; }
.toc a:hover, .toc a:focus-visible { border-color: var(--accent); }
.day { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 20px; display: grid; gap: 18px; scroll-margin-top: 16px; }
.day-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; }
.when { margin: 0; font-family: var(--display); font-weight: 800; font-size: 1.25rem; font-stretch: 110%; }
.fmt { margin: 0; color: var(--accent); font-weight: 700; font-size: 0.82rem; letter-spacing: 0.1em; text-transform: uppercase; }
.day-body { display: grid; gap: 18px; }
@media (min-width: 780px) { .day-body { grid-template-columns: 320px minmax(0, 1fr); align-items: start; } }
.visual { width: 100%; max-width: 100%; height: auto; border-radius: 10px; display: block; }
.texts { display: grid; gap: 14px; min-width: 0; }
.post { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.post header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--line); }
.post h3 { font-size: 0.85rem; letter-spacing: 0.08em; text-transform: uppercase; }
.post pre { margin: 0; padding: 12px; white-space: pre-wrap; word-break: break-word; font: 400 0.95rem/1.55 var(--body); }
.copy { font: 600 0.85rem var(--body); padding: 6px 12px; border-radius: 8px; border: 1px solid var(--accent); background: transparent; color: var(--accent); cursor: pointer; }
.copy:hover, .copy:focus-visible { background: var(--accent); color: var(--surface); outline: none; }
.copy.done { border-color: var(--ok); color: var(--ok); background: transparent; }
.link { margin: 0; font-size: 0.9rem; color: var(--muted); word-break: break-all; }
.link a { color: var(--accent); }
.article { border-top: 1px solid var(--line); padding-top: 14px; }
.article summary { cursor: pointer; font-weight: 700; display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; }
.article summary span { color: var(--accent); font-size: 0.78rem; letter-spacing: 0.12em; text-transform: uppercase; }
.article summary small { color: var(--muted); font-weight: 400; }
.prose { max-width: 68ch; padding-top: 10px; }
.prose h2 { font-size: 1.15rem; margin: 22px 0 6px; }
.prose p, .prose li { color: var(--ink); }
.prose a { color: var(--accent); }
.prose blockquote { margin: 18px 0; padding: 10px 16px; border-left: 3px solid var(--accent); font-weight: 600; }
.prose .eyebrow { margin: 0; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }
.takeaways { padding-left: 1.1em; }
.future { color: var(--muted); font-size: 0.9rem; }
.future span { word-break: break-all; }
code { font-family: var(--mono); font-size: 0.88em; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>

<main class="wrap">
  <header>
    <p class="kicker">Le sais-tu ? · Dark Side Energy</p>
    <h1>${esc(title)}</h1>
    ${status ? `<p class="status">${inline(status)}</p>` : ""}
  </header>
  <div class="how">
    <p><strong>Pour valider</strong> : répondez « ok » à Claude dans la conversation, ou indiquez ce qu'il faut changer, jour par jour.</p>
    <p>Une fois validés, les articles sont mis en ligne automatiquement le jour prévu. Les publications LinkedIn et Facebook se programment avec les textes ci-dessous (bouton Copier) et les visuels.</p>
  </div>
  ${notes
    .map(
      (n) => `<section class="notes"><h2>${inline(n.head)}</h2><ul>${n.items.map((it) => `<li>${inline(it)}</li>`).join("")}</ul></section>`
    )
    .join("\n")}
  <nav aria-label="Jours de la semaine"><ul class="toc">${days.map((d, i) => `<li><a href="#j${i + 1}">${esc(d.head.split(" · ")[0])}</a></li>`).join("")}</ul></nav>
  ${cards.join("\n")}
</main>

<script>
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-copy]");
  if (!b) return;
  const el = document.getElementById(b.dataset.copy);
  const text = el.textContent;
  const done = () => { b.textContent = "Copié"; b.classList.add("done"); setTimeout(() => { b.textContent = "Copier"; b.classList.remove("done"); }, 1800); };
  try {
    await navigator.clipboard.writeText(text);
    done();
  } catch (err) {
    const r = document.createRange();
    r.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    b.textContent = "Texte sélectionné";
  }
});
</script>
`;
writeFileSync(join(out, "index.html"), page);
console.log(JSON.stringify(files));
