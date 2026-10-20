#!/usr/bin/env node
// Diffusion de la publication du jour sur les réseaux sociaux :
//   node tools/diffusion.mjs [--date AAAA-MM-JJ] [--pas-avant HH:MM] [--essai | --verifier]
//
// Lit editorial/semaines/<lundi>/publications.md et ne diffuse rien tant que la semaine n'est pas validée
// par Damien (ligne « Statut : **validé… »). La section du jour donne le texte, le visuel et le lien :
//   Facebook : photo et légende sur la page (API Graph de Meta, POST /<page>/photos).
//   LinkedIn : à brancher quand LinkedIn aura accordé l'accès à son API (voir editorial/RESEAUX.md).
// Avant l'envoi, le lien doit répondre sur le site (l'article du jour doit être en ligne).
// Chaque envoi est noté dans editorial/semaines/<lundi>/diffusion.json : rien n'est jamais envoyé deux fois.
//
// --pas-avant HH:MM  ne rien envoyer avant cette heure (heure de Paris), pour les passages programmés
// --essai            affiche ce qui serait envoyé, sans rien envoyer
// --verifier         teste l'accès Facebook sans rien publier (photo non publiée, aussitôt supprimée)
//
// Accès : secrets GitHub FACEBOOK_PAGE_ID et FACEBOOK_PAGE_TOKEN. Sans eux, la diffusion Facebook est ignorée.
// Résumé écrit dans le fichier $DIFFUSION_RESUME s'il est défini (message du commit du journal).

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { lireSemaine, addDays } from "./publications.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GRAPH = process.env.FACEBOOK_GRAPH_URL || "https://graph.facebook.com/v26.0"; // adresse modifiable pour les essais

const opt = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const flag = (name) => process.argv.includes(name);
const paris = (format) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", ...format }).format(new Date());

const today = opt("--date") || paris();
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`Date invalide : ${today}`);
const essai = flag("--essai");
const verifier = flag("--verifier");
const notice = (msg) => console.log(process.env.GITHUB_ACTIONS ? `::notice::${msg}` : msg);
const warning = (msg) => console.log(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : msg);

// --- Facebook -----------------------------------------------------------------------------
const FB = { page: process.env.FACEBOOK_PAGE_ID, token: process.env.FACEBOOK_PAGE_TOKEN };

async function graph(method, path, form) {
  const url = new URL(`${GRAPH}/${path}`);
  if (form) form.append("access_token", FB.token);
  else url.searchParams.set("access_token", FB.token);
  const res = await fetch(url, { method, body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`Facebook a refusé l'envoi (${res.status}) : ${json.error?.message || "réponse illisible"}`);
  return json;
}

// Garde-fou : le jeton peut donner accès à une autre page gérée par le même compte.
async function pageName() {
  const { name = "" } = await graph("GET", `${FB.page}?fields=name`);
  if (!/dark side energy/i.test(name)) throw new Error(`Le jeton donne accès à la page « ${name} » et non à Dark Side Energy : rien n'est envoyé.`);
  return name;
}

function photo(file, caption, published) {
  const form = new FormData();
  form.append("source", new Blob([readFileSync(file)], { type: "image/png" }), "visuel.png");
  if (caption) form.append("caption", caption);
  form.append("published", String(published));
  return graph("POST", `${FB.page}/photos`, form);
}

if (verifier) {
  if (!FB.page || !FB.token) throw new Error("Secrets FACEBOOK_PAGE_ID et FACEBOOK_PAGE_TOKEN absents : voir editorial/RESEAUX.md.");
  const name = await pageName();
  const test = await photo(join(ROOT, "site/assets/img/icon-512.png"), "", false);
  await graph("DELETE", test.id);
  console.log(`Accès Facebook vérifié : page « ${name} ». Photo de test non publiée, envoyée puis supprimée.`);
  process.exit(0);
}

// --- Publication du jour ------------------------------------------------------------------
const pasAvant = opt("--pas-avant");
if (pasAvant && !opt("--date") && paris({ hour: "2-digit", minute: "2-digit" }) < pasAvant) {
  console.log(`Avant ${pasAvant} à Paris : rien n'est envoyé à ce passage.`);
  process.exit(0);
}

const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
const weekDir = join(ROOT, "editorial", "semaines", addDays(today, -weekday));
if (!existsSync(join(weekDir, "publications.md"))) {
  notice(`Aucune semaine préparée pour le ${today} : rien n'est envoyé.`);
  process.exit(0);
}
const week = lireSemaine(weekDir);
const day = week.days.find((d) => d.date === today);
if (!day) {
  console.log(`Pas de publication prévue le ${today}.`);
  process.exit(0);
}
if (!week.validated) {
  warning(`${week.title} : semaine non validée, rien n'est envoyé.`);
  process.exit(0);
}

const journalFile = join(weekDir, "diffusion.json");
const journal = existsSync(journalFile) ? JSON.parse(readFileSync(journalFile, "utf8")) : {};
const note = (network, data) => {
  journal[today] = { ...journal[today], [network]: { ...data, le: new Date().toISOString() } };
  writeFileSync(journalFile, JSON.stringify(journal, null, 2) + "\n");
  if (process.env.DIFFUSION_RESUME) appendFileSync(process.env.DIFFUSION_RESUME, `- ${network} : ${day.head}\n`);
};

const visual = join(weekDir, day.visual);
if (!day.visual || !existsSync(visual)) throw new Error(`Visuel introuvable pour ${day.head} : ${day.visual || "non indiqué"}`);

if (journal[today]?.facebook) console.log(`Facebook : déjà envoyé le ${journal[today].facebook.le}.`);
else if (!day.facebook) warning(`Facebook : pas de texte pour ${day.head}.`);
else if (essai) console.log(`Facebook (essai, rien n'est envoyé)\nVisuel : ${day.visual}\n\n${day.facebook}\n`);
else if (!FB.page || !FB.token) notice("Facebook : accès non configuré (secrets FACEBOOK_PAGE_ID et FACEBOOK_PAGE_TOKEN), rien n'est envoyé.");
else {
  if (day.link) {
    const res = await fetch(day.link, { method: "HEAD", redirect: "follow" });
    if (!res.ok) throw new Error(`Le lien ne répond pas (${res.status}), l'article n'est peut-être pas encore en ligne : ${day.link}`);
  }
  await pageName();
  const sent = await photo(visual, day.facebook, true);
  note("facebook", { id: sent.id, post: sent.post_id });
  console.log(`Facebook : publié (${sent.post_id}).`);
}
