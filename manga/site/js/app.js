// Mangâge : recherche dans la base AniList en direct, âge conseillé calculé dans le navigateur, fiche et guide.

import {
  AGES, CATEGORIES, ETIQUETTES_DOUCES, FANSERVICE, GENRES_DOUX, LIBELLES_AGE, LIBELLES_FIABILITE, PERTINENCE_MIN,
  PUBLICS, REGLES_ETIQUETTES, REGLES_GENRES, REGLE_ADULTE_PAR_DEFAUT, SEXE_EXPLICITE, ageMinimalRegle,
  couvertureSensible, evaluerAge, intensite,
} from './age.js';
import {
  ErreurAniList, REQUETE_ETIQUETTES, REQUETE_FICHE, REQUETE_LISTE, REQUETE_RESUME, reduireMedia, requeteAniList,
} from './anilist.js';

const GENRES_FR = {
  Action: 'Action', Adventure: 'Aventure', Comedy: 'Comédie', Drama: 'Drame', Ecchi: 'Ecchi', Fantasy: 'Fantasy',
  Horror: 'Horreur', 'Mahou Shoujo': 'Magical girl', Mecha: 'Mecha', Music: 'Musique', Mystery: 'Mystère',
  Psychological: 'Psychologique', Romance: 'Romance', 'Sci-Fi': 'Science-fiction', 'Slice of Life': 'Tranche de vie',
  Sports: 'Sport', Supernatural: 'Surnaturel', Thriller: 'Thriller',
};
const STATUTS_FR = {
  FINISHED: 'Terminée', RELEASING: 'En cours', NOT_YET_RELEASED: 'À paraître', CANCELLED: 'Arrêtée', HIATUS: 'En pause',
};
const PAYS_FR = { JP: 'Japon (manga)', KR: 'Corée du Sud (manhwa)', CN: 'Chine (manhua)', TW: 'Taïwan (manhua)' };
const DESCRIPTIONS_AGES = {
  6: 'Jeunesse (kodomo) sans contenu sensible, ou récit doux pour tous.',
  8: 'Jeunesse avec de l\'action, ou récit apaisant sans aucun élément sensible.',
  10: 'Shōnen et shōjo sans contenu marqué. Bagarres, crimes ou guerre peuvent être évoqués.',
  12: 'Violence modérée, peur, récit psychologique, nudité légère. Point de départ des seinen et josei.',
  14: 'Violence marquée (sang), horreur corporelle, fanservice, suicide ou drogues abordés.',
  16: 'Violence très graphique, torture, contenu sexuel suggéré, thèmes psychosexuels.',
  18: 'Scènes sexuelles représentées ou violences sexuelles explicites.',
};
const TEXTE_FIABILITE = {
  elevee: 'Titre très suivi : son contenu est bien décrit par les lecteurs.',
  moyenne: 'Contenu décrit par un nombre limité de lecteurs.',
  faible: 'Peu d\'informations sur ce titre : feuilletez-le avant de le confier.',
};
// Tri AniList ; pour les tris par note ou par date, seuls les titres suivis par au moins 200 membres sont gardés.
const TRIS = {
  popularite: { sort: ['POPULARITY_DESC'], libelle: 'les plus lus' },
  note: { sort: ['SCORE_DESC'], pop: 200, libelle: 'les mieux notés' },
  recent: { sort: ['START_DATE_DESC'], pop: 200, libelle: 'les plus récents' },
  ancien: { sort: ['START_DATE'], pop: 200, libelle: 'les plus anciens' },
};
const PERIODES = {
  '2020-': { debut_apres: 20191231 },
  '2010-2019': { debut_apres: 20091231, debut_avant: 20200101 },
  '2000-2009': { debut_apres: 19991231, debut_avant: 20100101 },
  '1990-1999': { debut_apres: 19891231, debut_avant: 20000101 },
  '1980-1989': { debut_apres: 19791231, debut_avant: 19900101 },
  '-1979': { debut_avant: 19800101 },
};
const LONGUEURS = {
  court: { format_in: ['ONE_SHOT'] },
  '1-10': { vol_plus: 0, vol_moins: 11 },
  '11-30': { vol_plus: 10, vol_moins: 31 },
  '31-': { vol_plus: 30 },
};
// Pour 6 et 8 ans : titres jeunesse, plus les récits doux des autres publics (une recherche par étiquette).
const FLUX_JEUNES = ['Kids', 'Iyashikei', 'Family Life', 'Primarily Animal Cast'];
const VISEE_PAR_LOT = 24;      // titres visibles ajoutés à chaque « Afficher plus »
const REQUETES_PAR_LOT = 4;    // plafond de requêtes par lot (limite AniList : 30 par minute)
const STOCKAGE = 'mangage-preferences';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nombre = (n) => n.toLocaleString('fr-FR');
const pluriel = (n, mot) => `${nombre(n)} ${mot}${n > 1 ? 's' : ''}`;
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const comparateur = new Intl.Collator('fr', { sensitivity: 'base' });

