// Textes des fiches, sur le modèle des fiches de filmspourenfants.net : thèmes abordés, scènes difficiles,
// vocabulaire, synthèse, avis extérieurs.
// Règle : rien n'est inventé. Chaque phrase générée vient d'une donnée AniList (genre, étiquette et sa pertinence,
// public, tomes, statut) ou d'une définition d'étiquette traduite de la documentation AniList.
// Une fiche vérifiée (donnees/fiches-verifiees.json), rédigée à la main avec ses sources, remplace ces textes.

import { CATEGORIES, FANSERVICE, SEXE_EXPLICITE } from './age.js';

// Définitions des étiquettes sensibles (traduites des définitions AniList).
export const DEFINITIONS = {
  Gore: 'Effusions de sang et violence montrées de façon explicite.',
  Torture: 'Des personnages infligent volontairement de grandes souffrances, pour punir ou pour obtenir quelque chose.',
  Cannibalism: 'Des êtres se nourrissent de leurs semblables.',
  'Human Experimentation': 'Des humains, ou des êtres d\'apparence humaine, servent de cobayes à des expériences.',
  'Death Game': 'Des personnages participent à un jeu où perdre signifie mourir.',
  'Battle Royale': 'Compétition acharnée entre de nombreux participants, souvent violente, avec un seul gagnant.',
  War: 'L\'histoire se déroule en partie ou entièrement en temps de guerre.',
  Terrorism: 'Le récit suit les actions d\'un terroriste ou d\'une organisation terroriste.',
  Assassins: 'Des personnages tuent par métier.',
  Crime: 'Le récit tourne autour d\'actes illégaux.',
  'Criminal Organization': 'Un groupe commet des crimes à des fins illicites ou violentes.',
  Yakuza: 'Le récit tourne autour de la pègre japonaise (yakuzas).',
  Mafia: 'Le récit tourne autour de la mafia italienne.',
  Triads: 'Le récit tourne autour de la pègre chinoise (triades).',
  Gangs: 'Le récit tourne autour de bandes organisées.',
  Delinquents: 'Des personnages ont l\'allure et l\'attitude de voyous (les « yankees » japonais).',
  'Body Horror': 'Des personnages subissent des transformations ou des mutilations effrayantes.',
  Zombie: 'Des morts-vivants s\'attaquent aux vivants et les transforment à leur tour.',
  'Cosmic Horror': 'Horreur fondée sur la peur de l\'inconnu et l\'impuissance face à des forces qui dépassent l\'humanité.',
  'Eco-Horror': 'La nature est montrée sous un jour effrayant pour interroger le rapport de l\'homme à son environnement.',
  Nudity: 'Des personnages apparaissent nus ou laissent voir des parties intimes.',
  Psychosexual: 'Le récit explore les aspects psychologiques des pulsions sexuelles.',
  "Teens' Love": 'Histoire d\'amour avec scènes sexuelles explicites, destinée à un public féminin adolescent et jeune adulte.',
  Incest: 'Relations amoureuses ou sexuelles entre personnages liés par le sang.',
  'Ero Guro': 'Courant artistique japonais qui mêle érotisme, grotesque et décadence.',
  Rape: 'Le récit comporte un viol.',
  Prostitution: 'Des personnages sont payés pour des faveurs sexuelles.',
  Cheating: 'Un personnage en couple a une relation intime avec quelqu\'un d\'autre.',
  Suicide: 'Un personnage se donne ou tente de se donner la mort.',
  Drugs: 'Des personnages consomment des drogues (opioïdes, stimulants, hallucinogènes…).',
  Slavery: 'Le récit montre des esclaves, l\'esclavage ou la traite.',
  Bullying: 'Des personnages en intimident d\'autres par la force, souvent à l\'école.',
  Cult: 'Le récit montre un groupe aux croyances religieuses, spirituelles ou philosophiques marginales.',
  Brainwashing: 'Des personnages sont manipulés mentalement pour agir contre leur volonté.',
  Gambling: 'Le récit tourne autour des jeux d\'argent.',
  Sadism: 'Des personnages prennent plaisir, y compris sexuel, à faire souffrir ou à humilier.',
  Masochism: 'Des personnages prennent un plaisir sexuel à être blessés ou dominés.',
};
const DEFINITION_EXPLICITE = 'Des actes sexuels sont représentés.';
const DEFINITION_FANSERVICE = 'Le dessin met en avant les formes ou certaines parties du corps des personnages.';
const DEFINITION_ADULTE = 'Pratiques ou allusions sexuelles signalées par une étiquette réservée aux adultes.';
export const DEFINITIONS_GENRES = {
  Hentai: 'Œuvre pornographique.',
  Ecchi: 'Fanservice et allusions sexuelles fréquents (genre ecchi).',
  Horror: 'Le récit relève du genre horreur : il cherche à faire peur.',
  Psychological: 'Récit psychologique, centré sur l\'état mental et les tensions intérieures des personnages.',
  Thriller: 'Récit à suspense, fondé sur la tension.',
};

