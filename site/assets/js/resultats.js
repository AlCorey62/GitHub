// Résultats du questionnaire de satisfaction (page privée /resultats/).
// La page s'ouvre avec le lien secret …/resultats/#<clé> : la fin du lien (#…) n'est jamais envoyée au
// serveur ; la clé part dans l'en-tête Authorization vers la fonction Netlify « resultats », qui lit les
// réponses en direct. Les statistiques sont calculées ici, sur les réponses retenues par les filtres
// (période, prestation), et la page se recharge toute seule toutes les 2 minutes quand elle est affichée.
// Les textes des clients sont insérés avec textContent uniquement.

const CRITERES = [
  ["note_globale", "Note globale"],
  ["note_reactivite", "Réactivité"],
  ["note_distribution", "Distribution électrique : installation et exploitation sur site"],
  ["note_regie", "Régie technique : qualité du personnel mis à disposition"],
  ["note_coordination", "Coordination générale : organisation et coordination de l'événement"],
  ["note_regie_generale", "Régie générale : qualité de la régie générale"],
  ["note_etudes", "Bureau d'étude : qualité des études et des plans"],
  ["note_consulting", "Consulting : pertinence des conseils"],
  ["note_budget", "Respect du budget et des délais"],
];
const PRESTAS = [
  ["distribution", "Distribution électrique"],
  ["regie", "Régie technique"],
  ["coordination", "Coordination générale"],
  ["regie_generale", "Régie générale"],
  ["bureau", "Bureau d'étude"],
  ["consulting", "Consulting"],
];
const RECO = { oui: "Oui", "peut-etre": "Peut-être", non: "Non" };
const SEUIL = 4; // critères signalés sous cette moyenne

const NB = " "; // espace insécable (typographie française)
const racine = document.querySelector("[data-resultats]");

// --- Mise en forme --------------------------------------------------------------------------
const un = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pluriel = (n, mot) => `${n}${NB}${mot}${n > 1 ? "s" : ""}`;
const moyenne = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const date = (iso, opts = { day: "numeric", month: "long", year: "numeric" }) =>
  new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", ...opts });
const heure = (iso) => new Date(iso).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });

// Élément HTML ; les enfants texte passent par des nœuds texte (jamais innerHTML)
function el(tag, attrs = {}, ...enfants) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "style") Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of enfants.flat()) if (c !== undefined && c !== null && c !== false) e.append(c);
  return e;
}

// Tableau de données : l'équivalent lisible de chaque graphique, sans survol
function tableau(legende, entetes, lignes) {
  return el(
    "details",
    { class: "resultats-table" },
    el("summary", {}, "Voir le tableau"),
    el(
      "div",
      { class: "table-wrap" },
      el(
        "table",
        { class: "table" },
        el("caption", {}, legende),
        el("thead", {}, el("tr", {}, entetes.map((h, i) => el("th", { scope: "col", class: i ? "num" : undefined }, h)))),
        el("tbody", {}, lignes.map((l) => el("tr", {}, el("th", { scope: "row" }, l[0]), l.slice(1).map((c) => el("td", { class: "num" }, c)))))
      )
    )
  );
}

// Barres horizontales : une ligne par élément, valeur au bout de la barre, détail au survol
function barres(lignes, max, formater) {
  return el(
    "div",
    { class: "hbar", role: "list" },
    lignes.map((l) =>
      el(
        "div",
        {
          class: "hbar__ligne",
          role: "listitem",
          tabindex: l.valeur === null ? undefined : "0",
          "data-tip-valeur": l.valeur === null ? undefined : formater(l.valeur),
          "data-tip-libelle": l.valeur === null ? undefined : `${l.libelle} · ${l.detail}`,
        },
        el("span", { class: "hbar__libelle" }, l.libelle),
        l.valeur === null
          ? el("span", { class: "hbar__vide" }, "Pas encore de note")
          : el("span", { class: "hbar__piste" }, el("span", { class: "hbar__barre", style: { width: `${(100 * l.valeur) / max}%` } })),
        el("span", { class: "hbar__valeur" }, l.valeur === null ? "" : formater(l.valeur))
      )
    )
  );
}

