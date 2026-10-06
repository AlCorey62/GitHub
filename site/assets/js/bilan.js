// Bilan de puissance : saisie des lignes, calcul, export CSV, impression, envoi au bureau d'étude.
// Démo limitée à 4 lignes ; au-delà, export et impression : accès client (Netlify Identity, sur invitation).
import { powerBalance, fmt, LANG } from "./elec.js";
import * as auth from "./identity.js";

const STORAGE_KEY = "darkside-bilan-v1";
const DEMO_MAX = 4;
const $ = (id) => document.getElementById(id);
const rowsEl = $("b-rows");
const tpl = $("b-row-tpl");
const FIELDS = ["name", "zone", "qty", "power", "type", "phase", "cosPhi", "ks"];
const tool = $("bilan-form");
const gate = $("b-gate");

// Textes de l'outil, selon la langue de la page
const T = {
  fr: {
    connectedTo: (p) => `Raccordée sur ${p}`,
    mono: "Monophasé",
    tri: "Triphasé",
    beyond: "au-delà de 2 000 A",
    empty: "Ajoutez vos appareils pour obtenir le bilan.",
    monoVerdict: (i) => `Toutes les charges sont sur une seule phase : ${i} A à prévoir.`,
    gap: (d) => `Écart ${d} %`,
    balanced: "Phases bien équilibrées.",
    warnGap: (d) => `La phase la plus chargée dépasse la moyenne de ${d} %. Répartissez autrement les lignes monophasées si possible.`,
    badGap: (d) => `Déséquilibre important (${d} % au-dessus de la moyenne) : la source doit être dimensionnée sur la phase la plus chargée.`,
    clientOnly: "Réservé aux comptes clients",
    hidden: (n, max) => `Ce bilan compte ${n} lignes : seules les ${max} premières sont affichées et calculées en démo. Connectez-vous pour le retrouver en entier.`,
    summaryTitle: "Bilan de puissance (outil en ligne Dark Side Energy)",
    event: "Événement",
    place: "Lieu",
    network: "Réseau",
    netMono: "monophasé 230 V",
    netTri: "triphasé 400 V",
    pinst: "Puissance installée",
    pf: "Puissance foisonnée",
    s: "Puissance apparente",
    currents: "Courants",
    reserve: (r, rating) => `Réserve : ${r} %, calibre indicatif : ${rating}`,
    detail: "Détail :",
    unnamed: "Sans nom",
    type: { tri: "tri", mono: "mono" },
    ks: "foisonnement",
    sep: " : ",
    csvSep: ";",
    head: ["Désignation", "Zone", "Quantité", "Puissance unitaire (W)", "Type", "Phase", "cos phi", "Foisonnement", "Puissance installée (W)", "Puissance foisonnée (W)", "Puissance apparente (VA)", "Intensité (A)"],
    total: "Total",
    current: (p) => `Courant ${p} (A)`,
    file: "bilan-de-puissance",
    demoLimit: `La démo est limitée à ${DEMO_MAX} lignes. Connectez-vous pour continuer votre bilan.`,
    confirmReset: "Effacer toutes les lignes du bilan ?",
    csvGate: "L'export CSV est réservé aux comptes clients.",
    printGate: "L'impression est réservée aux comptes clients.",
    sendEmpty: "Ajoutez au moins une ligne avec une puissance avant d'envoyer.",
    truncated: "Bilan complet disponible en export CSV.",
    gate: "Connectez-vous pour ajouter des lignes, exporter et imprimer votre bilan.",
    missing: "Saisissez votre e-mail et votre mot de passe.",
    signingIn: "Connexion…",
    signedIn: "Vous êtes connecté : accès complet au bilan.",
    signedOut: "Vous êtes déconnecté.",
  },
  en: {
    connectedTo: (p) => `Connected to ${p}`,
    mono: "Single-phase",
    tri: "Three-phase",
    beyond: "above 2,000 A",
    empty: "Add your equipment to get the assessment.",
    monoVerdict: (i) => `All loads are on a single phase: allow for ${i} A.`,
    gap: (d) => `Imbalance ${d}%`,
    balanced: "Phases well balanced.",
    warnGap: (d) => `The most loaded phase is ${d}% above the average. Spread the single-phase lines differently if possible.`,
    badGap: (d) => `Significant imbalance (${d}% above the average): the source must be sized on the most loaded phase.`,
    clientOnly: "Client accounts only",
    hidden: (n, max) => `This assessment has ${n} lines: only the first ${max} are shown and calculated in the demo. Sign in to get it back in full.`,
    summaryTitle: "Power assessment (Dark Side Energy online tool)",
    event: "Event",
    place: "Venue",
    network: "Network",
    netMono: "single-phase 230 V",
    netTri: "three-phase 400 V",
    pinst: "Installed power",
    pf: "Diversified power",
    s: "Apparent power",
    currents: "Currents",
    reserve: (r, rating) => `Reserve: ${r}%, indicative rating: ${rating}`,
    detail: "Details:",
    unnamed: "Unnamed",
    type: { tri: "three-phase", mono: "single-phase" },
    ks: "diversity factor",
    sep: ": ",
    csvSep: ",",
    head: ["Description", "Zone", "Quantity", "Unit power (W)", "Type", "Phase", "cos phi", "Diversity factor", "Installed power (W)", "Diversified power (W)", "Apparent power (VA)", "Current (A)"],
    total: "Total",
    current: (p) => `Current ${p} (A)`,
    file: "power-assessment",
    demoLimit: `The demo is limited to ${DEMO_MAX} lines. Sign in to continue your assessment.`,
    confirmReset: "Clear all the lines of the assessment?",
    csvGate: "CSV export is for client accounts only.",
    printGate: "Printing is for client accounts only.",
    sendEmpty: "Add at least one line with a power value before sending.",
    truncated: "Full assessment available as a CSV export.",
    gate: "Sign in to add lines, export and print your assessment.",
    missing: "Enter your email and password.",
    signingIn: "Signing in…",
    signedIn: "You are signed in: full access to the assessment.",
    signedOut: "You are signed out.",
  },
}[LANG];

