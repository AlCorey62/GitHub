// Tests de la traduction automatique des résumés (manga/site/js/traduction.js), avec un traducteur simulé.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

let n = 0;
// Chaque test charge une nouvelle copie du module (son état interne repart de zéro).
const charger = () => import(new URL(`../site/js/traduction.js?copie=${n++}`, import.meta.url));

const simuler = ({ dispo = 'available', traduire = (t) => `FR:${t}`, bloquer = false } = {}) => {
  globalThis.Translator = {
    availability: () => (bloquer ? new Promise(() => {}) : Promise.resolve(dispo)),
    create: async () => ({ translate: async (t) => traduire(t) }),
  };
};

afterEach(() => { delete globalThis.Translator; });

test('sans traducteur intégré : rien à traduire, le résumé reste en anglais', async () => {
  const t = await charger();
  assert.equal(t.traducteurDisponible(), false);
  assert.equal(await t.traduireEnFrancais('Hello'), null);
});

test('traduit paragraphe par paragraphe en gardant les sauts de paragraphe', async () => {
  simuler();
  const t = await charger();
  assert.equal(t.traducteurDisponible(), true);
  assert.equal(await t.traduireEnFrancais('One.\n\nTwo.'), 'FR:One.\n\nFR:Two.');
});

test('langue non prise en charge : null, puis traducteur considéré comme absent', async () => {
  simuler({ dispo: 'unavailable' });
  const t = await charger();
  assert.equal(await t.traduireEnFrancais('Hello'), null);
  assert.equal(t.traducteurDisponible(), false);
});

test('API présente mais muette : abandon rapide, puis traducteur considéré comme absent', async () => {
  simuler({ bloquer: true });
  const t = await charger();
  const debut = Date.now();
  assert.equal(await t.traduireEnFrancais('Hello'), null);
  assert.ok(Date.now() - debut < 5000);
  assert.equal(t.traducteurDisponible(), false);
});

test('erreur pendant la traduction : null, pas d\'exception', async () => {
  simuler({ traduire: () => { throw new Error('panne'); } });
  const t = await charger();
  assert.equal(await t.traduireEnFrancais('Hello'), null);
});