// Thèmes (étiquettes non sensibles) : libellé et définition traduite d'AniList.
export const THEMES = {
  'Found Family': ['Famille de cœur', 'Des personnages sans lien de sang forment un groupe soudé qui se soutient.'],
  'Coming of Age': ['Passage à l\'âge adulte', 'Le récit suit le passage d\'un personnage de l\'enfance à l\'âge adulte.'],
  Revenge: ['Vengeance', 'Un personnage cherche à punir ceux qui lui ont fait du tort.'],
  Tragedy: ['Tragédie', 'Le récit est marqué par des événements tragiques et des fins malheureuses.'],
  Survival: ['Survie', 'Les personnages luttent pour survivre face à des obstacles extrêmes.'],
  Rehabilitation: ['Reconstruction', 'Un personnage qui ne pouvait plus vivre en société ou travailler se reconstruit.'],
  Disability: ['Handicap', 'Un ou plusieurs personnages vivent avec un handicap physique, mental, cognitif ou un trouble du développement.'],
  Philosophy: ['Philosophie', 'Le récit interroge la connaissance, la réalité et l\'existence.'],
  Religion: ['Religion', 'Le récit traite de croyances spirituelles ou surnaturelles.'],
  Politics: ['Politique', 'Le récit tourne autour de la politique, des dirigeants ou du gouvernement.'],
  Environmental: ['Écologie', 'Le récit s\'intéresse à l\'état de la nature et à la façon dont l\'homme la traite.'],
  'Class Struggle': ['Inégalités sociales', 'Conflit entre classes sociales, en général entre une élite dominante et un groupe opprimé.'],
  Orphan: ['Orphelin', 'Un personnage important est orphelin.'],
  Adoption: ['Adoption', 'Un personnage a été adopté.'],
  'Estranged Family': ['Famille éloignée', 'Un membre de la famille du héros a pris ses distances avec lui, ou l\'inverse.'],
  'Family Life': ['Vie de famille', 'Le récit suit le quotidien d\'une famille.'],
  Parenthood: ['Parentalité', 'Le récit traite de l\'éducation d\'un enfant.'],
  School: ['École', 'L\'histoire se déroule en partie ou entièrement dans un établissement scolaire.'],
  'School Club': ['Club scolaire', 'L\'histoire se déroule en partie dans un club d\'élèves.'],
  Work: ['Monde du travail', 'Le récit suit l\'exercice d\'un métier.'],
  Food: ['Cuisine', 'Le récit tourne autour de la cuisine ou de la dégustation.'],
  Medicine: ['Médecine', 'Le récit suit des personnes qui travaillent dans la santé.'],
  Band: ['Groupe de musique', 'Les personnages principaux forment un groupe de musique.'],
  Idol: ['Idoles', 'Le récit suit la vie d\'une ou de plusieurs idoles (chanteuses ou chanteurs).'],
  'Martial Arts': ['Arts martiaux', 'Le récit tourne autour des arts martiaux traditionnels.'],
  'Video Games': ['Jeux vidéo', 'Les personnages jouent aux jeux vidéo.'],
  'Board Game': ['Jeux de société', 'Les personnages jouent à des jeux de société.'],
  'Card Battle': ['Jeux de cartes', 'Les personnages s\'affrontent aux cartes.'],
  Shogi: ['Shōgi', 'Le récit tourne autour du shōgi (échecs japonais).'],
  Go: ['Jeu de go', 'Le récit tourne autour du jeu de go.'],
  Karuta: ['Karuta', 'Le récit tourne autour du karuta (jeu de cartes poétique japonais).'],
  Baseball: ['Baseball', 'Le récit tourne autour du baseball.'],
  Basketball: ['Basket', 'Le récit tourne autour du basket.'],
  Football: ['Football', 'Le récit tourne autour du football.'],
  Volleyball: ['Volley', 'Le récit tourne autour du volley.'],
  Swimming: ['Natation', 'Le récit tourne autour de la natation.'],
  Tennis: ['Tennis', 'Le récit tourne autour du tennis.'],
  Boxing: ['Boxe', 'Le récit tourne autour de la boxe.'],
  Cycling: ['Cyclisme', 'Le récit tourne autour du cyclisme.'],
  'Ice Sports': ['Sports de glace', 'Le récit tourne autour des sports de glace.'],
  Fishing: ['Pêche', 'Le récit tourne autour de la pêche.'],
  'Outdoor Activities': ['Plein air', 'Le récit tourne autour de la randonnée, du camping ou d\'autres activités de plein air.'],
  Camping: ['Camping', 'Les personnages font du camping.'],
  Agriculture: ['Agriculture', 'Le récit montre le travail de la terre.'],
  Animals: ['Animaux', 'Des animaux tiennent les rôles principaux.'],
  'Primarily Animal Cast': ['Personnages animaux', 'Les personnages principaux sont surtout des animaux.'],
  Iyashikei: ['Récit apaisant', 'Le récit cherche à apaiser le lecteur par des scènes calmes du quotidien.'],
  Educational: ['Éducatif', 'L\'œuvre a d\'abord pour but d\'instruire.'],
  'Cute Girls Doing Cute Things': ['Quotidien tranquille', 'Des jeunes filles mènent des activités paisibles, avec peu de drame ou de conflit.'],
  'Cute Boys Doing Cute Things': ['Quotidien tranquille', 'Des jeunes garçons mènent des activités paisibles, avec peu de drame ou de conflit.'],
  Isekai: ['Autre monde (isekai)', 'Un personnage de notre époque est transporté dans un autre monde et doit s\'y adapter.'],
  Reincarnation: ['Réincarnation', 'Un personnage renaît après sa mort, souvent sous une autre identité ou dans un autre monde.'],
  Magic: ['Magie', 'La magie tient une place importante.'],
  Mythology: ['Mythologie', 'Le récit s\'inspire de mythes religieux ou culturels.'],
  Gods: ['Divinités', 'Un personnage est un dieu ou une divinité.'],
  Demons: ['Démons', 'Des créatures malfaisantes venues d\'un autre monde jouent un rôle important.'],
  Ghost: ['Fantômes', 'Un personnage important est un fantôme.'],
  Youkai: ['Yōkai', 'Des créatures surnaturelles du folklore japonais jouent un rôle important.'],
  'Super Power': ['Super-pouvoirs', 'Des personnages ont des capacités extraordinaires.'],
  Superhero: ['Super-héros', 'Des humains dotés de pouvoirs se mettent au service du bien commun.'],
  Robots: ['Robots', 'Des machines humanoïdes jouent un rôle important.'],
  'Super Robot': ['Robots géants', 'De grands robots, souvent pilotés par des héros fougueux.'],
  'Real Robot': ['Robots réalistes', 'Des machines inspirées de la robotique réelle.'],
  Kaiju: ['Monstres géants', 'Des monstres géants jouent un rôle important.'],
  Dragons: ['Dragons', 'Des dragons jouent un rôle important.'],
  Witch: ['Sorcières', 'Un personnage important est une sorcière.'],
  Vampire: ['Vampires', 'Un personnage important est un vampire.'],
  'Fairy Tale': ['Conte', 'L\'œuvre raconte ou revisite un conte.'],
  Alchemy: ['Alchimie', 'Des personnages pratiquent l\'alchimie.'],
  Curses: ['Malédictions', 'Un personnage, un objet ou un lieu est maudit.'],
  Exorcism: ['Exorcisme', 'Des personnages combattent des démons ou des esprits par des rites religieux.'],
  Aliens: ['Extraterrestres', 'Des extraterrestres jouent un rôle important.'],
  Dinosaurs: ['Dinosaures', 'Des dinosaures jouent un rôle important.'],
  Space: ['Espace', 'L\'histoire se déroule en partie ou entièrement dans l\'espace.'],
  'Time Manipulation': ['Voyage dans le temps', 'Voyages dans le temps ou autres manipulations du temps.'],
  'Time Loop': ['Boucle temporelle', 'Un personnage revit sans cesse la même période et cherche à en sortir.'],
  'Post-Apocalyptic': ['Après la catastrophe', 'L\'histoire se déroule après une catastrophe mondiale.'],
  Dystopian: ['Dystopie', 'La société décrite est marquée par la misère ou l\'oppression.'],
  Historical: ['Histoire', 'L\'histoire se déroule pendant une période historique réelle.'],
  Medieval: ['Moyen Âge', 'L\'histoire se déroule au Moyen Âge ou dans un décor qui s\'en inspire.'],
  Samurai: ['Samouraïs', 'Des guerriers de la noblesse japonaise, liés par un code d\'honneur, jouent un rôle important.'],
  Ninja: ['Ninjas', 'Des guerriers japonais formés à l\'espionnage et au combat jouent un rôle important.'],
  Pirates: ['Pirates', 'Des aventuriers des mers, hors-la-loi, jouent un rôle important.'],
  Detective: ['Enquête', 'Un personnage enquête et résout des crimes.'],
  Police: ['Police', 'Le récit suit la vie et le travail de policiers.'],
  Military: ['Armée', 'Le récit suit la vie et les missions de militaires.'],
  Espionage: ['Espionnage', 'Des personnages infiltrent une organisation pour lui voler des secrets.'],
  Travel: ['Voyage', 'Les personnages parcourent de longues distances.'],
  'Love Triangle': ['Triangle amoureux', 'Des sentiments amoureux entre plus de deux personnes.'],
  'Unrequited Love': ['Amour à sens unique', 'Un personnage vit un amour qui n\'est pas, ou pas encore, partagé.'],
  "Boys' Love": ['Romance entre garçons', 'Histoire d\'amour entre deux hommes, sans caractère sexuel par principe.'],
  Yuri: ['Romance entre filles', 'Histoire d\'amour entre deux femmes, sans caractère sexuel par principe.'],
  'LGBTQ+ Themes': ['Thèmes LGBTQ+', 'Personnages ou thèmes liés à l\'orientation sexuelle ou à l\'identité de genre.'],
  Marriage: ['Mariage', 'Le récit tourne autour d\'un mariage.'],
  Cohabitation: ['Vie commune', 'Des personnes vivent sous le même toit et une relation amoureuse naît entre elles.'],
  Pregnancy: ['Grossesse', 'Le récit montre des personnages enceintes ou aborde la grossesse.'],
  Amnesia: ['Amnésie', 'Un personnage a perdu la mémoire.'],
  'Body Swapping': ['Échange de corps', 'Des personnages échangent leur corps.'],
  Teacher: ['Enseignant', 'Le personnage principal est enseignant.'],
  'Body Image': ['Image de soi', 'Estime de soi et apparence physique, avec parfois les troubles alimentaires.'],
  Poverty: ['Pauvreté', 'Des personnages vivent ou observent la pauvreté.'],
  Homeless: ['Sans-abri', 'Un personnage important est sans domicile.'],
  Prison: ['Prison', 'L\'histoire se déroule en partie ou entièrement en prison.'],
  Fugitive: ['Fuite', 'Un personnage cherche à échapper à ceux qui le poursuivent.'],
  Conspiracy: ['Complot', 'Des groupes cherchent à contrôler le monde dans l\'ombre.'],
  'Natural Disaster': ['Catastrophe naturelle', 'Séismes, tsunamis ou tempêtes mettent les personnages en grand danger.'],
  Pandemic: ['Épidémie', 'Une maladie se répand dans un pays ou dans le monde.'],
  Biographical: ['Biographie', 'Histoire vraie d\'une personne réelle.'],
  Autobiographical: ['Autobiographie', 'L\'auteur raconte sa propre vie.'],
  'Non-fiction': ['Documentaire', 'L\'œuvre informe sur un sujet réel.'],
  Drawing: ['Dessin', 'Le récit tourne autour du dessin, y compris du manga.'],
  Writing: ['Écriture', 'Le récit tourne autour du métier d\'écrivain.'],
  Fashion: ['Mode', 'Le récit tourne autour du monde de la mode.'],
  Dancing: ['Danse', 'Le récit tourne autour de la danse.'],
  'Primarily Child Cast': ['Héros enfants', 'Les personnages principaux sont surtout des enfants, avant le lycée.'],
  'Primarily Teen Cast': ['Héros adolescents', 'Les personnages principaux sont surtout des adolescents.'],
  'Anti-Hero': ['Antihéros', 'Le héros n\'a pas les qualités habituelles d\'un héros et frôle parfois le rôle du méchant.'],
};

