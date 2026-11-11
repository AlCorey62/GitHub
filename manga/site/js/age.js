// Calcul de l'âge conseillé d'un manga à partir des données AniList (genres et étiquettes de contenu).
// Module partagé : utilisé par le site (navigateur) et par les tests (Node).
//
// Principe : âge conseillé = le plus élevé des âges déclenchés par
//   1. le public visé au Japon (kodomo, shōnen, shōjo, seinen, josei),
//   2. chaque genre ou étiquette de contenu sensible, selon sa pertinence (0 à 100 %) votée par les contributeurs AniList,
//   3. une règle de prudence quand les données sont trop peu nombreuses.
// Les orientations amoureuses (Boys' Love, Yuri, thèmes LGBTQ+) ne modifient jamais l'âge : seul le degré
// d'explicitation compte. Une fiche vérifiée (donnees/fiches-verifiees.json) remplace toujours l'estimation.

export const AGES = [6, 8, 10, 12, 14, 16, 18];

export const LIBELLES_AGE = {
  6: 'Dès 6 ans',
  8: 'Dès 8 ans',
  10: 'Dès 10 ans',
  12: 'Dès 12 ans',
  14: 'Dès 14 ans',
  16: 'Dès 16 ans',
  18: 'Adultes',
};

export const CATEGORIES = {
  violence: 'Violence',
  sexe: 'Nudité et sexualité',
  peur: 'Peur et horreur',
  themes: 'Thèmes sensibles',
};

// Étiquettes sous ce seuil de pertinence : ignorées (jugées marginales par les contributeurs AniList).
export const PERTINENCE_MIN = 30;

// Public visé (étiquettes « Demographic » d'AniList).
export const PUBLICS = {
  Kids: { age: 6, nom: 'Kodomo', fr: 'Jeunesse (kodomo) : public enfant' },
  Shounen: { age: 10, nom: 'Shōnen', fr: 'Shōnen : public adolescent, plutôt garçons' },
  Shoujo: { age: 10, nom: 'Shōjo', fr: 'Shōjo : public adolescent, plutôt filles' },
  Seinen: { age: 12, nom: 'Seinen', fr: 'Seinen : public jeune adulte, plutôt hommes' },
  Josei: { age: 12, nom: 'Josei', fr: 'Josei : public adulte, plutôt femmes' },
};
export const PUBLIC_INCONNU = { age: 10, nom: 'Non précisé', fr: 'Public visé non précisé' };

// Genres AniList qui déclenchent un âge minimal.
export const REGLES_GENRES = {
  Hentai: { cat: 'sexe', fr: 'Hentai (pornographique)', age: 18 },
  Ecchi: { cat: 'sexe', fr: 'Ecchi (fanservice, allusions sexuelles)', age: 14 },
  Horror: { cat: 'peur', fr: 'Horreur', age: 12 },
  Psychological: { cat: 'themes', fr: 'Récit psychologique', age: 12 },
  Thriller: { cat: 'themes', fr: 'Thriller', age: 12 },
};

