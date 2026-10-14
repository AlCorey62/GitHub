// Calculette électro : conversions, raccordement conseillé, chute de tension (NF C 15-100),
// pavé numérique, historique, copie, partage par lien, installation et fonctionnement hors ligne.
import { convert, recommendLine, voltageDrop, minSection, networkById, SECTIONS, LOAD_WARN_PCT, fmt, LANG } from "./elec.js";

const EN = LANG === "en";
const $ = (id) => document.getElementById(id);
const root = document.querySelector("[data-calc]");

// Textes de l'outil, selon la langue de la page
const T = EN
  ? {
      mono: "Single-phase",
      bi: "Two-phase",
      tri: "Three-phase",
      rating: "Rating",
      biNote: "Two-phase: there is no two-phase cable in our fleet; choose the socket and cable to suit your equipment.",
      pickSection: "Choose the cable size under “Another cable” to calculate the voltage drop.",
      iTri: "Current per phase",
      iMono: "Current",
      perPhase: "per phase",
      ofRating: (r) => `of ${r} A`,
      lowMargin: `Above ${LOAD_WARN_PCT}% of the rating: low margin.`,
      beyondMono: "Above 32 A in single-phase: there is no single-phase cable in our fleet, switch to three-phase.",
      beyond: "Above 400 A: power connection to be engineered with our engineering office.",
      over: (l) => `over ${l} m`,
      ok: (m) => `Voltage drop below the ${m}% limit.`,
      warn: (m) => `Voltage drop close to the ${m}% limit: little margin.`,
      bad: (m) => `Voltage drop above the ${m}% limit: larger cable or shorter line.`,
      beyondSection: "above 300 mm²",
      noFleet: "none in our fleet over this length",
      cable: "cable",
      limit: (m) => `limit ${m}%`,
      saved: "Calculation saved",
      copied: "Copied",
      linkCopied: "Link copied",
      copyFail: "Copy not available on this device",
      confirm: "Confirm",
      reuse: "Reuse",
      copy: "Copy",
      remove: "Delete",
      shareTitle: "Dark Side Energy calculator",
      title: "Dark Side Energy calculator",
      current: "Current",
      connection: "Suggested connection",
      dropOver: (l) => `Voltage drop over ${l} m`,
      live: (i, plug) => `${i} amps${plug ? `, suggested connection ${plug}` : ""}`,
      padOn: "Use the phone keyboard",
      padOff: "Use the keypad",
    }
  : {
      mono: "Monophasé",
      bi: "Biphasé",
      tri: "Triphasé",
      rating: "Calibre",
      biNote: "Biphasé\u202f: pas de câble biphasé dans notre parc, prise et câble à choisir selon votre matériel.",
      pickSection: "Choisissez la section du câble dans «\u202fAutre câble\u202f» pour calculer la chute de tension.",
      iTri: "Intensité par phase",
      iMono: "Intensité",
      perPhase: "par phase",
      ofRating: (r) => `de ${r} A`,
      lowMargin: `Plus de ${LOAD_WARN_PCT} % du calibre : marge faible.`,
      beyondMono: "Au-delà de 32 A en monophasé : pas de câble monophasé dans notre parc, passez en triphasé.",
      beyond: "Au-delà de 400 A : liaison de puissance à étudier avec notre bureau d'étude.",
      over: (l) => `sur ${l} m`,
      ok: (m) => `Chute de tension inférieure à la limite de ${m} %.`,
      warn: (m) => `Chute de tension proche de la limite de ${m} % : peu de marge.`,
      bad: (m) => `Chute de tension supérieure à la limite de ${m} % : section plus forte ou ligne plus courte.`,
      beyondSection: "au-delà de 300 mm²",
      noFleet: "aucun dans notre parc sur cette longueur",
      cable: "câble",
      limit: (m) => `limite ${m} %`,
      saved: "Calcul enregistré",
      copied: "Copié",
      linkCopied: "Lien copié",
      copyFail: "Copie impossible sur cet appareil",
      confirm: "Confirmer",
      reuse: "Reprendre",
      copy: "Copier",
      remove: "Supprimer",
      shareTitle: "Calculette Dark Side Energy",
      title: "Calculette Dark Side Energy",
      current: "Intensité",
      connection: "Raccordement conseillé",
      dropOver: (l) => `Chute de tension sur ${l} m`,
      live: (i, plug) => `${i} ampères${plug ? `, raccordement conseillé ${plug}` : ""}`,
      padOn: "Utiliser le clavier du téléphone",
      padOff: "Utiliser le pavé numérique",
    };

