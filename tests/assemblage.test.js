'use strict';
/* Tests de l'assemblage (scripts/build.js) : variante pour l'aperçu des artefacts Claude. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { construire, versionApercuClaude } = require('../scripts/build.js');

test('aperçu Claude : titre en tête, ni doctype ni html, head, body, cadre signalé avant l’interface', () => {
  const apercu = versionApercuClaude(construire()['app.html']);
  assert.match(apercu, /^<title>Calculateur d’Énergie Stand<\/title>\n/);
  for (const balise of [/<!DOCTYPE/i, /<html[\s>]/, /<\/?head>/, /<\/?body[\s>]/]) assert.doesNotMatch(apercu, balise);
  const signal = apercu.indexOf('window.CALCULATEUR_STAND_APERCU_CLAUDE = true');
  assert.ok(signal > 0 && signal < apercu.indexOf('<script id="interface">'));
  for (const id of ['<style>', '<script id="moteur">', '<script id="catalogue">', 'id="bandeau-apercu"']) assert.ok(apercu.includes(id), id);
});

test('aperçu Claude : structure de app.html inattendue refusée', () => {
  assert.throws(() => versionApercuClaude('<p>page sans en-tête</p>'), /structure de app\.html inattendue/);
});
