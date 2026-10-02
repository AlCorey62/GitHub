'use strict';
/*
 * Tests de bout en bout dans Chromium (Playwright) sur le fichier livré, app.html.
 * Aucune requête réelle n'est envoyée au site darkside-energy.com : la base en ligne est
 * simulée ou coupée par interception.
 *
 *   npm run test:e2e
 */
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const RACINE = path.join(__dirname, '..');
const URL_FICHIER = 'file://' + path.join(RACINE, 'app.html');
const BASE_EN_LIGNE = 'https://www.darkside-energy.com/**';
let navigateur;

before(async () => {
  navigateur = await chromium.launch();
});
after(async () => {
  if (navigateur) await navigateur.close();
});

const couper = (route) => route.abort();

async function ouvrir(options = {}) {
  const contexte = await navigateur.newContext(
    Object.assign({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, locale: 'fr-FR' }, options.contexte || {})
  );
  await contexte.route(BASE_EN_LIGNE, options.enLigne || couper);
  if (options.init) await contexte.addInitScript(options.init);
  const page = await contexte.newPage();
  const erreurs = suivreErreurs(page);
  await page.goto(options.url || URL_FICHIER);
  await page.waitForFunction(() => document.documentElement.classList.contains('pret'));
  return { contexte, page, erreurs };
}

function suivreErreurs(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    // Les requêtes coupées vers la base en ligne sont attendues.
    if (m.type() === 'error' && !/net::ERR_FAILED|ERR_INTERNET_DISCONNECTED/.test(m.text())) erreurs.push(m.text());
  });
  return erreurs;
}

const etatProjet = (page) => page.evaluate(() => window.CalculateurStand.etat());
const resultat = (page) => page.evaluate(() => window.CalculateurStand.resultat());

async function ajouter(page, texte) {
  await page.fill('#saisie', texte);
  await page.waitForSelector('#suggestions [role="option"][aria-selected="true"]');
  await page.press('#saisie', 'Enter');
}

async function attendreSauvegarde(page) {
  await page.waitForTimeout(450);
}

async function telechargement(page, declencheur) {
  const [dl] = await Promise.all([page.waitForEvent('download'), declencheur()]);
  return { nom: dl.suggestedFilename(), contenu: fs.readFileSync(await dl.path(), 'utf8'), chemin: await dl.path() };
}

async function actionMenu(page, action) {
  await page.click('#btn-menu');
  await page.click('#menu-principal [data-action="' + action + '"]');
}

describe('démarrage et saisie', () => {
  test('état vide sans erreur', async () => {
    const { contexte, page, erreurs } = await ouvrir();
    assert.equal(await page.isVisible('#etat-vide'), true);
    assert.equal(await page.textContent('#r-pfois'), '0');
    assert.match(await page.textContent('#racc-titre-texte'), /En attente/);
    assert.equal(await page.locator('#puces-populaires .puce').count(), 8);
    assert.equal(await page.isVisible('#bandeau-stockage'), false);
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });

  test('saisie rapide avec quantité, puis annuler et rétablir', async () => {
    const { contexte, page, erreurs } = await ouvrir();
    await ajouter(page, '12 spots led');
    let p = await etatProjet(page);
    assert.equal(p.lignes.length, 1);
    assert.equal(p.lignes[0].nom, 'Spot LED sur rail');
    assert.equal(p.lignes[0].quantite, 12);
    assert.equal(p.lignes[0].puissanceW, 30);
    assert.equal(p.lignes[0].origine, 'type');
    await page.waitForFunction(() => document.querySelector('#r-pfois').textContent === '360');
    assert.equal(await page.textContent('#r-pfois-unite'), 'W');
    assert.equal(await page.locator('tr.ligne .badge-type').count(), 1);
    assert.equal(await page.isVisible('#etat-vide'), false);
    assert.equal(await page.inputValue('#saisie'), '', 'champ vidé pour la saisie suivante');

    await page.click('.lignes-entete h2');
    await page.keyboard.press('Control+z');
    p = await etatProjet(page);
    assert.equal(p.lignes.length, 0);
    await page.keyboard.press('Control+Shift+z');
    p = await etatProjet(page);
    assert.equal(p.lignes.length, 1);
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });

  test('puissance donnée dans la saisie : valeur saisie, pas valeur type', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, '2 plancha 2,5 kW');
    const [l] = (await etatProjet(page)).lignes;
    assert.equal(l.nom, 'Plancha électrique');
    assert.equal(l.quantite, 2);
    assert.equal(l.puissanceW, 2500);
    assert.equal(l.origine, 'saisie');
    assert.equal(l.cosPhi, 1);
    assert.equal(await page.locator('tr.ligne .badge-type').count(), 0);
    await contexte.close();
  });

  test('équipement inconnu : ajout personnalisé, puissance à compléter signalée', async () => {
    const { contexte, page } = await ouvrir();
    await page.fill('#saisie', 'machine spéciale xyz');
    await page.waitForSelector('#suggestions [role="option"]');
    const options = await page.locator('#suggestions [role="option"]').allTextContents();
    assert.ok(options.some((t) => t.includes('Ajouter « Machine spéciale xyz »')), options.join(' | '));
    await page.locator('#suggestions [role="option"]', { hasText: 'Ajouter « Machine spéciale xyz »' }).click();
    const [l] = (await etatProjet(page)).lignes;
    assert.equal(l.nom, 'Machine spéciale xyz');
    assert.equal(l.puissanceW, null);
    const r = await resultat(page);
    assert.ok(r.alertes.some((a) => a.code === 'PUISSANCE_A_COMPLETER'));
    assert.equal(await page.locator('tr.ligne [data-champ="puissanceW"].a-completer').count(), 1);
    await contexte.close();
  });

  test('puce d’équipement courant', async () => {
    const { contexte, page } = await ouvrir();
    await page.click('#puces-populaires .puce >> nth=0');
    assert.equal((await etatProjet(page)).lignes.length, 1);
    await contexte.close();
  });
});

