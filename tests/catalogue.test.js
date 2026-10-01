'use strict';
/* Intégrité de la bibliothèque d'équipements types et des exemples. */
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/moteur.js');
const C = require('../src/catalogue.js');

test('chaque équipement est complet et vraisemblable', () => {
  const ids = new Set();
  const noms = new Set();
  for (const e of C.equipements) {
    const ref = e.id;
    assert.match(e.id, /^[a-z0-9-]+$/, ref);
    assert.ok(!ids.has(e.id), 'identifiant en double : ' + ref);
    ids.add(e.id);
    assert.ok(e.nom && e.nom.length <= M.LIMITES.nomMax, ref);
    assert.ok(!noms.has(e.nom), 'nom en double : ' + e.nom);
    noms.add(e.nom);
    assert.ok(Object.prototype.hasOwnProperty.call(M.CATEGORIES, e.categorie), 'catégorie : ' + ref);
    assert.ok(Number.isFinite(e.puissanceW) && e.puissanceW >= M.LIMITES.vraisemblanceBasseW && e.puissanceW <= M.LIMITES.vraisemblanceHauteW, 'puissance : ' + ref);
    assert.ok(e.alimentation === 'mono' || e.alimentation === 'tri', ref);
    assert.ok(e.cosPhi === null || (e.cosPhi > 0 && e.cosPhi <= 1), ref);
    assert.ok(Array.isArray(e.motsCles) && e.motsCles.every((m) => typeof m === 'string' && m), ref);
    assert.ok(!/[  ﻿]/.test(e.nom), 'caractère invisible : ' + ref);
  }
  assert.ok(C.equipements.length >= 80, 'au moins 80 équipements');
});

test('équipements triphasés cohérents avec leur libellé', () => {
  for (const e of C.equipements) {
    if (/\btri\b/i.test(e.nom)) assert.equal(e.alimentation, 'tri', e.id);
    if (/\bmono\b/i.test(e.nom)) assert.equal(e.alimentation, 'mono', e.id);
  }
});

test('bornes de recharge : courant conforme au calibre annoncé', () => {
  const p = M.creerProjet('Bornes');
  for (const id of ['borne-ve-7', 'borne-ve-11', 'borne-ve-22']) {
    const e = C.parId[id];
    p.lignes.push(M.creerLigne({ nom: e.nom, puissanceW: e.puissanceW, alimentation: e.alimentation, cosPhi: e.cosPhi }));
  }
  const r = M.calculer(p);
  const [mono32, tri16, tri32] = r.lignes.map((c) => c.iUnitaireA);
  assert.ok(Math.abs(mono32 - 32) < 0.5, 'mono 32 A : ' + mono32);
  assert.ok(Math.abs(tri16 - 16) < 0.5, 'tri 16 A : ' + tri16);
  assert.ok(Math.abs(tri32 - 32) < 0.5, 'tri 32 A : ' + tri32);
});

test('suggestions populaires disponibles', () => {
  assert.ok(C.equipements.filter((e) => e.populaire).length >= 8);
});

test('recherches courantes', () => {
  const premier = (q) => (M.rechercherCatalogue(C.equipements, q)[0] || {}).id;
  assert.equal(premier('ecran 55'), 'ecran-55');
  assert.equal(premier('tv 65'), 'ecran-65');
  assert.equal(premier('frigo'), 'refrigerateur');
  assert.equal(premier('cafe'), 'machine-cafe');
  assert.equal(premier('spot'), 'spot-led-rail');
  assert.equal(premier('clim'), 'climatiseur-mobile');
  assert.equal(premier('plancha'), 'plancha');
  assert.equal(premier('borne recharge 22'), 'borne-ve-22');
  assert.equal(premier('ordi portable'), 'ordinateur-portable');
  assert.equal(premier('lyre'), 'lyre-led');
  assert.equal(premier('mur led'), 'mur-led');
  assert.equal(premier('bière'), 'tireuse-biere');
  assert.ok(M.rechercherCatalogue(C.equipements, 'écran').length >= 6);
});

test('exemples : bilans valides, sans avertissement, recommandation obtenue', () => {
  assert.ok(C.exemples.length >= 2);
  for (const ex of C.exemples) {
    const { projet, avertissements } = M.normaliserProjet(JSON.parse(JSON.stringify(ex.projet)));
    assert.deepEqual(avertissements, [], ex.id);
    assert.ok(projet.lignes.length >= 8, ex.id);
    const r = M.calculer(projet);
    assert.equal(r.recommandation.motif, 'ok', ex.id);
    assert.ok(r.energie.eTotaleKWh > 0, ex.id);
    assert.ok(!r.alertes.some((a) => a.niveau === 'erreur'), ex.id);
  }
});
