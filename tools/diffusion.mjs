#!/usr/bin/env node
// Diffusion de la publication du jour sur les réseaux sociaux :
//   node tools/diffusion.mjs [--date AAAA-MM-JJ] [--pas-avant HH:MM] [--hors-programme] [--essai | --verifier]
//
// Lit editorial/semaines/<lundi>/publications.md et ne diffuse rien tant que la semaine n'est pas validée
// par Damien (ligne « Statut : **validé… »). La section du jour donne le texte, le visuel et le lien :
//   Facebook : photo et légende sur la page (API Graph de Meta, POST /<page>/photos).
//   LinkedIn : visuel et texte sur la page (API Community Management : /rest/images puis /rest/posts),
//              à partir du 9/11/2026 ; avant, les posts LinkedIn sont programmés à la main.
// Avant l'envoi, le lien doit répondre sur le site (l'article du jour doit être en ligne).
// Chaque envoi est noté dans editorial/semaines/<lundi>/diffusion.json : rien n'est jamais envoyé deux fois.
// Un réseau en échec n'empêche pas l'envoi sur l'autre ; la tâche finit alors en erreur.
//
// --pas-avant HH:MM  ne rien envoyer avant cette heure (heure de Paris), pour les passages programmés
// --hors-programme   envoie la publication « Hors programme » du jour (section en plus, ajoutée et validée par
//                    Damien), notée à part dans le journal ; elle part aussi sur LinkedIn avant le 9/11/2026,
//                    car seules les publications du programme y sont programmées à la main
// --essai            affiche ce qui serait envoyé, sans rien envoyer
// --verifier         teste les accès sans rien publier (Facebook : photo non publiée, aussitôt supprimée ;
//                    LinkedIn : lecture de la dernière publication de la page)
//
// Accès : secrets GitHub FACEBOOK_PAGE_ID et FACEBOOK_PAGE_TOKEN ; LINKEDIN_ORG_ID, et pour le jeton LinkedIn
// soit LINKEDIN_REFRESH_TOKEN, LINKEDIN_CLIENT_ID et LINKEDIN_CLIENT_SECRET (jeton neuf obtenu à chaque passage,
// jeton de renouvellement valable un an), soit LINKEDIN_TOKEN (60 jours), utilisé aussi en secours.
// Un réseau sans ses secrets est ignoré. Voir editorial/RESEAUX.md.
// Résumé écrit dans le fichier $DIFFUSION_RESUME s'il est défini (message du commit du journal).

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { lireSemaine, addDays, little } from "./publications.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GRAPH = process.env.FACEBOOK_GRAPH_URL || "https://graph.facebook.com/v26.0"; // adresse modifiable pour les essais
const LI_API = process.env.LINKEDIN_API_URL || "https://api.linkedin.com/rest"; // idem
const LI_OAUTH = process.env.LINKEDIN_OAUTH_URL || "https://www.linkedin.com/oauth/v2/accessToken"; // idem
// Version mensuelle de l'API LinkedIn, chacune maintenue au moins un an : à passer à une version récente chaque année.
const LI_VERSION = process.env.LINKEDIN_VERSION || "202610";
const LI_DEPUIS = process.env.LINKEDIN_DEPUIS || "2026-11-09"; // jusqu'au 6/11/2026, posts LinkedIn programmés à la main depuis la page

const opt = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const flag = (name) => process.argv.includes(name);
const paris = (format) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", ...format }).format(new Date());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const today = opt("--date") || paris();
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`Date invalide : ${today}`);
const essai = flag("--essai");
const verifier = flag("--verifier");
const horsProgramme = flag("--hors-programme");
const notice = (msg) => console.log(process.env.GITHUB_ACTIONS ? `::notice::${msg}` : msg);
const warning = (msg) => console.log(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : msg);
const error = (msg) => console.log(process.env.GITHUB_ACTIONS ? `::error::${msg}` : msg);

