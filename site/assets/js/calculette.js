// Calculette électro : conversions P, S, Q, I et chute de tension (NF C 15-100).
import { convert, voltageDrop, minSection, nextRating, connectorFor, SECTIONS, U_MONO, U_TRI, fmt, LANG } from "./elec.js";

const $ = (id) => document.getElementById(id);

// Textes de l'outil, selon la langue de la page
const T = {
  fr: {
    tri: "Triphasé",
    mono: "Monophasé",
    beyondRating: "au-delà de 2 000 A",
    beyondSection: "au-delà de 300 mm²",
    invalid: "Vérifiez les valeurs saisies (longueur, intensité, cos φ entre 0,1 et 1).",
    ok: (m) => `Chute de tension inférieure à la limite de ${m} % retenue.`,
    warn: (m) => `Chute de tension proche de la limite de ${m} % : peu de marge.`,
    bad: (m) => `Chute de tension supérieure à la limite de ${m} % : augmentez la section ou réduisez la longueur.`,
    pct: (v) => `${v} %`,
  },
  en: {
    tri: "Three-phase",
    mono: "Single-phase",
    beyondRating: "above 2,000 A",
    beyondSection: "above 300 mm²",
    invalid: "Check the values entered (length, current, cos φ between 0.1 and 1).",
    ok: (m) => `Voltage drop below the ${m}% limit selected.`,
    warn: (m) => `Voltage drop close to the ${m}% limit: little margin.`,
    bad: (m) => `Voltage drop above the ${m}% limit: increase the cable size or reduce the length.`,
    pct: (v) => `${v}%`,
  },
}[LANG];
const num = (el) => parseFloat(String(el.value).replace(",", "."));

// --- Conversion ---------------------------------------------------------------
const conv = {
  form: $("conv-form"),
  value: $("conv-value"),
  unit: $("conv-unit"),
  cos: $("conv-cos"),
  voltage: $("conv-voltage"),
};
let lastCurrent = null;

function convPhases() {
  return document.querySelector("input[name='conv-network']:checked").value === "3" ? 3 : 1;
}

function updateConversion() {
  const phases = convPhases();
  const r = convert({ value: num(conv.value), unit: conv.unit.value, phases, U: num(conv.voltage), cosPhi: num(conv.cos) });
  $("conv-badge").textContent = phases === 3 ? T.tri : T.mono;
  conv.cos.setAttribute("aria-invalid", String(!(num(conv.cos) > 0 && num(conv.cos) <= 1)));
  if (!r) {
    ["conv-i", "conv-p", "conv-s", "conv-q", "conv-rating"].forEach((id) => ($(id).textContent = "-"));
    lastCurrent = null;
    return;
  }
  lastCurrent = r.I;
  $("conv-i").textContent = fmt(r.I, r.I < 100 ? 2 : 1);
  $("conv-p").textContent = fmt(r.P / 1000, 2);
  $("conv-s").textContent = fmt(r.S / 1000, 2);
  $("conv-q").textContent = fmt(r.Q / 1000, 2);
  const rating = nextRating(r.I);
  $("conv-rating").textContent = rating ? `${fmt(rating, 0)} A, ${connectorFor(rating, phases)}` : T.beyondRating;
}

document.querySelectorAll("input[name='conv-network']").forEach((el) =>
  el.addEventListener("change", () => {
    conv.voltage.value = convPhases() === 3 ? U_TRI : U_MONO;
    updateConversion();
  })
);
[conv.value, conv.unit, conv.cos, conv.voltage].forEach((el) => el.addEventListener("input", updateConversion));


// --- Chute de tension -----------------------------------------------------------
const drop = {
  form: $("drop-form"),
  material: $("drop-material"),
  section: $("drop-section"),
  length: $("drop-length"),
  current: $("drop-current"),
  cos: $("drop-cos"),
  limit: $("drop-limit"),
};

SECTIONS.forEach((s) => {
  const o = document.createElement("option");
  o.value = String(s);
  o.textContent = `${fmt(s, s % 1 ? 1 : 0)} mm²`;
  if (s === 16) o.selected = true;
  drop.section.appendChild(o);
});

function dropPhases() {
  return document.querySelector("input[name='drop-network']:checked").value === "3" ? 3 : 1;
}

function updateDrop() {
  const phases = dropPhases();
  const line = {
    phases,
    material: drop.material.value,
    length: num(drop.length),
    current: num(drop.current),
    cosPhi: num(drop.cos),
  };
  const maxPct = num(drop.limit);
  const r = voltageDrop({ ...line, section: num(drop.section) });
  $("drop-badge").textContent = phases === 3 ? T.tri : T.mono;
  const verdict = $("drop-verdict");
  if (!r) {
    ["drop-pct", "drop-v", "drop-end", "drop-min"].forEach((id) => ($(id).textContent = "-"));
    verdict.dataset.level = "";
    verdict.textContent = T.invalid;
    return;
  }
  $("drop-pct").textContent = fmt(r.pct, 2);
  $("drop-v").textContent = fmt(r.dropLine, 1);
  $("drop-end").textContent = fmt(r.Uend, 0);
  const min = minSection({ ...line, maxPct });
  $("drop-min").textContent = min ? `${fmt(min.section, min.section % 1 ? 1 : 0)} mm² (${T.pct(fmt(min.pct, 2))})` : T.beyondSection;
  if (r.pct <= maxPct * 0.8) {
    verdict.dataset.level = "ok";
    verdict.textContent = T.ok(fmt(maxPct, 0));
  } else if (r.pct <= maxPct) {
    verdict.dataset.level = "warn";
    verdict.textContent = T.warn(fmt(maxPct, 0));
  } else {
    verdict.dataset.level = "bad";
    verdict.textContent = T.bad(fmt(maxPct, 0));
  }
}

document.querySelectorAll("input[name='drop-network']").forEach((el) => el.addEventListener("change", updateDrop));
[drop.material, drop.section, drop.length, drop.current, drop.cos, drop.limit].forEach((el) => el.addEventListener("input", updateDrop));


$("conv-to-drop").addEventListener("click", () => {
  if (lastCurrent == null) return;
  drop.current.value = String(Math.round(lastCurrent * 100) / 100);
  drop.cos.value = conv.cos.value;
  document.getElementById(convPhases() === 3 ? "drop-tri" : "drop-mono").checked = true;
  updateDrop();
  document.getElementById("chute-de-tension").scrollIntoView({ behavior: "smooth", block: "start" });
  drop.length.focus({ preventScroll: true });
});

updateConversion();
updateDrop();