// Étiquettes de contenu : seuils [pertinence minimale, âge], du plus exigeant au moins exigeant.
export const REGLES_ETIQUETTES = {
  // Violence
  Gore: { cat: 'violence', fr: 'Gore (sang, mutilations)', seuils: [[80, 16], [55, 14], [30, 12]] },
  Torture: { cat: 'violence', fr: 'Torture', seuils: [[70, 16], [30, 14]] },
  Cannibalism: { cat: 'violence', fr: 'Cannibalisme', seuils: [[75, 16], [30, 14]] },
  'Human Experimentation': { cat: 'violence', fr: 'Expériences sur des humains', seuils: [[60, 14], [30, 12]] },
  'Death Game': { cat: 'violence', fr: 'Jeu de mort', seuils: [[60, 14], [30, 12]] },
  'Battle Royale': { cat: 'violence', fr: 'Compétition éliminatoire (battle royale)', seuils: [[30, 10]] },
  War: { cat: 'violence', fr: 'Guerre', seuils: [[30, 10]] },
  Terrorism: { cat: 'violence', fr: 'Terrorisme', seuils: [[30, 10]] },
  Assassins: { cat: 'violence', fr: 'Assassins', seuils: [[30, 10]] },
  Crime: { cat: 'violence', fr: 'Crimes', seuils: [[30, 10]] },
  'Criminal Organization': { cat: 'violence', fr: 'Organisation criminelle', seuils: [[30, 10]] },
  Yakuza: { cat: 'violence', fr: 'Yakuzas', seuils: [[30, 10]] },
  Mafia: { cat: 'violence', fr: 'Mafia', seuils: [[30, 10]] },
  Triads: { cat: 'violence', fr: 'Triades', seuils: [[30, 10]] },
  Gangs: { cat: 'violence', fr: 'Gangs', seuils: [[30, 10]] },
  Delinquents: { cat: 'violence', fr: 'Délinquants, bagarres', seuils: [[85, 12], [30, 10]] },

  // Peur et horreur
  'Body Horror': { cat: 'peur', fr: 'Horreur corporelle', seuils: [[80, 14], [30, 12]] },
  Zombie: { cat: 'peur', fr: 'Zombies', seuils: [[70, 14], [50, 12], [30, 10]] },
  'Cosmic Horror': { cat: 'peur', fr: 'Horreur cosmique', seuils: [[60, 12], [30, 10]] },
  'Eco-Horror': { cat: 'peur', fr: 'Horreur écologique', seuils: [[30, 12]] },

  // Nudité et sexualité (hors étiquettes réservées aux adultes, traitées plus bas)
  Nudity: { cat: 'sexe', fr: 'Nudité', seuils: [[75, 16], [45, 14], [30, 12]] },
  Psychosexual: { cat: 'sexe', fr: 'Thèmes psychosexuels', seuils: [[60, 16], [30, 14]] },
  "Teens' Love": { cat: 'sexe', fr: 'Romance avec scènes sexuelles (Teens\' Love)', seuils: [[30, 16]] },
  Incest: { cat: 'sexe', fr: 'Inceste', seuils: [[70, 16], [55, 14], [30, 12]] },
  'Ero Guro': { cat: 'sexe', fr: 'Ero guro (érotisme et horreur)', seuils: [[30, 18]] },
  Rape: { cat: 'sexe', fr: 'Viol', seuils: [[70, 18], [40, 16], [30, 14]] },
  Prostitution: { cat: 'sexe', fr: 'Prostitution', seuils: [[60, 16], [30, 14]] },
  Cheating: { cat: 'sexe', fr: 'Infidélité', seuils: [[60, 12], [30, 10]] },

  // Thèmes sensibles
  Suicide: { cat: 'themes', fr: 'Suicide', seuils: [[60, 14], [30, 12]] },
  Drugs: { cat: 'themes', fr: 'Drogues', seuils: [[75, 14], [55, 12], [30, 10]] },
  Slavery: { cat: 'themes', fr: 'Esclavage', seuils: [[70, 12], [30, 10]] },
  Bullying: { cat: 'themes', fr: 'Harcèlement', seuils: [[60, 12], [30, 10]] },
  Cult: { cat: 'themes', fr: 'Secte', seuils: [[30, 10]] },
  Brainwashing: { cat: 'themes', fr: 'Manipulation mentale', seuils: [[30, 10]] },
  Gambling: { cat: 'themes', fr: 'Jeux d\'argent', seuils: [[60, 12], [30, 10]] },
};