// --- Facebook -----------------------------------------------------------------------------
// Accès lus dans les secrets, sans les espaces ni les retours à la ligne collés par erreur autour
const secret = (name) => (process.env[name] || "").trim().replace(/^["']|["']$/g, "");
const FB = { page: secret("FACEBOOK_PAGE_ID"), token: secret("FACEBOOK_PAGE_TOKEN") };

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

// --- LinkedIn -----------------------------------------------------------------------------
const LI = {
  org: secret("LINKEDIN_ORG_ID"),
  token: secret("LINKEDIN_TOKEN"),
  refresh: secret("LINKEDIN_REFRESH_TOKEN"),
  client: secret("LINKEDIN_CLIENT_ID"),
  clientSecret: secret("LINKEDIN_CLIENT_SECRET"),
};
const liRenewable = LI.refresh && LI.client && LI.clientSecret;
const liConfigured = LI.org && (LI.token || liRenewable);
const author = () => `urn:li:organization:${LI.org}`;

// Jeton d'accès LinkedIn : demandé une fois par passage avec le jeton de renouvellement (valable un an),
// sinon le jeton LINKEDIN_TOKEN. Le jeton obtenu est masqué dans le journal de la tâche GitHub.
let liAccess;
const accessToken = () => (liAccess ||= renewToken());
async function renewToken() {
  if (!liRenewable) return { token: LI.token, source: "jeton LINKEDIN_TOKEN" };
  const res = await fetch(LI_OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: LI.refresh, client_id: LI.client, client_secret: LI.clientSecret }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    const msg = `renouvellement du jeton refusé (${res.status}) : ${json.error_description || json.error || "réponse illisible"}`;
    if (!LI.token) throw new Error(`${msg}. Refaire l'autorisation (editorial/RESEAUX.md).`);
    warning(`LinkedIn : ${msg} ; jeton LINKEDIN_TOKEN utilisé en secours.`);
    return { token: LI.token, source: "jeton LINKEDIN_TOKEN (secours)" };
  }
  if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${json.access_token}`);
  const days = Number.isFinite(json.refresh_token_expires_in) ? Math.floor(json.refresh_token_expires_in / 86400) : null;
  if (days !== null && days < 30) warning(`LinkedIn : le jeton de renouvellement expire dans ${days} jours : refaire l'autorisation (editorial/RESEAUX.md).`);
  return { token: json.access_token, source: `jeton renouvelé automatiquement${days !== null ? `, jeton de renouvellement valable encore ${days} jours` : ""}` };
}

async function linkedin(method, path, body, headers = {}) {
  const { token } = await accessToken();
  const res = await fetch(`${LI_API}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Linkedin-Version": LI_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const hint = res.status === 401 ? ` Jeton expiré ou invalide (${token.length} caractères) : le recréer (editorial/RESEAUX.md).` : "";
    throw new Error(`LinkedIn a refusé l'envoi (${res.status}) : ${json.message || "réponse illisible"}.${hint}`);
  }
  return { json, id: res.headers.get("x-restli-id") };
}

// Envoi du visuel : déclaration, envoi du fichier, puis attente de la fin du traitement par LinkedIn.
async function linkedinImage(file) {
  const { json } = await linkedin("POST", "images?action=initializeUpload", { initializeUploadRequest: { owner: author() } });
  const { uploadUrl, image } = json.value || {};
  if (!uploadUrl || !image) throw new Error("LinkedIn n'a pas donné d'adresse d'envoi pour le visuel.");
  const up = await fetch(uploadUrl, { method: "PUT", headers: { Authorization: `Bearer ${(await accessToken()).token}` }, body: readFileSync(file) });
  if (!up.ok) throw new Error(`LinkedIn a refusé le visuel (${up.status}).`);
  for (let i = 0; i < 15; i++) {
    const { json: img } = await linkedin("GET", `images/${encodeURIComponent(image)}`);
    if (img.status === "AVAILABLE") return image;
    if (img.status === "PROCESSING_FAILED") throw new Error("LinkedIn n'a pas pu traiter le visuel.");
    await wait(Number(process.env.LINKEDIN_ATTENTE_MS || 2000));
  }
  throw new Error("Visuel toujours en traitement chez LinkedIn après 30 s : rien n'est publié.");
}

async function linkedinPost(text, file, altText) {
  const image = await linkedinImage(file);
  const { id } = await linkedin("POST", "posts", {
    author: author(),
    commentary: little(text),
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    content: { media: { id: image, ...(altText ? { altText } : {}) } },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  });
  if (!id) throw new Error("LinkedIn n'a pas renvoyé l'identifiant de la publication.");
  return id;
}

// --- Vérification des accès ---------------------------------------------------------------
if (verifier) {
  if (!(FB.page && FB.token) && !liConfigured) throw new Error("Aucun accès configuré (secrets Facebook et LinkedIn absents) : voir editorial/RESEAUX.md.");
  let failed = false;
  if (FB.page && FB.token) {
    try {
      const name = await pageName();
      const test = await photo(join(ROOT, "site/assets/img/icon-512.png"), "", false);
      await graph("DELETE", test.id);
      console.log(`Accès Facebook vérifié : page « ${name} ». Photo de test non publiée, envoyée puis supprimée.`);
    } catch (e) {
      failed = true;
      error(`Facebook : ${e.message}`);
    }
  } else notice("Facebook : accès non configuré.");
  if (liConfigured) {
    try {
      const { json } = await linkedin("GET", `posts?author=${encodeURIComponent(author())}&q=author&count=1&sortBy=CREATED`, null, { "X-RestLi-Method": "FINDER" });
      const last = json.elements?.[0];
      const when = last?.publishedAt ? new Date(last.publishedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "";
      const start = (last?.commentary || "").replace(/\\(.)/g, "$1").replace(/\{hashtag\|.\|([^}]*)\}/g, "#$1").split("\n")[0].slice(0, 80);
      const { source } = await accessToken();
      console.log(`Accès LinkedIn vérifié (${source}) : page n° ${LI.org}. ${last ? `Dernière publication${when ? ` du ${when}` : ""} : « ${start} ».` : "Aucune publication lue."}`);
      if (liRenewable && source.includes("secours")) {
        failed = true;
        error("LinkedIn : le renouvellement automatique du jeton ne fonctionne pas (voir l'avertissement ci-dessus).");
      }
    } catch (e) {
      failed = true;
      error(`LinkedIn : ${e.message}`);
    }
  } else notice("LinkedIn : accès non configuré.");
  process.exit(failed ? 1 : 0);
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
const day = week.days.find((d) => d.date === today && d.extra === horsProgramme);
if (!day) {
  console.log(`Pas de publication ${horsProgramme ? "hors programme " : ""}prévue le ${today}.`);
  process.exit(0);
}
if (!week.validated) {
  warning(`${week.title} : semaine non validée, rien n'est envoyé.`);
  process.exit(0);
}

const journalFile = join(weekDir, "diffusion.json");
const journal = existsSync(journalFile) ? JSON.parse(readFileSync(journalFile, "utf8")) : {};
// Clé du journal : la date, ou « date hors programme » pour la publication en plus du jour
const key = horsProgramme ? `${today} hors programme` : today;
const note = (network, data) => {
  journal[key] = { ...journal[key], [network]: { ...data, le: new Date().toISOString() } };
  writeFileSync(journalFile, JSON.stringify(journal, null, 2) + "\n");
  if (process.env.DIFFUSION_RESUME) appendFileSync(process.env.DIFFUSION_RESUME, `- ${network} : ${day.head}\n`);
};

const visual = join(weekDir, day.visual);
if (!day.visual || !existsSync(visual)) throw new Error(`Visuel introuvable pour ${day.head} : ${day.visual || "non indiqué"}`);

// Texte alternatif du visuel (titre et sous-titre de visuels.json), pour LinkedIn
const visuels = existsSync(join(weekDir, "visuels.json")) ? JSON.parse(readFileSync(join(weekDir, "visuels.json"), "utf8")) : [];
const v = visuels.find((x) => x.fichier === day.visual);
const altText = v ? [v.titre, v.sousTitre].filter(Boolean).join(" ").replace(/\*/g, "") : "";

// Ce qui reste à envoyer aujourd'hui, réseau par réseau
const todo = [];
if (journal[key]?.facebook) console.log(`Facebook : déjà envoyé le ${journal[key].facebook.le}.`);
else if (!day.facebook) warning(`Facebook : pas de texte pour ${day.head}.`);
else if (essai) console.log(`Facebook (essai, rien n'est envoyé)\nVisuel : ${day.visual}\n\n${day.facebook}\n`);
else if (!FB.page || !FB.token) notice("Facebook : accès non configuré (secrets FACEBOOK_PAGE_ID et FACEBOOK_PAGE_TOKEN), rien n'est envoyé.");
else todo.push("facebook");

if (today < LI_DEPUIS && !horsProgramme) console.log(`LinkedIn : jusqu'au 6/11/2026, les posts sont programmés à la main ; rien n'est envoyé.`);
else if (journal[key]?.linkedin) console.log(`LinkedIn : déjà envoyé le ${journal[key].linkedin.le}.`);
else if (!day.linkedin) warning(`LinkedIn : pas de texte pour ${day.head}.`);
else if (essai) console.log(`LinkedIn (essai, rien n'est envoyé)\nVisuel : ${day.visual}${altText ? ` (texte alternatif : ${altText})` : ""}\n\n${day.linkedin}\n`);
else if (!liConfigured) notice("LinkedIn : accès non configuré (secrets LINKEDIN_ORG_ID et jeton), rien n'est envoyé.");
else todo.push("linkedin");

if (todo.length && day.link) {
  const res = await fetch(day.link, { method: "HEAD", redirect: "follow" });
  if (!res.ok) throw new Error(`Le lien ne répond pas (${res.status}), l'article n'est peut-être pas encore en ligne : ${day.link}`);
}

let failed = false;
for (const network of todo) {
  try {
    if (network === "facebook") {
      await pageName();
      const sent = await photo(visual, day.facebook, true);
      note("facebook", { id: sent.id, post: sent.post_id });
      console.log(`Facebook : publié (${sent.post_id}).`);
    } else {
      const post = await linkedinPost(day.linkedin, visual, altText);
      note("linkedin", { post });
      console.log(`LinkedIn : publié (${post}).`);
    }
  } catch (e) {
    failed = true;
    error(`${network === "facebook" ? "Facebook" : "LinkedIn"} : ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