const LIBELLES_CATEGORIES_SCENES = {
  violence: 'Violence',
  peur: 'Peur et horreur',
  sexe: 'Nudité et sexualité',
  themes: 'Thèmes sensibles',
};

function definitionRaison(r) {
  if (r.source === 'genre') return DEFINITIONS_GENRES[r.nom] || '';
  if (SEXE_EXPLICITE.includes(r.nom)) return DEFINITION_EXPLICITE;
  if (FANSERVICE.includes(r.nom)) return DEFINITION_FANSERVICE;
  return DEFINITIONS[r.nom] || DEFINITION_ADULTE;
}

/** Thèmes du titre (étiquettes non sensibles), du plus pertinent au moins pertinent. Les spoilers sont écartés. */
export function themes(m, rangMin = 50) {
  const vus = new Set();
  return (m.tags || [])
    .filter((t) => THEMES[t.nom] && t.rang >= rangMin && !t.spoiler)
    .sort((a, b) => b.rang - a.rang)
    .filter((t) => {
      const libelle = THEMES[t.nom][0];
      if (vus.has(libelle)) return false;
      vus.add(libelle);
      return true;
    })
    .map((t) => ({ nom: t.nom, titre: THEMES[t.nom][0], texte: THEMES[t.nom][1], rang: t.rang }));
}

