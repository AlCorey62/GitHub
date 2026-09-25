// Bilan de puissance : saisie des lignes, calcul, export CSV, impression, envoi au bureau d'étude.
import { powerBalance, fmt } from "./elec.js";

const STORAGE_KEY = "darkside-bilan-v1";
const $ = (id) => document.getElementById(id);
const rowsEl = $("b-rows");
const tpl = $("b-row-tpl");
const FIELDS = ["name", "zone", "qty", "power", "type", "phase", "cosPhi", "ks"];

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
      lines: readLines(),
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
    phase.title = row && row.assigned ? `Raccordée sur ${row.assigned}` : "";
  });

  // Synthèse
  $("b-badge").textContent = net === "mono" ? "Monophasé" : "Triphasé";
  $("b-pinst").textContent = fmt(result.Pinst / 1000, 2);
  $("b-pf").textContent = fmt(result.Pf / 1000, 2);
  $("b-s").textContent = fmt(result.S / 1000, 2);
  $("b-imax").textContent = fmt(result.Imax, 1);
  const empty = result.S === 0;
  $("b-rating").textContent = empty ? "-" : result.rating ? `${fmt(result.rating, 0)} A` : "au-delà de 2 000 A";
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
    verdict.textContent = "Ajoutez vos appareils pour obtenir le bilan.";
    tag.textContent = "-";
  } else if (net === "mono") {
    verdict.dataset.level = "ok";
    verdict.textContent = `Toutes les charges sont sur une seule phase : ${fmt(result.Imax, 1)} A à prévoir.`;
    tag.textContent = "Monophasé";
  } else {
    const d = result.imbalancePct;
    tag.textContent = `Écart ${fmt(d, 0)} %`;
    if (d <= 10) {
      verdict.dataset.level = "ok";
      verdict.textContent = "Phases bien équilibrées.";
    } else if (d <= 25) {
      verdict.dataset.level = "warn";
      verdict.textContent = `La phase la plus chargée dépasse la moyenne de ${fmt(d, 0)} %. Répartissez autrement les lignes monophasées si possible.`;
    } else {
      verdict.dataset.level = "bad";
      verdict.textContent = `Déséquilibre important (${fmt(d, 0)} % au-dessus de la moyenne) : la source doit être dimensionnée sur la phase la plus chargée.`;
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

function summaryText() {
  if (!last) return "";
  const { result, net, reservePct } = last;
  const lines = [
    "Bilan de puissance (outil en ligne Dark Side Energy)",
    `Événement : ${$("b-event").value || "-"}`,
    `Lieu : ${$("b-place").value || "-"}`,
    `Réseau : ${net === "mono" ? "monophasé 230 V" : "triphasé 400 V"}`,
    `Puissance installée : ${fmt(result.Pinst / 1000, 2)} kW`,
    `Puissance foisonnée : ${fmt(result.Pf / 1000, 2)} kW`,
    `Puissance apparente : ${fmt(result.S / 1000, 2)} kVA`,
    `Courants : ${Object.entries(result.phases).map(([p, v]) => `${p} ${fmt(v, 1)} A`).join(", ")}`,
    `Réserve : ${fmt(reservePct, 0)} %, calibre indicatif : ${result.rating ? `${result.rating} A` : "au-delà de 2 000 A"}`,
    "",
    "Détail :",
  ];
  result.rows.forEach((r) => {
    if (!r.pInst) return;
    lines.push(`- ${r.name || "Sans nom"}${r.zone ? ` (${r.zone})` : ""} : ${r.qty} × ${fmt(r.power, 0)} W, ${r.type}, cos φ ${fmt(r.cosPhi, 2)}, foisonnement ${fmt(r.ks, 2)}, ${fmt(r.s / 1000, 2)} kVA`);
  });
  return lines.join("\n");
}

function csv() {
  if (!last) return "";
  const { result } = last;
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ["Désignation", "Zone", "Quantité", "Puissance unitaire (W)", "Type", "Phase", "cos phi", "Foisonnement", "Puissance installée (W)", "Puissance foisonnée (W)", "Puissance apparente (VA)", "Intensité (A)"];
  const rows = result.rows.map((r) => [
    r.name, r.zone, r.qty, r.power, r.type, r.assigned || "", fmt(r.cosPhi, 2), fmt(r.ks, 2),
    fmt(r.pInst, 0), fmt(r.pF, 0), fmt(r.s, 0), fmt(r.current || 0, 2),
  ]);
  rows.push([]);
  rows.push(["Total", "", "", "", "", "", "", "", fmt(result.Pinst, 0), fmt(result.Pf, 0), fmt(result.S, 0), ""]);
  Object.entries(result.phases).forEach(([p, v]) => rows.push([`Courant ${p} (A)`, fmt(v, 2)]));
  return "﻿" + [head, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
}

// Événements
$("b-add").addEventListener("click", () => {
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
  if (!window.confirm("Effacer toutes les lignes du bilan ?")) return;
  rowsEl.innerHTML = "";
  $("b-event").value = "";
  $("b-place").value = "";
  addRow();
  compute();
});

$("b-csv").addEventListener("click", () => {
  const blob = new Blob([csv()], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bilan-de-puissance-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$("b-print").addEventListener("click", () => {
  $("print-date").textContent = new Date().toLocaleDateString("fr-FR");
  window.print();
});

$("b-send").addEventListener("click", () => {
  const text = summaryText();
  const status = $("b-status");
  if (!last || !last.result.S) {
    status.dataset.state = "error";
    status.textContent = "Ajoutez au moins une ligne avec une puissance avant d'envoyer.";
    return;
  }
  const max = 1800;
  const message = text.length > max ? `${text.slice(0, max)}\n[…] Bilan complet disponible en export CSV.` : text;
  const url = new URL("../contact/", window.location.href);
  url.searchParams.set("objet", "bilan");
  url.searchParams.set("message", message);
  window.location.href = url.toString();
});

// Initialisation
const saved = load();
if (saved && Array.isArray(saved.lines) && saved.lines.length) {
  $("b-event").value = saved.event || "";
  $("b-place").value = saved.place || "";
  if (saved.reserve != null) $("b-reserve").value = saved.reserve;
  const radio = document.querySelector(`input[name='b-network'][value='${saved.network === "mono" ? "mono" : "tri"}']`);
  if (radio) radio.checked = true;
  saved.lines.forEach((l) => addRow(l));
} else {
  addRow();
  addRow();
  addRow();
}
compute();
