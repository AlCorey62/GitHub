// Tests du calcul de l'âge conseillé (manga/site/js/age.js) sur des fiches fictives.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AGES, ETIQUETTES_UTILES, evaluerAge, couvertureSensible } from '../site/js/age.js';

// Fiche fictive bien renseignée (fiabilité élevée) : seules les étiquettes données comptent.
const fiche = (tags = [], genres = ['Action'], extra = {}) => ({
  genres,
  tags: tags.map(([nom, rang, opts = {}]) => ({ nom, rang, adulte: !!opts.adulte, spoiler: !!opts.spoiler })),
  nbEtiquettes: 20,
  popularite: 20000,
  ...extra,
});

test('public visé : point de départ', () => {
  assert.equal(evaluerAge(fiche([['Kids', 90]], ['Comedy'])).age, 6);
  assert.equal(evaluerAge(fiche([['Kids', 90]], ['Action', 'Comedy'])).age, 8);
  assert.equal(evaluerAge(fiche([['Shounen', 90]])).age, 10);
  assert.equal(evaluerAge(fiche([['Shoujo', 90]], ['Romance'])).age, 10);
  assert.equal(evaluerAge(fiche([['Seinen', 90]])).age, 12);
  assert.equal(evaluerAge(fiche([['Josei', 90]], ['Drama'])).age, 12);
  assert.equal(evaluerAge(fiche([])).age, 10);
});

test('le public le plus pertinent l\'emporte', () => {
  const e = evaluerAge(fiche([['Seinen', 40], ['Shounen', 85]]));
  assert.equal(e.public.cle, 'Shounen');
});

test('violence : paliers de pertinence du gore', () => {
  assert.equal(evaluerAge(fiche([['Shounen', 90], ['Gore', 85]])).age, 16);
  assert.equal(evaluerAge(fiche([['Shounen', 90], ['Gore', 60]])).age, 14);
  assert.equal(evaluerAge(fiche([['Shounen', 90], ['Gore', 35]])).age, 12);
});

test('étiquettes sous 30 % ignorées', () => {
  const e = evaluerAge(fiche([['Shounen', 90], ['Gore', 25], ['Rape', 20]]));
  assert.equal(e.age, 10);
  assert.equal(e.raisons.length, 0);
});

test('sexualité : scènes représentées et violences sexuelles', () => {
  assert.equal(evaluerAge(fiche([['Seinen', 90], ['Group Sex', 54, { adulte: true }]])).age, 18);
  assert.equal(evaluerAge(fiche([['Seinen', 90], ['Group Sex', 35, { adulte: true }]])).age, 16);
  assert.equal(evaluerAge(fiche([['Seinen', 90], ['Rape', 75, { adulte: true }]])).age, 18);
  assert.equal(evaluerAge(fiche([['Shounen', 90], ['Large Breasts', 65, { adulte: true }]])).age, 14);
  // étiquette réservée aux adultes absente du barème : règle par défaut
  assert.equal(evaluerAge(fiche([['Shounen', 90], ['Inconnue', 70, { adulte: true }]])).age, 16);
  assert.equal(evaluerAge(fiche([['Shounen', 90]], ['Ecchi', 'Comedy'])).age, 14);
});

test('les orientations amoureuses ne changent pas l\'âge', () => {
  const base = evaluerAge(fiche([['Shoujo', 90]], ['Romance'])).age;
  for (const nom of ["Boys' Love", 'Yuri', 'LGBTQ+ Themes', 'Transgender']) {
    assert.equal(evaluerAge(fiche([['Shoujo', 90], [nom, 95]], ['Romance'])).age, base, nom);
  }
});

test('contenu doux : seinen apaisant ramené à 8 ans', () => {
  const e = evaluerAge(fiche([['Seinen', 90], ['Iyashikei', 85]], ['Slice of Life', 'Comedy']));
  assert.equal(e.age, 8);
  assert.ok(e.douceur);
  // un genre non paisible bloque la baisse
  assert.equal(evaluerAge(fiche([['Seinen', 90], ['Iyashikei', 85]], ['Slice of Life', 'Romance'])).age, 12);
  // un élément sensible aussi
  assert.equal(evaluerAge(fiche([['Seinen', 90], ['Iyashikei', 85], ['Suicide', 40]], ['Slice of Life'])).age, 12);
});

test('prudence quand les données sont rares', () => {
  const rare = { nbEtiquettes: 3, popularite: 150 };
  const seinen = evaluerAge(fiche([['Seinen', 90]], ['Drama'], rare));
  assert.equal(seinen.fiabilite, 'faible');
  assert.equal(seinen.age, 14);
  assert.ok(seinen.prudence);
  assert.equal(evaluerAge(fiche([], ['Drama'], rare)).age, 12);
  assert.equal(evaluerAge(fiche([['Shounen', 90]], ['Drama'], rare)).age, 10);
});

test('âge vérifié prioritaire, estimation conservée', () => {
  const e = evaluerAge(fiche([['Shounen', 90], ['Gore', 85]]), { age: 12, source: 'Éditeur français' });
  assert.equal(e.age, 12);
  assert.equal(e.estimation, 16);
  assert.equal(e.verifie, true);
  // âge hors échelle ignoré
  assert.equal(evaluerAge(fiche([['Shounen', 90]]), { age: 11 }).verifie, false);
});

test('spoilers signalés, catégories et couverture sensible', () => {
  const e = evaluerAge(fiche([['Shounen', 90], ['Suicide', 70, { spoiler: true }], ['Nudity', 80]]));
  assert.equal(e.raisons.find((r) => r.nom === 'Suicide').spoiler, true);
  assert.equal(e.categories.themes, 14);
  assert.equal(e.categories.sexe, 16);
  assert.equal(couvertureSensible(e), true);
  assert.equal(couvertureSensible(evaluerAge(fiche([['Shounen', 90], ['Gore', 90]]))), false);
});

test('résultat toujours sur l\'échelle', () => {
  for (const tags of [[], [['Kids', 99]], [['Seinen', 99], ['Gore', 99], ['Group Sex', 99, { adulte: true }]]]) {
    assert.ok(AGES.includes(evaluerAge(fiche(tags)).age));
  }
  assert.ok(ETIQUETTES_UTILES.has('Gore') && ETIQUETTES_UTILES.has('Kids'));
});
