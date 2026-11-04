// Accès à l'API publique d'AniList (https://docs.anilist.co), interrogée en direct depuis le navigateur.
// Conditions d'utilisation d'AniList : usage non commercial gratuit, collecte massive et stockage interdits.
// Le site ne fait donc que des requêtes ponctuelles (une page de résultats à la fois) et ne conserve rien.

export const API_ANILIST = 'https://graphql.anilist.co';
// Couvertures : même nom de fichier en trois tailles (small 100 px, medium 230 px, large 460 px de large).
export const PREFIXE_COUVERTURE = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/';
const MOTIF_COUVERTURE = /^https:\/\/s4\.anilist\.co\/file\/anilistcdn\/media\/manga\/cover\/(?:small|medium|large)\/([^/]+)$/;

/** Nom de fichier d'une couverture AniList (adresse complète conservée si elle ne suit pas le modèle). */
export function fichierCouverture(url) {
  if (!url || /\/default\.jpg$/.test(url)) return '';
  const m = MOTIF_COUVERTURE.exec(url);
  return m ? m[1] : url;
}

/** Adresse d'une couverture à partir de son nom de fichier. */
export function urlCouverture(fichier, taille = 'medium') {
  if (!fichier) return '';
  return /^https?:/.test(fichier) ? fichier : `${PREFIXE_COUVERTURE}${taille}/${fichier}`;
}

// Champs demandés pour chaque manga.
export const CHAMPS_MEDIA = `
  id idMal popularity averageScore
  title { romaji english }
  synonyms format status countryOfOrigin
  startDate { year }
  volumes chapters genres
  tags { name rank isAdult isMediaSpoiler }
  coverImage { medium }
  staff(perPage: 8, sort: [RELEVANCE]) { edges { role node { name { full } } } }`;

export const PAR_PAGE = 40;

// Liste filtrée. Les variables absentes sont ignorées par l'API (ne jamais envoyer null : la liste reviendrait vide).
export const REQUETE_LISTE = `query ($page: Int, $search: String, $sort: [MediaSort], $format_in: [MediaFormat],
  $genre_in: [String], $genre_not_in: [String], $tag_in: [String], $tag_not_in: [String], $rang: Int,
  $country: CountryCode, $status: MediaStatus, $debut_apres: FuzzyDateInt, $debut_avant: FuzzyDateInt,
  $vol_plus: Int, $vol_moins: Int, $pop_plus: Int) {
  Page(page: $page, perPage: ${PAR_PAGE}) {
    pageInfo { hasNextPage total }
    media(type: MANGA, isAdult: false, search: $search, sort: $sort, format_in: $format_in,
      genre_in: $genre_in, genre_not_in: $genre_not_in, tag_in: $tag_in, tag_not_in: $tag_not_in, minimumTagRank: $rang,
      countryOfOrigin: $country, status: $status, startDate_greater: $debut_apres, startDate_lesser: $debut_avant,
      volumes_greater: $vol_plus, volumes_lesser: $vol_moins, popularity_greater: $pop_plus) {${CHAMPS_MEDIA}
    }
  }
}`;

export const REQUETE_FICHE = `query ($id: Int) { Media(id: $id, type: MANGA, isAdult: false) {${CHAMPS_MEDIA} } }`;
export const REQUETE_RESUME = 'query ($id: Int) { Media(id: $id) { description } }';
export const REQUETE_ETIQUETTES = '{ MediaTagCollection { name isAdult } }';

const LATIN = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]+$/u;
const ROLE_AUTEUR = /^(Story|Art|Original Creator|Original Story|Original Character Design)/i;

/** Réduit une fiche AniList aux champs utiles au site. */
export function reduireMedia(m) {
  const romaji = (m.title?.romaji || '').trim();
  const anglais = (m.title?.english || '').trim();
  const deja = new Set([romaji.toLowerCase(), anglais.toLowerCase()]);
  const synonymes = [];
  for (const s of m.synonyms || []) {
    const t = s.trim();
    if (!t || !LATIN.test(t) || deja.has(t.toLowerCase())) continue;
    deja.add(t.toLowerCase());
    synonymes.push(t);
  }
  const auteurs = [];
  for (const e of m.staff?.edges || []) {
    const nom = e.node?.name?.full?.replace(/\s+/g, ' ').trim();
    if (nom && ROLE_AUTEUR.test(e.role || '') && !auteurs.includes(nom)) auteurs.push(nom);
  }
  return {
    id: m.id,
    idMal: m.idMal || 0,
    romaji,
    anglais: anglais && anglais.toLowerCase() !== romaji.toLowerCase() ? anglais : '',
    synonymes,
    annee: m.startDate?.year || 0,
    statut: m.status || '',
    volumes: m.volumes || 0,
    chapitres: m.chapters || 0,
    pays: m.countryOfOrigin || '',
    format: m.format || 'MANGA',
    genres: m.genres || [],
    tags: (m.tags || []).map((t) => ({ nom: t.name, rang: t.rank, adulte: !!t.isAdult, spoiler: !!t.isMediaSpoiler })),
    nbEtiquettes: (m.tags || []).length,
    auteurs: auteurs.slice(0, 4),
    couverture: urlCouverture(fichierCouverture(m.coverImage?.medium)),
    popularite: m.popularity || 0,
    note: m.averageScore || 0,
  };
}

export class ErreurAniList extends Error {
  constructor(message, { attente = 0, statut = 0 } = {}) {
    super(message);
    this.attente = attente;
    this.statut = statut;
  }
}

/** Appel GraphQL. Lève ErreurAniList (attente en secondes si la limite de requêtes est atteinte). */
export async function requeteAniList(query, variables = {}, { signal } = {}) {
  let reponse;
  try {
    reponse = await fetch(API_ANILIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ErreurAniList('connexion à AniList impossible');
  }
  if (reponse.status === 429) {
    const attente = Number(reponse.headers.get('retry-after')) || 60;
    throw new ErreurAniList(`AniList limite le nombre de recherches, nouvel essai possible dans ${attente} s`, { attente, statut: 429 });
  }
  let json = null;
  try {
    json = await reponse.json();
  } catch { /* réponse non JSON */ }
  if (!reponse.ok || !json || json.errors) {
    const message = json?.errors?.map((e) => e.message).join(' ; ') || `erreur ${reponse.status}`;
    throw new ErreurAniList(reponse.status === 403 ? `AniList est momentanément indisponible (${message})` : `AniList a répondu : ${message}`, { statut: reponse.status });
  }
  return json.data;
}