describe('tableau des équipements', () => {
  test('édition : kW acceptés, valeur invalide refusée puis abandonnée', async () => {
    const { contexte, page, erreurs } = await ouvrir();
    await ajouter(page, 'bouilloire');
    const champ = page.locator('tr.ligne [data-champ="puissanceW"]').first();
    await champ.fill('1,5 kW');
    let [l] = (await etatProjet(page)).lignes;
    assert.equal(l.puissanceW, 1500);
    assert.equal(l.origine, 'saisie', 'une puissance modifiée devient une donnée saisie');
    await champ.press('Tab');
    assert.equal(await champ.inputValue(), '1500');

    await champ.fill('abc');
    assert.equal(await champ.getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('tr.ligne .erreur-champ').count(), 1);
    await champ.press('Tab');
    assert.equal(await champ.inputValue(), '1500', 'valeur précédente rétablie');
    assert.equal(await page.locator('.toast.attention').count(), 1);
    [l] = (await etatProjet(page)).lignes;
    assert.equal(l.puissanceW, 1500);

    const quantite = page.locator('tr.ligne [data-champ="quantite"]').first();
    await quantite.fill('0');
    const r = await resultat(page);
    assert.equal(r.totaux.nbLignesIncluses, 0);
    assert.ok(r.alertes.some((a) => a.code === 'QUANTITE_NULLE'));
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });

  test('détails : cos φ propre, durée, catégorie déplacée', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, 'ordinateur portable');
    await page.click('tr.ligne [data-action="details"]');
    const details = page.locator('tr.ligne-details:not([hidden])');
    await details.locator('[data-champ="cosPhi"]').fill('0,95');
    await details.locator('[data-champ="heuresParJour"]').fill('8');
    await details.locator('[data-champ="categorie"]').selectOption('accueil');
    const [l] = (await etatProjet(page)).lignes;
    assert.equal(l.cosPhi, 0.95);
    assert.equal(l.heuresParJour, 8);
    assert.equal(l.categorie, 'accueil');
    assert.equal(await page.locator('tbody.groupe[data-categorie="accueil"] tr.ligne').count(), 1);
    assert.equal(await page.locator('tr.ligne-details:not([hidden])').count(), 1, 'détails restés ouverts');
    await contexte.close();
  });

  test('suppression avec annulation dans la notification', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, 'écran 55');
    await ajouter(page, 'frigo');
    await page.click('tr.ligne >> nth=0 >> [data-action="supprimer"]');
    assert.equal((await etatProjet(page)).lignes.length, 1);
    assert.equal(await page.locator('.toast .toast-action').count(), 1, 'une seule action d’annulation proposée');
    await page.click('.toast:has-text("supprimé") .toast-action');
    const p = await etatProjet(page);
    assert.equal(p.lignes.length, 2);
    await contexte.close();
  });

  test('équilibrage triphasé et passage d’un équipement en triphasé', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, '3 bouilloire');
    let r = await resultat(page);
    assert.equal(r.retenu.id, 'tri32');
    assert.equal(r.vuePhases.desequilibre, 0);
    assert.equal(await page.locator('#phases .phase').count(), 3);
    assert.equal(await page.textContent('#racc-titre-texte'), '32 A tri');
    await page.locator('tr.ligne [data-champ="alimentation"]').first().selectOption('tri');
    const [l] = (await etatProjet(page)).lignes;
    assert.equal(l.alimentation, 'tri');
    assert.equal(await page.locator('tr.ligne .phase-tri').count(), 1);
    r = await resultat(page);
    assert.equal(r.scenarioMono.possible, false);
    await contexte.close();
  });
});