// Étiquettes réservées aux adultes sur AniList, présentes sur des titres non pornographiques.
// Actes sexuels représentés : 18 ans dès 50 % de pertinence.
export const SEXE_EXPLICITE = [
  'Ahegao', 'Anal Sex', 'Ashikoki', 'Boobjob', 'Cervix Penetration', 'Cumflation', 'Cunnilingus', 'Deepthroat',
  'Defloration', 'Double Penetration', 'Facial', 'Fellatio', 'Fingering', 'Fisting', 'Futanari', 'Group Sex',
  'Handjob', 'Irrumatio', 'Masturbation', 'Mating Press', 'Nakadashi', 'Oyakodon', 'Public Sex', 'Rimjob', 'Scat',
  'Scissoring', 'Sex Toys', 'Shimaidon', 'Sixty-nine', 'Squirting', 'Strap-on', 'Sumata', 'Swapping', 'Tentacles',
  'Threesome', 'Vore', 'Watersports', 'Zoophilia',
];
// Fanservice (représentation du corps) : 14 ans dès 60 %.
export const FANSERVICE = ['Armpits', 'Feet', 'Flat Chest', 'Large Breasts', 'Sweat', 'MILF', 'DILF', 'Virginity'];

for (const nom of SEXE_EXPLICITE) {
  REGLES_ETIQUETTES[nom] = { cat: 'sexe', fr: 'Scènes sexuelles représentées', seuils: [[50, 18], [30, 16]] };
}
for (const nom of FANSERVICE) {
  REGLES_ETIQUETTES[nom] = { cat: 'sexe', fr: 'Fanservice (corps mis en valeur)', seuils: [[60, 14], [30, 12]] };
}
// Toute autre étiquette réservée aux adultes (pratiques et thèmes sexuels) : 16 ans dès 60 %.
export const REGLE_ADULTE_PAR_DEFAUT = { cat: 'sexe', fr: 'Contenu sexuel suggéré', seuils: [[60, 16], [30, 14]] };

// Contenu doux : ces étiquettes, sans aucun élément sensible, ramènent l'âge à 8 ans (6 pour le public enfant).
export const ETIQUETTES_DOUCES = {
  Iyashikei: 'Récit apaisant (iyashikei)',
  'Primarily Animal Cast': 'Personnages principalement animaux',
  'Family Life': 'Vie de famille',
  Educational: 'Éducatif',
  Parenthood: 'Parentalité',
  Kids: 'Public enfant',
  Animals: 'Animaux',
  Chibi: 'Personnages en style chibi',
  'Cute Girls Doing Cute Things': 'Quotidien tranquille de jeunes filles',
  'Cute Boys Doing Cute Things': 'Quotidien tranquille de jeunes garçons',
};
export const GENRES_DOUX = new Set(['Comedy', 'Slice of Life', 'Sports', 'Music', 'Adventure', 'Fantasy', 'Mahou Shoujo']);

// Étiquettes utiles au calcul (avec toute étiquette réservée aux adultes).
export const ETIQUETTES_UTILES = new Set([
  ...Object.keys(PUBLICS),
  ...Object.keys(REGLES_ETIQUETTES),
  ...Object.keys(ETIQUETTES_DOUCES),
]);

export function fiabilite(m) {
  const n = m.nbEtiquettes || 0;
  const p = m.popularite || 0;
  if (n >= 12 && p >= 3000) return 'elevee';
  if (n >= 6 && p >= 300) return 'moyenne';
  return 'faible';
}

export const LIBELLES_FIABILITE = {
  elevee: 'Fiabilité élevée',
  moyenne: 'Fiabilité moyenne',
  faible: 'Fiabilité faible',
};

function ageSelonSeuils(seuils, rang) {
  for (const [min, age] of seuils) if (rang >= min) return age;
  return 0;
}

// Âge minimal qu'une règle impose dès le seuil de pertinence le plus bas.
export function ageMinimalRegle(regle) {
  return Math.min(...regle.seuils.map(([, age]) => age));
}

/**
 * Évalue l'âge conseillé.
 * @param {{genres: string[], tags: {nom: string, rang: number, adulte?: boolean, spoiler?: boolean}[],
 *          nbEtiquettes?: number, popularite?: number}} m
 * @param {{age: number, source?: string, note?: string}} [ajustement] recommandation vérifiée
 */
