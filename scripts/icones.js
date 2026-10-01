'use strict';
/* Génère les icônes PNG de l'application à partir de icone.svg (Playwright requis). node scripts/icones.js */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const racine = path.join(__dirname, '..');
  const svg = fs.readFileSync(path.join(racine, 'icone.svg'), 'utf8');
  const navigateur = await chromium.launch();
  for (const taille of [180, 192, 512]) {
    const page = await navigateur.newPage({ viewport: { width: taille, height: taille } });
    await page.setContent('<html><body style="margin:0">' + svg.replace('<svg ', '<svg width="' + taille + '" height="' + taille + '" ') + '</body></html>');
    await page.screenshot({ path: path.join(racine, 'icone-' + taille + '.png'), omitBackground: false });
    await page.close();
  }
  await navigateur.close();
  console.log('Icônes écrites : icone-180.png, icone-192.png, icone-512.png');
})();