const DEC = EN ? "." : ",";
const PCT = EN ? "%" : "\u202f%";
const COLON = EN ? ":" : "\u202f:";
const KEY_HIST = `dse-calculette-historique-${LANG}`;
const KEY_PREFS = "dse-calculette-reglages";
const MAX_HIST = 30;

// Stockage local : facultatif (navigation privée, stockage bloqué), la calculette fonctionne sans
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* stockage indisponible */
    }
  },
};

const phName = (ph) => (ph === 1 ? T.mono : ph === 2 ? T.bi : T.tri);
const parse = (s) => parseFloat(String(s ?? "").trim().replace(/\s/g, "").replace(",", "."));
const toField = (n) => (Number.isFinite(n) ? String(Math.round(n * 1e6) / 1e6).replace(".", DEC) : "");
const num = (n) => fmt(n, n < 100 ? 2 : 1);
const volts = (u) => fmt(u, u % 1 ? 1 : 0);
const pct = (n) => `${fmt(n, 2)}${PCT}`;

const el = {
  network: $("calc-network"),
  custom: $("calc-custom"),
  u1: $("calc-u1"),
  u3: $("calc-u3"),
  hz: $("calc-hz"),
  value: $("calc-value"),
  unitShown: $("calc-unit-shown"),
  cos: $("calc-cos"),
  length: $("calc-length"),
  pad: $("calc-pad"),
  padToggle: $("calc-pad-toggle"),
  iLabel: $("calc-i-label"),
  i: $("calc-i"),
  context: $("calc-context"),
  p: $("calc-p"),
  s: $("calc-s"),
  q: $("calc-q"),
  plug: $("calc-plug"),
  cable: $("calc-cable"),
  loadBar: $("calc-load-bar"),
  load: $("calc-load"),
  recoNote: $("calc-reco-note"),
  dropLen: $("calc-drop-len"),
  dropHint: $("calc-drop-hint"),
  dropBody: $("calc-drop-body"),
  dropPct: $("calc-drop-pct"),
  verdict: $("calc-verdict"),
  uend: $("calc-uend"),
  dline: $("calc-dline"),
  minRow: $("calc-min-row"),
  min: $("calc-min"),
  betterRow: $("calc-better-row"),
  better: $("calc-better"),
  section: $("calc-section"),
  material: $("calc-material"),
  toast: $("calc-toast"),
  live: $("calc-live"),
  history: $("calc-history"),
  historyEmpty: $("calc-history-empty"),
  clear: $("calc-clear"),
  install: $("calc-install"),
  installed: $("calc-installed"),
};

// Sections proposées pour un autre câble
SECTIONS.forEach((s) => {
  const o = document.createElement("option");
  o.value = String(s);
  o.textContent = `${fmt(s, s % 1 ? 1 : 0)} mm²`;
  el.section.appendChild(o);
});

// --- Lecture de l'état -----------------------------------------------------------
const checked = (name) => document.querySelector(`input[name='${name}']:checked`);

function state() {
  const custom = el.network.value === "custom";
  const net = custom ? { id: "custom", mono: parse(el.u1.value), tri: parse(el.u3.value), hz: Number(el.hz.value) } : networkById(el.network.value);
  const ph = Number(checked("calc-phases").value);
  return {
    net,
    ph,
    // Biphasé et triphasé : tension entre phases ; monophasé : tension simple
    U: ph === 1 ? net.mono : net.tri,
    value: parse(el.value.value),
    unit: checked("calc-unit").value,
    cos: parse(el.cos.value),
    length: parse(el.length.value),
    limit: Number(checked("calc-limit").value),
    section: el.section.value,
    material: el.material.value,
  };
}