const etat = {
  filtres: { q: '', age: 0, public: '', genres: new Set(), pays: '', statut: '', longueur: '', periode: '', fiabilite: '' },
  tri: 'popularite',
  triChoisi: false,
  flou: true,
  ajustements: {},
  etiquettesAdultes: null,
  vus: new Map(),         // fiches déjà reçues pendant la visite (id → manga)
  reponses: new Map(),    // pages déjà reçues pendant la visite (variables → page)
  resumes: new Map(),
  liste: [],              // titres affichés
  ids: new Set(),
  flux: [],
  total: null,
  generation: 0,
  occupe: false,
  erreur: null,
  ficheId: null,
};

// ---------- Préférences (âge du lecteur, flou) ----------
function lirePreferences() {
  try {
    const p = JSON.parse(localStorage.getItem(STOCKAGE) || '{}');
    if (AGES.includes(p.age)) etat.filtres.age = p.age;
    if (typeof p.flou === 'boolean') etat.flou = p.flou;
  } catch { /* stockage indisponible : valeurs par défaut */ }
}
function sauverPreferences() {
  try {
    localStorage.setItem(STOCKAGE, JSON.stringify({ age: etat.filtres.age, flou: etat.flou }));
  } catch { /* sans effet */ }
}

// ---------- Données ----------
function completer(m) {
  m.titre = m.anglais || m.romaji;
  m.eval = evaluerAge(m, etat.ajustements[m.id]);
  etat.vus.set(m.id, m);
  return m;
}

async function chargerAjustements() {
  try {
    const r = await fetch('donnees/ajustements.json');
    if (!r.ok) return;
    for (const [cle, v] of Object.entries(await r.json())) if (!cle.startsWith('_')) etat.ajustements[cle] = v;
  } catch { /* pas d'âges vérifiés */ }
}

// Liste des étiquettes réservées aux adultes : sert à écarter ces titres dès la requête.
async function chargerEtiquettesAdultes() {
  if (etat.etiquettesAdultes) return;
  try {
    const memo = sessionStorage.getItem('mangage-etiquettes-adultes');
    if (memo) {
      etat.etiquettesAdultes = JSON.parse(memo);
      return;
    }
  } catch { /* pas de mémoire de session */ }
  try {
    const data = await requeteAniList(REQUETE_ETIQUETTES);
    etat.etiquettesAdultes = data.MediaTagCollection.filter((t) => t.isAdult).map((t) => t.name);
    try {
      sessionStorage.setItem('mangage-etiquettes-adultes', JSON.stringify(etat.etiquettesAdultes));
    } catch { /* sans effet */ }
  } catch {
    etat.etiquettesAdultes = [];
  }
}

// ---------- Construction des requêtes ----------
// Exclusions envoyées à AniList pour un âge donné : tout genre ou étiquette qui dépasse cet âge dès 30 % de
// pertinence. Les cas intermédiaires (étiquette tolérée à faible pertinence) sont triés ensuite dans le navigateur.
function exclusionsPourAge(age) {
  const genres = Object.entries(REGLES_GENRES).filter(([, r]) => r.age > age).map(([g]) => g);
  const tags = Object.entries(REGLES_ETIQUETTES).filter(([, r]) => ageMinimalRegle(r) > age).map(([n]) => n);
  if (ageMinimalRegle(REGLE_ADULTE_PAR_DEFAUT) > age) {
    for (const n of etat.etiquettesAdultes || []) if (!REGLES_ETIQUETTES[n]) tags.push(n);
  }
  return { genres, tags };
}

