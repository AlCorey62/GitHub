#!/usr/bin/env node
// Fond de la carte des interventions, en points : node tools/carte.mjs [land-110m.json]
// Contours des terres : Natural Earth 1:110m (domaine public), via le paquet world-atlas 2.0.2 (licence ISC).
// Sans fichier en argument, les contours sont téléchargés depuis jsDelivr.
// À relancer seulement si le cadrage de la carte (MAP dans tools/site.config.mjs) change.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { WIDTH, HEIGHT, unproject } from "./map.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json";
const STEP = 7.5; // écart entre deux points, en pixels de la carte (maille hexagonale)

const topo = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], "utf8")) : await (await fetch(SOURCE)).json();

// Décodage TopoJSON : arcs quantifiés et codés en différences
const { scale, translate } = topo.transform;
const arcs = topo.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
});
const ringOf = (ids) =>
  ids.flatMap((id, i) => {
    const a = id < 0 ? arcs[~id].slice().reverse() : arcs[id];
    return i ? a.slice(1) : a;
  });

const land = topo.objects.land;
const rings = [];
for (const g of land.type === "GeometryCollection" ? land.geometries : [land]) {
  if (g.type === "Polygon") g.arcs.forEach((r) => rings.push(ringOf(r)));
  if (g.type === "MultiPolygon") g.arcs.forEach((p) => p.forEach((r) => rings.push(ringOf(r))));
}
const boxes = rings.map((r) => {
  const xs = r.map((p) => p[0]);
  const ys = r.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
});

// Point sur terre : règle pair-impair sur l'ensemble des anneaux (les lacs sont des trous)
function onLand(lon, lat) {
  let inside = false;
  rings.forEach((ring, k) => {
    const [x0, y0, x1, y1] = boxes[k];
    if (lon < x0 || lon > x1 || lat < y0 || lat > y1) return;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  });
  return inside;
}

// Maille hexagonale : une rangée sur deux décalée d'un demi-pas
const r1 = (n) => Math.round(n * 10) / 10;
const rowStep = (STEP * Math.sqrt(3)) / 2;
let d = "";
let dots = 0;
for (let row = 0, y = STEP / 2; y < HEIGHT; row++, y += rowStep) {
  let prev = null;
  for (let x = STEP / 2 + (row % 2 ? STEP / 2 : 0); x < WIDTH; x += STEP) {
    const [lat, lon] = unproject(x, y);
    if (!onLand(lon, lat)) continue;
    d += prev === null ? `M${r1(x)} ${r1(y)}h0` : `m${r1(x - prev)} 0h0`;
    prev = x;
    dots++;
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}"><path fill="none" stroke="#4a4a54" stroke-width="2.4" stroke-linecap="round" d="${d}"/></svg>\n`;
writeFileSync(join(ROOT, "site/assets/img/carte-monde.svg"), svg);
console.log(`carte-monde.svg : ${dots} points, ${Math.round(svg.length / 1024)} Ko`);