// --- Calcul et affichage -----------------------------------------------------------
let current = null; // dernier résultat complet, pour l'historique, la copie et le partage
let liveTimer;

function invalid(input, bad) {
  input.setAttribute("aria-invalid", String(bad));
  input.closest(".calc__entry, .field")?.classList.toggle("is-invalid", bad);
}

function render() {
  const st = state();
  const netOk = st.net.mono > 0 && st.net.tri > 0;
  invalid(el.value, !(st.value >= 0));
  invalid(el.cos, !(st.cos > 0 && st.cos <= 1));
  invalid(el.length, el.length.value.trim() !== "" && !(st.length >= 0));
  invalid(el.u1, !(st.net.mono > 0));
  invalid(el.u3, !(st.net.tri > 0));

  el.custom.hidden = st.net.id !== "custom";
  root.querySelector('[data-volt="1"]').textContent = st.net.mono > 0 ? `${volts(st.net.mono)} V` : "";
  root.querySelector('[data-volt="2"]').textContent = st.net.tri > 0 ? `${volts(st.net.tri)} V` : "";
  root.querySelector('[data-volt="3"]').textContent = st.net.tri > 0 ? `${volts(st.net.tri)} V` : "";
  el.unitShown.textContent = st.unit;
  el.iLabel.textContent = st.ph === 1 ? T.iMono : T.iTri;
  el.context.textContent = `${phName(st.ph)} ${netOk ? volts(st.U) : "-"} V · ${st.net.hz} Hz · cos φ ${st.cos > 0 && st.cos <= 1 ? fmt(st.cos, 2) : "-"}`;

  const r = netOk ? convert({ value: st.value, unit: st.unit, phases: st.ph, U: st.U, cosPhi: st.cos }) : null;
  if (!r) {
    current = null;
    [el.i, el.p, el.s, el.q, el.plug, el.cable, el.load].forEach((n) => (n.textContent = "-"));
    el.loadBar.style.width = "0";
    el.recoNote.hidden = true;
    el.dropBody.hidden = true;
    el.dropHint.hidden = false;
    el.dropLen.textContent = "";
    return;
  }

  const before = el.i.textContent;
  el.i.textContent = num(r.I);
  if (before !== el.i.textContent) {
    el.i.classList.remove("is-updated");
    void el.i.offsetWidth;
    el.i.classList.add("is-updated");
  }
  el.p.textContent = num(r.P / 1000);
  el.s.textContent = num(r.S / 1000);
  el.q.textContent = num(r.Q / 1000);

  // Raccordement conseillé
  const L = st.length > 0 ? st.length : 0;
  const reco = recommendLine({ current: r.I, phases: st.ph, length: L, cosPhi: st.cos, U: st.U, hz: st.net.hz, maxPct: st.limit, lang: LANG });
  let note = "";
  if (reco.status === "ok") {
    el.plug.textContent = reco.item.connector;
    el.cable.textContent = reco.item.cable;
    el.loadBar.style.width = `${Math.min(100, reco.loadPct)}%`;
    el.loadBar.dataset.level = reco.loadPct > LOAD_WARN_PCT ? "warn" : "ok";
    el.load.textContent = `${fmt(reco.loadPct, 0)}${PCT} ${T.ofRating(reco.item.rating)}`;
    if (reco.loadPct > LOAD_WARN_PCT) note = T.lowMargin;
  } else if (reco.status === "biphase") {
    el.plug.textContent = `${T.rating} ${fmt(reco.rating, 0)} A`;
    el.cable.textContent = "-";
    el.loadBar.style.width = `${Math.min(100, reco.loadPct)}%`;
    el.loadBar.dataset.level = reco.loadPct > LOAD_WARN_PCT ? "warn" : "ok";
    el.load.textContent = `${fmt(reco.loadPct, 0)}${PCT} ${T.ofRating(reco.rating)}`;
    note = reco.loadPct > LOAD_WARN_PCT ? `${T.biNote} ${T.lowMargin}` : T.biNote;
  } else {
    el.plug.textContent = "-";
    el.cable.textContent = "-";
    el.loadBar.style.width = "0";
    el.load.textContent = "-";
    note = reco.status === "beyondMono" ? T.beyondMono : T.beyond;
  }
  el.recoNote.textContent = note;
  el.recoNote.hidden = !note;

  // Chute de tension sur la longueur indiquée
  let drop = null;
  let section = null;
  let material = "cu";
  if (L > 0) {
    if (st.section) {
      section = Number(st.section);
      material = st.material;
    } else if (reco.status === "ok") {
      section = reco.item.section;
    }
    el.dropLen.textContent = T.over(fmt(L, L % 1 ? 1 : 0));
    el.dropHint.hidden = true;
    el.dropBody.hidden = false;
    const line = { phases: st.ph, material, length: L, current: r.I, cosPhi: st.cos, U: st.U, hz: st.net.hz };
    drop = section ? voltageDrop({ ...line, section }) : null;
    el.dropPct.textContent = drop ? fmt(drop.pct, 2) : "-";
    el.uend.textContent = drop ? fmt(drop.Uend, drop.Uend < 300 ? 1 : 0) : "-";
    el.dline.textContent = drop ? fmt(drop.dropLine, 1) : "-";
    const over = !drop || drop.pct > st.limit;
    if (drop) {
      el.verdict.dataset.level = drop.pct <= st.limit * 0.8 ? "ok" : drop.pct <= st.limit ? "warn" : "bad";
      el.verdict.textContent = drop.pct <= st.limit * 0.8 ? T.ok(st.limit) : drop.pct <= st.limit ? T.warn(st.limit) : T.bad(st.limit);
    } else {
      el.verdict.dataset.level = "";
      el.verdict.textContent = T.pickSection;
    }
    el.minRow.hidden = !over;
    if (over) {
      const min = minSection({ ...line, material, maxPct: st.limit });
      el.min.textContent = min ? `${fmt(min.section, min.section % 1 ? 1 : 0)} mm²` : T.beyondSection;
    }
    const showBetter = over && !st.section && reco.status === "ok";
    el.betterRow.hidden = !showBetter;
    if (showBetter) el.better.textContent = reco.better ? `${reco.better.cable} (${pct(reco.better.drop.pct)})` : T.noFleet;
  } else {
    el.dropLen.textContent = "";
    el.dropHint.hidden = false;
    el.dropBody.hidden = true;
  }

  current = { st, r, reco, drop, L };

  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => {
    el.live.textContent = T.live(num(r.I), reco.status === "ok" ? `${reco.item.connector}, ${reco.item.cable}` : "");
  }, 900);

  savePrefs();
}

