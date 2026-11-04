// Tests du circuit de relecture (manga/outils/relecture.mjs) : seule une fiche validée par les deux relecteurs est publiée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { controlerFiche, trier } from '../outils/relecture.mjs';

const fiche = (extra = {}) => ({
  titre: 'Titre',
  age: 12,
  resume: 'Résumé.',
  avis: 'Avis. Mieux vaut avoir 12 ans pour découvrir cette série.',
  scenes: [{ categorie: 'violence', titre: 'Combats', texte: 'Texte.', spoiler: false }],
  sources: [{ titre: 'Éditeur', lien: 'https://exemple.fr/a' }, { titre: 'Wikipédia', lien: 'https://fr.wikipedia.org/b' }],
  notes_relecture: ['À vérifier.'],
  ...extra,
});
const valide = { verdict: 'valide', age_propose: 12, erreurs: [], date: '2026-11-05' };

test('contrôle de forme', () => {
  assert.deepEqual(controlerFiche(fiche()), []);
  assert.ok(controlerFiche(fiche({ age: 11 })).length);
  assert.ok(controlerFiche(fiche({ sources: [{ titre: 'Seule', lien: 'https://a.fr' }] })).length);
  assert.ok(controlerFiche(fiche({ avis: 'Texte — avec tiret cadratin.' })).length);
  assert.ok(controlerFiche(fiche({ scenes: [{ categorie: 'inconnue', titre: 'x', texte: 'y' }] })).length);
});

test('publiée seulement si Pipo et Mario valident sans erreur', () => {
  const brouillons = { 1: fiche(), 2: fiche(), 3: fiche(), 4: fiche(), _format: 'ignoré' };
  const retours = {
    pipo: { 1: valide, 2: valide, 3: valide, 4: valide },
    mario: {
      1: valide,
      2: { verdict: 'a_corriger', erreurs: [{ rubrique: 'scenes', probleme: 'Non sourcé' }] },
      3: { ...valide, age_propose: 14 },
    },
  };
  const { publiables, aCorriger } = trier(brouillons, retours);
  assert.deepEqual(Object.keys(publiables), ['1']);
  assert.deepEqual(Object.keys(aCorriger).sort(), ['2', '3', '4']);
  assert.deepEqual(aCorriger[4].manquants, ['mario']);
  assert.equal(aCorriger[3].ageConteste, true);
});

test('la fiche publiée porte la relecture et perd les notes internes', () => {
  const { publiables } = trier({ 7: fiche() }, { pipo: { 7: valide }, mario: { 7: { ...valide, date: '2026-11-06' } } });
  const p = publiables[7];
  assert.equal(p.notes_relecture, undefined);
  assert.deepEqual(p.relecture, { par: ['Pipo (ChatGPT)', 'Mario (Gemini)'], date: '2026-11-06' });
  assert.equal(p.redacteur, 'Claude (assistant IA)');
});

test('un verdict « valide » avec des erreurs listées bloque la publication', () => {
  const r = { ...valide, erreurs: [{ rubrique: 'age', probleme: 'x' }] };
  const { publiables } = trier({ 9: fiche() }, { pipo: { 9: valide }, mario: { 9: r } });
  assert.deepEqual(publiables, {});
});