let session = null; // session client vérifiée par le serveur, null en démo
let hiddenLines = []; // lignes d'un bilan enregistré au-delà de la démo, rendues à la connexion

function network() {
  return document.querySelector("input[name='b-network']:checked").value;
}

function readLines() {
  return Array.from(rowsEl.querySelectorAll("tr")).map((tr) => {
    const line = {};
    FIELDS.forEach((k) => {
      const el = tr.querySelector(`[data-k='${k}']`);
      line[k] = el ? el.value : "";
    });
    return line;
  });
}

function addRow(values = {}, focus = false) {
  const tr = tpl.content.firstElementChild.cloneNode(true);
  FIELDS.forEach((k) => {
    if (values[k] != null && values[k] !== "") tr.querySelector(`[data-k='${k}']`).value = values[k];
  });
  rowsEl.appendChild(tr);
  syncPhaseField(tr);
  if (focus) tr.querySelector("[data-k='name']").focus();
  return tr;
}

function syncPhaseField(tr) {
  const type = tr.querySelector("[data-k='type']");
  const phase = tr.querySelector("[data-k='phase']");
  const disabled = type.value === "tri" || network() === "mono";
  phase.disabled = disabled;
  if (disabled) phase.value = "auto";
}

function save() {
  try {
    const data = {
      event: $("b-event").value,
      place: $("b-place").value,
      network: network(),
      reserve: $("b-reserve").value,
      lines: readLines().concat(hiddenLines),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    /* stockage indisponible : l'outil fonctionne sans */
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

let last = null;

function compute() {
  const net = network();
  const reservePct = parseFloat($("b-reserve").value) || 0;
  const lines = readLines();
  const result = powerBalance(lines, { network: net, reservePct });
  last = { result, lines, net, reservePct };

  // Lignes
  Array.from(rowsEl.querySelectorAll("tr")).forEach((tr, i) => {
    const row = result.rows[i];
    tr.querySelector("[data-out='s']").value = fmt(row ? row.s / 1000 : 0, 2);
    const phase = tr.querySelector("[data-k='phase']");
    phase.title = row && row.assigned ? T.connectedTo(row.assigned) : "";
  });

  // Synthèse
  $("b-badge").textContent = net === "mono" ? T.mono : T.tri;
  $("b-pinst").textContent = fmt(result.Pinst / 1000, 2);
  $("b-pf").textContent = fmt(result.Pf / 1000, 2);
  $("b-s").textContent = fmt(result.S / 1000, 2);
  $("b-imax").textContent = fmt(result.Imax, 1);
  const empty = result.S === 0;
  $("b-rating").textContent = empty ? "-" : result.rating ? `${fmt(result.rating, 0)} A` : T.beyond;
  $("b-connector").textContent = empty ? "-" : result.connector;
  $("b-source").textContent = empty ? "-" : fmt(result.Ssource / 1000, 1);

  // Phases
  const meter = $("b-meter");
  const entries = Object.entries(result.phases);
  const scale = Math.max(...entries.map(([, v]) => v), 1);
  meter.innerHTML = "";
  entries.forEach(([p, v]) => {
    const row = document.createElement("div");
    row.className = "meter__row";
    row.innerHTML = `<b>${p}</b><span class="meter__bar"><i style="width:${Math.min(100, (v / scale) * 100)}%"></i></span><output>${fmt(v, 1)} A</output>`;
    meter.appendChild(row);
  });

  const verdict = $("b-verdict");
  const tag = $("b-balance");
  if (empty) {
    verdict.dataset.level = "";
    verdict.textContent = T.empty;
    tag.textContent = "-";
  } else if (net === "mono") {
    verdict.dataset.level = "ok";
    verdict.textContent = T.monoVerdict(fmt(result.Imax, 1));
    tag.textContent = T.mono;
  } else {
    const d = result.imbalancePct;
    tag.textContent = T.gap(fmt(d, 0));
    if (d <= 10) {
      verdict.dataset.level = "ok";
      verdict.textContent = T.balanced;
    } else if (d <= 25) {
      verdict.dataset.level = "warn";
      verdict.textContent = T.warnGap(fmt(d, 0));
    } else {
      verdict.dataset.level = "bad";
      verdict.textContent = T.badGap(fmt(d, 0));
    }
  }

  const warnings = $("b-warnings");
  warnings.innerHTML = "";
  result.warnings.forEach((w) => {
    const li = document.createElement("li");
    li.textContent = w;
    warnings.appendChild(li);
  });

  save();
}

// Accès : démo ou compte client
function renderAccess() {
  tool.classList.toggle("is-client", Boolean(session));
  $("b-access").querySelector("[data-when='demo']").hidden = Boolean(session);
  $("b-access").querySelector("[data-when='client']").hidden = !session;
  $("b-user").textContent = session ? session.email : "";
  document.querySelectorAll("[data-full]").forEach((btn) => {
    btn.title = session ? "" : T.clientOnly;
  });
  const notice = $("b-hidden");
  if (notice) notice.remove();
  if (!session && hiddenLines.length) {
    const p = document.createElement("p");
    p.id = "b-hidden";
    p.className = "access access--warn no-print";
    p.textContent = T.hidden(DEMO_MAX + hiddenLines.length, DEMO_MAX);
    $("b-access").after(p);
  }
}

function openGate(reason) {
  $("b-gate-reason").textContent = reason;
  gate.hidden = false;
  gate.scrollIntoView({ behavior: "smooth", block: "center" });
  $("l-email").focus({ preventScroll: true });
}

// Passage en démo : au-delà de 4 lignes, les lignes sont mises de côté (et conservées)
function enforceDemo() {
  const rows = Array.from(rowsEl.children);
  if (rows.length > DEMO_MAX) {
    hiddenLines = readLines().slice(DEMO_MAX).concat(hiddenLines);
    rows.slice(DEMO_MAX).forEach((tr) => tr.remove());
  }
}

function unlock(s) {
  session = s;
  gate.hidden = true;
  hiddenLines.splice(0).forEach((l) => addRow(l));
  renderAccess();
  compute();
}

function summaryText() {
  if (!last) return "";
  const { result, net, reservePct } = last;
  const c = T.sep;
  const lines = [
    T.summaryTitle,
    `${T.event}${c}${$("b-event").value || "-"}`,
    `${T.place}${c}${$("b-place").value || "-"}`,
    `${T.network}${c}${net === "mono" ? T.netMono : T.netTri}`,
    `${T.pinst}${c}${fmt(result.Pinst / 1000, 2)} kW`,
    `${T.pf}${c}${fmt(result.Pf / 1000, 2)} kW`,
    `${T.s}${c}${fmt(result.S / 1000, 2)} kVA`,
    `${T.currents}${c}${Object.entries(result.phases).map(([p, v]) => `${p} ${fmt(v, 1)} A`).join(", ")}`,
    T.reserve(fmt(reservePct, 0), result.rating ? `${result.rating} A` : T.beyond),
    "",
    T.detail,
  ];
  result.rows.forEach((r) => {
    if (!r.pInst) return;
    lines.push(`- ${r.name || T.unnamed}${r.zone ? ` (${r.zone})` : ""}${c}${r.qty} × ${fmt(r.power, 0)} W, ${T.type[r.type]}, cos φ ${fmt(r.cosPhi, 2)}, ${T.ks} ${fmt(r.ks, 2)}, ${fmt(r.s / 1000, 2)} kVA`);
  });
  return lines.join("\n");
}

// Export CSV : nombres sans séparateur de milliers, lisibles par un tableur
// (virgule décimale et point-virgule en français, point décimal et virgule en anglais)
function csv() {
  if (!last) return "";
  const { result } = last;
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const n = (v, digits) => {
    const t = (Number(v) || 0).toFixed(digits);
    return LANG === "en" ? t : t.replace(".", ",");
  };
  const rows = result.rows.map((r) => [
    r.name, r.zone, r.qty, r.power, T.type[r.type], r.assigned || "", n(r.cosPhi, 2), n(r.ks, 2),
    n(r.pInst, 0), n(r.pF, 0), n(r.s, 0), n(r.current || 0, 2),
  ]);
  rows.push([]);
  rows.push([T.total, "", "", "", "", "", "", "", n(result.Pinst, 0), n(result.Pf, 0), n(result.S, 0), ""]);
  Object.entries(result.phases).forEach(([p, v]) => rows.push([T.current(p), n(v, 2)]));
  return "\ufeff" + [T.head, ...rows].map((r) => r.map(esc).join(T.csvSep)).join("\r\n");
}

// Événements
$("b-add").addEventListener("click", () => {
  if (!session && rowsEl.children.length >= DEMO_MAX) {
    openGate(T.demoLimit);
    return;
  }
  addRow({}, true);
  compute();
});

rowsEl.addEventListener("input", (e) => {
  if (e.target.matches("[data-k='type']")) syncPhaseField(e.target.closest("tr"));
  compute();
});
rowsEl.addEventListener("change", (e) => {
  if (e.target.matches("[data-k='type']")) syncPhaseField(e.target.closest("tr"));
  compute();
});
rowsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-del]");
  if (!btn) return;
  const tr = btn.closest("tr");
  const next = tr.nextElementSibling || tr.previousElementSibling;
  tr.remove();
  if (!rowsEl.children.length) addRow();
  compute();
  const focusTarget = (next && next.isConnected ? next : rowsEl.lastElementChild).querySelector("[data-del]");
  if (focusTarget) focusTarget.focus();
});

