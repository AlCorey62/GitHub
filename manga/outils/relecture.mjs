#!/usr/bin/env node
// Relecture des fiches vérifiées par Pipo (ChatGPT) et Mario (Gemini). Voir manga/relecture/LISEZMOI.md.
//
//   node manga/outils/relecture.mjs dossier    écrit relecture/dossier-relecture.md (les fiches en clair, avec sources)
//   node manga/outils/relecture.mjs integrer   lit les retours des relecteurs, publie les fiches validées par les deux
//                                              dans site/donnees/fiches-verifiees.json, liste le reste dans
//                                              relecture/a-corriger.md
//
// Une fiche n'est publiée que si chaque relecteur attendu a rendu le verdict « valide » sans erreur signalée.

import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER = join(RACINE, 'relecture');
const BROUILLONS = join(DOSSIER, 'fiches-a-relire.json');
const PUBLIEES = join(RACINE, 'site', 'donnees', 'fiches-verifiees.json');

export const RELECTEURS = {
  pipo: 'Pipo (ChatGPT)',
  mario: 'Mario (Gemini)',
};
export const AGES = [6, 8, 10, 12, 14, 16, 18];
const CATEGORIES = { violence: 'Violence', peur: 'Peur et horreur', sexe: 'Nudité et sexualité', themes: 'Thèmes sensibles', autre: 'Autre' };
const VERDICTS = ['valide', 'a_corriger', 'a_rejeter'];

const lireJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const ecrireJson = (f, v) => writeFileSync(f, `${JSON.stringify(v, null, 2)}\n`);

