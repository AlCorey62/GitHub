/*
 * Calculateur d'Énergie Stand : bibliothèque d'équipements types (Dark Side Energy).
 *
 * Les puissances sont des VALEURS TYPES : ordres de grandeur courants de la puissance
 * appelée par un appareil de cette famille. Elles servent à démarrer un bilan et sont
 * signalées « à confirmer » tant que l'utilisateur ne les a pas vérifiées sur la plaque
 * signalétique ou la fiche technique.
 *
 * cosPhi : renseigné à 1 seulement pour les charges purement résistives (chauffage,
 * halogène) ; sinon null, et le cos φ du projet s'applique.
 */
(function (racine, fabrique) {
  'use strict';
  const catalogue = fabrique();
  if (typeof module === 'object' && module && module.exports) module.exports = catalogue;
  else racine.CatalogueStand = catalogue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '2026.10';

  function E(id, nom, categorie, puissanceW, options) {
    const o = options || {};
    return Object.freeze({
      id,
      nom,
      categorie,
      puissanceW,
      alimentation: o.tri ? 'tri' : 'mono',
      cosPhi: o.cosPhi == null ? null : o.cosPhi,
      motsCles: Object.freeze(o.mots || []),
      populaire: !!o.populaire,
    });
  }

  const RESISTIF = 1;

  const equipements = Object.freeze([
    // Lumière
    E('spot-led-rail', 'Spot LED sur rail', 'lumiere', 30, { populaire: true, mots: ['spot', 'projecteur', 'éclairage', 'rail', 'lampe'] }),
    E('spot-led-encastre', 'Spot LED encastré', 'lumiere', 10, { mots: ['spot', 'downlight', 'éclairage', 'plafond'] }),
    E('projecteur-led-50', 'Projecteur LED 50 W', 'lumiere', 50, { mots: ['projecteur', 'flood', 'éclairage'] }),
    E('projecteur-led-100', 'Projecteur LED 100 W', 'lumiere', 100, { populaire: true, mots: ['projecteur', 'flood', 'éclairage'] }),
    E('projecteur-led-200', 'Projecteur LED 200 W', 'lumiere', 200, { mots: ['projecteur', 'flood', 'éclairage'] }),
    E('ruban-led', 'Ruban LED (par mètre)', 'lumiere', 15, { mots: ['bandeau', 'strip', 'ruban', 'led', 'mètre'] }),
    E('tube-led', 'Tube LED 120 cm', 'lumiere', 18, { mots: ['néon', 'réglette', 'tube', 'éclairage'] }),
    E('dalle-led', 'Dalle LED 60 × 60', 'lumiere', 36, { mots: ['panneau', 'dalle', 'plafond', 'éclairage'] }),
    E('suspension-led', 'Suspension ou lampe décorative LED', 'lumiere', 20, { mots: ['lampe', 'luminaire', 'suspension', 'lampadaire', 'applique'] }),
    E('guirlande-led', 'Guirlande lumineuse LED (10 m)', 'lumiere', 30, { mots: ['guinguette', 'guirlande', 'déco'] }),
    E('par-led', 'PAR LED', 'lumiere', 150, { mots: ['par', 'projecteur', 'scène', 'wash'] }),
    E('lyre-led', 'Lyre asservie LED', 'lumiere', 400, { mots: ['lyre', 'asservi', 'moving head', 'spot', 'wash', 'beam'] }),
    E('decoupe-led', 'Découpe LED', 'lumiere', 200, { mots: ['découpe', 'profile', 'projecteur', 'scène'] }),
    E('par-64-halogene', 'PAR 64 halogène 1 000 W', 'lumiere', 1000, { cosPhi: RESISTIF, mots: ['par', 'halogène', 'projecteur', 'scène'] }),
    E('projecteur-halogene-500', 'Projecteur halogène 500 W', 'lumiere', 500, { cosPhi: RESISTIF, mots: ['halogène', 'projecteur', 'chantier'] }),
    E('caisson-lumineux', 'Caisson lumineux LED (par m²)', 'lumiere', 80, { mots: ['caisson', 'lightbox', 'rétroéclairé', 'textile', 'visuel'] }),

    // Vidéo
    E('ecran-32', 'Écran 32"', 'video', 50, { mots: ['tv', 'télé', 'télévision', 'moniteur', 'display', 'lcd'] }),
    E('ecran-43', 'Écran 43"', 'video', 100, { mots: ['tv', 'télé', 'télévision', 'moniteur', 'display', 'lcd'] }),
    E('ecran-55', 'Écran 55"', 'video', 150, { populaire: true, mots: ['tv', 'télé', 'télévision', 'moniteur', 'display', 'lcd'] }),
    E('ecran-65', 'Écran 65"', 'video', 200, { mots: ['tv', 'télé', 'télévision', 'moniteur', 'display', 'lcd'] }),
    E('ecran-75', 'Écran 75"', 'video', 300, { mots: ['tv', 'télé', 'télévision', 'moniteur', 'display', 'lcd'] }),
    E('ecran-86', 'Écran 86"', 'video', 400, { mots: ['tv', 'télé', 'télévision', 'moniteur', 'display', 'lcd'] }),
    E('ecran-tactile-65', 'Écran tactile interactif 65"', 'video', 300, { mots: ['tactile', 'interactif', 'tableau', 'touch', 'écran'] }),
    E('mur-led', 'Mur d’images LED (par m², puissance max)', 'video', 600, { mots: ['mur', 'led', 'wall', 'écran géant', 'dalles'] }),
    E('videoprojecteur-5000', 'Vidéoprojecteur 5 000 lm', 'video', 400, { mots: ['projecteur', 'vidéoprojecteur', 'beamer', 'projection'] }),
    E('videoprojecteur-10000', 'Vidéoprojecteur 10 000 lm', 'video', 800, { mots: ['projecteur', 'vidéoprojecteur', 'beamer', 'projection'] }),
    E('videoprojecteur-20000', 'Vidéoprojecteur 20 000 lm', 'video', 1800, { mots: ['projecteur', 'vidéoprojecteur', 'beamer', 'projection'] }),
    E('lecteur-multimedia', 'Lecteur multimédia', 'video', 20, { mots: ['player', 'lecteur', 'média', 'boîtier'] }),
    E('melangeur-video', 'Mélangeur vidéo', 'video', 100, { mots: ['régie', 'mélangeur', 'switcher'] }),
    E('camera-ptz', 'Caméra PTZ', 'video', 25, { mots: ['caméra', 'captation', 'streaming'] }),
    E('borne-tactile', 'Borne tactile (totem)', 'video', 250, { mots: ['borne', 'totem', 'kiosque', 'tactile', 'interactif'] }),

    // Son
    E('enceinte-amplifiee', 'Enceinte amplifiée', 'son', 400, { populaire: true, mots: ['enceinte', 'sono', 'haut-parleur', 'active', 'speaker'] }),
    E('caisson-basses', 'Caisson de basses amplifié', 'son', 800, { mots: ['sub', 'caisson', 'basses', 'sono'] }),
    E('enceinte-ambiance', 'Enceinte d’ambiance compacte', 'son', 50, { mots: ['enceinte', 'bluetooth', 'musique', 'ambiance'] }),
    E('console-mixage', 'Console de mixage', 'son', 100, { mots: ['table', 'mixage', 'console', 'régie', 'son'] }),
    E('recepteur-micro-hf', 'Récepteur micro HF', 'son', 15, { mots: ['micro', 'hf', 'sans fil', 'récepteur'] }),
    E('amplificateur', 'Amplificateur de puissance', 'son', 1000, { mots: ['ampli', 'amplificateur', 'sono'] }),

    // Informatique
    E('ordinateur-portable', 'Ordinateur portable', 'informatique', 65, { populaire: true, mots: ['pc', 'laptop', 'portable', 'macbook', 'ordi'] }),
    E('ordinateur-fixe', 'Ordinateur fixe avec écran', 'informatique', 250, { mots: ['pc', 'tour', 'desktop', 'unité centrale', 'ordi'] }),
    E('ecran-ordinateur', 'Écran d’ordinateur 24"', 'informatique', 30, { mots: ['moniteur', 'écran', 'pc'] }),
    E('imprimante-laser', 'Imprimante laser', 'informatique', 600, { mots: ['imprimante', 'printer', 'photocopieur', 'impression'] }),
    E('imprimante-badges', 'Imprimante de badges ou d’étiquettes', 'informatique', 80, { mots: ['imprimante', 'badge', 'étiquette', 'thermique'] }),
    E('box-internet', 'Box internet ou routeur 4G/5G', 'informatique', 20, { mots: ['box', 'routeur', 'wifi', 'internet', 'modem', '4g', '5g'] }),
    E('switch-reseau', 'Switch réseau', 'informatique', 30, { mots: ['switch', 'réseau', 'ethernet', 'commutateur'] }),
    E('point-acces-wifi', 'Point d’accès Wi-Fi', 'informatique', 15, { mots: ['wifi', 'borne', 'antenne', 'réseau'] }),
    E('tablette', 'Tablette (en charge)', 'informatique', 20, { mots: ['ipad', 'tablette', 'chargeur'] }),
    E('station-recharge', 'Station de recharge téléphones', 'informatique', 100, { mots: ['recharge', 'chargeur', 'téléphone', 'smartphone', 'casier'] }),
    E('terminal-paiement', 'Terminal de paiement (TPE)', 'informatique', 10, { mots: ['tpe', 'carte bancaire', 'paiement', 'cb'] }),
    E('caisse', 'Caisse enregistreuse', 'informatique', 80, { mots: ['caisse', 'encaissement', 'pos', 'tpv'] }),
    E('console-jeux', 'Console de jeux vidéo', 'informatique', 200, { mots: ['console', 'playstation', 'xbox', 'jeu', 'gaming'] }),
    E('poste-vr', 'Poste de réalité virtuelle (casque et PC)', 'informatique', 600, { mots: ['vr', 'réalité virtuelle', 'casque', 'simulateur'] }),

    // Catering
    E('machine-cafe', 'Machine à café (capsules ou automatique)', 'catering', 1500, { populaire: true, mots: ['café', 'cafetière', 'nespresso', 'expresso', 'capsules'] }),
    E('expresso-2-groupes', 'Machine à expresso professionnelle 2 groupes', 'catering', 3500, { mots: ['café', 'expresso', 'barista', 'percolateur', 'professionnelle'] }),
    E('percolateur', 'Percolateur', 'catering', 1500, { cosPhi: RESISTIF, mots: ['café', 'filtre', 'percolateur', 'thé'] }),
    E('bouilloire', 'Bouilloire', 'catering', 2000, { cosPhi: RESISTIF, populaire: true, mots: ['eau chaude', 'thé', 'bouilloire'] }),
    E('refrigerateur', 'Réfrigérateur', 'catering', 150, { populaire: true, mots: ['frigo', 'réfrigérateur', 'froid', 'frigidaire'] }),
    E('vitrine-refrigeree', 'Vitrine réfrigérée à boissons', 'catering', 400, { mots: ['frigo', 'vitrine', 'boissons', 'froid', 'canettes'] }),
    E('arriere-bar', 'Arrière-bar réfrigéré', 'catering', 300, { mots: ['frigo', 'bar', 'froid', 'arrière-bar'] }),
    E('congelateur', 'Congélateur', 'catering', 200, { mots: ['congélateur', 'surgelés', 'glaces', 'froid'] }),
    E('machine-glacons', 'Machine à glaçons', 'catering', 400, { mots: ['glaçons', 'glace', 'froid'] }),
    E('tireuse-biere', 'Tireuse à bière avec refroidisseur', 'catering', 500, { mots: ['bière', 'pression', 'tireuse', 'fût', 'bar'] }),
    E('micro-ondes', 'Four à micro-ondes', 'catering', 1200, { mots: ['micro-ondes', 'four', 'réchauffer'] }),
    E('induction-portable', 'Plaque à induction portable (1 foyer)', 'catering', 2000, { mots: ['plaque', 'induction', 'cuisson', 'réchaud'] }),
    E('induction-pro', 'Plaque à induction professionnelle (1 foyer)', 'catering', 3500, { mots: ['plaque', 'induction', 'cuisson', 'wok'] }),
    E('plancha', 'Plancha électrique', 'catering', 3000, { cosPhi: RESISTIF, mots: ['plancha', 'grill', 'snacking', 'cuisson'] }),
    E('crepiere', 'Crêpière électrique', 'catering', 3000, { cosPhi: RESISTIF, mots: ['crêpe', 'galette', 'billig'] }),
    E('gaufrier', 'Gaufrier', 'catering', 2000, { cosPhi: RESISTIF, mots: ['gaufre', 'gaufrier'] }),
    E('friteuse', 'Friteuse professionnelle (1 bac)', 'catering', 3500, { cosPhi: RESISTIF, mots: ['friteuse', 'frites', 'friture'] }),
    E('four-convection', 'Four à convection de comptoir', 'catering', 3000, { cosPhi: RESISTIF, mots: ['four', 'pizza', 'viennoiseries', 'chaleur tournante'] }),
    E('four-mixte', 'Four mixte 6 niveaux', 'catering', 11000, { tri: true, mots: ['four', 'mixte', 'combi', 'vapeur', 'cuisine'] }),
    E('lave-vaisselle', 'Lave-vaisselle ou lave-verres professionnel', 'catering', 3500, { mots: ['lave-vaisselle', 'lave-verres', 'plonge'] }),
    E('bain-marie', 'Bain-marie ou chauffe-plats', 'catering', 1200, { cosPhi: RESISTIF, mots: ['bain-marie', 'chauffe-plat', 'maintien', 'buffet'] }),
    E('toaster', 'Toaster professionnel', 'catering', 2000, { cosPhi: RESISTIF, mots: ['toaster', 'grille-pain', 'croque'] }),
    E('blender', 'Blender', 'catering', 1000, { mots: ['blender', 'mixeur', 'smoothie', 'cocktail'] }),
    E('fontaine-eau', 'Fontaine à eau réfrigérée', 'catering', 150, { mots: ['fontaine', 'eau', 'distributeur'] }),
    E('hotte', 'Hotte aspirante', 'catering', 300, { mots: ['hotte', 'extraction', 'aspiration'] }),
    E('machine-popcorn', 'Machine à popcorn', 'catering', 1500, { cosPhi: RESISTIF, mots: ['popcorn', 'pop-corn'] }),
    E('machine-barbe-a-papa', 'Machine à barbe à papa', 'catering', 1000, { cosPhi: RESISTIF, mots: ['barbe à papa', 'confiserie'] }),

    // Climatisation et chauffage
    E('climatiseur-mobile', 'Climatiseur mobile', 'climatisation', 1200, { populaire: true, mots: ['clim', 'climatisation', 'climatiseur', 'froid', 'rafraîchisseur'] }),
    E('radiateur-soufflant', 'Radiateur soufflant', 'climatisation', 2000, { cosPhi: RESISTIF, mots: ['chauffage', 'radiateur', 'soufflant', 'chauffage d’appoint'] }),
    E('chauffage-infrarouge', 'Chauffage infrarouge', 'climatisation', 2000, { cosPhi: RESISTIF, mots: ['chauffage', 'infrarouge', 'parasol chauffant', 'terrasse'] }),
    E('ventilateur', 'Ventilateur', 'climatisation', 50, { mots: ['ventilateur', 'brasseur'] }),
    E('ventilateur-brumisateur', 'Ventilateur brumisateur', 'climatisation', 200, { mots: ['brumisateur', 'brumisation', 'ventilateur', 'rafraîchir'] }),
    E('deshumidificateur', 'Déshumidificateur', 'climatisation', 400, { mots: ['déshumidificateur', 'humidité'] }),

    // Signalétique
    E('enseigne-led', 'Enseigne lumineuse LED', 'signaletique', 100, { populaire: true, mots: ['enseigne', 'logo', 'lettres', 'lumineuse', 'signalétique'] }),
    E('totem-lumineux', 'Totem lumineux LED', 'signaletique', 150, { mots: ['totem', 'kakémono', 'lumineux', 'signalétique'] }),
    E('neon-led', 'Néon LED flexible (par mètre)', 'signaletique', 10, { mots: ['néon', 'flex', 'led', 'mètre', 'logo'] }),

    // Accueil
    E('comptoir-eclaire', 'Comptoir d’accueil éclairé', 'accueil', 50, { mots: ['comptoir', 'banque', 'accueil', 'desk'] }),

    // Mobilier
    E('vitrine-exposition', 'Vitrine d’exposition éclairée', 'mobilier', 50, { mots: ['vitrine', 'présentoir', 'exposition'] }),
    E('plateau-tournant', 'Plateau tournant motorisé', 'mobilier', 30, { mots: ['plateau', 'tournant', 'présentoir', 'rotatif'] }),

    // Effets
    E('machine-fumee', 'Machine à fumée', 'effets', 1200, { mots: ['fumée', 'smoke', 'effet'] }),
    E('machine-brouillard', 'Machine à brouillard (hazer)', 'effets', 1000, { mots: ['brouillard', 'hazer', 'haze', 'effet'] }),
    E('machine-bulles', 'Machine à bulles', 'effets', 50, { mots: ['bulles', 'effet'] }),

    // Backline
    E('ampli-guitare', 'Ampli guitare ou basse', 'backline', 300, { mots: ['ampli', 'guitare', 'basse', 'musicien'] }),
    E('clavier', 'Clavier ou synthétiseur', 'backline', 50, { mots: ['clavier', 'piano', 'synthé', 'synthétiseur'] }),

    // Sanitaire
    E('chauffe-eau', 'Chauffe-eau électrique (ballon)', 'sanitaire', 2000, { cosPhi: RESISTIF, mots: ['ballon', 'eau chaude', 'cumulus', 'chauffe-eau'] }),
    E('seche-mains', 'Sèche-mains électrique', 'sanitaire', 1800, { mots: ['sèche-mains', 'toilettes', 'sanitaire'] }),

    // Sécurité
    E('camera-surveillance', 'Caméra de surveillance', 'securite', 10, { mots: ['caméra', 'vidéosurveillance', 'surveillance', 'ip'] }),
    E('enregistreur-video', 'Enregistreur vidéo (NVR)', 'securite', 50, { mots: ['enregistreur', 'nvr', 'vidéosurveillance'] }),

    // Sport
    E('tapis-course', 'Tapis de course', 'sport', 2000, { mots: ['tapis', 'course', 'running', 'fitness'] }),
    E('home-trainer', 'Home-trainer connecté avec écran', 'sport', 200, { mots: ['vélo', 'home-trainer', 'simulateur', 'fitness'] }),

    // Structure
    E('soufflerie', 'Soufflerie de structure gonflable', 'structure', 1100, { mots: ['gonflable', 'soufflerie', 'arche', 'tente', 'ventilateur'] }),

    // Divers
    E('aspirateur', 'Aspirateur', 'divers', 900, { mots: ['aspirateur', 'ménage', 'nettoyage'] }),
    E('borne-ve-7', 'Borne de recharge VE 7,4 kW (mono 32 A)', 'divers', 7400, { cosPhi: 1, mots: ['borne', 'recharge', 'voiture', 'électrique', 've', 'irve', 'wallbox'] }),
    E('borne-ve-11', 'Borne de recharge VE 11 kW (tri 16 A)', 'divers', 11000, { tri: true, cosPhi: 1, mots: ['borne', 'recharge', 'voiture', 'électrique', 've', 'irve', 'wallbox'] }),
    E('borne-ve-22', 'Borne de recharge VE 22 kW (tri 32 A)', 'divers', 22000, { tri: true, cosPhi: 1, mots: ['borne', 'recharge', 'voiture', 'électrique', 've', 'irve', 'wallbox'] }),
    E('recharge-velo', 'Recharge vélo ou trottinette électrique', 'divers', 200, { mots: ['vélo', 'trottinette', 'vae', 'recharge', 'batterie'] }),
  ]);

  const parId = Object.freeze(
    equipements.reduce((acc, e) => {
      acc[e.id] = e;
      return acc;
    }, {})
  );

  /** Ligne d'exemple tirée de la bibliothèque (valeur type, à confirmer). */
  function L(id, quantite, extra) {
    const e = parId[id];
    return Object.assign(
      { nom: e.nom, categorie: e.categorie, puissanceW: e.puissanceW, quantite, alimentation: e.alimentation, cosPhi: e.cosPhi, origine: 'type' },
      extra || {}
    );
  }

  // Exemples fictifs, pour découvrir l'outil.
  const exemples = Object.freeze([
    Object.freeze({
      id: 'stand-salon',
      titre: 'Stand de salon 36 m²',
      description: 'Éclairage, écrans, informatique et coin café.',
      projet: {
        info: { nom: 'Exemple : stand de salon 36 m²', evenement: 'Salon professionnel (exemple)', lieu: 'Hall 1', stand: 'B12', dateDebut: '2026-11-17', dateFin: '2026-11-19' },
        hypotheses: { heuresParJour: 10 },
        lignes: [
          L('spot-led-rail', 16),
          L('projecteur-led-100', 4),
          L('ruban-led', 12),
          L('caisson-lumineux', 6),
          L('ecran-55', 2),
          L('ecran-75', 1),
          L('ordinateur-portable', 3),
          L('box-internet', 1, { heuresParJour: 24 }),
          L('machine-cafe', 1, { foisonnement: 0.5, note: 'Exemple : chauffe par intermittence.' }),
          L('refrigerateur', 1, { heuresParJour: 24 }),
          L('vitrine-refrigeree', 1, { heuresParJour: 24 }),
          L('enseigne-led', 1),
          L('climatiseur-mobile', 1, { foisonnement: 0.8 }),
        ],
      },
    }),
    Object.freeze({
      id: 'bar-festival',
      titre: 'Bar de festival',
      description: 'Froid, cuisson, sonorisation et caisse : triphasé.',
      projet: {
        info: { nom: 'Exemple : bar de festival', evenement: 'Festival (exemple)', lieu: 'Zone restauration', stand: 'Bar 2', dateDebut: '2027-07-09', dateFin: '2027-07-11' },
        hypotheses: { heuresParJour: 12 },
        lignes: [
          L('tireuse-biere', 2),
          L('arriere-bar', 3, { heuresParJour: 24 }),
          L('machine-glacons', 1, { heuresParJour: 24 }),
          L('plancha', 2, { foisonnement: 0.8 }),
          L('friteuse', 1),
          L('chauffe-eau', 1, { heuresParJour: 6 }),
          L('guirlande-led', 4),
          L('projecteur-led-50', 4),
          L('enceinte-amplifiee', 2, { foisonnement: 0.5 }),
          L('terminal-paiement', 3),
          L('caisse', 1),
        ],
      },
    }),
  ]);

  return Object.freeze({ VERSION, equipements, parId, exemples });
});
