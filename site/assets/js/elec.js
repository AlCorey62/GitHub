// Formules électriques utilisées par les outils du site (bilan de puissance, calculette électro).
// Module ES sans dépendance. Tests : `node --test`.
//
// Conventions :
//   P : puissance active (W), S : puissance apparente (VA), Q : puissance réactive (var), I : intensité (A)
//   Monophasé : S = U × I avec U = 230 V (tension simple)
//   Triphasé  : S = √3 × U × I avec U = 400 V (tension composée)
//   Biphasé   : S = U × I avec U = 400 V (charge entre deux phases), ou 200 V au Japon (monophasé à trois fils) ;
//               calculs du monophasé avec la tension entre phases (phases = 2)
//   Autres réseaux (NETWORKS) : mêmes formules avec leurs tensions simple et composée

// Langue de la page : anglais sous /en/, français sinon (et hors navigateur, pour les tests)
export const LANG = typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "fr";

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
export function voltageDrop({ phases = 3, material = "cu", section, length, current, cosPhi = 1, U = defaultVoltage(phases), hz = 50 }) {
  const S = toNumber(section);
  const L = toNumber(length);
  const I = toNumber(current);
  const c = toNumber(cosPhi);
  const rho = RHO[material];
  if (!rho || !(S > 0) || !(L >= 0) || !(I >= 0) || !(c > 0 && c <= 1) || !(U > 0)) return null;
  const b = phases === 3 ? 1 : 2;
  const sin = Math.sqrt(1 - c * c);
  // λ est donnée pour 50 Hz ; la réactance d'un câble est proportionnelle à la fréquence (hypothèse pour 60 Hz)
  const lambda = LAMBDA * ((toNumber(hz) || 50) / 50);
  const u = b * ((rho * L) / S * c + lambda * L * sin) * I;
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
export function maxLength({ maxPct, phases = 3, material = "cu", section, current, cosPhi = 1, U = defaultVoltage(phases), hz = 50 }) {
  const one = voltageDrop({ phases, material, section, length: 1, current, cosPhi, U, hz });
  if (!one || one.pct === 0) return Infinity;
  return maxPct / one.pct;
}

/** Calibre normalisé immédiatement supérieur ou égal (A), ou null au-delà de 2 000 A. */
export function nextRating(I) {
  return RATINGS.find((r) => r >= I - 1e-9) ?? null;
}

/** Connectique usuelle en événementiel pour un calibre donné (repère indicatif). */
export function connectorFor(rating, phases = 3, lang = LANG) {
  const en = lang === "en";
  if (rating == null) return en ? "Several incoming supplies or a power distribution cabinet" : "Plusieurs arrivées ou armoire de puissance";
  if (phases === 1) {
    if (rating <= 16) return en ? "16 A socket" : "Prise 16 A";
    if (rating <= 63) return en ? `P17 ${rating} A single-phase` : `P17 ${rating} A monophasé`;
    return en ? "Three-phase supply recommended" : "Arrivée triphasée conseillée";
  }
  if (rating <= 125) return `P17 ${rating} A`;
  if (rating <= 400) return "Powerlock 400 A";
  if (rating <= 660) return "Powerlock 660 A";
  return en ? "Several Powerlock supplies" : "Plusieurs arrivées Powerlock";
}

/**
 * Réseaux basse tension usuels : tension simple (entre phase et neutre, monophasé), tension composée
 * (entre phases, triphasé) et fréquence. Valeurs nominales ; vérifier sur place la tension réellement fournie.
 */
export const NETWORKS = [
  { id: "eu", mono: 230, tri: 400, hz: 50, fr: "Europe et Royaume-Uni", en: "Europe and United Kingdom" },
  { id: "us208", mono: 120, tri: 208, hz: 60, fr: "États-Unis et Canada", en: "United States and Canada" },
  { id: "us480", mono: 277, tri: 480, hz: 60, fr: "États-Unis", en: "United States" },
  { id: "ca600", mono: 347, tri: 600, hz: 60, fr: "Canada", en: "Canada" },
  { id: "mx", mono: 127, tri: 220, hz: 60, fr: "Mexique", en: "Mexico" },
  { id: "jp50", mono: 100, tri: 200, hz: 50, fr: "Japon, est (Tokyo)", en: "Japan, east (Tokyo)" },
  { id: "jp60", mono: 100, tri: 200, hz: 60, fr: "Japon, ouest (Osaka)", en: "Japan, west (Osaka)" },
];

export const networkById = (id) => NETWORKS.find((n) => n.id === id) || NETWORKS[0];

/**
 * Parc de câbles de Dark Side Energy (page Matériel) : prise, câble souple cuivre et calibre.
 * Monophasé : prises 16 A (3G2,5) et P17 32 A (3G6). Triphasé : P17 32, 63 et 125 A (5G6, 5G16, 5G35),
 * Powerlock 400 A en unifilaires 150 ou 240 mm².
 */
export const PARC = {
  1: [
    { rating: 16, connector: { fr: "Prise 16 A", en: "16 A socket" }, cable: "3G2,5", section: 2.5 },
    { rating: 32, connector: { fr: "P17 32 A monophasé", en: "P17 32 A single-phase" }, cable: "3G6", section: 6 },
  ],
  3: [
    { rating: 32, connector: { fr: "P17 32 A triphasé", en: "P17 32 A three-phase" }, cable: "5G6", section: 6 },
    { rating: 63, connector: { fr: "P17 63 A triphasé", en: "P17 63 A three-phase" }, cable: "5G16", section: 16 },
    { rating: 125, connector: { fr: "P17 125 A triphasé", en: "P17 125 A three-phase" }, cable: "5G35", section: 35 },
    { rating: 400, connector: { fr: "Powerlock 400 A", en: "Powerlock 400 A" }, cable: { fr: "Unifilaires 150 mm²", en: "150 mm² single-core" }, section: 150 },
    { rating: 400, connector: { fr: "Powerlock 400 A", en: "Powerlock 400 A" }, cable: { fr: "Unifilaires 240 mm²", en: "240 mm² single-core" }, section: 240 },
  ],
};

// Seuil d'alerte de charge d'un calibre (%)
export const LOAD_WARN_PCT = 80;

const label = (v, lang) => (typeof v === "string" ? v : v[lang === "en" ? "en" : "fr"]);

/**
 * Raccordement conseillé dans le parc pour une intensité, et chute de tension sur la longueur donnée.
 * @returns {null | {
 *   status: "ok" | "beyondMono" | "beyond" | "biphase", rating?: number (biphasé),
 *   item?: {rating:number, connector:string, cable:string, section:number}, loadPct?: number,
 *   drop?: object|null, minSection?: object|null, better?: {cable:string, section:number, rating:number, drop:object}|null
 * }}
 */
export function recommendLine({ current, phases = 3, length = 0, cosPhi = 1, U = defaultVoltage(phases), hz = 50, maxPct = DROP_LIMITS.autres, lang = LANG }) {
  const I = toNumber(current);
  const L = toNumber(length) || 0;
  if (!(I >= 0)) return null;
  // Biphasé : pas de câble dédié dans le parc, seulement le calibre normalisé
  if (phases === 2) {
    const rating = nextRating(I);
    return rating ? { status: "biphase", rating, loadPct: (100 * I) / rating } : { status: "beyond" };
  }
  const list = PARC[phases === 1 ? 1 : 3];
  const pick = list.find((p) => p.rating >= I - 1e-9);
  if (!pick) return { status: phases === 1 ? "beyondMono" : "beyond" };
  const view = (p) => ({ rating: p.rating, connector: label(p.connector, lang), cable: label(p.cable, lang), section: p.section });
  const line = { phases, material: "cu", length: L, current: I, cosPhi, U, hz };
  const drop = L > 0 ? voltageDrop({ ...line, section: pick.section }) : null;
  let min = null;
  let better = null;
  if (drop && drop.pct > maxPct) {
    min = minSection({ ...line, maxPct });
    // Câble du parc de section suffisante (même type de réseau), quelle que soit sa prise
    const alt = list.find((p) => p.section > pick.section && voltageDrop({ ...line, section: p.section }).pct <= maxPct);
    if (alt) better = { ...view(alt), drop: voltageDrop({ ...line, section: alt.section }) };
  }
  return { status: "ok", item: view(pick), loadPct: (100 * I) / pick.rating, drop, minSection: min, better };
}

/**
 * Bilan de puissance.
 * @param {Array<{name?:string, zone?:string, qty:number, power:number, type:"tri"|"mono", phase?:"auto"|"L1"|"L2"|"L3", cosPhi:number, ks:number}>} lines
 *   power : puissance unitaire en W, ks : coefficient de foisonnement (0 à 1)
 * @param {{network?:"tri"|"mono", reservePct?:number, lang?:"fr"|"en"}} options
 */
export function powerBalance(lines, { network = "tri", reservePct = 0, lang = LANG } = {}) {
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
      warnings.push(
        lang === "en"
          ? `“${l.name || `Line ${index + 1}`}” is declared as three-phase on a single-phase network: it is counted as single-phase.`
          : `« ${l.name || `Ligne ${index + 1}`} » est déclarée en triphasé sur un réseau monophasé : elle est comptée en monophasé.`
      );
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
    connector: connectorFor(rating, network === "mono" ? 1 : 3, lang),
    Sequivalent,
    Ssource: Sequivalent * reserve,
    warnings,
  };
}

/** Formatage d'un nombre dans la langue de la page (1 385,6 en français, 1,385.6 en anglais). */
export function fmt(n, digits = 1, lang = LANG) {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString(lang === "en" ? "en-GB" : "fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