function construireFlux() {
  const f = etat.filtres;
  const recherche = f.q.trim();
  const tri = TRIS[etat.tri];
  const v = { format_in: ['MANGA', 'ONE_SHOT'], rang: PERTINENCE_MIN };
  const tagIn = [];
  const tagNotIn = [];
  const genreNotIn = [];
  if (recherche) v.search = recherche;
  if (recherche && !etat.triChoisi) v.sort = ['SEARCH_MATCH', 'POPULARITY_DESC'];
  else {
    v.sort = tri.sort;
    if (tri.pop) v.pop_plus = tri.pop - 1;
  }
  if (f.genres.size) v.genre_in = [...f.genres];
  if (f.public === 'aucun') tagNotIn.push(...Object.keys(PUBLICS));
  else if (f.public) tagIn.push(f.public);
  if (f.pays) v.country = f.pays;
  if (f.statut) v.status = f.statut;
  if (f.longueur) Object.assign(v, LONGUEURS[f.longueur]);
  if (f.periode) Object.assign(v, PERIODES[f.periode]);
  if (f.fiabilite) v.pop_plus = Math.max(v.pop_plus || 0, f.fiabilite === 'elevee' ? 2999 : 299);
  if (f.age && f.age < 18) {
    const ex = exclusionsPourAge(f.age);
    genreNotIn.push(...ex.genres);
    tagNotIn.push(...ex.tags);
  }
  const flux = (extra = {}) => {
    const x = { ...v };
    const ti = [...tagIn, ...(extra.tag_in || [])];
    const tn = [...new Set([...tagNotIn, ...(extra.tag_not_in || [])])];
    const gn = [...new Set([...genreNotIn, ...(extra.genre_not_in || [])])];
    if (ti.length) x.tag_in = ti;
    if (tn.length) x.tag_not_in = tn;
    if (gn.length) x.genre_not_in = gn;
    return { variables: x, page: 0, fini: false };
  };
  if (f.age && f.age <= 8) {
    const nonDoux = Object.keys(GENRES_FR).filter((g) => !GENRES_DOUX.has(g));
    return FLUX_JEUNES.map((t) => flux({
      tag_in: [t],
      genre_not_in: t === 'Kids' ? (f.age === 6 ? ['Action'] : []) : nonDoux,
    }));
  }
  return [flux()];
}

function passeFiltresLocaux(m) {
  const f = etat.filtres;
  if (f.age && m.eval.age > f.age) return false;
  if (f.fiabilite === 'elevee' && m.eval.fiabilite !== 'elevee') return false;
  if (f.fiabilite === 'moyenne' && m.eval.fiabilite === 'faible') return false;
  if (f.public === 'aucun' && m.eval.public.cle) return false;
  if (f.public && f.public !== 'aucun' && m.eval.public.cle && m.eval.public.cle !== f.public) return false;
  return true;
}

async function pageSuivante(flux, generation) {
  const variables = { ...flux.variables, page: flux.page + 1 };
  const cle = JSON.stringify(variables);
  let page = etat.reponses.get(cle);
  if (!page) {
    const data = await requeteAniList(REQUETE_LISTE, variables);
    if (generation !== etat.generation) return null;
    page = data.Page;
    etat.reponses.set(cle, page);
  }
  flux.page += 1;
  flux.fini = !page.pageInfo.hasNextPage || !page.media.length;
  if (etat.flux.length === 1) etat.total = page.pageInfo.total;
  return page.media.map((m) => etat.vus.get(m.id) || completer(reduireMedia(m)));
}

// ---------- Chargement des résultats ----------
async function nouvelleRecherche() {
  const generation = ++etat.generation;
  if (etat.filtres.age && etat.filtres.age < 16 && !etat.etiquettesAdultes) {
    $('#grille').innerHTML = '';
    $('#grille').setAttribute('aria-busy', 'true');
    $('#etat').textContent = 'Préparation du filtre par âge…';
    await chargerEtiquettesAdultes();
  }
  if (generation !== etat.generation) return;
  etat.flux = construireFlux();
  etat.liste = [];
  etat.ids = new Set();
  etat.total = null;
  etat.erreur = null;
  etat.occupe = false;
  $('#grille').innerHTML = '';
  await chargerPlus(generation);
}

async function chargerPlus(generation = etat.generation) {
  if (etat.occupe) return;
  etat.occupe = true;
  $('#grille').setAttribute('aria-busy', 'true');
  majEntete();
  majEtat();
  const avant = etat.liste.length;
  let requetes = 0;
  try {
    while (etat.liste.length - avant < VISEE_PAR_LOT && requetes < REQUETES_PAR_LOT) {
      const actifs = etat.flux.filter((x) => !x.fini);
      if (!actifs.length) break;
      const nouveaux = [];
      for (const flux of actifs) {
        if (requetes) await attendre(250); // pas de rafale (limiteur d'AniList)
        const lot = await pageSuivante(flux, generation);
        requetes += 1;
        if (!lot || generation !== etat.generation) return;
        nouveaux.push(...lot);
      }
      if (etat.flux.length > 1) nouveaux.sort((a, b) => b.popularite - a.popularite);
      const visibles = nouveaux.filter((m) => !etat.ids.has(m.id) && passeFiltresLocaux(m));
      for (const m of visibles) etat.ids.add(m.id);
      etat.liste.push(...visibles);
      $('#grille').insertAdjacentHTML('beforeend', visibles.map(carte).join(''));
    }
  } catch (e) {
    if (generation === etat.generation) etat.erreur = e;
  } finally {
    if (generation === etat.generation) {
      etat.occupe = false;
      $('#grille').removeAttribute('aria-busy');
      majEntete();
      majEtat();
    }
  }
}

function plusDisponible() {
  return etat.flux.some((x) => !x.fini);
}

// ---------- Rendu ----------
function gommette(age) {
  return `<span class="gommette a${age}" title="${esc(LIBELLES_AGE[age])}" aria-hidden="true">${age}<small>+</small></span>`;
}