// --- Résumé texte (copie, partage, historique) ------------------------------------------
function summary(c = current, withLink = true) {
  if (!c) return "";
  const { st, r, reco, drop, L } = c;
  const lines = [
    T.title,
    `${toField(st.value)} ${st.unit} · ${phName(st.ph).toLowerCase()} ${volts(st.U)} V · ${st.net.hz} Hz · cos φ ${fmt(st.cos, 2)}`,
    `${T.current}${COLON} ${num(r.I)} A${st.ph === 1 ? "" : ` ${T.perPhase}`}`,
    `P ${num(r.P / 1000)} kW · S ${num(r.S / 1000)} kVA · Q ${num(r.Q / 1000)} kvar`,
  ];
  if (reco.status === "ok") lines.push(`${T.connection}${COLON} ${reco.item.connector}, ${T.cable} ${reco.item.cable} (${fmt(reco.loadPct, 0)}${PCT} ${T.ofRating(reco.item.rating)})`);
  if (reco.status === "biphase") lines.push(`${T.connection}${COLON} ${T.rating.toLowerCase()} ${fmt(reco.rating, 0)} A (${fmt(reco.loadPct, 0)}${PCT})`);
  if (drop) lines.push(`${T.dropOver(fmt(L, L % 1 ? 1 : 0))}${COLON} ${pct(drop.pct)} (${T.limit(st.limit)})`);
  if (withLink) lines.push(shareUrl(st));
  return lines.join("\n");
}

