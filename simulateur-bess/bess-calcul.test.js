const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('./bess-calcul.js');

const pack = { ...B.HYPOTHESES_BESS };

test('charge moyenne et crête d un équipement unique', () => {
  const c = B.calculerCharge([{ nom: 'x', puissanceW: 1000, quantite: 2, facteur: 0.5, cosPhi: 0.8 }]);
  assert.equal(c.pCreteKw, 2);
  assert.equal(c.pMoyenneKw, 1);
  assert.ok(Math.abs(c.sMoyenneKva - 1 / 0.8) < 1e-9);
  assert.ok(Math.abs(c.sCreteKva - 2 / 0.8) < 1e-9);
});

test('kit vide : charge nulle et autonomie infinie', () => {
  const c = B.calculerCharge([]);
  assert.equal(c.pMoyenneKw, 0);
  assert.equal(B.autonomie(c.pMoyenneKw, pack), Infinity);
});

test('puissance active du pack = kVA x cos phi', () => {
  assert.ok(Math.abs(B.puissancePackKw(pack) - 270) < 1e-9);
});

test('énergie utilisable = kWh nominal x (1 - SOC min)', () => {
  assert.ok(Math.abs(B.energieUtilisable(pack) - 486) < 1e-9);
});

test('autonomie = énergie utilisable / puissance soutirée', () => {
  // 27 kW de charge, rendement 0,9 : soutiré 30 kW, autonomie 486 / 30 = 16,2 h
  assert.ok(Math.abs(B.autonomie(27, pack) - 16.2) < 1e-9);
});

test('les auxiliaires réduisent l autonomie', () => {
  const avecAux = { ...pack, auxiliairesKw: 3 };
  assert.ok(B.autonomie(27, avecAux) < B.autonomie(27, pack));
});

test('courbe SOC : part de 100 % et finit à l autonomie', () => {
  const pts = B.courbeSoc(27, pack, 100, 1);
  assert.equal(pts[0].soc, 100);
  const fin = pts[pts.length - 1];
  assert.ok(Math.abs(fin.t - 16.2) < 1e-9);
  // Au bout de l autonomie, le SOC doit atteindre le minimum de réserve (10 %)
  assert.ok(Math.abs(fin.soc - 10) < 1e-6);
});

test('courbe SOC limitée à la durée demandée', () => {
  const pts = B.courbeSoc(27, pack, 2, 0.5);
  assert.equal(pts[pts.length - 1].t, 2);
});

test('kit exemple : aucune alerte pour le pack de référence', () => {
  const c = B.calculerCharge(B.KIT_EXEMPLE);
  const msgs = B.verifier(c, pack, 6);
  assert.deepEqual(msgs, []);
});

test('alerte si le pic apparent dépasse le calibre', () => {
  const c = B.calculerCharge([{ nom: 'x', puissanceW: 400000, quantite: 1, facteur: 1, cosPhi: 1 }]);
  const msgs = B.verifier(c, pack, 1);
  assert.ok(msgs.some((m) => m.texte.includes('Pic apparent')));
});

test('alerte si l autonomie est inférieure à la durée demandée', () => {
  const c = B.calculerCharge(B.KIT_EXEMPLE);
  const msgs = B.verifier(c, pack, 24);
  assert.ok(msgs.some((m) => m.texte.includes('Autonomie insuffisante')));
});