function couverture(m) {
  const flou = etat.flou && couvertureSensible(m.eval);
  const img = m.couverture
    ? `<img src="${esc(m.couverture)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
    : '';
  return `<div class="couv${flou ? ' floue' : ''}"><span class="couv-texte" aria-hidden="true">${esc(m.titre)}</span>${img}${
    flou ? '<span class="couv-mention">Couverture masquée</span>' : ''}</div>`;
}

function carte(m) {
  const ligne1 = [m.auteurs.slice(0, 2).join(', '), m.annee || ''].filter(Boolean).join(' · ');
  const ligne2 = [
    m.eval.public.cle ? PUBLICS[m.eval.public.cle].nom : '',
    m.volumes ? pluriel(m.volumes, 'tome') : m.format === 'ONE_SHOT' ? 'Histoire courte' : '',
    m.pays && m.pays !== 'JP' ? (m.pays === 'KR' ? 'Manhwa' : 'Manhua') : '',
  ].filter(Boolean).join(' · ');
  return `<article class="carte">
  ${couverture(m)}
  ${gommette(m.eval.age)}
  <h3 class="carte-titre">${esc(m.titre)}</h3>
  ${ligne1 ? `<p class="carte-meta">${esc(ligne1)}</p>` : ''}
  ${ligne2 ? `<p class="carte-meta">${esc(ligne2)}</p>` : ''}
  <a class="carte-lien" href="#manga-${m.id}" aria-label="${esc(`${m.titre}, ${LIBELLES_AGE[m.eval.age].toLowerCase()}${m.eval.verifie ? ', âge vérifié' : ''}`)}"></a>
</article>`;
}

function descriptionFiltres() {
  const f = etat.filtres;
  const morceaux = [];
  if (f.public) morceaux.push(f.public === 'aucun' ? 'public non précisé' : PUBLICS[f.public].nom);
  for (const g of f.genres) morceaux.push(GENRES_FR[g] || g);
  for (const [cle, sel] of [['pays', '#f-pays'], ['statut', '#f-statut'], ['longueur', '#f-longueur'], ['periode', '#f-periode']]) {
    if (f[cle]) morceaux.push($(sel).selectedOptions[0].textContent.toLowerCase());
  }
  if (f.fiabilite) morceaux.push(`fiabilité ${$('#f-fiabilite').selectedOptions[0].textContent.toLowerCase()}`);
  return morceaux;
}

function majEntete() {
  const f = etat.filtres;
  const n = etat.liste.length;
  const recherche = f.q.trim();
  let titre;
  if (etat.occupe && !n) titre = recherche ? `Recherche de « ${esc(recherche)} »…` : 'Chargement…';
  else if (recherche) titre = `<span class="nb">${nombre(n)}</span> ${n > 1 ? 'résultats' : 'résultat'} pour « ${esc(recherche)} »`;
  else titre = `Titres ${TRIS[etat.tri].libelle}`;
  if (f.age && f.age < 18 && (n || !etat.occupe)) titre += ` <small>conseillés jusqu'à ${f.age} ans</small>`;
  $('#titre-resultats').innerHTML = titre;
  const actifs = descriptionFiltres();
  $('#actifs').hidden = !actifs.length;
  $('#actifs').textContent = actifs.length ? `Filtres : ${actifs.join(', ')}.` : '';
  $('#nb-filtres').textContent = actifs.length ? `(${actifs.length})` : '';
  majEchelle();
}

function majEtat() {
  const zone = $('#etat');
  const plus = $('#plus');
  const n = etat.liste.length;
  const f = etat.filtres;
  plus.hidden = etat.occupe || !!etat.erreur || !plusDisponible();
  if (etat.occupe) {
    zone.textContent = 'Recherche en cours dans la base AniList…';
  } else if (etat.erreur) {
    const e = etat.erreur;
    zone.innerHTML = `${esc(e instanceof ErreurAniList ? e.message : 'Connexion à AniList impossible')}.<br><button type="button" class="bouton bouton-second" id="reessayer">Réessayer</button>`;
  } else if (!n && !plusDisponible()) {
    zone.innerHTML = `<strong>Aucun titre ne correspond.</strong> ${f.q ? 'Vérifiez l\'orthographe ou essayez le titre japonais ou anglais. ' : ''}Vous pouvez élargir les filtres${f.age ? ' ou l\'âge du lecteur' : ''}.`;
  } else if (!plusDisponible()) {
    zone.textContent = `${pluriel(n, 'titre')} : fin de la liste.`;
  } else {
    const total = etat.total && !f.age && !f.fiabilite && !f.public
      ? ` sur ${etat.total >= 5000 ? 'plus de 5 000' : nombre(etat.total)}` : '';
    zone.textContent = `${pluriel(n, 'titre')} affiché${n > 1 ? 's' : ''}${total}.${
      TRIS[etat.tri].pop && (!f.q.trim() || etat.triChoisi) ? ' Tri limité aux titres suivis par au moins 200 membres AniList.' : ''}`;
  }
}

