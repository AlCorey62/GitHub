// Tests des formules électriques du site : `node --test`
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  convert, currentFromApparent, apparentFromCurrent, voltageDrop, minSection, maxLength,
  nextRating, connectorFor, powerBalance, SQRT3, SECTIONS,
} from "../site/assets/js/elec.js";

const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (tolérance ${tol})`);

test("conversions monophasé et triphasé", () => {
  close(currentFromApparent(3680, 1), 16);
  close(apparentFromCurrent(32, 3), SQRT3 * 400 * 32);
  const r = convert({ value: 10, unit: "kW", phases: 3, cosPhi: 0.8 });
  close(r.S, 12500);
  close(r.P, 10000);
  close(r.Q, 7500, 1e-6);
  close(r.I, 12500 / (SQRT3 * 400));
  const a = convert({ value: 16, unit: "A", phases: 1, cosPhi: 1 });
  close(a.S, 3680);
  assert.equal(convert({ value: 10, unit: "kW", phases: 3, cosPhi: 0 }), null);
  assert.equal(convert({ value: -1, unit: "W" }), null);
});

test("chute de tension NF C 15-100 : cas de référence", () => {
  // Triphasé, cuivre, 16 mm², 100 m, 63 A, cos φ = 1 : u = 0,0225 × 100 / 16 × 63 = 8,859 V
  const r = voltageDrop({ phases: 3, material: "cu", section: 16, length: 100, current: 63, cosPhi: 1 });
  close(r.u, 0.0225 * 100 / 16 * 63, 1e-9);
  close(r.pct, (100 * r.u) / 230, 1e-9);
  close(r.Uend, 400 - SQRT3 * r.u, 1e-9);
  // Monophasé : facteur b = 2 (aller et retour)
  const m = voltageDrop({ phases: 1, material: "cu", section: 2.5, length: 25, current: 16, cosPhi: 1 });
  close(m.u, 2 * 0.0225 * 25 / 2.5 * 16, 1e-9);
  close(m.pct, (100 * m.u) / 230, 1e-9);
  // Aluminium plus résistif que le cuivre
  const al = voltageDrop({ phases: 3, material: "al", section: 16, length: 100, current: 63, cosPhi: 1 });
  assert.ok(al.pct > r.pct);
});

test("cohérence avec les abaques historiques Dark Side Energy (400 V tétraphasé, cos φ 0,8, ΔU 5 %)", () => {
  // [section mm², intensité A, longueur maximale lue sur l'abaque en m]
  const abaque = [
    [1.5, 5, 190], [2.5, 5, 325], [4, 5, 510], [6, 5, 745], [10, 7, 895], [16, 10, 970],
    [25, 16, 940], [35, 23, 880], [50, 31, 860], [70, 48, 760], [95, 57, 840], [120, 76, 745],
    [150, 86, 770], [185, 114, 680], [240, 152, 600], [1.5, 10, 96], [10, 10, 630], [240, 342, 265],
  ];
  for (const [section, current, L] of abaque) {
    const Lcalc = maxLength({ maxPct: 5, phases: 3, material: "cu", section, current, cosPhi: 0.8 });
    const ecart = Math.abs(Lcalc - L) / L;
    assert.ok(ecart < 0.06, `${section} mm², ${current} A : ${Lcalc.toFixed(0)} m calculés pour ${L} m sur l'abaque`);
  }
});

test("section minimale et calibres", () => {
  const s = minSection({ maxPct: 3, phases: 3, material: "cu", length: 80, current: 100, cosPhi: 0.9 });
  assert.ok(s && s.pct <= 3);
  const below = SECTIONS[SECTIONS.indexOf(s.section) - 1];
  const smaller = voltageDrop({ phases: 3, material: "cu", section: below, length: 80, current: 100, cosPhi: 0.9 });
  assert.ok(smaller.pct > 3, "la section immédiatement inférieure ne doit pas convenir");
  assert.equal(nextRating(63), 63);
  assert.equal(nextRating(63.1), 125);
  assert.equal(nextRating(2500), null);
  assert.equal(connectorFor(125, 3), "P17 125 A");
  assert.equal(connectorFor(250, 3), "Powerlock 400 A");
});

test("bilan de puissance : foisonnement, équilibrage et calibre", () => {
  const b = powerBalance(
    [
      { name: "Son", qty: 1, power: 20000, type: "tri", cosPhi: 0.9, ks: 1 },
      { name: "Lumière", qty: 10, power: 1000, type: "mono", phase: "auto", cosPhi: 1, ks: 0.8 },
      { name: "Catering", qty: 2, power: 3000, type: "mono", phase: "L2", cosPhi: 1, ks: 1 },
    ],
    { network: "tri", reservePct: 20 }
  );
  close(b.Pinst, 20000 + 10000 + 6000);
  close(b.Pf, 20000 + 8000 + 6000);
  close(b.S, 20000 / 0.9 + 8000 + 6000, 1e-6);
  // Somme des courants de phase = courant tri × 3 + courants mono
  const iTri = (20000 / 0.9) / (SQRT3 * 400);
  close(b.phases.L1 + b.phases.L2 + b.phases.L3, 3 * iTri + 8000 / 230 + 6000 / 230, 1e-9);
  assert.ok(b.Imax >= (b.phases.L1 + b.phases.L2 + b.phases.L3) / 3);
  assert.equal(b.rating, nextRating(b.Imax * 1.2));
  close(b.Sequivalent, 3 * 230 * b.Imax, 1e-9);

  const mono = powerBalance([{ qty: 2, power: 1000, type: "tri", cosPhi: 1, ks: 1 }], { network: "mono" });
  close(mono.phases.L1, 2000 / 230, 1e-9);
  assert.equal(mono.warnings.length, 1);
});

test("les repères de puissance publiés sur le site correspondent aux formules", () => {
  const html = readFileSync(new URL("../site/calculette-electro/index.html", import.meta.url), "utf8");
  const rows = [...html.matchAll(/<tr data-check="(\d+)-(\d)">[\s\S]*?<td class="num">([\d\s,]+?)\s?kVA<\/td>/g)];
  assert.ok(rows.length >= 8, `repères trouvés : ${rows.length}`);
  for (const m of rows) {
    const I = Number(m[1]);
    const phases = Number(m[2]);
    const shown = Number(m[3].replace(/\s/g, "").replace(",", "."));
    const expected = apparentFromCurrent(I, phases) / 1000;
    close(shown, Math.round(expected * 10) / 10, 1e-9);
  }
});
