// Tests des textes des fiches (manga/site/js/textes.js) : aucune phrase sans donnée derrière.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FANSERVICE, REGLES_ETIQUETTES, REGLES_GENRES, SEXE_EXPLICITE, evaluerAge } from '../site/js/age.js';
import { DEFINITIONS, DEFINITIONS_GENRES, THEMES, scenesDifficiles, synthese, themes } from '../site/js/textes.js';

const manga = (tags = [], extra = {}) => ({
  genres: ['Action', 'Adventure'],
  tags: tags.map(([nom, rang, opts = {}]) => ({ nom, rang, adulte: !!opts.adulte, spoiler: !!opts.spoiler })),
  nbEtiquettes: 20,
  popularite: 20000,
  volumes: 23,
  statut: 'FINISHED',
  format: 'MANGA',
  pays: 'JP',
  ...extra,
});
const GENRES_FR = { Action: 'Action', Adventure: 'Aventure', 'Slice of Life': 'Tranche de vie', Comedy: 'Comédie' };

test('chaque règle sensible a une définition en français', () => {
  const groupes = new Set([...SEXE_EXPLICITE, ...FANSERVICE]);
  for (const nom of Object.keys(REGLES_ETIQUETTES)) {
    if (!groupes.has(nom)) assert.ok(DEFINITIONS[nom], `définition manquante : ${nom}`);
  }
  for (const g of Object.keys(REGLES_GENRES)) assert.ok(DEFINITIONS_GENRES[g], `définition manquante : ${g}`);
});

test('les thèmes ne recouvrent pas les étiquettes sensibles', () => {
  for (const nom of Object.keys(THEMES)) assert.ok(!REGLES_ETIQUETTES[nom], `${nom} est à la fois thème et règle`);
});

test('thèmes : seuil de pertinence, spoilers écartés, libellés sans doublon', () => {
  const m = manga([
    ['Revenge', 83], ['Found Family', 55], ['Tragedy', 90, { spoiler: true }],
    ['Cute Girls Doing Cute Things', 70], ['Cute Boys Doing Cute Things', 65], ['Shounen', 90],
  ]);
  const t = themes(m, 60);
  assert.deepEqual(t.map((x) => x.nom), ['Revenge', 'Cute Girls Doing Cute Things']);
  assert.equal(t[0].titre, 'Vengeance');
  assert.ok(themes(m, 50).some((x) => x.nom === 'Found Family'));
});

test('scènes difficiles : définition pour chaque élément, sans nom d\'étiquette explicite', () => {
  const m = manga([['Seinen', 90], ['Gore', 73], ['Group Sex', 54, { adulte: true }], ['Large Breasts', 65, { adulte: true }], ['Inconnue', 70, { adulte: true }]]);
  const parCat = scenesDifficiles(evaluerAge(m));
  const toutes = Object.values(parCat).flatMap((c) => c.scenes);
  assert.ok(toutes.length >= 3);
  for (const s of toutes) {
    assert.ok(s.texte, `texte vide pour ${s.titre}`);
    assert.ok(!/Group Sex|Large Breasts|Inconnue/.test(`${s.titre} ${s.texte}`));
  }
  const gore = parCat.violence.scenes.find((s) => s.titre.startsWith('Gore'));
  assert.equal(gore.rang, 73);
  assert.equal(gore.age, 14);
});

test('synthèse : public, tomes, points d\'attention chiffrés, âge final', () => {
  const m = manga([['Shounen', 92], ['Gore', 68], ['Body Horror', 59], ['Revenge', 76]]);
  const texte = synthese(m, evaluerAge(m), GENRES_FR).join(' ');
  assert.match(texte, /^Shōnen, 23 tomes, série terminée\./);
  assert.match(texte, /Genres : action, aventure\./);
  assert.match(texte, /Thèmes principaux : vengeance\./);
  assert.match(texte, /gore \(sang, mutilations\) \(68 %\)/);
  assert.match(texte, /Mieux vaut avoir 14 ans pour découvrir cette série\.$/);
  assert.ok(!/torture|nudité/i.test(texte), 'élément absent mentionné');
});

test('synthèse : récit doux, adulte, histoire courte, données rares', () => {
  const doux = manga([['Seinen', 90], ['Iyashikei', 85]], { genres: ['Slice of Life', 'Comedy'] });
  assert.match(synthese(doux, evaluerAge(doux), GENRES_FR).join(' '), /Récit doux : aucune scène difficile signalée.*8 ans/);

  const adulte = manga([['Seinen', 90], ['Rape', 82, { adulte: true }]]);
  assert.match(synthese(adulte, evaluerAge(adulte)).join(' '), /Cette série est réservée aux adultes\.$/);

  const court = manga([['Shounen', 90]], { format: 'ONE_SHOT', volumes: 1 });
  assert.match(synthese(court, evaluerAge(court)).join(' '), /histoire courte.*découvrir ce récit\./);

  const rare = manga([['Seinen', 90]], { nbEtiquettes: 2, popularite: 100 });
  assert.match(synthese(rare, evaluerAge(rare)).join(' '), /relevé par prudence/);
});

test('synthèse : les éléments d\'intrigue restent masqués', () => {
  const m = manga([['Shounen', 90], ['Suicide', 70, { spoiler: true }]]);
  const texte = synthese(m, evaluerAge(m)).join(' ');
  assert.ok(!/suicide/i.test(texte));
  assert.match(texte, /1 élément d'intrigue masqué \(dès 14 ans/);
});