describe('rendu incrémental', () => {
  test('annuler remet les valeurs affichées et la catégorie d’origine', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, 'bouilloire');
    const champ = page.locator('tr.ligne [data-champ="puissanceW"]').first();
    await champ.fill('1500');
    await champ.press('Tab');
    await page.click('tr.ligne [data-action="details"]');
    await page.locator('tr.ligne-details:not([hidden]) [data-champ="categorie"]').selectOption('divers');
    assert.equal(await page.locator('tbody.groupe[data-categorie="divers"] tr.ligne').count(), 1);
    await page.click('.lignes-entete h2');
    await page.keyboard.press('Control+z');
    assert.equal(await page.locator('tbody.groupe[data-categorie="catering"] tr.ligne').count(), 1);
    assert.equal(await page.locator('tbody.groupe[data-categorie="divers"]').count(), 0, 'groupe vide retiré');
    await page.keyboard.press('Control+z');
    assert.equal(await page.locator('tr.ligne [data-champ="puissanceW"]').first().inputValue(), '2000');
    await page.keyboard.press('Control+Shift+z');
    assert.equal(await page.locator('tr.ligne [data-champ="puissanceW"]').first().inputValue(), '1500');
    await contexte.close();
  });

  test('gros bilan (1 000 lignes) : saisie et ajout restent fluides', async () => {
    const M = require('../src/moteur.js');
    const C = require('../src/catalogue.js');
    const p = M.creerProjet('Gros bilan');
    for (let i = 0; i < 1000; i++) {
      const e = C.equipements[i % C.equipements.length];
      p.lignes.push(M.creerLigne({ nom: e.nom + ' ' + i, categorie: e.categorie, puissanceW: e.puissanceW, quantite: 1 + (i % 7), alimentation: e.alimentation }));
    }
    const chemin = path.join(os.tmpdir(), 'gros-bilan-' + Date.now() + '.json');
    fs.writeFileSync(chemin, M.serialiserProjet(p));
    const { contexte, page, erreurs } = await ouvrir();
    await page.setInputFiles('#fichier', chemin);
    await page.waitForFunction(() => document.querySelectorAll('tr.ligne').length === 1000);
    const parSaisie = await page.evaluate(() => {
      const el = document.querySelector('tr.ligne [data-champ="puissanceW"]');
      el.focus();
      const t0 = performance.now();
      for (let i = 0; i < 20; i++) {
        el.value = String(100 + i);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return (performance.now() - t0) / 20;
    });
    assert.ok(parSaisie < 80, 'saisie : ' + parSaisie.toFixed(1) + ' ms');
    const ajout = await page.evaluate(() => {
      const input = document.querySelector('#saisie');
      input.focus();
      input.value = 'frigo';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const t0 = performance.now();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return performance.now() - t0;
    });
    assert.ok(ajout < 800, 'ajout : ' + ajout.toFixed(0) + ' ms');
    assert.equal(await page.locator('tr.ligne').count(), 1001);
    fs.unlinkSync(chemin);
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });
});

describe('raccordement et hypothèses', () => {
  test('raccordement imposé en surcharge, puis retour à la recommandation', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, '3 bouilloire');
    await page.selectOption('#choix-raccordement', 'mono16');
    let r = await resultat(page);
    assert.equal(r.retenu.source, 'impose');
    assert.equal(r.retenu.statut, 'surcharge');
    assert.match(await page.textContent('#racc-statut'), /Surcharge/);
    assert.equal(await page.locator('#alertes .alerte.erreur').count(), 1);
    await page.click('#alertes [data-action="retour-recommandation"]');
    r = await resultat(page);
    assert.equal(r.retenu.source, 'recommande');
    assert.equal(r.retenu.id, 'tri32');
    await contexte.close();
  });

  test('hypothèses : durée, valeur refusée, retour aux valeurs par défaut', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, 'bouilloire');
    await page.click('#btn-hypotheses');
    await page.fill('[data-hyp="heuresParJour"]', '10');
    let r = await resultat(page);
    assert.equal(r.energie.eJourKWh, 20);
    await page.fill('[data-hyp="cosPhi"]', '1,5');
    assert.equal(await page.getAttribute('[data-hyp="cosPhi"]', 'aria-invalid'), 'true');
    assert.equal((await etatProjet(page)).hypotheses.cosPhi, 0.85);
    await page.fill('[data-hyp="tauxChargeMax"]', '70');
    assert.equal((await etatProjet(page)).hypotheses.tauxChargeMax, 0.7);
    await page.uncheck('[data-offre="mono16"]');
    assert.deepEqual((await etatProjet(page)).hypotheses.offresProposees, ['mono32', 'tri32', 'tri63', 'tri125']);
    await page.click('#btn-hyp-defaut');
    const h = (await etatProjet(page)).hypotheses;
    assert.equal(h.heuresParJour, null);
    assert.equal(h.tauxChargeMax, 0.8);
    assert.equal(h.offresProposees.length, 5);
    await page.click('#dlg-hypotheses [data-fermer] >> nth=0');
    await contexte.close();
  });

  test('raccordement imposé personnalisé depuis les hypothèses', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, 'bouilloire');
    await page.click('#btn-hypotheses');
    await page.selectOption('#impose-phases', '3');
    await page.fill('#impose-calibre', '40');
    const r = await resultat(page);
    assert.equal(r.retenu.source, 'impose');
    assert.equal(r.retenu.calibreA, 40);
    assert.equal(r.retenu.phases, 3);
    await page.keyboard.press('Escape');
    assert.equal(await page.inputValue('#choix-raccordement'), 'perso');
    await contexte.close();
  });
});