let minuterie;
function relancer(delai = 0) {
  clearTimeout(minuterie);
  if (delai) minuterie = setTimeout(nouvelleRecherche, delai);
  else nouvelleRecherche();
}

// ---------- Échelle des âges ----------
function construireEchelle() {
  const zone = $('#echelle-boutons');
  zone.innerHTML = `<button type="button" class="echelon echelon-tous" data-age="0">Tous les âges</button>${AGES.map((a) =>
    `<button type="button" class="echelon" data-age="${a}">${gommette(a)}${a === 18 ? 'Adulte' : `${a} ans`}</button>`).join('')}`;
  zone.addEventListener('click', (e) => {
    const b = e.target.closest('.echelon');
    if (!b) return;
    etat.filtres.age = Number(b.dataset.age);
    sauverPreferences();
    relancer();
  });
}

function majEchelle() {
  const age = etat.filtres.age;
  for (const b of document.querySelectorAll('.echelon')) b.setAttribute('aria-pressed', String(Number(b.dataset.age) === age));
  const aide = $('#echelle-aide');
  if (!age) {
    aide.textContent = 'Tous les âges sont affichés. Choisissez l\'âge du lecteur pour ne garder que les titres conseillés jusqu\'à cet âge.';
  } else if (age === 18) {
    aide.textContent = 'Tous les titres sont affichés, y compris ceux réservés aux adultes.';
  } else {
    const suivant = AGES[AGES.indexOf(age) + 1];
    aide.textContent = `Pour un lecteur de ${age} ans : les titres conseillés « ${LIBELLES_AGE[suivant].toLowerCase()} » et au-delà sont masqués.${
      age <= 8 ? ' À cet âge, la liste réunit les mangas jeunesse et les récits doux (apaisants, familiaux, animaliers).' : ''}`;
  }
}

// ---------- Fiche détaillée ----------
function jauge(age) {
  const niveaux = { aucune: 0, légère: 1, modérée: 2, marquée: 3, forte: 4 };
  const n = niveaux[intensite(age)];
  return `<span class="jauge" role="img" aria-label="Intensité ${intensite(age)}">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
}

function blocContenus(e) {
  const nbSpoilers = e.raisons.filter((r) => r.spoiler).length;
  const lignes = Object.entries(CATEGORIES).map(([cat, nom]) => {
    // regroupe les raisons de même libellé (étiquettes réservées aux adultes notamment)
    const parLibelle = new Map();
    for (const r of e.raisons.filter((x) => x.cat === cat)) {
      const cle = `${r.spoiler ? 's' : 'v'}:${r.fr}`;
      const prec = parLibelle.get(cle);
      if (!prec || r.age > prec.age || (r.age === prec.age && (r.rang || 0) > (prec.rang || 0))) parLibelle.set(cle, r);
    }
    const raisons = [...parLibelle.values()];
    const caches = raisons.filter((r) => r.spoiler);
    const item = (r) => {
      const pct = r.source === 'genre' ? 'genre' : `${r.rang} %`;
      return `<li${r.spoiler ? ' class="spoiler" hidden' : ''}>${esc(r.fr)} <span class="pct">${pct}</span> → ${r.age} ans</li>`;
    };
    const items = raisons.filter((r) => !r.spoiler).map(item);
    if (caches.length) {
      const max = Math.max(...caches.map((r) => r.age));
      items.push(`<li class="spoiler-resume">${caches.length === 1 ? 'Un élément d\'intrigue masqué' : `${caches.length} éléments d'intrigue masqués`} (jusqu'à ${max} ans)</li>`);
      items.push(...caches.map(item));
    }
    const age = e.categories[cat];
    return `<div class="contenu">
      <span class="contenu-nom">${esc(nom)}</span>${jauge(age)}
      <div class="contenu-detail">${age ? `<span class="vers">${intensite(age)}</span><ul>${items.join('')}</ul>` : 'aucun élément signalé'}</div>
    </div>`;
  });
  const notes = [`Point de départ : ${esc(e.public.fr)}, ${e.public.age} ans.`];
  if (e.douceur) notes.push(`Contenu doux : ${esc(e.douceur.fr.toLowerCase())} (${e.douceur.rang} %), aucun élément sensible.`);
  if (e.prudence) notes.push(`${esc(e.prudence)} : ${e.estimation} ans.`);
  const devoiler = nbSpoilers
    ? '<p class="base-calcul"><button type="button" class="spoiler-bouton" id="devoiler">Afficher les éléments d\'intrigue masqués</button> (ils peuvent dévoiler l\'histoire)</p>'
    : '';
  return `<section class="contenus" aria-labelledby="t-contenus">
    <h3 id="t-contenus">Ce qui détermine l'âge</h3>
    ${notes.map((n) => `<p class="base-calcul">${n}</p>`).join('')}
    ${lignes.join('')}
    ${devoiler}
    <p class="base-calcul">Pourcentage : part des contributeurs AniList qui jugent l'étiquette pertinente. <a href="#guide">Voir le barème</a></p>
  </section>`;
}