/** Scènes difficiles regroupées par catégorie, avec définition, pertinence et âge déclenché. */
export function scenesDifficiles(evaluation) {
  const parCategorie = {};
  for (const cat of Object.keys(CATEGORIES)) {
    const parLibelle = new Map();
    for (const r of evaluation.raisons.filter((x) => x.cat === cat)) {
      const cle = `${r.spoiler ? 's' : 'v'}:${r.fr}`;
      const prec = parLibelle.get(cle);
      if (!prec || r.age > prec.age || (r.age === prec.age && (r.rang || 0) > (prec.rang || 0))) parLibelle.set(cle, r);
    }
    parCategorie[cat] = {
      titre: LIBELLES_CATEGORIES_SCENES[cat],
      age: evaluation.categories[cat],
      scenes: [...parLibelle.values()].map((r) => ({
        titre: r.fr,
        texte: definitionRaison(r),
        rang: r.source === 'genre' ? null : r.rang,
        age: r.age,
        spoiler: !!r.spoiler,
      })),
    };
  }
  return parCategorie;
}

const NATURE_PUBLIC = {
  Kids: 'Manga jeunesse (kodomo)',
  Shounen: 'Shōnen',
  Shoujo: 'Shōjo',
  Seinen: 'Seinen',
  Josei: 'Josei',
};
const STATUT_SERIE = {
  FINISHED: 'série terminée',
  RELEASING: 'série en cours',
  HIATUS: 'série en pause',
  CANCELLED: 'série arrêtée',
  NOT_YET_RELEASED: 'série à paraître',
};
const TYPE_PAYS = { JP: 'Manga', KR: 'Manhwa', CN: 'Manhua', TW: 'Manhua' };