// --- Partage par lien ----------------------------------------------------------------
function shareUrl(st = state()) {
  const p = new URLSearchParams();
  p.set("v", toField(st.value).replace(",", "."));
  p.set("u", st.unit);
  p.set("ph", String(st.ph));
  p.set("n", st.net.id);
  if (st.net.id === "custom") {
    p.set("u1", String(st.net.mono));
    p.set("u3", String(st.net.tri));
    p.set("hz", String(st.net.hz));
  }
  p.set("cos", String(st.cos));
  if (st.length > 0) p.set("l", String(st.length));
  p.set("lim", String(st.limit));
  if (st.section) {
    p.set("s", st.section);
    p.set("m", st.material);
  }
  return `${location.origin}${location.pathname}?${p}`;
}

function apply(s) {
  const has = (k) => s[k] != null && s[k] !== "";
  if (has("n") && (s.n === "custom" || [...el.network.options].some((o) => o.value === s.n))) el.network.value = s.n;
  if (has("u1") && parse(s.u1) > 0) el.u1.value = toField(parse(s.u1));
  if (has("u3") && parse(s.u3) > 0) el.u3.value = toField(parse(s.u3));
  if (has("hz") && ["50", "60"].includes(String(s.hz))) el.hz.value = String(s.hz);
  if (has("ph") && ["1", "2", "3"].includes(String(s.ph))) $(`calc-ph${s.ph}`).checked = true;
  if (has("u")) {
    const u = root.querySelector(`input[name='calc-unit'][value='${String(s.u).replace(/[^A-Za-z]/g, "")}']`);
    if (u) u.checked = true;
  }
  if (has("v") && parse(s.v) >= 0) el.value.value = toField(parse(s.v));
  if (has("cos") && parse(s.cos) > 0 && parse(s.cos) <= 1) el.cos.value = toField(parse(s.cos));
  el.length.value = has("l") && parse(s.l) > 0 ? toField(parse(s.l)) : "";
  if (has("lim")) (String(s.lim) === "3" ? $("calc-lim3") : $("calc-lim5")).checked = true;
  const sec = has("s") && SECTIONS.includes(parse(s.s)) ? String(parse(s.s)) : "";
  el.section.value = sec;
  if (has("m") && ["cu", "al"].includes(s.m)) el.material.value = s.m;
  if (sec) root.querySelector(".calc__other").open = true;
}

function snapshot(st = state()) {
  return {
    n: st.net.id,
    u1: st.net.id === "custom" ? st.net.mono : undefined,
    u3: st.net.id === "custom" ? st.net.tri : undefined,
    hz: st.net.id === "custom" ? st.net.hz : undefined,
    ph: st.ph,
    u: st.unit,
    v: st.value,
    cos: st.cos,
    l: st.length > 0 ? st.length : "",
    lim: st.limit,
    s: st.section,
    m: st.material,
  };
}

function savePrefs() {
  const prefs = store.get(KEY_PREFS, {}) || {};
  store.set(KEY_PREFS, { ...prefs, ...snapshot() });
}

// --- Messages ----------------------------------------------------------------------
let toastTimer;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add("is-shown");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.toast.classList.remove("is-shown");
    el.toast.textContent = "";
  }, 2400);
}

async function copyText(text, okMsg = T.copied) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg);
  } catch {
    // Repli pour les navigateurs sans presse-papiers asynchrone
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    toast(ok ? okMsg : T.copyFail);
  }
}

// --- Historique ------------------------------------------------------------------------
const history = () => store.get(KEY_HIST, []) || [];

