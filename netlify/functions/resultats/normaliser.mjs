// Mise en forme d'une réponse du formulaire Netlify « satisfaction » pour la page privée /resultats/ :
// seules les réponses du client sont gardées (ni adresse IP, ni navigateur, ni adresse de provenance).
//
// Trois formats de réponse coexistent dans Netlify :
//   - jusqu'au 28/10/2026 vers 14 h : un champ par note (note_globale, note_reactivite…) et recommandation = oui ;
//   - le 28/10/2026 après midi : notes en texte (« Note globale : 4/5 », une ligne par critère) et
//     recommandation en clair (Oui, Peut-être, Non ; Yes, Maybe, No) ;
//   - ensuite : en plus, le champ « valeurs » (note_globale=4; note_reactivite=5; recommandation=oui).

export const CRITERES = [
  "note_globale",
  "note_reactivite",
  "note_distribution",
  "note_regie",
  "note_coordination",
  "note_regie_generale",
  "note_etudes",
  "note_consulting",
  "note_budget",
];
export const PRESTAS = ["distribution", "regie", "coordination", "regie_generale", "bureau", "consulting"];

// Ligne du texte des notes -> critère, d'après son libellé français ou anglais
const LIBELLES = [
  [/^(note globale|overall rating)/i, "note_globale"],
  [/^(réactivité|responsiveness)/i, "note_reactivite"],
  [/^(distribution électrique|power distribution)/i, "note_distribution"],
  [/^(régie technique|technical management)/i, "note_regie"],
  [/^(coordination générale|general coordination)/i, "note_coordination"],
  [/^(régie générale|production management)/i, "note_regie_generale"],
  [/^(bureau d'étude|engineering office)/i, "note_etudes"],
  [/^consulting/i, "note_consulting"],
  [/^(respect du budget|budget)/i, "note_budget"],
];

const RECO = { oui: "oui", yes: "oui", "peut-etre": "peut-etre", "peut-être": "peut-etre", maybe: "peut-etre", non: "non", no: "non" };

const texte = (v, max = 4000) => String(v ?? "").trim().slice(0, max);
const note = (v) => {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : undefined;
};

export function normaliser(s) {
  const d = s?.data || {};
  const valeurs = Object.fromEntries(
    texte(d.valeurs)
      .split(";")
      .map((p) => p.split("=").map((x) => x.trim()))
      .filter(([k, v]) => k && v)
  );
  const parTexte = {};
  for (const ligne of texte(d.notes).split("\n")) {
    const m = ligne.match(/^(.*?)\s*:\s*(\d)\/5\s*$/);
    const crit = m && LIBELLES.find(([re]) => re.test(m[1].trim()))?.[1];
    if (crit && !(crit in parTexte)) parTexte[crit] = m[2];
  }
  const notes = {};
  for (const c of CRITERES) {
    const n = note(valeurs[c] ?? d[c] ?? parTexte[c]);
    if (n) notes[c] = n;
  }
  return {
    id: texte(s?.id, 64),
    date: texte(s?.created_at, 40),
    langue: d.langue === "en" ? "en" : "fr",
    nom: texte(d.nom, 200),
    structure: texte(d.structure, 200),
    evenement: texte(d.evenement, 300),
    prestations: PRESTAS.filter((p) => texte(d[`presta_${p}`]).toLowerCase() === "oui"),
    notes,
    recommandation: RECO[texte(valeurs.recommandation || d.recommandation).toLowerCase()] || "",
    satisfait: texte(d.satisfait),
    ameliorer: texte(d.ameliorer),
    commentaire: texte(d.commentaire_public),
  };
}
