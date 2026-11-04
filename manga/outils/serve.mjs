#!/usr/bin/env node
// Prévisualisation locale du site Mangâge : node manga/outils/serve.mjs [port], puis ouvrir http://localhost:8081
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const PORT = Number(process.argv[2]) || 8081;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png',
};

createServer(async (req, res) => {
  const chemin = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let fichier = normalize(join(RACINE, chemin));
  if (!fichier.startsWith(RACINE)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(fichier)).isDirectory()) fichier = join(fichier, 'index.html');
    const contenu = await readFile(fichier);
    res.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] || 'application/octet-stream' }).end(contenu);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Introuvable');
  }
}).listen(PORT, () => console.log(`Mangâge : http://localhost:${PORT}`));