function save() {
  if (!current) return;
  const { st, r, reco, drop, L } = current;
  const meta = [];
  if (reco.status === "ok") meta.push(`${reco.item.connector} · ${reco.item.cable}`);
  if (reco.status === "biphase") meta.push(`${T.rating} ${fmt(reco.rating, 0)} A`);
  if (drop) meta.push(`ΔU ${pct(drop.pct)} ${T.over(fmt(L, L % 1 ? 1 : 0))}`);
  const entry = {
    t: Date.now(),
    main: `${num(r.I)} A`,
    sub: `${toField(st.value)} ${st.unit} · ${phName(st.ph)} ${volts(st.U)} V · cos φ ${fmt(st.cos, 2)}`,
    meta: meta.join(" · "),
    text: summary(current, true),
    state: snapshot(st),
  };
  const list = [entry, ...history()].slice(0, MAX_HIST);
  store.set(KEY_HIST, list);
  renderHistory();
  toast(T.saved);
  root.classList.remove("is-saved");
  void root.offsetWidth;
  root.classList.add("is-saved");
}

function renderHistory() {
  const list = history();
  el.history.textContent = "";
  el.historyEmpty.hidden = list.length > 0;
  el.clear.hidden = list.length === 0;
  const dateFmt = new Intl.DateTimeFormat(EN ? "en-GB" : "fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  list.forEach((e, i) => {
    const li = document.createElement("li");
    li.className = "calc-history__item";
    const body = document.createElement("div");
    body.className = "calc-history__body";
    const main = document.createElement("p");
    main.className = "calc-history__main";
    const strong = document.createElement("strong");
    strong.textContent = e.main;
    const sub = document.createElement("span");
    sub.textContent = e.sub;
    main.append(strong, " ", sub);
    const meta = document.createElement("p");
    meta.className = "calc-history__meta";
    meta.textContent = [e.meta, dateFmt.format(new Date(e.t))].filter(Boolean).join(" · ");
    body.append(main, meta);
    const acts = document.createElement("div");
    acts.className = "calc-history__acts";
    const btn = (label, action, icon) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "calc-history__btn";
      b.dataset.action = action;
      b.dataset.index = String(i);
      b.textContent = label;
      if (icon) {
        b.setAttribute("aria-label", `${label}${COLON} ${e.main}, ${e.sub}`);
        b.textContent = "";
        b.insertAdjacentHTML("afterbegin", icon);
      }
      return b;
    };
    acts.append(
      btn(T.reuse, "reuse"),
      btn(T.copy, "copy"),
      btn(T.remove, "remove", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>')
    );
    li.append(body, acts);
    el.history.appendChild(li);
  });
}

el.history.addEventListener("click", (ev) => {
  const b = ev.target.closest("button[data-action]");
  if (!b) return;
  const list = history();
  const i = Number(b.dataset.index);
  const e = list[i];
  if (!e) return;
  if (b.dataset.action === "reuse") {
    apply(e.state);
    render();
    el.value.focus({ preventScroll: true });
    root.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  } else if (b.dataset.action === "copy") {
    copyText(e.text);
  } else if (b.dataset.action === "remove") {
    list.splice(i, 1);
    store.set(KEY_HIST, list);
    renderHistory();
    (el.history.querySelector("button") || el.value).focus({ preventScroll: true });
  }
});

// Effacement de l'historique en deux temps (pas de fenêtre de confirmation)
let clearArmed = null;
el.clear.addEventListener("click", () => {
  const label = el.clear.querySelector("span");
  if (!clearArmed) {
    el.clear.dataset.label = label.textContent;
    label.textContent = T.confirm;
    el.clear.classList.add("is-armed");
    clearArmed = setTimeout(() => {
      label.textContent = el.clear.dataset.label;
      el.clear.classList.remove("is-armed");
      clearArmed = null;
    }, 4000);
    return;
  }
  clearTimeout(clearArmed);
  clearArmed = null;
  label.textContent = el.clear.dataset.label;
  el.clear.classList.remove("is-armed");
  store.set(KEY_HIST, []);
  renderHistory();
  el.value.focus({ preventScroll: true });
});

// --- Pavé numérique ---------------------------------------------------------------------
const fields = [...root.querySelectorAll("[data-calc-field]")];
let active = el.value;

function setActive(input) {
  active = input;
  root.querySelectorAll(".calc__entry").forEach((e) => e.classList.toggle("is-active", e.contains(input)));
}

fields.forEach((f) => {
  f.addEventListener("focus", () => setActive(f));
  f.addEventListener("input", render);
  f.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      save();
    }
  });
});