// Colonnes : valeur sur la colonne, libellé dessous, détail au survol
function colonnes(cols) {
  const max = Math.max(1, ...cols.map((c) => c.valeur));
  return el(
    "div",
    { class: "vbar-cadre" },
    el(
      "div",
      { class: "vbar", role: "list" },
      cols.map((c) =>
        el(
          "div",
          { class: "vbar__col", role: "listitem", tabindex: "0", "data-tip-valeur": c.tipValeur, "data-tip-libelle": c.tipLibelle },
          el("span", { class: `vbar__valeur${c.valeur ? "" : " vbar__valeur--zero"}` }, String(c.valeur)),
          el("span", { class: "vbar__barre", style: { height: `${Math.round((120 * c.valeur) / max)}px` } }),
          el("span", { class: "visually-hidden" }, c.libelle)
        )
      )
    ),
    el("div", { class: "vbar__axe", "aria-hidden": "true" }, cols.map((c) => el("span", {}, c.libelle)))
  );
}

// Infobulle unique : la valeur d'abord, le libellé ensuite ; au survol et au clavier
function infobulle() {
  const tip = el("div", { class: "resultats-tip", role: "tooltip", hidden: true });
  document.body.append(tip);
  const montrer = (cible, x, y) => {
    tip.replaceChildren(el("strong", {}, cible.dataset.tipValeur), el("span", {}, cible.dataset.tipLibelle || ""));
    tip.hidden = false;
    const r = cible.getBoundingClientRect();
    const px = x ?? r.left + r.width / 2;
    const py = y ?? r.top;
    const left = Math.min(window.innerWidth - tip.offsetWidth - 8, Math.max(8, px - tip.offsetWidth / 2));
    const top = py - tip.offsetHeight - 12 < 8 ? py + 20 : py - tip.offsetHeight - 12;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };
  const cacher = () => (tip.hidden = true);
  racine.addEventListener("pointermove", (e) => {
    const c = e.target.closest("[data-tip-valeur]");
    if (c) montrer(c, e.clientX, e.clientY);
    else cacher();
  });
  racine.addEventListener("pointerleave", cacher);
  racine.addEventListener("focusin", (e) => {
    const c = e.target.closest("[data-tip-valeur]");
    if (c) montrer(c);
  });
  racine.addEventListener("focusout", cacher);
  window.addEventListener("scroll", cacher, { passive: true });
}

// --- Sections ----------------------------------------------------------------------------------
function chiffresCles(liste) {
  const globales = liste.map((r) => r.notes.note_globale).filter(Boolean);
  const recos = liste.map((r) => r.recommandation).filter(Boolean);
  const compte = (v) => recos.filter((r) => r === v).length;
  const tuile = (libelle, valeur, unite, detail, hero) =>
    el(
      "div",
      { class: `kpi${hero ? " kpi--hero" : ""}` },
      el("p", { class: "kpi__libelle" }, libelle),
      el("p", { class: "kpi__valeur" }, valeur, unite ? el("span", { class: "kpi__unite" }, unite) : null),
      el("p", { class: "kpi__detail" }, detail)
    );
  const m = moyenne(globales);
  return [
    tuile("Note globale moyenne", m === null ? "Aucune" : un(m), m === null ? "" : `${NB}/${NB}5`, `sur ${pluriel(globales.length, "réponse")}`, true),
    tuile("Réponses", String(liste.length), "", liste.length ? `depuis le ${date(liste[liste.length - 1].date)}` : "Aucune réponse sur cette période"),
    tuile(
      "Recommanderaient Dark Side Energy",
      recos.length ? `${Math.round((100 * compte("oui")) / recos.length)}${NB}%` : "Aucune réponse",
      "",
      `${compte("oui")} oui · ${compte("peut-etre")} peut-être · ${compte("non")} non`
    ),
    tuile("Dernière réponse", liste.length ? date(liste[0].date, { day: "numeric", month: "short" }) : "Aucune", "", liste.length ? liste[0].structure : ""),
  ];
}

function grapheCriteres(liste) {
  const lignes = CRITERES.map(([k, libelle]) => {
    const v = liste.map((r) => r.notes[k]).filter(Boolean);
    return { libelle, valeur: moyenne(v), detail: pluriel(v.length, "note"), n: v.length };
  });
  return [
    barres(lignes, 5, (v) => `${un(v)}${NB}/${NB}5`),
    tableau(
      "Notes moyennes par critère, sur 5",
      ["Critère", "Moyenne", "Notes"],
      lignes.map((l) => [l.libelle, l.valeur === null ? "" : un(l.valeur), String(l.n)])
    ),
  ];
}

function grapheRepartition(liste) {
  const cols = [1, 2, 3, 4, 5].map((n) => {
    const nb = liste.filter((r) => r.notes.note_globale === n).length;
    return { libelle: `${n}/5`, valeur: nb, tipValeur: pluriel(nb, "réponse"), tipLibelle: `Note globale ${n}/5` };
  });
  return [colonnes(cols), tableau("Nombre de réponses par note globale", ["Note globale", "Réponses"], cols.map((c) => [c.libelle, String(c.valeur)]))];
}