describe('bilans, fichiers et partage', () => {
  test('enregistrement automatique, rechargement, plusieurs bilans, suppression annulable', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, 'écran 55');
    await page.fill('#projet-nom', 'Stand A');
    await attendreSauvegarde(page);
    await page.reload();
    await page.waitForFunction(() => document.documentElement.classList.contains('pret'));
    let p = await etatProjet(page);
    assert.equal(p.info.nom, 'Stand A');
    assert.equal(p.lignes.length, 1);

    await page.click('#btn-bilans');
    await page.click('#dlg-bilans [data-action="nouveau"]');
    await ajouter(page, 'frigo');
    await page.fill('#projet-nom', 'Stand B');
    await attendreSauvegarde(page);
    await page.click('#btn-bilans');
    assert.equal(await page.locator('#liste-bilans .bilan').count(), 2);
    await page.click('#liste-bilans .bilan-ouvrir:has-text("Stand A")');
    p = await etatProjet(page);
    assert.equal(p.info.nom, 'Stand A');

    await page.click('#btn-bilans');
    await page.click('#liste-bilans .bilan:has-text("Stand B") [data-action="supprimer-bilan-id"]');
    await page.click('#btn-confirmer-oui');
    await page.waitForFunction(() => document.querySelectorAll('#liste-bilans .bilan').length === 1);
    await page.click('.toast:has-text("supprimé") .toast-action');
    await page.waitForFunction(() => document.querySelectorAll('#liste-bilans .bilan').length === 2);
    await contexte.close();
  });

  test('fichier du bilan : export puis import sans écraser', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, '12 spots led');
    await page.fill('#projet-nom', 'Export');
    const fichier = await telechargement(page, () => actionMenu(page, 'export-json'));
    assert.equal(fichier.nom, 'Export.bilan-stand.json');
    const contenu = JSON.parse(fichier.contenu);
    assert.equal(contenu.format, 'calculateur-energie-stand');
    assert.equal(contenu.projet.lignes[0].quantite, 12);

    const autre = await ouvrir();
    await autre.page.setInputFiles('#fichier', fichier.chemin);
    await autre.page.waitForFunction(() => window.CalculateurStand.etat().info.nom === 'Export');
    assert.equal((await etatProjet(autre.page)).lignes.length, 1);
    await autre.contexte.close();

    const idAvant = (await etatProjet(page)).id;
    await page.setInputFiles('#fichier', fichier.chemin);
    await page.waitForSelector('.toast:has-text("sans rien écraser")');
    const apres = await etatProjet(page);
    assert.notEqual(apres.id, idAvant, 'import du même bilan : nouvel identifiant');
    await contexte.close();
  });

  test('fichier refusé : message clair, rien de modifié', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, 'frigo');
    const chemin = path.join(os.tmpdir(), 'pas-un-bilan-' + Date.now() + '.json');
    fs.writeFileSync(chemin, '{"autre":true}');
    await page.setInputFiles('#fichier', chemin);
    await page.waitForSelector('.toast.erreur:has-text("ne provient pas")');
    assert.equal((await etatProjet(page)).lignes.length, 1);
    fs.unlinkSync(chemin);
    await contexte.close();
  });

  test('export CSV pour Excel', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, '12 spots led');
    const fichier = await telechargement(page, () => actionMenu(page, 'export-csv'));
    assert.ok(fichier.contenu.startsWith('﻿'));
    const lignes = fichier.contenu.slice(1).trim().split('\r\n');
    assert.ok(lignes[0].startsWith('Désignation;Catégorie;Puissance unitaire (W);Quantité'));
    assert.ok(lignes[1].startsWith('Spot LED sur rail;Lumière;30;12;1;0,85;Monophasé;'), lignes[1]);
    await contexte.close();
  });

  test('collage depuis Excel avec en-têtes, puis liste simple', async () => {
    const { contexte, page } = await ouvrir();
    await actionMenu(page, 'coller');
    await page.fill('#import-texte', 'Désignation\tPuissance (W)\tQté\tAlimentation\nSpot LED\t30\t12\tMono\nFour mixte\t11 000\t1\tTri\nÉcran 55 pouces\t150\t2\tMono');
    await page.waitForSelector('#btn-importer:has-text("Importer 3 équipements")');
    await page.click('#btn-importer');
    let p = await etatProjet(page);
    assert.equal(p.lignes.length, 3);
    assert.equal(p.lignes.find((l) => l.nom === 'Four mixte').alimentation, 'tri');
    assert.ok(p.lignes.every((l) => l.origine === 'saisie'));

    await actionMenu(page, 'coller');
    await page.fill('#import-texte', '12 spots LED\n2 frigos 150 W');
    await page.waitForSelector('#btn-importer:has-text("Importer 2 équipements")');
    await page.check('#import-remplacer');
    await page.click('#btn-importer');
    p = await etatProjet(page);
    assert.equal(p.lignes.length, 2);
    assert.equal(p.lignes[0].origine, 'type');
    assert.equal(p.lignes[0].quantite, 12);
    assert.equal(p.lignes[1].puissanceW, 150);
    assert.equal(p.lignes[1].origine, 'saisie');
    await contexte.close();
  });

  test('collage multiligne dans la saisie rapide : ouvre l’import', async () => {
    const { contexte, page } = await ouvrir();
    await page.focus('#saisie');
    await page.evaluate(() => {
      const donnees = new DataTransfer();
      donnees.setData('text/plain', 'Spot LED\t30\t12\nÉcran\t150\t2');
      document.querySelector('#saisie').dispatchEvent(new ClipboardEvent('paste', { clipboardData: donnees, bubbles: true, cancelable: true }));
    });
    await page.waitForSelector('#dlg-import[open]');
    assert.match(await page.inputValue('#import-texte'), /Spot LED/);
    await contexte.close();
  });

  test('lien de partage : ouverture dans un autre navigateur', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, '12 spots led');
    await page.fill('#projet-nom', 'Partagé');
    await page.click('#btn-partager');
    await page.waitForSelector('#dlg-partage[open]');
    const url = await page.inputValue('#partage-url');
    assert.match(url, /#b=z[A-Za-z0-9_-]+$/);
    assert.match(await page.textContent('#partage-note'), /fichier/);
    await contexte.close();

    const autre = await ouvrir({ url });
    await autre.page.waitForSelector('#dlg-confirmer[open]');
    await autre.page.click('#btn-confirmer-oui');
    await autre.page.waitForFunction(() => window.CalculateurStand.etat().info.nom === 'Partagé');
    const p = await etatProjet(autre.page);
    assert.equal(p.info.nom, 'Partagé');
    assert.equal(p.lignes[0].quantite, 12);
    assert.equal(await autre.page.evaluate(() => location.hash), '');
    await autre.contexte.close();
  });

  test('lien de partage abîmé : message, aucune modification', async () => {
    const { contexte, page } = await ouvrir({ url: URL_FICHIER + '#b=zAAAAAA' });
    await page.waitForSelector('.toast.erreur:has-text("endommagé")');
    assert.equal((await etatProjet(page)).lignes.length, 0);
    await contexte.close();
  });

  test('synchronisation entre deux onglets', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, 'frigo');
    await page.fill('#projet-nom', 'Onglets');
    await attendreSauvegarde(page);
    const second = await contexte.newPage();
    await second.goto(URL_FICHIER);
    await second.waitForFunction(() => document.documentElement.classList.contains('pret'));
    assert.equal((await etatProjet(second)).info.nom, 'Onglets');
    await ajouter(second, 'écran 55');
    await attendreSauvegarde(second);
    await page.waitForFunction(() => window.CalculateurStand.etat().lignes.length === 2);
    await contexte.close();
  });
});