const visibleFields = () => fields.filter((f) => f.offsetParent !== null);

function press(key) {
  if (key === "save") return save();
  if (key === "next") {
    const list = visibleFields();
    const next = list[(list.indexOf(active) + 1) % list.length];
    next.focus({ preventScroll: true });
    setActive(next);
    return;
  }
  let v = active.value;
  if (/^\d$/.test(key)) {
    if (v.replace(/[.,]/, "").length >= 9) return;
    v = v === "0" ? key : v + key;
  } else if (key === "dec") {
    if (!/[.,]/.test(v)) v = (v || "0") + DEC;
  } else if (key === "back") {
    v = v.slice(0, -1);
  } else if (key === "clear") {
    v = "";
  }
  active.value = v;
  active.dispatchEvent(new Event("input", { bubbles: true }));
  if ("vibrate" in navigator && matchMedia("(pointer: coarse)").matches) {
    try {
      navigator.vibrate(8);
    } catch {
      /* vibration indisponible */
    }
  }
}

// Le pavé ne prend pas le focus : le champ actif garde son curseur
el.pad.addEventListener("pointerdown", (ev) => {
  if (ev.target.closest(".calc__key")) ev.preventDefault();
});
el.pad.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-key]");
  if (!b) return;
  press(b.dataset.key);
  b.classList.remove("is-pressed");
  void b.offsetWidth;
  b.classList.add("is-pressed");
});

// Sur écran tactile : pavé intégré (le clavier du téléphone ne s'ouvre pas), ou clavier du téléphone au choix
const touch = matchMedia("(pointer: coarse)").matches;
function setPad(on) {
  root.classList.toggle("is-pad-off", !on);
  fields.forEach((f) => f.setAttribute("inputmode", on && touch ? "none" : "decimal"));
  el.padToggle.setAttribute("aria-pressed", String(!on));
  el.padToggle.querySelector("span").textContent = on ? T.padOn : T.padOff;
}
if (touch) {
  el.padToggle.hidden = false;
  el.padToggle.addEventListener("click", () => {
    const on = root.classList.contains("is-pad-off");
    setPad(on);
    store.set(KEY_PREFS, { ...(store.get(KEY_PREFS, {}) || {}), padOff: !on });
    active.focus({ preventScroll: true });
  });
}

// --- Autres réglages -------------------------------------------------------------------
[el.network, el.hz, el.section, el.material].forEach((n) => n.addEventListener("change", render));
root.querySelectorAll("input[name='calc-phases'], input[name='calc-unit'], input[name='calc-limit']").forEach((n) => n.addEventListener("change", render));

$("calc-save").addEventListener("click", save);
$("calc-copy").addEventListener("click", () => current && copyText(summary()));
$("calc-share").addEventListener("click", async () => {
  if (!current) return;
  const url = shareUrl();
  if (navigator.share) {
    try {
      await navigator.share({ title: T.shareTitle, text: summary(current, false), url });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  copyText(url, T.linkCopied);
});

// --- Installation et hors ligne ----------------------------------------------------------
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
if (standalone) {
  document.documentElement.classList.add("is-app");
  el.installed.hidden = false;
}
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (ev) => {
  ev.preventDefault();
  deferredPrompt = ev;
  el.install.hidden = false;
});
el.install.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice.catch(() => null);
  deferredPrompt = null;
  el.install.hidden = true;
});
window.addEventListener("appinstalled", () => {
  el.install.hidden = true;
  el.installed.hidden = false;
});

if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(new URL("../../calculette-sw.js", import.meta.url), { scope: "./" }).catch(() => {
      /* hors ligne indisponible : la calculette fonctionne en ligne */
    });
  });
}

// --- Démarrage : lien partagé, sinon derniers réglages de l'appareil ---------------------------
const params = Object.fromEntries(new URLSearchParams(location.search));
const prefs = store.get(KEY_PREFS, null);
if (params.v != null || params.u != null) apply(params);
else if (prefs) apply(prefs);
setPad(!(prefs && prefs.padOff));
render();
renderHistory();