document.querySelectorAll("input[name='b-network']").forEach((el) =>
  el.addEventListener("change", () => {
    rowsEl.querySelectorAll("tr").forEach(syncPhaseField);
    compute();
  })
);
["b-reserve", "b-event", "b-place"].forEach((id) => $(id).addEventListener("input", compute));


$("b-reset").addEventListener("click", () => {
  if (!window.confirm(T.confirmReset)) return;
  rowsEl.innerHTML = "";
  hiddenLines = [];
  $("b-event").value = "";
  $("b-place").value = "";
  addRow();
  renderAccess();
  compute();
});

$("b-csv").addEventListener("click", () => {
  if (!session) {
    openGate(T.csvGate);
    return;
  }
  const blob = new Blob([csv()], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${T.file}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$("b-print").addEventListener("click", () => {
  if (!session) {
    openGate(T.printGate);
    return;
  }
  $("print-date").textContent = new Date().toLocaleDateString(LANG === "en" ? "en-GB" : "fr-FR");
  window.print();
});

$("b-send").addEventListener("click", () => {
  const text = summaryText();
  const status = $("b-status");
  if (!last || !last.result.S) {
    status.dataset.state = "error";
    status.textContent = T.sendEmpty;
    return;
  }
  const max = 1800;
  const message = text.length > max ? `${text.slice(0, max)}\n[…] ${T.truncated}` : text;
  const url = new URL("../contact/", window.location.href);
  url.searchParams.set("objet", "bilan");
  url.searchParams.set("message", message);
  window.location.href = url.toString();
});

document.querySelectorAll("[data-open-gate]").forEach((btn) =>
  btn.addEventListener("click", () => openGate(T.gate))
);

$("b-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("l-email").value.trim();
  const password = $("l-password").value;
  const status = $("b-login-status");
  const submit = e.target.querySelector("[type='submit']");
  if (!email || !password) {
    status.dataset.state = "error";
    status.textContent = T.missing;
    return;
  }
  submit.disabled = true;
  status.dataset.state = "";
  status.textContent = T.signingIn;
  try {
    unlock(await auth.login(email, password));
    $("l-password").value = "";
    status.textContent = "";
    $("b-status").dataset.state = "ok";
    $("b-status").textContent = T.signedIn;
    $("b-add").focus();
  } catch (err) {
    status.dataset.state = "error";
    status.textContent = err.message;
  } finally {
    submit.disabled = false;
  }
});

$("b-logout").addEventListener("click", async () => {
  await auth.logout();
  session = null;
  enforceDemo();
  renderAccess();
  compute();
  $("b-status").dataset.state = "";
  $("b-status").textContent = T.signedOut;
});

// Initialisation
const saved = load();
if (saved && Array.isArray(saved.lines) && saved.lines.length) {
  $("b-event").value = saved.event || "";
  $("b-place").value = saved.place || "";
  if (saved.reserve != null) $("b-reserve").value = saved.reserve;
  const radio = document.querySelector(`input[name='b-network'][value='${saved.network === "mono" ? "mono" : "tri"}']`);
  if (radio) radio.checked = true;
  saved.lines.slice(0, DEMO_MAX).forEach((l) => addRow(l));
  hiddenLines = saved.lines.slice(DEMO_MAX);
} else {
  addRow();
  addRow();
  addRow();
}
renderAccess();
compute();
auth.currentSession().then((s) => {
  if (s) unlock(s);
});
