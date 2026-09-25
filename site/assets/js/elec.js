// Formules électriques utilisées par les outils du site (bilan de puissance, calculette électro).
// Module ES sans dépendance. Tests : `node --test`.
//
// Conventions :
//   P : puissance active (W), S : puissance apparente (VA), Q : puissance réactive (var), I : intensité (A)
//   Monophasé : S = U × I avec U = 230 V (tension simple)
//   Triphasé  : S = √3 × U × I avec U = 400 V (tension composée)

export const U_MONO = 230;
export const U_TRI = 400;
export const SQRT3 = Math.sqrt(3);

// Chute de tension selon NF C 15-100 (partie 5-52, annexe G) :
//   u = b × (ρ1 × L / S × cos φ + λ × L × sin φ) × Ib
//   b = 1 en triphasé, 2 en monophasé ; ΔU % = 100 × u / U0 (U0 : tension entre phase et neutre)
//   ρ1 = résistivité en service normal (1,25 fois la résistivité à 20 °C), λ = réactance linéique
export const RHO = { cu: 0.0225, al: 0.036 }; // Ω·mm²/m
export const LAMBDA = 0.08e-3; // Ω/m

// Repères NF C 15-100 : chutes de tension maximales admises (installation alimentée par le réseau public BT)
export const DROP_LIMITS = { eclairage: 3, autres: 5 };

export const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
export const RATINGS = [16, 32, 63, 125, 250, 400, 630, 800, 1000, 1250, 1600, 2000];

const toNumber = (v) => (typeof v === "number" ? v : parseFloat(String(v).replace(",", ".")));

export function defaultVoltage(phases) {
  return phases === 3 ? U_TRI : U_MONO;
}

/** Intensité (A) à partir d'une puissance apparente (VA). */
export function currentFromApparent(S, phases = 1, U = defaultVoltage(phases)) {
  return phases === 3 ? S / (SQRT3 * U) : S / U;
}

/** Puissance apparente (VA) à partir d'une intensité (A). */
export function apparentFromCurrent(I, phases = 1, U = defaultVoltage(phases)) {
  return phases === 3 ? SQRT3 * U * I : U * I;
}

/**
 * Convertit une valeur (W, kW, VA, kVA ou A) en P, S, Q et I.
 * @returns {{P:number,S:number,Q:number,I:number}} en W, VA, var et A
 */
export function convert({ value, unit, phases = 1, U = defaultVoltage(phases), cosPhi = 1 }) {
  const v = toNumber(value);
  const c = toNumber(cosPhi);
  if (!(v >= 0) || !(c > 0 && c <= 1) || !(U > 0)) return null;
  let S;
  switch (unit) {
    case "W": S = v / c; break;
    case "kW": S = (v * 1000) / c; break;
    case "VA": S = v; break;
    case "kVA": S = v * 1000; break;
    case "A": S = apparentFromCurrent(v, phases, U); break;
    default: return null;
  }
  const P = S * c;
  const Q = S * Math.sqrt(1 - c * c);
  return { P, S, Q, I: currentFromApparent(S, phases, U) };
}

/**
 * Chute de tension d'une ligne selon la méthode NF C 15-100.
 * @returns {{u:number,pct:number,dropLine:number,Uend:number}}
 *   u : chute de tension (V) entre phase et neutre en triphasé, sur l'aller-retour en monophasé
 *   pct : chute relative (%) rapportée à U0
 *   dropLine : chute sur la tension d'alimentation (V), Uend : tension en bout de ligne (V)
 */
export function voltageDrop({ phases = 3, material = "cu", section, length, current, cosPhi = 1, U = defaultVoltage(phases) }) {
  const S = toNumber(section);
  const L = toNumber(length);
  const I = toNumber(current);
  const c = toNumber(cosPhi);
  const rho = RHO[material];
  if (!rho || !(S > 0) || !(L >= 0) || !(I >= 0) || !(c > 0 && c <= 1) || !(U > 0)) return null;
  const b = phases === 3 ? 1 : 2;
  const sin = Math.sqrt(1 - c * c);
  const u = b * ((rho * L) / S * c + LAMBDA * L * sin) * I;
  // U0 : tension nominale entre phase et neutre (230 V pour un réseau 230/400 V)
  const U0 = phases === 3 ? (U === U_TRI ? U_MONO : U / SQRT3) : U;
  const dropLine = phases === 3 ? u * SQRT3 : u;
  return { u, pct: (100 * u) / U0, dropLine, Uend: U - dropLine };
}

/** Plus petite section normalisée respectant une chute de tension maximale (%), ou null. */
export function minSection({ maxPct, ...line }) {
  for (const section of SECTIONS) {
    const r = voltageDrop({ ...line, section });
    if (r && r.pct <= maxPct) return { section, ...r };
  }
  return null;
}

/** Longueur maximale (m) d'une ligne pour une chute de tension maximale (%). */
export function maxLength({ maxPct, phases = 3, material = "cu", section, current, cosPhi = 1, U = defaultVoltage(phases) }) {
  const one = voltageDrop({ phases, material, section, length: 1, current, cosPhi, U });
  if (!one || one.pct === 0) return Infinity;
  return maxPct / one.pct;
}

/** Calibre normalisé immédiatement supérieur ou égal (A), ou null au-delà de 2 000 A. */
export function nextRating(I) {
  return RATINGS.find((r) => r >= I - 1e-9) ?? null;
}