function htmlFiche(m) {
  const e = m.eval;
  const infos = [];
  if (m.auteurs.length) infos.push(['Auteurs', m.auteurs.join(', ')]);
  if (m.annee) infos.push(['Début', String(m.annee)]);
  const parution = [STATUTS_FR[m.statut], m.volumes ? pluriel(m.volumes, 'tome') : '', m.chapitres ? pluriel(m.chapitres, 'chapitre') : '']
    .filter(Boolean).join(', ');
  if (parution) infos.push(['Parution', parution]);
  if (m.format === 'ONE_SHOT') infos.push(['Format', 'Histoire courte (one-shot)']);
  if (m.pays) infos.push(['Origine', PAYS_FR[m.pays] || m.pays]);
  infos.push(['Public visé', e.public.cle ? PUBLICS[e.public.cle].fr : 'Non précisé']);
  if (m.note) infos.push(['Note AniList', `${m.note}/100, ${pluriel(m.popularite, 'membre')} le suivent`]);
  else if (m.popularite) infos.push(['Suivi par', pluriel(m.popularite, 'membre AniList')]);

  const autres = m.synonymes.slice(0, 6);
  const etatAge = e.verifie
    ? '<span class="etiquette-etat fiab-elevee">Vérifié</span>'
    : '<span class="etiquette-etat">Estimation</span>';
  const explication = e.verifie
    ? `Âge vérifié${e.source ? ` (source : ${esc(e.source)})` : ''}.${e.note ? ` ${esc(e.note)}` : ''} L'estimation calculée était de ${e.estimation} ans.`
    : `Estimation calculée d'après le public visé et les étiquettes de contenu AniList. ${TEXTE_FIABILITE[e.fiabilite]}`;

  const liens = [`<a href="https://anilist.co/manga/${m.id}" target="_blank" rel="noopener">Fiche AniList</a>`];
  if (m.idMal) liens.push(`<a href="https://myanimelist.net/manga/${m.idMal}" target="_blank" rel="noopener">Fiche MyAnimeList</a>`);

  return `<div class="fiche-entete">
    ${couverture(m)}
    <div class="fiche-titres">
      <h2 id="fiche-titre">${esc(m.titre)}</h2>
      ${m.anglais ? `<p class="romaji">${esc(m.romaji)}</p>` : ''}
      ${autres.length ? `<p class="autres">Autres titres : ${esc(autres.join(' · '))}</p>` : ''}
      <dl class="infos">${infos.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    </div>
  </div>
  <section class="verdict" aria-label="Âge conseillé">
    ${gommette(e.age)}
    <div>
      <h3>${esc(LIBELLES_AGE[e.age])}</h3>
      <p>${etatAge}<span class="etiquette-etat fiab-${e.fiabilite}">${esc(LIBELLES_FIABILITE[e.fiabilite])}</span></p>
      <p>${explication}</p>
    </div>
  </section>
  ${blocContenus(e)}
  ${m.genres.length ? `<section class="fiche-section"><h3>Genres</h3><ul class="genres-liste">${m.genres.map((g) => `<li>${esc(GENRES_FR[g] || g)}</li>`).join('')}</ul></section>` : ''}
  <section class="fiche-section" aria-labelledby="t-resume">
    <h3 id="t-resume">Résumé (en anglais, source AniList)</h3>
    <div id="resume"><p class="resume-etat">Chargement du résumé…</p></div>
  </section>
  <section class="fiche-section"><h3>En savoir plus</h3><div class="liens">${liens.join('')}</div></section>`;
}