export function evaluerAge(m, ajustement) {
  const genres = m.genres || [];
  const tags = (m.tags || []).filter((t) => t.rang >= PERTINENCE_MIN);

  // 1. Public visé : l'étiquette démographique la plus pertinente.
  let publicCle = null;
  let publicRang = -1;
  for (const t of tags) {
    if (PUBLICS[t.nom] && t.rang > publicRang) {
      publicCle = t.nom;
      publicRang = t.rang;
    }
  }
  const pub = publicCle ? PUBLICS[publicCle] : PUBLIC_INCONNU;
  let base = pub.age;
  let baseLibelle = pub.fr;
  if (publicCle === 'Kids' && genres.includes('Action')) {
    base = 8;
    baseLibelle = 'Jeunesse (kodomo), avec scènes d\'action';
  }

  // 2. Genres et étiquettes de contenu.
  const raisons = [];
  for (const g of genres) {
    const r = REGLES_GENRES[g];
    if (r) raisons.push({ cat: r.cat, age: r.age, fr: r.fr, source: 'genre', nom: g });
  }
  for (const t of tags) {
    let r = REGLES_ETIQUETTES[t.nom];
    if (!r && t.adulte) r = REGLE_ADULTE_PAR_DEFAUT;
    if (!r) continue;
    const age = ageSelonSeuils(r.seuils, t.rang);
    if (age) raisons.push({ cat: r.cat, age, fr: r.fr, source: 'etiquette', nom: t.nom, rang: t.rang, spoiler: !!t.spoiler });
  }
  raisons.sort((a, b) => b.age - a.age || (b.rang || 100) - (a.rang || 100));

  const fiab = fiabilite(m);

  // 3. Contenu doux : aucun élément sensible, genres paisibles, étiquette douce bien établie.
  let douceur = null;
  if (!raisons.length && fiab !== 'faible' && genres.length && genres.every((g) => GENRES_DOUX.has(g))) {
    const douce = tags.find((t) => ETIQUETTES_DOUCES[t.nom] && t.rang >= 60);
    if (douce) {
      douceur = { nom: douce.nom, rang: douce.rang, fr: ETIQUETTES_DOUCES[douce.nom] };
      base = Math.min(base, publicCle === 'Kids' ? 6 : 8);
    }
  }

  let age = Math.max(base, ...raisons.map((r) => r.age));

  // 4. Prudence quand les données sont rares.
  let prudence = null;
  if (fiab === 'faible') {
    const min = publicCle === 'Seinen' || publicCle === 'Josei' ? 14 : publicCle ? 0 : 12;
    if (min > age) {
      age = min;
      prudence = publicCle
        ? 'Public adulte et peu d\'informations sur le contenu : âge relevé par prudence'
        : 'Public visé inconnu et peu d\'informations sur le contenu : âge relevé par prudence';
    }
  }

  const categories = { violence: 0, sexe: 0, peur: 0, themes: 0 };
  for (const r of raisons) categories[r.cat] = Math.max(categories[r.cat], r.age);

  const resultat = {
    age,
    estimation: age,
    public: { cle: publicCle, nom: pub.nom, fr: baseLibelle, age: base },
    raisons,
    douceur,
    prudence,
    categories,
    fiabilite: fiab,
    verifie: false,
  };
  if (ajustement && AGES.includes(ajustement.age)) {
    resultat.age = ajustement.age;
    resultat.verifie = true;
    resultat.source = ajustement.source || '';
    resultat.note = ajustement.note || '';
  }
  return resultat;
}

// Intensité affichée pour une catégorie, selon l'âge le plus élevé qu'elle déclenche.
export function intensite(age) {
  if (!age) return 'aucune';
  if (age <= 10) return 'légère';
  if (age <= 12) return 'modérée';
  if (age <= 14) return 'marquée';
  return 'forte';
}

// Couverture à flouter par défaut : contenu sexuel classé 16 ans ou plus.
export function couvertureSensible(evaluation) {
  return evaluation.categories.sexe >= 16 || evaluation.age >= 18;
}