function grapheMois(liste) {
  if (!liste.length) return [el("p", { class: "hint" }, "Aucune réponse sur cette période.")];
  const cle = (iso) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 7);
  const premier = cle(liste[liste.length - 1].date);
  const dernier = cle(liste[0].date);
  const mois = [];
  for (let [a, m] = premier.split("-").map(Number); `${a}-${String(m).padStart(2, "0")}` <= dernier; m === 12 ? ((a += 1), (m = 1)) : (m += 1)) {
    mois.push(`${a}-${String(m).padStart(2, "0")}`);
  }
  const cols = mois.slice(-12).map((k) => {
    const du = liste.filter((r) => cle(r.date) === k);
    const moy = moyenne(du.map((r) => r.notes.note_globale).filter(Boolean));
    const libelle = new Date(`${k}-15T12:00:00Z`).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    return {
      libelle,
      valeur: du.length,
      tipValeur: pluriel(du.length, "réponse"),
      tipLibelle: `${libelle}${moy === null ? "" : ` · note globale moyenne ${un(moy)}${NB}/${NB}5`}`,
      moy,
    };
  });
  return [
    colonnes(cols),
    tableau("Réponses et note globale moyenne par mois", ["Mois", "Réponses", "Note globale moyenne"], cols.map((c) => [c.libelle, String(c.valeur), c.moy === null ? "" : un(c.moy)])),
  ];
}

function graphePrestations(liste) {
  const lignes = PRESTAS.map(([k, libelle]) => {
    const n = liste.filter((r) => r.prestations.includes(k)).length;
    const part = liste.length ? Math.round((100 * n) / liste.length) : 0;
    return { libelle, valeur: n, detail: `${part}${NB}% des réponses`, n };
  });
  return [
    barres(lignes, Math.max(1, liste.length), (v) => String(v)),
    tableau("Nombre de réponses par prestation", ["Prestation", "Réponses"], lignes.map((l) => [l.libelle, String(l.n)])),
  ];
}

function citations(liste, champ) {
  const avec = liste.filter((r) => r[champ]);
  if (!avec.length) return el("p", { class: "hint" }, "Aucun commentaire sur cette période.");
  return el(
    "ul",
    { class: "citations" },
    avec.map((r) => el("li", {}, el("p", {}, r[champ]), el("span", { class: "citations__auteur" }, `${r.nom}, ${r.structure} · ${date(r.date)}`)))
  );
}

function synthese(liste) {
  return [
    el("div", { class: "panel" }, el("h3", {}, "Ce qui a le plus satisfait"), citations(liste, "satisfait")),
    el("div", { class: "panel" }, el("h3", {}, "Ce qui pourrait être amélioré"), citations(liste, "ameliorer")),
    el("div", { class: "panel" }, el("h3", {}, "Commentaires publics"), citations(liste, "commentaire")),
  ];
}

function attention(liste) {
  const bas = CRITERES.map(([k, libelle]) => [libelle, moyenne(liste.map((r) => r.notes[k]).filter(Boolean))]).filter(([, m]) => m !== null && m < SEUIL);
  return bas.length
    ? `Critères sous ${SEUIL}${NB}/${NB}5 sur cette période${NB}: ${bas.map(([l, m]) => `${l} (${un(m)})`).join(", ")}.`
    : `Aucun critère sous ${SEUIL}${NB}/${NB}5 sur cette période.`;
}

function etoiles(n) {
  return el("span", { class: "etoiles", "aria-hidden": "true" }, "★".repeat(n), el("span", { class: "etoiles__vide" }, "★".repeat(5 - n)));
}

function fiche(r) {
  const prestas = PRESTAS.filter(([k]) => r.prestations.includes(k)).map(([, l]) => l);
  const notes = CRITERES.filter(([k]) => r.notes[k]);
  const bloc = (titre, texte) => (texte ? el("div", { class: "reponse__texte" }, el("h4", {}, titre), el("p", {}, texte)) : null);
  return el(
    "article",
    { class: "panel reponse" },
    el(
      "header",
      { class: "reponse__tete" },
      el("h3", {}, `${r.nom} · ${r.structure}`),
      el("p", { class: "reponse__date" }, `${date(r.date)} à ${heure(r.date)}${r.langue === "en" ? " · version anglaise" : ""}`)
    ),
    el("p", { class: "reponse__evt" }, r.evenement),
    prestas.length ? el("ul", { class: "reponse__tags", "aria-label": "Prestations" }, prestas.map((p) => el("li", {}, p))) : null,
    notes.length
      ? el("dl", { class: "reponse__notes" }, notes.map(([k, l]) => el("div", {}, el("dt", {}, l), el("dd", {}, etoiles(r.notes[k]), `${r.notes[k]}${NB}/${NB}5`))))
      : null,
    r.recommandation ? el("p", { class: "reponse__reco" }, `Recommanderait Dark Side Energy${NB}: ${RECO[r.recommandation]}`) : null,
    bloc("Ce qui a le plus satisfait", r.satisfait),
    bloc("À améliorer", r.ameliorer),
    bloc("Commentaire public", r.commentaire)
  );
}