describe('rapport', () => {
  test('aperçu structuré (données, hypothèses, calculs, recommandations) et PDF A4', async () => {
    const { contexte, page, erreurs } = await ouvrir();
    await actionMenu(page, 'exemple-bar-festival');
    await page.click('#btn-rapport');
    const titres = await page.locator('#apercu-rapport .rapport h2').allTextContents();
    assert.deepEqual(titres, ['1Synthèse', '2Équipements (données saisies)', '3Hypothèses', '4Calculs', '5Recommandations', '6Points à vérifier']);
    const texte = await page.textContent('#apercu-rapport .rapport');
    assert.ok(texte.includes('32 A tri'));
    assert.ok(texte.includes('Valeur'), 'tableau des hypothèses');
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    assert.equal(await page.locator('#zone-impression .rapport').count(), 1);
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    assert.ok(pdf.length > 20000, 'PDF de ' + pdf.length + ' octets');
    fs.writeFileSync(path.join(os.tmpdir(), 'rapport-calculateur-stand.pdf'), pdf);
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });
});

describe('robustesse et accessibilité', () => {
  test('stockage bloqué : bandeau, outil utilisable', async () => {
    const { contexte, page, erreurs } = await ouvrir({
      init: () => {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new Error('stockage bloqué');
          },
        });
      },
    });
    assert.equal(await page.isVisible('#bandeau-stockage'), true);
    await ajouter(page, 'frigo');
    assert.equal((await etatProjet(page)).lignes.length, 1);
    assert.match(await page.textContent('#etat-sauvegarde'), /indisponible/);
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });

  test('données locales abîmées : mises de côté, outil démarré', async () => {
    const { contexte, page, erreurs } = await ouvrir({
      init: () => {
        if (!sessionStorage.getItem('fait')) {
          sessionStorage.setItem('fait', '1');
          localStorage.setItem('calculateur-energie-stand/bilan/p_casse', '{pas du json');
        }
      },
    });
    await page.waitForSelector('.toast.attention:has-text("mis de côté")');
    const cles = await page.evaluate(() => Object.keys(localStorage));
    assert.ok(cles.some((k) => k.startsWith('calculateur-energie-stand/illisible/')));
    assert.ok(!cles.includes('calculateur-energie-stand/bilan/p_casse'));
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });

  test('base en ligne simulée : résultats affichés en texte, valeurs contrôlées', async () => {
    const enLigne = (route) => {
      const entetes = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: entetes });
      return route.fulfill({
        status: 200,
        headers: entetes,
        contentType: 'application/json',
        body: JSON.stringify({
          devices: [
            { name: 'Totem Dark Side', power: 180, diversity: 0.9 },
            { name: '<img src=x onerror="window.piege=1">', power: 50, diversity: 1 },
            { name: 'Invalide', power: -5 },
          ],
        }),
      });
    };
    const { contexte, page, erreurs } = await ouvrir({ enLigne });
    await page.fill('#saisie', 'totem');
    await page.waitForSelector('#suggestions .sugg-groupe:has-text("Base Dark Side Energy en ligne")');
    assert.equal(await page.locator('#suggestions img').count(), 0, 'aucun HTML interprété');
    assert.equal(await page.locator('#suggestions [role="option"]:has-text("Invalide")').count(), 0, 'puissance négative écartée');
    await page.locator('#suggestions [role="option"]', { hasText: 'Totem Dark Side' }).click();
    const [l] = (await etatProjet(page)).lignes;
    assert.equal(l.origine, 'en_ligne');
    assert.equal(l.foisonnement, 0.9);
    assert.equal(await page.evaluate(() => window.piege), undefined);
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });

  test('base en ligne indisponible : repli sur la bibliothèque locale', async () => {
    const { contexte, page } = await ouvrir();
    await page.fill('#saisie', 'ecran');
    await page.waitForTimeout(600);
    await page.fill('#saisie', 'ecran 55');
    await page.waitForTimeout(600);
    await page.waitForSelector('#suggestions .sugg-pied:has-text("indisponible")');
    assert.ok((await page.locator('#suggestions [role="option"]').count()) >= 2);
    await contexte.close();
  });

  test('mobile : pas de défilement horizontal, barre de synthèse', async () => {
    const { contexte, page, erreurs } = await ouvrir({ contexte: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } });
    await actionMenu(page, 'exemple-stand-salon');
    const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(largeur <= 390, 'largeur ' + largeur);
    assert.equal(await page.isVisible('#barre-mobile'), true);
    assert.match(await page.textContent('#bm-p'), /kW/);
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });

  test('noms accessibles, raccourcis clavier, thème mémorisé', async () => {
    const { contexte, page } = await ouvrir();
    await actionMenu(page, 'exemple-stand-salon');
    const sansNom = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button, input:not([type=hidden]), select, textarea'))
        .filter((el) => el.getClientRects().length)
        .filter((el) => {
          const nom = el.getAttribute('aria-label') || el.getAttribute('title') || (el.labels && el.labels.length && el.labels[0].textContent.trim()) || (el.tagName === 'BUTTON' && el.textContent.trim());
          return !nom;
        })
        .map((el) => el.outerHTML.slice(0, 80))
    );
    assert.deepEqual(sansNom, []);
    await page.click('.lignes-entete h2');
    await page.keyboard.press('/');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'saisie');
    await page.keyboard.press('Escape');
    await page.click('.lignes-entete h2');
    await page.keyboard.press('?');
    await page.waitForSelector('#dlg-aide[open]');
    await page.keyboard.press('Escape');
    await actionMenu(page, 'theme');
    assert.equal(await page.getAttribute('html', 'data-theme'), 'clair');
    await page.reload();
    await page.waitForFunction(() => document.documentElement.classList.contains('pret'));
    assert.equal(await page.getAttribute('html', 'data-theme'), 'clair');
    await contexte.close();
  });
});