/** Contrôle de forme d'une fiche rédigée. Renvoie la liste des problèmes. */
export function controlerFiche(f) {
  const pb = [];
  if (!AGES.includes(f?.age)) pb.push('âge absent ou hors échelle');
  if (!Array.isArray(f?.sources) || f.sources.length < 2) pb.push('moins de 2 sources');
  for (const s of f?.sources || []) if (!s.titre || !/^https?:\/\//.test(s.lien || '')) pb.push(`source sans titre ou sans lien : ${s.titre || s.lien}`);
  if (!f?.resume) pb.push('résumé absent');
  if (!f?.avis) pb.push('avis absent');
  for (const s of f?.scenes || []) if (!CATEGORIES[s.categorie]) pb.push(`catégorie de scène inconnue : ${s.categorie}`);
  const texte = JSON.stringify(f);
  if (texte.includes('—')) pb.push('tiret cadratin présent');
  return pb;
}

/**
 * Lit les retours d'un relecteur (relecture/retour-<nom>*.json) : pour chaque fiche, la liste de ses retours.
 * Un retour sans numéro de révision porte sur la révision 1.
 */
export function lireRetours(nom, dossier = DOSSIER) {
  const fiches = {};
  if (!existsSync(dossier)) return fiches;
  for (const f of readdirSync(dossier).filter((x) => x.startsWith(`retour-${nom}`) && x.endsWith('.json')).sort()) {
    const r = lireJson(join(dossier, f));
    for (const [id, v] of Object.entries(r.fiches || {})) {
      (fiches[id] ||= []).push({ ...v, revision: Number(v.revision) || 1, date: v.date || r.date || '', fichier: f });
    }
  }
  return fiches;
}

/**
 * Sépare les fiches publiables des fiches à corriger.
 * @param {Record<string, object>} brouillons fiches rédigées
 * @param {Record<string, Record<string, object>>} retours { pipo: {id: retour}, mario: {...} }
 */
export function trier(brouillons, retours) {
  const publiables = {};
  const aCorriger = {};
  for (const [id, fiche] of Object.entries(brouillons)) {
    if (id.startsWith('_')) continue;
    // Seul compte le dernier retour qui porte sur la révision actuelle de la fiche.
    const revision = Number(fiche.revision) || 1;
    const pourRevision = (liste) => {
      const l = Array.isArray(liste) ? liste : liste ? [liste] : [];
      return l.filter((a) => (Number(a.revision) || 1) === revision).at(-1);
    };
    const avis = Object.fromEntries(Object.keys(RELECTEURS).map((n) => [n, pourRevision(retours[n]?.[id])]));
    const manquants = Object.keys(avis).filter((n) => !avis[n]);
    const invalides = Object.entries(avis).filter(([, a]) => a && !VERDICTS.includes(a.verdict)).map(([n]) => n);
    const forme = controlerFiche(fiche);
    const tousValides = !manquants.length && !invalides.length
      && Object.values(avis).every((a) => a.verdict === 'valide' && !(a.erreurs || []).length);
    const ageConteste = Object.values(avis).some((a) => a?.age_propose && a.age_propose !== fiche.age);
    if (tousValides && !forme.length && !ageConteste) {
      const dates = Object.values(avis).map((a) => a.date).filter(Boolean).sort();
      const { notes_relecture, journal_corrections, revision: _r, ...publique } = fiche;
      publiables[id] = {
        ...publique,
        redacteur: publique.redacteur || 'Claude (assistant IA)',
        relecture: { par: Object.values(RELECTEURS), date: dates[dates.length - 1] || '' },
      };
    } else {
      aCorriger[id] = { fiche, avis, manquants, invalides, forme, ageConteste };
    }
  }
  return { publiables, aCorriger };
}

function texteFiche(id, f) {
  const l = [];
  l.push(`## ${f.titre || id} (AniList ${id}) : ${f.age >= 18 ? 'adultes' : `dès ${f.age} ans`}, révision ${Number(f.revision) || 1}`);
  l.push('', `Fiche AniList : https://anilist.co/manga/${id}`, '', `**Résumé.** ${f.resume || '(absent)'}`, '');
  if (f.themes?.length) {
    l.push('**Thèmes abordés**', '');
    for (const t of f.themes) l.push(`- *${t.titre}* : ${t.texte}`);
    l.push('');
  }
  l.push('**Scènes difficiles**', '');
  if (f.scenes?.length) for (const s of f.scenes) l.push(`- [${CATEGORIES[s.categorie] || s.categorie}]${s.spoiler ? ' [révèle l\'intrigue]' : ''} *${s.titre}* : ${s.texte}`);
  else l.push('- Aucune scène relevée.');
  l.push('', `**Vocabulaire.** ${f.vocabulaire || '(absent)'}`, '', `**Avis.** ${f.avis || '(absent)'}`, '');
  if (f.autres?.length) {
    l.push('**Ce que disent les autres**', '');
    for (const a of f.autres) l.push(`- ${a.source} : ${a.texte}${a.lien ? ` (${a.lien})` : ''}`);
    l.push('');
  }
  l.push('**Sources**', '');
  for (const s of f.sources || []) l.push(`- ${s.titre} : ${s.lien}`);
  if (f.notes_relecture?.length) {
    l.push('', '**Points à vérifier en priorité**', '');
    for (const n of f.notes_relecture) l.push(`- ${n}`);
  }
  if (f.journal_corrections?.length) {
    l.push('', `**Suite donnée aux remarques de la relecture précédente (révision ${(Number(f.revision) || 1) - 1})**`, '');
    for (const j of f.journal_corrections) {
      l.push(`- ${j.relecteur || '?'} [${j.rubrique || '?'}] ${j.remarque || ''} → ${j.decision || '?'} : ${j.explication || ''}`);
    }
  }
  const forme = controlerFiche(f);
  if (forme.length) l.push('', `**Contrôle de forme : ${forme.join(' ; ')}**`);
  l.push('', '---', '');
  return l.join('\n');
}

function dossier() {
  const brouillons = lireJson(BROUILLONS);
  const ids = Object.keys(brouillons).filter((k) => !k.startsWith('_'));
  const entete = [
    '# Dossier de relecture des fiches Mangâge',
    '',
    `${ids.length} fiches à relire. Consigne : relecture/consigne-relecteurs.md. Données brutes : relecture/fiches-a-relire.json.`,
    '',
    '---',
    '',
  ];
  writeFileSync(join(DOSSIER, 'dossier-relecture.md'), entete.join('\n') + ids.map((id) => texteFiche(id, brouillons[id])).join('\n'));
  console.log(`relecture/dossier-relecture.md : ${ids.length} fiches`);
  // Lots de 10 fiches, un par conversation avec chaque relecteur.
  for (const f of readdirSync(DOSSIER).filter((x) => /^lot-\d+\.md$/.test(x))) rmSync(join(DOSSIER, f));
  for (let i = 0; i * 10 < ids.length; i++) {
    const lot = ids.slice(i * 10, i * 10 + 10);
    const texte = [
      `# Lot ${i + 1} : ${lot.length} fiches à relire`,
      '',
      'Consigne : relecture/consigne-relecteurs.md. Répondre en JSON dans relecture/retour-<pipo|mario>-' + (i + 1) + '.json.',
      '',
      '---',
      '',
    ].join('\n') + lot.map((id) => texteFiche(id, brouillons[id])).join('\n');
    writeFileSync(join(DOSSIER, `lot-${i + 1}.md`), texte);
  }
  console.log(`relecture/lot-1.md à lot-${Math.ceil(ids.length / 10)}.md : 10 fiches par lot`);
}

function integrer() {
  const brouillons = lireJson(BROUILLONS);
  const retours = Object.fromEntries(Object.keys(RELECTEURS).map((n) => [n, lireRetours(n)]));
  for (const [n, r] of Object.entries(retours)) console.log(`${RELECTEURS[n]} : ${Object.keys(r).length} retours`);
  const { publiables, aCorriger } = trier(brouillons, retours);
  const publiees = existsSync(PUBLIEES) ? lireJson(PUBLIEES) : {};
  Object.assign(publiees, publiables);
  ecrireJson(PUBLIEES, publiees);
  const restants = Object.fromEntries(Object.entries(brouillons).filter(([id]) => id.startsWith('_') || !publiables[id]));
  ecrireJson(BROUILLONS, restants);

  const l = ['# Fiches à corriger', '', `${Object.keys(aCorriger).length} fiches non publiées. Après correction dans fiches-a-relire.json, les refaire relire par les deux relecteurs.`, ''];
  for (const [id, x] of Object.entries(aCorriger)) {
    l.push(`## ${x.fiche.titre || id} (AniList ${id})`, '');
    if (x.manquants.length) l.push(`- Pas encore relue par : ${x.manquants.map((n) => RELECTEURS[n]).join(', ')}`);
    if (x.invalides.length) l.push(`- Verdict illisible chez : ${x.invalides.map((n) => RELECTEURS[n]).join(', ')}`);
    if (x.forme.length) l.push(`- Contrôle de forme : ${x.forme.join(' ; ')}`);
    for (const [n, a] of Object.entries(x.avis)) {
      if (!a) continue;
      l.push(`- ${RELECTEURS[n]} : ${a.verdict}${a.age_propose && a.age_propose !== x.fiche.age ? `, âge proposé ${a.age_propose} (fiche : ${x.fiche.age})` : ''}${a.commentaire ? `. ${a.commentaire}` : ''}`);
      for (const err of a.erreurs || []) {
        l.push(`  - [${err.rubrique || '?'}] ${err.probleme || ''}${err.extrait ? ` (« ${err.extrait} »)` : ''}${err.correction ? ` Correction proposée : ${err.correction}` : ''}${err.source ? ` Source : ${err.source}` : ''}`);
      }
    }
    l.push('');
  }
  writeFileSync(join(DOSSIER, 'a-corriger.md'), l.join('\n'));
  console.log(`${Object.keys(publiables).length} fiches publiées, ${Object.keys(aCorriger).length} à corriger (relecture/a-corriger.md)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const commande = process.argv[2];
  if (commande === 'dossier') dossier();
  else if (commande === 'integrer') integrer();
  else {
    console.log('Usage : node manga/outils/relecture.mjs dossier | integrer');
    process.exit(1);
  }
}