// --- Chargement et affichage -------------------------------------------------------------------
if (racine) {
  const etat = racine.querySelector("[data-etat]");
  const contenu = racine.querySelector("[data-contenu]");
  const majEl = racine.querySelector("[data-maj]");
  const filtres = { periode: racine.querySelector("[data-filtre=periode]"), presta: racine.querySelector("[data-filtre=presta]") };
  const graphes = Object.fromEntries([...racine.querySelectorAll("[data-graphe]")].map((g) => [g.dataset.graphe, g]));
  const cle = decodeURIComponent(location.hash.replace(/^#(?:cle=)?/, "")).trim();
  let reponses = [];
  let minuteur;

  for (const [k, l] of PRESTAS) filtres.presta.append(new Option(l, k));
  for (const f of Object.values(filtres)) f.addEventListener("change", afficher);
  racine.querySelector("[data-actualiser]").addEventListener("click", charger);
  infobulle();

  function retenues() {
    const p = filtres.periode.value;
    const debut =
      p === "30" || p === "90" ? Date.now() - Number(p) * 864e5 : p === "annee" ? Date.parse(`${new Date().getFullYear()}-01-01T00:00:00`) : 0;
    return reponses.filter((r) => Date.parse(r.date) >= debut && (!filtres.presta.value || r.prestations.includes(filtres.presta.value)));
  }

  function afficher() {
    const liste = retenues();
    racine.querySelector("[data-kpi]").replaceChildren(...chiffresCles(liste));
    graphes.criteres.replaceChildren(...grapheCriteres(liste));
    graphes.repartition.replaceChildren(...grapheRepartition(liste));
    graphes.mois.replaceChildren(...grapheMois(liste));
    graphes.prestations.replaceChildren(...graphePrestations(liste));
    racine.querySelector("[data-attention]").textContent = attention(liste);
    racine.querySelector("[data-synthese]").replaceChildren(...synthese(liste));
    racine.querySelector("[data-reponses]").replaceChildren(...(liste.length ? liste.map(fiche) : [el("p", { class: "hint" }, "Aucune réponse sur cette période.")]));
  }

  async function charger() {
    // Pendant la lecture, l'affichage précédent reste en place, atténué
    racine.classList.add("is-loading");
    racine.setAttribute("aria-busy", "true");
    try {
      const res = await fetch("/.netlify/functions/resultats", { headers: { Authorization: `Bearer ${cle}` }, cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.erreur || `erreur ${res.status}`), { status: res.status });
      reponses = (data.reponses || []).filter((r) => r.date).sort((a, b) => b.date.localeCompare(a.date));
      majEl.textContent = `Mis à jour à ${heure(data.maj)} · ${pluriel(reponses.length, "réponse")} au total`;
      etat.hidden = true;
      etat.dataset.state = "";
      contenu.hidden = false;
      afficher();
    } catch (e) {
      etat.hidden = false;
      etat.dataset.state = "error";
      if (e.status === 401) {
        contenu.hidden = true;
        clearInterval(minuteur);
        etat.textContent = "Lien invalide : la clé a peut-être changé. Demandez le lien à jour.";
      } else if (e.status === 503) {
        etat.textContent = "La page n'est pas encore configurée sur Netlify (variables RESULTATS_CLE et RESULTATS_NETLIFY_TOKEN).";
      } else {
        etat.textContent = `Lecture des réponses impossible pour le moment (${e.message}). Nouvel essai automatique dans 2 minutes.`;
      }
    } finally {
      racine.classList.remove("is-loading");
      racine.setAttribute("aria-busy", "false");
    }
  }

  // Un autre lien collé dans le même onglet ne recharge pas la page tout seul : on le fait ici
  window.addEventListener("hashchange", () => location.reload());

  if (!cle) {
    etat.textContent = "Cette page s'ouvre uniquement avec le lien secret de l'équipe.";
    racine.setAttribute("aria-busy", "false");
  } else {
    charger();
    minuteur = setInterval(() => document.visibilityState === "visible" && charger(), 120000);
  }
}