function texteDepuisHtml(html) {
  const doc = new DOMParser().parseFromString(String(html || '').replace(/<br\s*\/?>/gi, '\n'), 'text/html');
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

async function chargerResume(m) {
  const zone = $('#resume');
  if (!zone) return;
  const afficher = (texte) => {
    if (etat.ficheId !== m.id) return;
    zone.innerHTML = texte ? '<p class="resume"></p>' : '<p class="resume-etat">Pas de résumé sur AniList pour ce titre.</p>';
    if (texte) zone.firstChild.textContent = texte;
  };
  if (etat.resumes.has(m.id)) return afficher(etat.resumes.get(m.id));
  try {
    const data = await requeteAniList(REQUETE_RESUME, { id: m.id });
    const texte = texteDepuisHtml(data.Media?.description);
    etat.resumes.set(m.id, texte);
    afficher(texte);
  } catch (e) {
    if (etat.ficheId === m.id) {
      zone.innerHTML = `<p class="resume-etat">Résumé indisponible (${esc(e.message || 'AniList ne répond pas')}). Le lien vers la fiche AniList reste utilisable.</p>`;
    }
  }
}

async function trouverManga(id) {
  if (etat.vus.has(id)) return etat.vus.get(id);
  const data = await requeteAniList(REQUETE_FICHE, { id });
  return data.Media ? completer(reduireMedia(data.Media)) : null;
}

async function ouvrirFiche(id) {
  const dialogue = $('#fiche');
  const contenu = $('#fiche-contenu');
  etat.ficheId = id;
  let m = null;
  let erreur = null;
  if (!etat.vus.has(id)) {
    contenu.innerHTML = '<div class="fiche-titres"><h2 id="fiche-titre">Chargement de la fiche…</h2></div>';
    $('#correction').hidden = true;
    if (!dialogue.open) dialogue.showModal();
  }
  try {
    m = await trouverManga(id);
  } catch (e) {
    erreur = e;
  }
  if (etat.ficheId !== id) return;
  contenu.innerHTML = m
    ? htmlFiche(m)
    : `<div class="fiche-titres"><h2 id="fiche-titre">Titre introuvable</h2><p>${esc(erreur ? `${erreur.message}.` : 'Ce titre n\'existe pas sur AniList ou il est classé pornographique.')}</p></div>`;
  $('#correction').hidden = !m;
  $('#correction').open = false;
  $('#form-correction').reset();
  $('#c-retour').textContent = '';
  if (m) $('#c-manga').value = `${m.id} | ${m.titre} | estimation ${m.eval.estimation} ans`;
  if (!dialogue.open) dialogue.showModal();
  dialogue.scrollTop = 0;
  $('#fiche-fermer').focus();
  if (m) chargerResume(m);
}

function fermerFiche() {
  const dialogue = $('#fiche');
  if (dialogue.open) dialogue.close();
}

// ---------- Guide ----------
function seuilsTexte(seuils) {
  return seuils.map(([p, a]) => `${p} % → ${a}`).join(' · ');
}

function construireGuide() {
  $('#guide-echelle').innerHTML = AGES.map((a) => `<li>${gommette(a)}<div><strong>${esc(LIBELLES_AGE[a])}</strong><span>${esc(DESCRIPTIONS_AGES[a])}</span></div></li>`).join('');
  $('#g-seuil').textContent = PERTINENCE_MIN;
  const groupes = new Set([...SEXE_EXPLICITE, ...FANSERVICE]);
  const lignes = [];
  for (const [cat, nomCat] of Object.entries(CATEGORIES)) {
    const regles = [];
    for (const r of Object.values(REGLES_GENRES)) if (r.cat === cat) regles.push([`${r.fr} (genre)`, `genre présent → ${r.age}`]);
    for (const [nom, r] of Object.entries(REGLES_ETIQUETTES)) {
      if (r.cat === cat && !groupes.has(nom)) regles.push([r.fr, seuilsTexte(r.seuils)]);
    }
    if (cat === 'sexe') {
      regles.push([`Fanservice (${FANSERVICE.length} étiquettes : formes du corps mises en avant…)`, seuilsTexte(REGLES_ETIQUETTES[FANSERVICE[0]].seuils)]);
      regles.push([`Scènes sexuelles représentées (${SEXE_EXPLICITE.length} étiquettes réservées aux adultes)`, seuilsTexte(REGLES_ETIQUETTES[SEXE_EXPLICITE[0]].seuils)]);
      regles.push(['Autre contenu sexuel suggéré (étiquettes réservées aux adultes)', seuilsTexte(REGLE_ADULTE_PAR_DEFAUT.seuils)]);
    }
    lignes.push(`<tr class="groupe"><th colspan="3" scope="colgroup">${esc(nomCat)}</th></tr>`);
    for (const [libelle, seuils] of regles) lignes.push(`<tr><td>${esc(libelle)}</td><td>${esc(nomCat)}</td><td>${esc(seuils)}</td></tr>`);
  }
  const douces = Object.values(ETIQUETTES_DOUCES).map((x) => x.toLowerCase()).join(', ');
  lignes.push(`<tr class="groupe"><th colspan="3" scope="colgroup">Contenu doux</th></tr><tr><td>${esc(`Étiquettes : ${douces}`)}</td><td>Baisse</td><td>60 % → 8 (6 en jeunesse)</td></tr>`);
  $('#bareme tbody').innerHTML = lignes.join('');
}

function majSourcesVerifiees() {
  const n = Object.keys(etat.ajustements).length;
  if (n) $('#g-source-verifies').textContent = `${pluriel(n, 'âge')} vérifié${n > 1 ? 's' : ''} à la main ; les autres sont des estimations.`;
}

// ---------- Navigation ----------
function router() {
  const h = decodeURIComponent(location.hash.slice(1));
  const guide = h === 'guide';
  $('#vue-guide').hidden = !guide;
  $('#vue-catalogue').hidden = guide;
  for (const a of document.querySelectorAll('.nav a')) {
    if ((a.dataset.vue === 'guide') === guide) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  const fiche = /^manga-(\d+)$/.exec(h);
  if (fiche) ouvrirFiche(Number(fiche[1]));
  else fermerFiche();
  if (guide) window.scrollTo(0, 0);
}

// ---------- Initialisation ----------
function lierControles() {
  const f = etat.filtres;
  $('#q').addEventListener('input', (e) => {
    f.q = e.target.value;
    relancer(450);
  });
  $('#q').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') relancer();
  });
  const selects = { '#f-public': 'public', '#f-pays': 'pays', '#f-statut': 'statut', '#f-longueur': 'longueur', '#f-periode': 'periode', '#f-fiabilite': 'fiabilite' };
  for (const [sel, cle] of Object.entries(selects)) {
    $(sel).addEventListener('change', (e) => {
      f[cle] = e.target.value;
      relancer();
    });
  }
  $('#tri').addEventListener('change', (e) => {
    etat.tri = e.target.value;
    etat.triChoisi = true;
    relancer();
  });
  $('#f-flou').checked = etat.flou;
  $('#f-flou').addEventListener('change', (e) => {
    etat.flou = e.target.checked;
    sauverPreferences();
    $('#grille').innerHTML = etat.liste.map(carte).join('');
  });
  const genres = Object.keys(GENRES_FR).sort((a, b) => comparateur.compare(GENRES_FR[a], GENRES_FR[b]));
  $('#f-genres').innerHTML = genres.map((g) => `<button type="button" class="puce" data-genre="${esc(g)}" aria-pressed="false">${esc(GENRES_FR[g])}</button>`).join('');
  $('#f-genres').addEventListener('click', (e) => {
    const b = e.target.closest('.puce');
    if (!b) return;
    const g = b.dataset.genre;
    if (f.genres.has(g)) f.genres.delete(g);
    else f.genres.add(g);
    b.setAttribute('aria-pressed', String(f.genres.has(g)));
    relancer(300);
  });
  $('#reinit').addEventListener('click', () => {
    Object.assign(f, { public: '', pays: '', statut: '', longueur: '', periode: '', fiabilite: '' });
    f.genres.clear();
    for (const sel of Object.keys(selects)) $(sel).value = '';
    for (const b of document.querySelectorAll('.puce')) b.setAttribute('aria-pressed', 'false');
    relancer();
  });
  $('#ouvrir-filtres').addEventListener('click', (e) => {
    const ouvert = $('#filtres').classList.toggle('ouvert');
    e.currentTarget.setAttribute('aria-expanded', String(ouvert));
  });
  $('#plus').addEventListener('click', () => chargerPlus());
  $('#etat').addEventListener('click', (e) => {
    if (e.target.id === 'reessayer') {
      etat.erreur = null;
      chargerPlus();
    }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entrees) => {
      if (entrees.some((x) => x.isIntersecting) && !$('#plus').hidden && !etat.occupe) chargerPlus();
    }, { rootMargin: '400px' }).observe($('#plus'));
  }

  // Couverture introuvable : on garde le titre en texte.
  document.addEventListener('error', (e) => {
    if (e.target instanceof HTMLImageElement && e.target.closest('.couv')) e.target.remove();
  }, true);

  const dialogue = $('#fiche');
  $('#fiche-fermer').addEventListener('click', fermerFiche);
  dialogue.addEventListener('click', (e) => {
    if (e.target === dialogue) fermerFiche();
    if (e.target.closest('#devoiler')) {
      for (const li of dialogue.querySelectorAll('li.spoiler')) li.hidden = false;
      for (const li of dialogue.querySelectorAll('li.spoiler-resume')) li.remove();
      e.target.closest('p').remove();
    }
  });
  dialogue.addEventListener('close', () => {
    etat.ficheId = null;
    if (/^#manga-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
  });

  $('#form-correction').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const retour = $('#c-retour');
    retour.textContent = 'Envoi en cours…';
    try {
      const r = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!r.ok) throw new Error(String(r.status));
      retour.textContent = 'Merci : votre proposition a été transmise. Elle sera vérifiée avant toute modification.';
      form.reset();
    } catch {
      retour.textContent = 'L\'envoi n\'a pas abouti. Le formulaire ne fonctionne que sur le site publié (Netlify).';
    }
  });

  window.addEventListener('hashchange', router);
}

async function demarrer() {
  lirePreferences();
  construireEchelle();
  construireGuide();
  lierControles();
  majEchelle();
  await chargerAjustements();
  majSourcesVerifiees();
  router();
  nouvelleRecherche();
}

demarrer();
