// Lecture du fichier publications.md d'une semaine éditoriale (editorial/semaines/AAAA-MM-JJ/).
// Utilisé par la page de relecture (tools/relecture.mjs) et la diffusion sur les réseaux (tools/diffusion.mjs).
//
// Renvoie { monday, title, status, validated, notes, days } ; chaque jour porte sa date (AAAA-MM-JJ),
// son titre, le nom du visuel, le lien et les textes LinkedIn et Facebook (citations « > » du fichier).

import { readFileSync } from "node:fs";
import { join, basename } from "node:path";

const DAYS = { Lundi: 0, Mardi: 1, Mercredi: 2, Jeudi: 3, Vendredi: 4, Samedi: 5, Dimanche: 6 };

export const addDays = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

// Texte d'une publication LinkedIn au format « little » de l'API : les caractères réservés sont précédés
// d'une barre oblique inverse, sinon LinkedIn les interprète ou refuse le texte, et chaque mot-clé (#mot en
// début de mot) devient le modèle {hashtag|\#|mot}.
export function little(text) {
  const esc = (s) => s.replace(/[|{}@[\]()<>#\\*_~]/g, "\\$&");
  return text
    .split(/((?<=^|\s)#[\p{L}\p{N}]+)/u)
    .map((part, i) => (i % 2 ? `{hashtag|\\#|${esc(part.slice(1))}}` : esc(part)))
    .join("");
}

export function lireSemaine(week) {
  const monday = basename(week); // AAAA-MM-JJ
  const md = readFileSync(join(week, "publications.md"), "utf8");
  const parts = md.split(/\n## /);
  const statusLine = parts[0].match(/^Statut : (.+)$/m)?.[1] || "";
  const notes = [];
  const days = [];
  for (const part of parts.slice(1)) {
    const [head, ...rest] = part.split("\n");
    const body = rest.join("\n");
    const dayName = head.split(" ")[0];
    if (!(dayName in DAYS)) {
      notes.push({ head, items: body.split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2)) });
      continue;
    }
    const quote = (label) => {
      const m = body.match(new RegExp(`\\*\\*${label}\\*\\*\\s*\\n\\n((?:>.*\\n?)+)`));
      return m ? m[1].split("\n").map((l) => l.replace(/^> ?/, "")).join("\n").trim() : "";
    };
    const visual = body.match(/\*\*Visuel\*\* : `([^`]+)`/)?.[1] || "";
    days.push({
      head,
      date: addDays(monday, DAYS[dayName]),
      visual,
      link: body.match(/\*\*Lien\*\*[^:]*: (\S+)/)?.[1] || "",
      linkedin: quote("LinkedIn"),
      facebook: quote("Facebook"),
    });
  }
  return {
    monday,
    title: parts[0].match(/^# (.+)$/m)?.[1] || `Semaine du ${monday}`,
    status: statusLine.replace(/\s*Visuels dans ce dossier[^.]*\./, ""),
    validated: /^\*\*validé/.test(statusLine),
    notes,
    days,
  };
}