describe('corrections issues de la relecture', () => {
  test('« Annuler » des hypothèses par défaut sans effet sur un autre bilan', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, 'frigo');
    await page.click('#btn-hypotheses');
    await page.fill('[data-hyp="cosPhi"]', '0,7');
    await page.click('#btn-hyp-defaut');
    await page.keyboard.press('Escape');
    await actionMenu(page, 'nouveau');
    await page.click('.toast:has-text("Hypothèses par défaut") .toast-action').catch(() => {});
    const p = await etatProjet(page);
    assert.equal(p.hypotheses.cosPhi, 0.85, 'le nouveau bilan garde ses hypothèses');
    await contexte.close();
  });

  test('stockage bloqué : changer de bilan ne perd rien pendant la session', async () => {
    const { contexte, page } = await ouvrir({
      init: () => {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new Error('stockage bloqué');
          },
        });
      },
    });
    await ajouter(page, '12 spots led');
    await page.fill('#projet-nom', 'Bilan A');
    await actionMenu(page, 'exemple-stand-salon');
    await page.click('#btn-bilans');
    assert.equal(await page.locator('#liste-bilans .bilan').count(), 2);
    assert.match(await page.textContent('#info-bilans'), /session/);
    await page.click('#liste-bilans .bilan-ouvrir:has-text("Bilan A")');
    const p = await etatProjet(page);
    assert.equal(p.info.nom, 'Bilan A');
    assert.equal(p.lignes[0].quantite, 12);
    await contexte.close();
  });

  test('tableau à jour après changement de raccordement', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, '6 plancha');
    assert.equal(await page.locator('tr.ligne [data-champ="phase"]').first().isDisabled(), false);
    await page.selectOption('#choix-raccordement', 'mono63');
    assert.equal(await page.locator('tr.ligne [data-champ="phase"]').first().isDisabled(), true, 'phases désactivées en monophasé');
    assert.equal(await page.textContent('tr.ligne [data-calc="repartition"]'), '');
    await ajouter(page, 'four mixte');
    const four = page.locator('tr.ligne', { has: page.locator('[data-champ="alimentation"] option[value="tri"]:checked') });
    assert.equal(await four.locator('[data-calc="alerte"]').isHidden(), false, 'marque d’alerte sur le four triphasé');
    assert.equal(await page.locator('#alertes .alerte.erreur').count(), 1);
    await contexte.close();
  });

  test('sélecteur de raccordement : prise retrouvée, clavier, « Autre calibre »', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, 'bouilloire');
    await page.selectOption('#choix-raccordement', 'tri32');
    assert.match(await page.textContent('#racc-sous'), /P17 3P\+N\+T 32 A/);
    await page.click('#comparatif summary');
    const libelles = await page.locator('#table-comparatif tbody td:first-child').allTextContents();
    assert.equal(libelles.filter((t) => t.startsWith('32\u00a0A tri')).length, 1, 'pas de doublon : ' + libelles.join(' | '));
    await page.selectOption('#choix-raccordement', 'autre');
    await page.waitForSelector('#dlg-hypotheses[open]');
    await page.keyboard.press('Escape');
    assert.equal(await page.inputValue('#choix-raccordement'), 'tri32');
    await page.selectOption('#choix-raccordement', 'auto');
    await page.focus('#choix-raccordement');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'choix-raccordement', 'focus conservé');
    await contexte.close();
  });

  test('résultat en ligne tardif : l’option choisie au clavier est conservée', async () => {
    let liberer;
    const attente = new Promise((r) => (liberer = r));
    const enLigne = async (route) => {
      const entetes = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: entetes });
      await attente;
      return route.fulfill({ status: 200, headers: entetes, contentType: 'application/json', body: JSON.stringify({ devices: [{ name: 'Projecteur base', power: 300, diversity: 1 }] }) });
    };
    const { contexte, page } = await ouvrir({ enLigne });
    await page.fill('#saisie', 'projecteur');
    await page.waitForSelector('#suggestions [role="option"]');
    await page.press('#saisie', 'ArrowUp');
    const choisie = await page.textContent('#suggestions [aria-selected="true"]');
    assert.match(choisie, /Ajouter « Projecteur »/);
    await page.waitForTimeout(500);
    liberer();
    await page.waitForSelector('#suggestions .sugg-groupe:has-text("Base Dark Side Energy en ligne")');
    assert.match(await page.textContent('#suggestions [aria-selected="true"]'), /Ajouter « Projecteur »/);
    await page.press('#saisie', 'Enter');
    const [l] = (await etatProjet(page)).lignes;
    assert.equal(l.nom, 'Projecteur');
    await contexte.close();
  });

  test('tension modifiée reprise dans le texte de la source autonome', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, '3 bouilloire');
    await page.click('#btn-hypotheses');
    await page.fill('[data-hyp="tensionTriV"]', '380');
    await page.keyboard.press('Escape');
    assert.match(await page.textContent('#energie'), /triphasé 380/);
    await contexte.close();
  });

  test('suppression au clavier : le focus passe à la ligne suivante', async () => {
    const { contexte, page } = await ouvrir();
    await ajouter(page, 'frigo');
    await ajouter(page, 'congélateur');
    await page.focus('tr.ligne >> nth=0 >> [data-action="supprimer"]');
    await page.keyboard.press('Enter');
    assert.equal((await etatProjet(page)).lignes.length, 1);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'supprimer');
    await contexte.close();
  });

  test('flèche haut : ouvre la liste des suggestions', async () => {
    const { contexte, page } = await ouvrir();
    await page.focus('#saisie');
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.isVisible('#suggestions'), true);
    await contexte.close();
  });
});

