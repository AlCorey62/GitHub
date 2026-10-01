'use strict';
/*
 * Assemble app.html, fichier unique et autonome (styles et scripts en ligne), à partir de src/,
 * ainsi que sw.js (service worker, cache versionné par l'empreinte de app.html).
 *
 *   node scripts/build.js           écrit app.html et sw.js
 *   node scripts/build.js --check   vérifie qu'ils sont à jour (intégration continue)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const racine = path.join(__dirname, '..');
const lire = (f) => fs.readFileSync(path.join(racine, f), 'utf8').replace(/\r\n/g, '\n');
const pkg = JSON.parse(lire('package.json'));

// Caractères invisibles interdits dans les sources : on écrit  ,  … en échappement.
const INVISIBLES = /[   ​ ﻿]/;

function verifierInvisibles(nom, contenu) {
  const fautes = [];
  contenu.split('\n').forEach((ligne, i) => {
    if (INVISIBLES.test(ligne)) fautes.push(i + 1);
  });
  if (fautes.length) {
    throw new Error(nom + ' : caractère invisible (espace insécable ou fine) ligne(s) ' + fautes.slice(0, 12).join(', ') + '. Utiliser les échappements \\u00a0 ou \\u202f.');
  }
}

function verifierScript(nom, code) {
  if (/<\/script/i.test(code)) throw new Error(nom + ' : la suite « </script » est interdite dans un script en ligne.');
  if (/<!--/.test(code)) throw new Error(nom + ' : la suite « <!-- » est interdite dans un script en ligne.');
}

function construire() {
  const sources = {
    page: 'src/page.html',
    styles: 'src/styles.css',
    moteur: 'src/moteur.js',
    catalogue: 'src/catalogue.js',
    interface: 'src/interface.js',
    sw: 'src/sw.js',
  };
  const c = {};
  for (const [cle, fichier] of Object.entries(sources)) {
    c[cle] = lire(fichier);
    verifierInvisibles(fichier, c[cle]);
  }
  for (const cle of ['moteur', 'catalogue', 'interface']) verifierScript(sources[cle], c[cle]);

  const version = (c.moteur.match(/const VERSION_APP = '([^']+)'/) || [])[1];
  if (version !== pkg.version) throw new Error('Version du moteur (' + version + ') différente de package.json (' + pkg.version + ').');

  let page = c.page;
  const remplacer = (marque, texte) => {
    if (!page.includes(marque)) throw new Error('Marque absente de src/page.html : ' + marque);
    page = page.replace(marque, () => texte);
  };
  remplacer('<!--@styles-->', '<style>\n' + c.styles.trim() + '\n</style>');
  remplacer('<!--@moteur-->', '<script id="moteur">\n' + c.moteur.trim() + '\n</script>');
  remplacer('<!--@catalogue-->', '<script id="catalogue">\n' + c.catalogue.trim() + '\n</script>');
  remplacer('<!--@interface-->', '<script id="interface">\n' + c.interface.trim() + '\n</script>');
  page = page.replace(/\{\{VERSION\}\}/g, () => pkg.version);
  if (/<!--@|\{\{[A-Z]+\}\}/.test(page)) throw new Error('Marque non remplacée dans app.html.');
  const avertissement =
    '<!-- Calculateur d\'Énergie Stand ' + pkg.version + ', Dark Side Energy. Fichier GÉNÉRÉ par scripts/build.js à partir de src/ : modifier src/ puis lancer « npm run build ». -->\n';
  const app = page.replace(/^<!DOCTYPE html>\n/, () => '<!DOCTYPE html>\n' + avertissement);

  const empreinte = crypto.createHash('sha256').update(app).digest('hex').slice(0, 12);
  const sw = c.sw.replace('{{CACHE}}', () => 'calculateur-energie-stand-' + pkg.version + '-' + empreinte);
  return { 'app.html': app, 'sw.js': sw };
}

function principal() {
  const sorties = construire();
  if (process.argv.includes('--check')) {
    const perimes = Object.keys(sorties).filter((f) => {
      const chemin = path.join(racine, f);
      return !fs.existsSync(chemin) || lire(f) !== sorties[f];
    });
    if (perimes.length) {
      console.error('Fichier(s) généré(s) pas à jour : ' + perimes.join(', ') + '. Lancer « npm run build ».');
      process.exit(1);
    }
    console.log('app.html et sw.js à jour (' + pkg.version + ').');
    return;
  }
  for (const [f, contenu] of Object.entries(sorties)) fs.writeFileSync(path.join(racine, f), contenu);
  console.log('app.html (' + Math.round(Buffer.byteLength(sorties['app.html']) / 1024) + ' Ko) et sw.js écrits.');
}

try {
  principal();
} catch (e) {
  console.error('Échec de l\'assemblage : ' + e.message);
  process.exit(1);
}