function minuscule(s) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Synthèse en quelques phrases, sur le modèle de l'avis final de filmspourenfants.net.
 * Chaque phrase repose sur une donnée AniList ou sur le résultat du calcul de l'âge.
 * @param {object} m fiche (genres, tags, volumes, statut, format, pays)
 * @param {object} e résultat de evaluerAge
 * @param {Record<string, string>} genresFr libellés français des genres
 */
export function synthese(m, e, genresFr = {}) {
  const phrases = [];
  const nature = (e.public.cle && NATURE_PUBLIC[e.public.cle]) || TYPE_PAYS[m.pays] || 'Manga';
  const forme = m.format === 'ONE_SHOT'
    ? 'histoire courte (one-shot)'
    : [m.volumes ? `${m.volumes} tome${m.volumes > 1 ? 's' : ''}` : '', STATUT_SERIE[m.statut] || ''].filter(Boolean).join(', ');
  phrases.push(`${nature}${forme ? `, ${forme}` : ''}.`);
  const genres = (m.genres || []).map((g) => minuscule(genresFr[g] || g));
  if (genres.length) phrases.push(`Genres : ${genres.join(', ')}.`);
  const th = themes(m, 60).slice(0, 4).map((t) => minuscule(t.titre));
  if (th.length) phrases.push(`Thèmes principaux : ${th.join(', ')}.`);

  const visibles = e.raisons.filter((r) => !r.spoiler);
  const raisonsMasquees = e.raisons.filter((r) => r.spoiler);
  const masques = new Set(raisonsMasquees.map((r) => r.fr)).size;
  const ageMasque = masques ? Math.max(...raisonsMasquees.map((r) => r.age)) : 0;
  const vus = new Set();
  const points = [];
  for (const r of visibles) {
    if (vus.has(r.fr)) continue;
    vus.add(r.fr);
    points.push(r.source === 'genre' ? minuscule(r.fr) : `${minuscule(r.fr)} (${r.rang} %)`);
  }
  if (points.length || masques) {
    const morceaux = points.slice(0, 4);
    if (points.length > 4) morceaux.push(`${points.length - 4} autre${points.length - 4 > 1 ? 's' : ''}`);
    if (masques) morceaux.push(`${masques} élément${masques > 1 ? 's' : ''} d'intrigue masqué${masques > 1 ? 's' : ''} (dès ${ageMasque} ans, détail dans « Scènes difficiles »)`);
    phrases.push(`Points d'attention signalés par les lecteurs : ${morceaux.join(', ')}.`);
  } else if (e.douceur) {
    phrases.push('Récit doux : aucune scène difficile signalée par les lecteurs.');
  } else if (!e.raisons.length) {
    phrases.push('Aucune scène difficile signalée par les lecteurs.');
  }

  if (e.prudence) phrases.push('Peu de lecteurs ont décrit ce titre : l\'âge a été relevé par prudence.');
  const oeuvre = m.format === 'ONE_SHOT' ? 'ce récit' : 'cette série';
  if (e.age >= 18) phrases.push(m.format === 'ONE_SHOT' ? 'Ce récit est réservé aux adultes.' : 'Cette série est réservée aux adultes.');
  else phrases.push(`Mieux vaut avoir ${e.age} ans pour découvrir ${oeuvre}.`);
  if (e.fiabilite === 'faible' && !e.prudence) phrases.push('Peu d\'informations disponibles : feuilletez un tome avant de le confier.');
  return phrases;
}

export const TEXTE_VOCABULAIRE = 'Non renseigné : la base AniList ne décrit pas le langage employé dans les dialogues.';