describe('application installable (servie en HTTP)', () => {
  let serveur;
  let base;
  before(async () => {
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
    serveur = http.createServer((req, res) => {
      const chemin = decodeURIComponent(new URL(req.url, 'http://local').pathname);
      const fichier = path.join(RACINE, chemin === '/' ? 'index.html' : chemin);
      if (!fichier.startsWith(RACINE) || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'content-type': types[path.extname(fichier)] || 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(fichier));
    });
    await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
    base = 'http://127.0.0.1:' + serveur.address().port + '/';
  });
  after(() => serveur && serveur.close());

  test('redirection, manifeste, service worker et fonctionnement hors ligne', async () => {
    const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 900 } });
    await contexte.route(BASE_EN_LIGNE, couper);
    const page = await contexte.newPage();
    const erreurs = suivreErreurs(page);
    await page.goto(base);
    await page.waitForURL(/app\.html$/);
    await page.waitForFunction(() => document.documentElement.classList.contains('pret'));
    await page.waitForSelector('link[rel="manifest"]', { state: 'attached' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await contexte.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => document.documentElement.classList.contains('pret'));
    assert.equal(await page.title(), 'Calculateur d’Énergie Stand');
    await contexte.setOffline(false);
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });
});

describe('aperçu dans Claude (variante pour artefact)', () => {
  // Reproduction du visualiseur d'après ses règles publiées : la page est insérée dans un squelette
  // <body>, servie dans un cadre sandbox sans impression, téléchargement ni fenêtre, avec une CSP qui
  // n'autorise que les scripts et styles en ligne et aucune requête vers un autre site.
  const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'self'";

  async function ouvrirApercu(contexteOptions) {
    const { versionApercuClaude } = require('../scripts/build.js');
    const apercu = versionApercuClaude(fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8'));
    const squelette =
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
      '<style>:root{color-scheme:light}body{margin:0;font:14px system-ui;background:#f7f7f5}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' +
      apercu +
      '</body></html>';
    const contexte = await navigateur.newContext(Object.assign({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, locale: 'fr-FR' }, contexteOptions));
    const compteurs = { base: 0, telechargements: 0 };
    await contexte.route(BASE_EN_LIGNE, (route) => {
      compteurs.base++;
      return route.abort();
    });
    await contexte.route('https://hote.test/**', (route) =>
      route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hôte</title><style>body{margin:0}iframe{display:block;width:100vw;height:100vh;border:0}</style><iframe sandbox="allow-scripts allow-same-origin allow-forms" src="https://cadre.test/"></iframe>',
      })
    );
    await contexte.route('https://cadre.test/**', (route) =>
      route.fulfill({ contentType: 'text/html; charset=utf-8', headers: { 'content-security-policy': CSP }, body: squelette })
    );
    const page = await contexte.newPage();
    const erreurs = suivreErreurs(page);
    page.on('download', () => compteurs.telechargements++);
    await page.goto('https://hote.test/');
    const f = page.frame({ url: /^https:\/\/cadre\.test\// });
    await f.waitForFunction(() => document.documentElement.classList.contains('pret'));
    return { apercu, contexte, page, f, erreurs, compteurs };
  }

  test('variante assemblée : démarre sans erreur, fonctions bloquées expliquées, aucune requête externe', async () => {
    const { apercu, contexte, f, erreurs, compteurs } = await ouvrirApercu();
    assert.match(apercu, /^<title>Calculateur d’Énergie Stand<\/title>\n/);
    for (const balise of [/<!DOCTYPE/i, /<html[\s>]/, /<\/?head>/, /<\/?body[\s>]/]) assert.doesNotMatch(apercu, balise);
    assert.equal(await f.evaluate(() => document.documentElement.lang), 'fr');
    assert.equal(await f.isVisible('#bandeau-apercu'), true);
    assert.equal(await f.evaluate(() => document.querySelector('#menu-plein-ecran').hidden), true);

    await f.click('#btn-menu');
    await f.click('#menu-principal [data-action="exemple-bar-festival"]');
    await f.waitForSelector('#table-lignes tr.ligne');
    assert.ok((await f.evaluate(() => window.CalculateurStand.etat().lignes.length)) > 5);

    await f.click('#btn-menu');
    await f.click('#menu-principal [data-action="export-csv"]');
    await f.waitForSelector('.toast.attention:has-text("Téléchargement bloqué")');
    assert.equal(await f.locator('.toast:has-text("Tableau exporté")').count(), 0, 'aucun message de réussite');

    await f.evaluate(() => {
      window.impressions = 0;
      window.print = () => window.impressions++;
    });
    await f.click('#btn-rapport');
    await f.waitForSelector('#apercu-rapport .rapport h2');
    await f.click('#btn-imprimer');
    await f.waitForSelector('.toast.attention:has-text("Impression bloquée")');
    assert.equal(await f.evaluate(() => window.impressions), 0);
    await f.press('body', 'Escape');
    await f.waitForFunction(() => !document.querySelector('dialog[open]'));

    await f.click('#btn-partager');
    await f.waitForSelector('.toast.attention:has-text("Lien de partage indisponible")');
    assert.equal(await f.evaluate(() => document.querySelector('#dlg-partage').open), false);

    await f.fill('#saisie', 'groupe froid industriel');
    await f.waitForSelector('.sugg-pied:has-text("indisponible dans l’aperçu Claude")');
    await f.waitForTimeout(800);
    assert.equal(compteurs.base, 0, 'aucune requête vers la base en ligne');
    assert.equal(compteurs.telechargements, 0);
    await f.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith('calculateur-energie-stand/')));
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });

  test('téléphone : pas de défilement horizontal dans le cadre', async () => {
    const { contexte, f, erreurs } = await ouvrirApercu({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await f.click('#btn-menu');
    await f.click('#menu-principal [data-action="exemple-stand-salon"]');
    await f.waitForSelector('#table-lignes tr.ligne');
    const largeur = await f.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(largeur <= 390, 'largeur ' + largeur);
    assert.equal(await f.isVisible('#bandeau-apercu'), true);
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });
});