/** Connectique usuelle en événementiel pour un calibre donné (repère indicatif). */
export function connectorFor(rating, phases = 3) {
  if (rating == null) return "Plusieurs arrivées ou armoire de puissance";
  if (phases === 1) {
    if (rating <= 16) return "Prise 16 A";
    if (rating <= 63) return `P17 ${rating} A monophasé`;
    return "Arrivée triphasée conseillée";
  }
  if (rating <= 125) return `P17 ${rating} A`;
  if (rating <= 400) return "Powerlock 400 A";
  if (rating <= 660) return "Powerlock 660 A";
  return "Plusieurs arrivées Powerlock";
}

/**
 * Bilan de puissance.
 * @param {Array<{name?:string, zone?:string, qty:number, power:number, type:"tri"|"mono", phase?:"auto"|"L1"|"L2"|"L3", cosPhi:number, ks:number}>} lines
 *   power : puissance unitaire en W, ks : coefficient de foisonnement (0 à 1)
 * @param {{network?:"tri"|"mono", reservePct?:number}} options
 */
export function powerBalance(lines, { network = "tri", reservePct = 0 } = {}) {
  const phases = { L1: 0, L2: 0, L3: 0 }; // courants (A)
  const phaseS = { L1: 0, L2: 0, L3: 0 }; // puissances apparentes (VA)
  const rows = [];
  let Pinst = 0;
  let Pf = 0;
  let S = 0;
  const warnings = [];

  const prepared = lines.map((l, index) => {
    const qty = Math.max(0, toNumber(l.qty) || 0);
    const power = Math.max(0, toNumber(l.power) || 0);
    const cosPhi = Math.min(1, Math.max(0.1, toNumber(l.cosPhi) || 1));
    const ks = Math.min(1, Math.max(0, Number.isFinite(toNumber(l.ks)) ? toNumber(l.ks) : 1));
    const type = network === "mono" ? "mono" : l.type === "tri" ? "tri" : "mono";
    if (network === "mono" && l.type === "tri" && qty * power > 0) {
      warnings.push(`« ${l.name || `Ligne ${index + 1}`} » est déclarée en triphasé sur un réseau monophasé : elle est comptée en monophasé.`);
    }
    const pInst = qty * power;
    const pF = pInst * ks;
    const s = pF / cosPhi;
    return { index, name: l.name || "", zone: l.zone || "", qty, power, cosPhi, ks, type, phase: l.phase || "auto", pInst, pF, s };
  });

  // Charges triphasées, puis monophasées fixées, puis monophasées « auto » (équilibrage glouton, plus grosses d'abord)
  const assign = (row, phase) => {
    const i = currentFromApparent(row.s, 1, U_MONO);
    phases[phase] += i;
    phaseS[phase] += row.s;
    row.assigned = phase;
    row.current = i;
  };

  for (const row of prepared) {
    Pinst += row.pInst;
    Pf += row.pF;
    S += row.s;
    if (row.type === "tri") {
      const i = currentFromApparent(row.s, 3, U_TRI);
      for (const p of ["L1", "L2", "L3"]) {
        phases[p] += i;
        phaseS[p] += row.s / 3;
      }
      row.assigned = "L1 L2 L3";
      row.current = i;
    }
  }
  const monoFixed = prepared.filter((r) => r.type === "mono" && network === "tri" && ["L1", "L2", "L3"].includes(r.phase));
  monoFixed.forEach((r) => assign(r, r.phase));
  const monoAuto = prepared
    .filter((r) => r.type === "mono" && (network === "mono" || !["L1", "L2", "L3"].includes(r.phase)))
    .sort((a, b) => b.s - a.s);
  for (const r of monoAuto) {
    if (network === "mono") {
      assign(r, "L1");
    } else {
      const target = ["L1", "L2", "L3"].reduce((best, p) => (phases[p] < phases[best] ? p : best), "L1");
      assign(r, target);
    }
  }
  prepared.sort((a, b) => a.index - b.index).forEach((r) => rows.push(r));

  const used = network === "mono" ? ["L1"] : ["L1", "L2", "L3"];
  const currents = used.map((p) => phases[p]);
  const Imax = Math.max(...currents, 0);
  const Iavg = currents.reduce((a, b) => a + b, 0) / currents.length;
  const imbalancePct = Iavg > 0 ? ((Imax - Iavg) / Iavg) * 100 : 0;
  const reserve = 1 + Math.max(0, toNumber(reservePct) || 0) / 100;
  const Idesign = Imax * reserve;
  const rating = nextRating(Idesign);
  // Puissance apparente à couvrir par une source : la phase la plus chargée fixe le besoin
  const Sequivalent = network === "mono" ? Imax * U_MONO : 3 * U_MONO * Imax;

  return {
    rows,
    network,
    Pinst,
    Pf,
    S,
    cosPhiGlobal: S > 0 ? Pf / S : 1,
    phases: network === "mono" ? { L1: phases.L1 } : { ...phases },
    phaseS: network === "mono" ? { L1: phaseS.L1 } : { ...phaseS },
    Imax,
    imbalancePct,
    reservePct: (reserve - 1) * 100,
    Idesign,
    rating,
    connector: connectorFor(rating, network === "mono" ? 1 : 3),
    Sequivalent,
    Ssource: Sequivalent * reserve,
    warnings,
  };
}

/** Formatage français d'un nombre. */
export function fmt(n, digits = 1) {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
