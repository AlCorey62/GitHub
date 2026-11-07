// Contrôles du calcul du repérage TDAH : `node --test`
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const code = html.match(/<script id="tdah-scoring">([\s\S]*?)<\/script>/)[1];
const ctx = vm.createContext({});
vm.runInContext(code, ctx);
const T = ctx.TdahScoring;

const ids = (dim) => T.SYMPTOMS.filter((q) => (dim === "HI" ? q.dim !== "IA" : q.dim === dim)).map((q) => q.id);
const fill = (value) => Object.fromEntries(T.SYMPTOMS.map((q) => [q.id, value]));
const base = (over = {}) => ({
  age: "40",
  answers: fill(1),
  traits: {},
  onset: "oui",
  duration: "toujours",
  contexts: ["travail", "famille"],
  impact: { travail: 2 },
  flags: [],
  ...over,
});
const withPresent = (iaCount, hiCount, value = 3) => {
  const a = fill(1);
  ids("IA").slice(0, iaCount).forEach((id) => (a[id] = value));
  ids("HI").slice(0, hiCount).forEach((id) => (a[id] = value));
  return a;
};

test("18 symptômes : 9 inattention, 6 hyperactivité, 3 impulsivité, identifiants uniques", () => {
  assert.equal(T.SYMPTOMS.length, 18);
  assert.equal(ids("IA").length, 9);
  assert.equal(ids("HY").length, 6);
  assert.equal(ids("IM").length, 3);
  const all = [...T.SYMPTOMS, ...T.TRAITS].map((q) => q.id);
  assert.equal(new Set(all).size, all.length);
});

test("chaque fonction du profil renvoie à des questions existantes", () => {
  const known = new Set([...T.SYMPTOMS, ...T.TRAITS].map((q) => q.id));
  for (const c of T.CLUSTERS) for (const id of c.items) assert.ok(known.has(id), `${c.id} : ${id}`);
});

test("seuil DSM-5 : 5 à partir de 17 ans, 6 avant, 5 si l'âge manque", () => {
  assert.equal(T.thresholdFor("17"), 5);
  assert.equal(T.thresholdFor("16"), 6);
  assert.equal(T.thresholdFor(""), 5);
});

test("un symptôme compte à partir de « Souvent »", () => {
  const r = T.evaluate(base({ answers: withPresent(5, 0, 2) }));
  assert.equal(r.counts.IA, 0);
  const r2 = T.evaluate(base({ answers: withPresent(5, 0, 3) }));
  assert.equal(r2.counts.IA, 5);
});

test("présentations : inattentive, hyperactive-impulsive, combinée", () => {
  assert.equal(T.evaluate(base({ answers: withPresent(5, 2) })).presentation, "inattention");
  assert.equal(T.evaluate(base({ answers: withPresent(2, 5) })).presentation, "hyperactivite");
  assert.equal(T.evaluate(base({ answers: withPresent(6, 7) })).presentation, "combinee");
  assert.equal(T.evaluate(base({ answers: withPresent(4, 4) })).presentation, null);
});

test("à 16 ans, 5 symptômes ne suffisent pas", () => {
  const r = T.evaluate(base({ age: "16", answers: withPresent(5, 0) }));
  assert.equal(r.threshold, 6);
  assert.equal(r.symptomsMet, false);
});

test("niveau léger : seuil juste atteint, gêne limitée", () => {
  const r = T.evaluate(base({ answers: withPresent(5, 0) }));
  assert.equal(r.level, "leger");
  assert.equal(r.verdict, "tres-evocateur");
});

test("niveau sévère : deux domaines en gêne majeure", () => {
  const r = T.evaluate(base({ answers: withPresent(5, 0), impact: { travail: 3, famille: 3 } }));
  assert.equal(r.level, "severe");
});

test("niveau sévère : nombreux symptômes au-delà du seuil", () => {
  const r = T.evaluate(base({ answers: withPresent(8, 6) }));
  assert.equal(r.excess, 4);
  assert.equal(r.level, "severe");
});

test("niveau moyen entre les deux", () => {
  const r = T.evaluate(base({ answers: withPresent(7, 0), impact: { travail: 2, famille: 2 } }));
  assert.equal(r.level, "moyen");
});

test("questionnaire incomplet", () => {
  const a = fill(1);
  delete a.ia_c;
  const r = T.evaluate(base({ answers: a }));
  assert.equal(r.verdict, "incomplet");
  assert.deepEqual([...r.missing], ["ia_c"]);
});

test("début après 12 ans : critère de contexte manquant", () => {
  const r = T.evaluate(base({ answers: withPresent(6, 0), onset: "non" }));
  assert.equal(r.verdict, "contexte-non");
  assert.deepEqual([...r.failing], ["B"]);
});

test("début dans l'enfance inconnu : profil à compléter", () => {
  const r = T.evaluate(base({ answers: withPresent(6, 0), onset: "nsp" }));
  assert.equal(r.verdict, "evocateur");
  assert.ok(r.uncertain.includes("B"));
});

test("sous le seuil avec gêne nette, puis loin du seuil", () => {
  assert.equal(T.evaluate(base({ answers: withPresent(3, 0) })).verdict, "sous-seuil");
  assert.equal(T.evaluate(base({ answers: withPresent(1, 1) })).verdict, "peu-evocateur");
});

test("l'exemple fictif donne une présentation inattentive de niveau moyen", () => {
  const r = T.evaluate(T.EXAMPLE);
  assert.equal(r.counts.IA, 7);
  assert.equal(r.counts.HI, 4);
  assert.equal(r.presentation, "inattention");
  assert.equal(r.level, "moyen");
  assert.equal(r.verdict, "tres-evocateur");
  assert.equal(r.flagged[0].id, "sommeil");
});

test("le résumé reprend les comptes et la lecture de l'outil", () => {
  const r = T.evaluate(T.EXAMPLE);
  const s = T.summary(T.EXAMPLE, r, "07/11/2026");
  assert.match(s, /Inattention \(A1\) : 7\/9/);
  assert.match(s, /Hyperactivité-impulsivité \(A2\) : 4\/9/);
  assert.match(s, /niveau indicatif \(calcul de l'outil\) : moyen/i);
  assert.match(s, /trouble du sommeil/);
  assert.doesNotMatch(s, /undefined|null|NaN/);
});
