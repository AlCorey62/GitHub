/*
 * Calculateur d'Énergie Stand : moteur de calcul (Dark Side Energy).
 *
 * Fonctions pures, sans accès au DOM. Le même fichier sert dans le navigateur
 * (window.MoteurStand) et sous Node (require), où tests/moteur.test.js l'exerce.
 *
 * Unités : puissances actives en W, apparentes en VA, courants en A,
 * énergies en kWh, durées en h. Taux, foisonnements et cos φ sont des nombres
 * compris entre 0 et 1.
 */
(function (racine, fabrique) {
  'use strict';
  const moteur = fabrique();
  if (typeof module === 'object' && module && module.exports) module.exports = moteur;
  else racine.MoteurStand = moteur;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION_APP = '2.0.0';
  const FORMAT_ID = 'calculateur-energie-stand';
  const VERSION_FORMAT = 1;
  const RACINE3 = Math.sqrt(3);
  const PHASES = Object.freeze(['L1', 'L2', 'L3']);
  const EPS = 1e-9;

  /* ------------------------------------------------------------------ */
  /* Référentiels                                                        */
  /* ------------------------------------------------------------------ */

  // Clés des catégories de Darkside Power Plan 2, dans l'ordre d'affichage du stand.
  const CATEGORIES = Object.freeze({
    lumiere: 'Lumière',
    video: 'Vidéo',
    son: 'Son',
    informatique: 'Informatique',
    catering: 'Catering',
    climatisation: 'Climatisation et chauffage',
    signaletique: 'Signalétique',
    accueil: 'Accueil',
    mobilier: 'Mobilier',
    effets: 'Effets',
    backline: 'Backline',
    sanitaire: 'Sanitaire',
    securite: 'Sécurité',
    sport: 'Sport',
    structure: 'Structure',
    rigg: 'Rigg',
    divers: 'Divers',
  });
  const ORDRE_CATEGORIES = Object.freeze(Object.keys(CATEGORIES));

  function offre(id, phases, calibreA, prise) {
    return Object.freeze({ id, phases, calibreA, prise });
  }

  // Raccordements normalisés (prises CEI 60309, dites P17 : bleues en 230 V, rouges en 400 V).
  const OFFRES = Object.freeze([
    offre('mono16', 1, 16, 'P17 2P+T 16 A'),
    offre('mono32', 1, 32, 'P17 2P+T 32 A'),
    offre('mono63', 1, 63, 'P17 2P+T 63 A'),
    offre('tri16', 3, 16, 'P17 3P+N+T 16 A'),
    offre('tri32', 3, 32, 'P17 3P+N+T 32 A'),
    offre('tri63', 3, 63, 'P17 3P+N+T 63 A'),
    offre('tri125', 3, 125, 'P17 3P+N+T 125 A'),
  ]);
  const OFFRES_PAR_ID = Object.freeze(
    OFFRES.reduce((acc, o) => {
      acc[o.id] = o;
      return acc;
    }, {})
  );
  const OFFRES_PROPOSEES_DEFAUT = Object.freeze(['mono16', 'mono32', 'tri32', 'tri63', 'tri125']);

  const HYPOTHESES_DEFAUT = Object.freeze({
    tensionMonoV: 230,
    tensionTriV: 400,
    cosPhi: 0.85,
    tauxChargeMax: 0.8,
    desequilibreMax: 0.2,
    heuresParJour: null,
    jours: null,
    offresProposees: OFFRES_PROPOSEES_DEFAUT,
    raccordementImpose: null,
  });

  // Domaine de validité des hypothèses numériques.
  const BORNES_HYPOTHESES = Object.freeze({
    tensionMonoV: { min: 100, max: 300 },
    tensionTriV: { min: 100, max: 1000 },
    cosPhi: { min: 0, minExclu: true, max: 1 },
    tauxChargeMax: { min: 0, minExclu: true, max: 1 },
    desequilibreMax: { min: 0, minExclu: true, max: 1 },
    heuresParJour: { min: 0, max: 24, optionnel: true },
    jours: { min: 1, max: 366, entier: true, optionnel: true },
  });

  const LIMITES = Object.freeze({
    lignesMax: 2000,
    quantiteMax: 100000,
    puissanceMaxW: 10000000,
    calibreMaxA: 6300,
    nomMax: 200,
    noteMax: 2000,
    infoMax: 300,
    notesProjetMax: 5000,
    // Contrôles de vraisemblance (heuristiques de l'outil, pièges d'unités).
    vraisemblanceHauteW: 50000,
    vraisemblanceBasseW: 1,
    // Une prise standard (domestique ou P17 16 A) au-delà de laquelle un appareil demande mieux.
    priseStandardA: 16,
    // Au-delà, plus de prise P17 monophasée : le triphasé s'impose.
    monoMaxA: 63,
  });

  /* ------------------------------------------------------------------ */
  /* Outils                                                              */
  /* ------------------------------------------------------------------ */

  function nouvelId(prefixe) {
    const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    let brut;
    try {
      brut = c && typeof c.randomUUID === 'function' ? c.randomUUID().replace(/-/g, '').slice(0, 12) : null;
    } catch (e) {
      brut = null;
    }
    if (!brut) brut = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    return prefixe + '_' + brut;
  }

  function estNombre(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  function somme(liste, cle) {
    let s = 0;
    for (const x of liste) s += x[cle] || 0;
    return s;
  }

  function arrondir(n, decimales) {
    const f = Math.pow(10, decimales);
    return Math.round(n * f) / f;
  }

  function cloner(v) {
    return v == null ? v : JSON.parse(JSON.stringify(v));
  }

  const formateurs = new Map();
  /** Nombre au format français (virgule décimale, espace fine insécable pour les milliers). */
  function fmt(n, decimales = 1) {
    if (!estNombre(n)) return '';
    let f = formateurs.get(decimales);
    if (!f) {
      f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: decimales });
      formateurs.set(decimales, f);
    }
    // Évite l'affichage « -0 ».
    return f.format(Math.abs(n) < Math.pow(10, -decimales) / 2 ? 0 : n);
  }

  function pourcent(taux, decimales = 0) {
    return estNombre(taux) ? fmt(taux * 100, decimales) + '\u00a0%' : '';
  }

  function texteSimple(v, max) {
    if (v == null) return '';
    return String(v)
      .replace(/[\u0000-\u001F\u007F]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  function texteLong(v, max) {
    if (v == null) return '';
    return String(v)
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim()
      .slice(0, max);
  }

  function ordinal(n, singulier, pluriel) {
    return n + ' ' + (n > 1 ? pluriel : singulier);
  }

  /** « A », « B », « C » et 2 autres */
  function listeNoms(noms, max = 3) {
    const propres = noms.map((n) => '« ' + (n || 'Sans nom') + ' »');
    if (propres.length <= max) {
      if (propres.length <= 1) return propres.join('');
      return propres.slice(0, -1).join(', ') + ' et ' + propres[propres.length - 1];
    }
    const reste = propres.length - max;
    return propres.slice(0, max).join(', ') + ' et ' + ordinal(reste, 'autre', 'autres');
  }

  /* ------------------------------------------------------------------ */
  /* Lecture des saisies                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Lit un nombre saisi à la française ou à l'anglaise : « 1 500,5 », « 1500.5 »,
   * « 1.234,5 ». Renvoie NaN si la saisie n'est pas un nombre.
   */
  function analyserNombre(saisie) {
    if (typeof saisie === 'number') return Number.isFinite(saisie) ? saisie : NaN;
    if (saisie == null) return NaN;
    let s = String(saisie).trim().replace(/[\s\u00a0\u202f']/g, '').replace(/^\+/, '');
    if (!s) return NaN;
    const virgules = (s.match(/,/g) || []).length;
    const points = (s.match(/\./g) || []).length;
    if (virgules && points) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (virgules > 1) {
      return NaN;
    } else if (virgules === 1) {
      s = s.replace(',', '.');
    } else if (points > 1) {
      if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
      else return NaN;
    }
    if (!/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return NaN;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }

  /** Puissance en W : « 1500 », « 1 500 W », « 1,5 kW », « 2.2kw ». */
  function analyserPuissance(saisie) {
    if (typeof saisie === 'number') return Number.isFinite(saisie) ? saisie : NaN;
    if (saisie == null) return NaN;
    let s = String(saisie).trim().toLowerCase();
    let facteur = 1;
    if (/kw$/.test(s)) {
      facteur = 1000;
      s = s.slice(0, -2);
    } else if (/w$/.test(s)) {
      s = s.slice(0, -1);
    }
    const n = analyserNombre(s);
    return Number.isFinite(n) ? arrondir(n * facteur, 3) : NaN;
  }

  /**
   * Facteur entre 0 et 1 : « 0,8 », « 80 % », ou un entier de 2 à 100 compris comme
   * un pourcentage (« 80 » → 0,8). « 1,5 » reste 1,5 (donc refusé, jamais deviné).
   * La valeur relue est réaffichée à l'utilisateur : l'interprétation reste visible.
   */
  function analyserRatio(saisie) {
    if (typeof saisie === 'number') return Number.isFinite(saisie) ? saisie : NaN;
    if (saisie == null) return NaN;
    const s = String(saisie).trim();
    if (/%$/.test(s)) {
      const n = analyserNombre(s.slice(0, -1));
      return Number.isFinite(n) ? n / 100 : NaN;
    }
    const n = analyserNombre(s);
    if (!Number.isFinite(n)) return NaN;
    return n > 1 && n <= 100 && Number.isInteger(n) ? n / 100 : n;
  }

  function dansBornes(n, b) {
    if (!estNombre(n)) return false;
    if (b.entier && !Number.isInteger(n)) return false;
    if (b.minExclu ? n <= b.min : n < b.min) return false;
    return n <= b.max;
  }

  const BORNES_LIGNE = Object.freeze({
    puissanceW: { min: 0, max: LIMITES.puissanceMaxW },
    quantite: { min: 0, max: LIMITES.quantiteMax },
    foisonnement: { min: 0, minExclu: true, max: 1 },
    cosPhi: { min: 0, minExclu: true, max: 1 },
    heuresParJour: { min: 0, max: 24 },
  });

  /** Vrai si la valeur est admise pour ce champ de ligne. */
  function valeurLigneValide(champ, valeur) {
    const b = BORNES_LIGNE[champ];
    return !!b && dansBornes(valeur, b);
  }

  /** Vrai si la valeur est admise pour cette hypothèse (null accepté pour les hypothèses facultatives). */
  function valeurHypotheseValide(cle, valeur) {
    const b = BORNES_HYPOTHESES[cle];
    if (!b) return false;
    if (valeur == null) return !!b.optionnel;
    return dansBornes(valeur, b);
  }

  /** « 2026-06-12 » valide ? */
  function estDateISO(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [a, m, j] = s.split('-').map(Number);
    const d = new Date(Date.UTC(a, m - 1, j));
    return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
  }

  /** Nombre de jours d'exploitation, bornes incluses (du 12 au 14 : 3 jours). */
  function joursEntre(debut, fin) {
    if (!estDateISO(debut) || !estDateISO(fin)) return null;
    const [a1, m1, j1] = debut.split('-').map(Number);
    const [a2, m2, j2] = fin.split('-').map(Number);
    const n = Math.round((Date.UTC(a2, m2 - 1, j2) - Date.UTC(a1, m1 - 1, j1)) / 86400000) + 1;
    return n >= 1 && n <= 366 ? n : null;
  }

  /* ------------------------------------------------------------------ */
  /* Modèle : projets et lignes                                          */
  /* ------------------------------------------------------------------ */

  function hypothesesParDefaut() {
    const h = cloner(HYPOTHESES_DEFAUT);
    h.offresProposees = OFFRES_PROPOSEES_DEFAUT.slice();
    return h;
  }

  function infoVide() {
    return { nom: '', exposant: '', evenement: '', lieu: '', stand: '', dateDebut: '', dateFin: '', contact: '', notes: '' };
  }

  function creerProjet(nom) {
    const maintenant = new Date().toISOString();
    const info = infoVide();
    info.nom = texteSimple(nom, LIMITES.infoMax);
    return {
      id: nouvelId('p'),
      creeLe: maintenant,
      modifieLe: maintenant,
      info,
      hypotheses: hypothesesParDefaut(),
      lignes: [],
    };
  }

  function ligneVide() {
    return {
      id: nouvelId('l'),
      nom: '',
      categorie: 'divers',
      puissanceW: null,
      quantite: 1,
      foisonnement: 1,
      cosPhi: null,
      alimentation: 'mono',
      phase: 'auto',
      heuresParJour: null,
      origine: 'saisie',
      note: '',
    };
  }

  /** Crée une ligne valide à partir de valeurs partielles (les valeurs hors domaine sont écartées). */
  function creerLigne(partiel) {
    const { ligne } = normaliserLigneAvecRapport(Object.assign({}, partiel || {}), 1);
    return ligne || ligneVide();
  }

  function lireChampNombre(valeur, bornes, lecteur, signaler, defaut) {
    if (valeur == null || valeur === '') return defaut;
    const n = lecteur(valeur);
    if (dansBornes(n, bornes)) return n;
    signaler();
    return defaut;
  }

  function normaliserLigneAvecRapport(brut, rang) {
    const avertissements = [];
    if (!brut || typeof brut !== 'object' || Array.isArray(brut)) {
      return { ligne: null, avertissements: ['Ligne ' + rang + ' ignorée : format invalide.'] };
    }
    const l = ligneVide();
    if (typeof brut.id === 'string' && /^[\w-]{1,64}$/.test(brut.id)) l.id = brut.id;
    l.nom = texteSimple(brut.nom, LIMITES.nomMax);
    const ref = l.nom ? '« ' + l.nom + ' »' : 'Ligne ' + rang;
    const signaler = (msg) => avertissements.push(ref + ' : ' + msg);

    if (brut.categorie != null && brut.categorie !== '') {
      if (Object.prototype.hasOwnProperty.call(CATEGORIES, brut.categorie)) l.categorie = brut.categorie;
      else signaler('catégorie inconnue, classée en Divers.');
    }
    l.puissanceW = lireChampNombre(brut.puissanceW, BORNES_LIGNE.puissanceW, analyserPuissance, () => signaler('puissance invalide, à compléter.'), null);
    l.quantite = lireChampNombre(brut.quantite, BORNES_LIGNE.quantite, analyserNombre, () => signaler('quantité invalide, remplacée par 1.'), 1);
    l.foisonnement = lireChampNombre(brut.foisonnement, BORNES_LIGNE.foisonnement, analyserRatio, () => signaler('foisonnement hors de ]0 ; 1], remplacé par 1.'), 1);
    l.cosPhi = lireChampNombre(brut.cosPhi, BORNES_LIGNE.cosPhi, analyserRatio, () => signaler('cos φ hors de ]0 ; 1], hypothèse du projet appliquée.'), null);
    l.heuresParJour = lireChampNombre(brut.heuresParJour, BORNES_LIGNE.heuresParJour, analyserNombre, () => signaler('durée par jour hors de [0 ; 24] h, hypothèse du projet appliquée.'), null);

    if (brut.alimentation != null && brut.alimentation !== '') {
      if (brut.alimentation === 'mono' || brut.alimentation === 'tri') l.alimentation = brut.alimentation;
      else signaler('alimentation inconnue, monophasé retenu.');
    }
    if (l.alimentation === 'mono' && brut.phase != null && brut.phase !== '') {
      if (brut.phase === 'auto' || PHASES.includes(brut.phase)) l.phase = brut.phase;
      else signaler('phase inconnue, répartition automatique.');
    }
    if (brut.origine === 'type' || brut.origine === 'en_ligne' || brut.origine === 'saisie') l.origine = brut.origine;
    l.note = texteLong(brut.note, LIMITES.noteMax);
    return { ligne: l, avertissements };
  }

  function normaliserHypotheses(brut, avertissements) {
    const h = hypothesesParDefaut();
    if (!brut || typeof brut !== 'object') return h;
    for (const cle of Object.keys(BORNES_HYPOTHESES)) {
      if (!(cle in brut)) continue;
      const b = BORNES_HYPOTHESES[cle];
      const v = brut[cle];
      if (v == null || v === '') {
        if (!b.optionnel) avertissements.push('Hypothèse « ' + cle + ' » absente : valeur par défaut appliquée.');
        continue;
      }
      const n = cle === 'cosPhi' || cle === 'tauxChargeMax' || cle === 'desequilibreMax' ? analyserRatio(v) : analyserNombre(v);
      if (dansBornes(n, b)) h[cle] = n;
      else avertissements.push('Hypothèse « ' + cle + ' » hors domaine : valeur par défaut appliquée.');
    }
    if (Array.isArray(brut.offresProposees)) {
      const ids = brut.offresProposees.filter((id) => typeof id === 'string' && OFFRES_PAR_ID[id]);
      h.offresProposees = OFFRES.map((o) => o.id).filter((id) => ids.includes(id));
    }
    if (brut.raccordementImpose != null) {
      const r = brut.raccordementImpose;
      const calibre = r && analyserNombre(r.calibreA);
      if (r && (r.phases === 1 || r.phases === 3) && dansBornes(calibre, { min: 0, minExclu: true, max: LIMITES.calibreMaxA })) {
        h.raccordementImpose = { phases: r.phases, calibreA: calibre };
      } else {
        avertissements.push('Raccordement imposé invalide : ignoré.');
      }
    }
    return h;
  }

  /**
   * Valide et complète un projet lu (fichier, lien, stockage local).
   * Renvoie { projet, avertissements } ; lève une erreur si l'objet n'est pas un projet.
   */
  function normaliserProjet(brut) {
    if (!brut || typeof brut !== 'object' || Array.isArray(brut)) {
      throw new Error('Le contenu ne correspond pas à un bilan.');
    }
    const avertissements = [];
    const p = creerProjet('');
    if (typeof brut.id === 'string' && /^[\w-]{1,64}$/.test(brut.id)) p.id = brut.id;
    if (typeof brut.creeLe === 'string' && !isNaN(Date.parse(brut.creeLe))) p.creeLe = new Date(brut.creeLe).toISOString();
    if (typeof brut.modifieLe === 'string' && !isNaN(Date.parse(brut.modifieLe))) p.modifieLe = new Date(brut.modifieLe).toISOString();

    const info = brut.info && typeof brut.info === 'object' ? brut.info : {};
    for (const cle of Object.keys(p.info)) {
      if (cle === 'notes') p.info.notes = texteLong(info.notes, LIMITES.notesProjetMax);
      else if (cle === 'dateDebut' || cle === 'dateFin') {
        if (info[cle] && !estDateISO(info[cle])) avertissements.push('Date « ' + cle + ' » invalide : ignorée.');
        p.info[cle] = estDateISO(info[cle]) ? info[cle] : '';
      } else p.info[cle] = texteSimple(info[cle], LIMITES.infoMax);
    }
    p.hypotheses = normaliserHypotheses(brut.hypotheses, avertissements);

    if (brut.lignes != null && !Array.isArray(brut.lignes)) avertissements.push('Liste des équipements illisible : ignorée.');
    const brutes = Array.isArray(brut.lignes) ? brut.lignes : [];
    if (brutes.length > LIMITES.lignesMax) avertissements.push('Plus de ' + LIMITES.lignesMax + ' équipements : les suivants sont ignorés.');
    const ids = new Set();
    brutes.slice(0, LIMITES.lignesMax).forEach((b, i) => {
      const { ligne, avertissements: av } = normaliserLigneAvecRapport(b, i + 1);
      avertissements.push(...av);
      if (!ligne) return;
      if (ids.has(ligne.id)) ligne.id = nouvelId('l');
      ids.add(ligne.id);
      p.lignes.push(ligne);
    });
    return { projet: p, avertissements };
  }

  /** Copie indépendante d'un projet (nouveaux identifiants). */
  function dupliquerProjet(projet, suffixe = ' (copie)') {
    const copie = cloner(projet);
    const maintenant = new Date().toISOString();
    copie.id = nouvelId('p');
    copie.creeLe = maintenant;
    copie.modifieLe = maintenant;
    copie.info.nom = texteSimple((copie.info.nom || 'Bilan') + suffixe, LIMITES.infoMax);
    copie.lignes.forEach((l) => (l.id = nouvelId('l')));
    return copie;
  }

  function hypothesesEffectives(brutes) {
    const h = hypothesesParDefaut();
    if (!brutes || typeof brutes !== 'object') return h;
    for (const cle of Object.keys(BORNES_HYPOTHESES)) {
      if (cle in brutes && dansBornes(brutes[cle], BORNES_HYPOTHESES[cle])) h[cle] = brutes[cle];
    }
    if (Array.isArray(brutes.offresProposees)) h.offresProposees = brutes.offresProposees.filter((id) => OFFRES_PAR_ID[id]);
    const r = brutes.raccordementImpose;
    if (r && (r.phases === 1 || r.phases === 3) && dansBornes(r.calibreA, { min: 0, minExclu: true, max: LIMITES.calibreMaxA })) {
      h.raccordementImpose = { phases: r.phases, calibreA: r.calibreA };
    }
    return h;
  }

  /** Hypothèses dont la valeur diffère du défaut. */
  function hypothesesModifiees(h) {
    const d = hypothesesParDefaut();
    const cles = [];
    for (const cle of Object.keys(BORNES_HYPOTHESES)) if (h[cle] !== d[cle]) cles.push(cle);
    if (JSON.stringify(h.offresProposees) !== JSON.stringify(d.offresProposees)) cles.push('offresProposees');
    if (h.raccordementImpose) cles.push('raccordementImpose');
    return cles;
  }

  /* ------------------------------------------------------------------ */
  /* Calculs                                                             */
  /* ------------------------------------------------------------------ */

  function libelleRaccordement(r) {
    if (!r) return '';
    return fmt(r.calibreA, 1) + '\u00a0A ' + (r.phases === 1 ? 'mono' : 'tri');
  }

  function capaciteVA(r, h) {
    return r.phases === 1 ? h.tensionMonoV * r.calibreA : RACINE3 * h.tensionTriV * r.calibreA;
  }

  function calculerLigne(l, h) {
    const P = estNombre(l.puissanceW) && l.puissanceW >= 0 ? l.puissanceW : null;
    const q = estNombre(l.quantite) && l.quantite >= 0 ? l.quantite : 0;
    const ks = valeurLigneValide('foisonnement', l.foisonnement) ? l.foisonnement : 1;
    const cosPropre = valeurLigneValide('cosPhi', l.cosPhi);
    const cos = cosPropre ? l.cosPhi : h.cosPhi;
    const tri = l.alimentation === 'tri';
    const puissanceConnue = P != null && P > 0;
    const incluse = puissanceConnue && q > 0;
    const pInstW = incluse ? P * q : 0;
    const pFoisW = pInstW * ks;
    const sVA = pFoisW / cos;
    const diviseur = tri ? RACINE3 * h.tensionTriV : h.tensionMonoV;
    const heuresPropres = valeurLigneValide('heuresParJour', l.heuresParJour);
    const heures = heuresPropres ? l.heuresParJour : h.heuresParJour;
    return {
      id: l.id,
      nom: l.nom,
      categorie: Object.prototype.hasOwnProperty.call(CATEGORIES, l.categorie) ? l.categorie : 'divers',
      alimentation: tri ? 'tri' : 'mono',
      phase: tri ? null : PHASES.includes(l.phase) ? l.phase : 'auto',
      origine: l.origine || 'saisie',
      puissanceW: P,
      quantite: q,
      foisonnement: ks,
      cosPhi: cos,
      cosPhiDefaut: !cosPropre,
      heures: heures == null ? null : heures,
      heuresDefaut: !heuresPropres,
      puissanceConnue,
      incluse,
      pInstW,
      pFoisW,
      sVA,
      iA: sVA / diviseur,
      // Courant d'un appareil à pleine puissance (sans foisonnement) : choix de sa prise.
      iUnitaireA: puissanceConnue ? P / cos / diviseur : 0,
      eJourKWh: incluse && heures != null ? (pFoisW * heures) / 1000 : null,
      repartition: null,
    };
  }

  function phaseLaMoinsChargee(courant) {
    let choix = PHASES[0];
    for (const ph of PHASES) if (courant[ph] < courant[choix] - EPS) choix = ph;
    return choix;
  }

  /**
   * Scénario triphasé : charges triphasées réparties sur les trois phases, monophasées
   * sur leur phase imposée, puis monophasées « auto » placées appareil par appareil,
   * du plus puissant au moins puissant, sur la phase la moins chargée.
   */
  function scenarioTriphase(calc, h) {
    const courant = { L1: 0, L2: 0, L3: 0 };
    const actif = { L1: 0, L2: 0, L3: 0 };
    const apparent = { L1: 0, L2: 0, L3: 0 };
    const ajouter = (ph, i, p, s) => {
      courant[ph] += i;
      actif[ph] += p;
      apparent[ph] += s;
    };
    const incluses = calc.filter((c) => c.incluse);

    for (const c of incluses) {
      if (c.alimentation !== 'tri') continue;
      for (const ph of PHASES) ajouter(ph, c.iA, c.pFoisW / 3, c.sVA / 3);
      c.repartition = { mode: 'tri' };
    }
    for (const c of incluses) {
      if (c.alimentation !== 'mono' || c.phase === 'auto') continue;
      ajouter(c.phase, c.iA, c.pFoisW, c.sVA);
      c.repartition = { mode: 'fixe', L1: 0, L2: 0, L3: 0, [c.phase]: c.quantite };
    }
    const autos = incluses
      .filter((c) => c.alimentation === 'mono' && c.phase === 'auto')
      .map((c, rang) => ({ c, rang, sUnitaire: c.sVA / c.quantite }))
      .sort((a, b) => b.sUnitaire - a.sUnitaire || a.rang - b.rang);
    for (const { c } of autos) {
      const rep = { L1: 0, L2: 0, L3: 0 };
      const iU = c.iA / c.quantite;
      const pU = c.pFoisW / c.quantite;
      const sU = c.sVA / c.quantite;
      let reste = c.quantite;
      while (reste > EPS) {
        const part = Math.min(1, reste);
        const ph = phaseLaMoinsChargee(courant);
        ajouter(ph, iU * part, pU * part, sU * part);
        rep[ph] += part;
        reste -= part;
      }
      c.repartition = { mode: 'auto', L1: arrondir(rep.L1, 3), L2: arrondir(rep.L2, 3), L3: arrondir(rep.L3, 3) };
    }

    let iMaxA = 0;
    let phaseMax = null;
    let iMinA = Infinity;
    for (const ph of PHASES) {
      if (courant[ph] > iMaxA + EPS) {
        iMaxA = courant[ph];
        phaseMax = ph;
      }
      iMinA = Math.min(iMinA, courant[ph]);
    }
    const iMoyA = (courant.L1 + courant.L2 + courant.L3) / 3;
    return {
      phases: PHASES.map((ph) => ({ phase: ph, iA: courant[ph], pW: actif[ph], sVA: apparent[ph] })),
      iMaxA,
      phaseMax,
      iMinA,
      iMoyA,
      ecartA: iMaxA - iMinA,
      // Déséquilibre : écart maximal à la moyenne, rapporté à la moyenne.
      desequilibre: iMoyA > EPS ? (iMaxA - iMoyA) / iMoyA : 0,
    };
  }

  /** Scénario monophasé : tout sur une seule phase, impossible avec une charge triphasée. */
  function scenarioMonophase(calc, h) {
    const incluses = calc.filter((c) => c.incluse);
    const tri = incluses.filter((c) => c.alimentation === 'tri');
    const monos = incluses.filter((c) => c.alimentation === 'mono');
    const sVA = somme(monos, 'sVA');
    return {
      possible: tri.length === 0,
      lignesTri: tri.map((c) => c.id),
      iA: somme(monos, 'iA'),
      pW: somme(monos, 'pFoisW'),
      sVA,
    };
  }

  function statutCharge(taux, tauxMax) {
    if (taux <= tauxMax + EPS) return 'ok';
    if (taux <= 1 + EPS) return 'attention';
    return 'surcharge';
  }

  function evaluerRaccordement(r, mono, tri, h) {
    const base = {
      id: r.id || null,
      phases: r.phases,
      calibreA: r.calibreA,
      prise: r.prise || null,
      libelle: libelleRaccordement(r),
      capaciteVA: capaciteVA(r, h),
    };
    if (r.phases === 1 && !mono.possible) {
      return Object.assign(base, { possible: false, ibA: null, taux: null, statut: 'impossible' });
    }
    const ibA = r.phases === 1 ? mono.iA : tri.iMaxA;
    const taux = ibA / r.calibreA;
    return Object.assign(base, { possible: true, ibA, taux, statut: statutCharge(taux, h.tauxChargeMax) });
  }

  /** Plus petit raccordement proposé (par puissance disponible) dont le taux de charge reste dans l'objectif. */
  function recommander(mono, tri, h, totaux) {
    const proposees = h.offresProposees
      .map((id) => OFFRES_PAR_ID[id])
      .filter(Boolean)
      .sort((a, b) => capaciteVA(a, h) - capaciteVA(b, h));
    if (totaux.sVA <= EPS) return { motif: 'vide', evaluation: null };
    if (!proposees.length) return { motif: 'aucune_offre', evaluation: null };
    for (const o of proposees) {
      const e = evaluerRaccordement(o, mono, tri, h);
      if (e.statut === 'ok') return { motif: 'ok', evaluation: e };
    }
    if (!mono.possible && proposees.every((o) => o.phases === 1)) {
      return { motif: 'tri_requis', evaluation: null, phases: 3, ibA: tri.iMaxA, calibreMinA: tri.iMaxA / h.tauxChargeMax };
    }
    const toutMono = proposees.every((o) => o.phases === 1);
    const ibA = toutMono ? mono.iA : tri.iMaxA;
    return {
      motif: 'hors_gamme',
      evaluation: null,
      phases: toutMono ? 1 : 3,
      ibA,
      calibreMinA: ibA / h.tauxChargeMax,
    };
  }

  function construireVuePhases(retenu, mono, tri) {
    if (retenu && retenu.phases === 1 && retenu.possible) {
      return {
        type: 'mono',
        calibreA: retenu.calibreA,
        phases: [{ phase: 'L1', iA: mono.iA, pW: mono.pW, sVA: mono.sVA }],
        iMaxA: mono.iA,
        phaseMax: mono.iA > EPS ? 'L1' : null,
        desequilibre: null,
        ecartA: null,
      };
    }
    return {
      type: 'tri',
      calibreA: retenu ? retenu.calibreA : null,
      phases: tri.phases,
      iMaxA: tri.iMaxA,
      phaseMax: tri.phaseMax,
      desequilibre: tri.desequilibre,
      ecartA: tri.ecartA,
    };
  }

  function calculerEnergie(calc, h, info) {
    const incluses = calc.filter((c) => c.incluse);
    const avecHeures = incluses.filter((c) => c.heures != null);
    const sansHeures = incluses.filter((c) => c.heures == null);
    const eJourKWh = avecHeures.length ? somme(avecHeures, 'eJourKWh') : null;
    const joursDates = joursEntre(info.dateDebut, info.dateFin);
    const jours = h.jours != null ? h.jours : joursDates;
    return {
      eJourKWh,
      complete: incluses.length > 0 && sansHeures.length === 0,
      lignesSansHeures: sansHeures.map((c) => c.id),
      jours,
      joursSource: h.jours != null ? 'hypothese' : joursDates != null ? 'dates' : null,
      eTotaleKWh: eJourKWh != null && jours != null ? eJourKWh * jours : null,
    };
  }

  /** Puissance minimale d'une source autonome (groupe, batterie) qui alimenterait le stand seul. */
  function dimensionnerSource(retenu, mono, tri, h) {
    const monophase = !!(retenu && retenu.phases === 1 && retenu.possible);
    const iA = monophase ? mono.iA : tri.iMaxA;
    const sChargeVA = monophase ? h.tensionMonoV * iA : RACINE3 * h.tensionTriV * iA;
    return {
      phases: monophase ? 1 : 3,
      iDimensionnanteA: iA,
      sChargeVA,
      sMinVA: sChargeVA / h.tauxChargeMax,
      tauxChargeMax: h.tauxChargeMax,
    };
  }

  function repartirParCategorie(calc, pFoisTotaleW) {
    const parCle = new Map();
    for (const c of calc) {
      if (!c.incluse) continue;
      let g = parCle.get(c.categorie);
      if (!g) {
        g = { categorie: c.categorie, libelle: CATEGORIES[c.categorie], pFoisW: 0, pInstW: 0, nbAppareils: 0, nbLignes: 0 };
        parCle.set(c.categorie, g);
      }
      g.pFoisW += c.pFoisW;
      g.pInstW += c.pInstW;
      g.nbAppareils += c.quantite;
      g.nbLignes += 1;
    }
    return [...parCle.values()]
      .map((g) => Object.assign(g, { part: pFoisTotaleW > EPS ? g.pFoisW / pFoisTotaleW : 0 }))
      .sort((a, b) => b.pFoisW - a.pFoisW || ORDRE_CATEGORIES.indexOf(a.categorie) - ORDRE_CATEGORIES.indexOf(b.categorie));
  }

  /* ------------------------------------------------------------------ */
  /* Contrôles                                                           */
  /* ------------------------------------------------------------------ */

  const ORDRE_NIVEAUX = { erreur: 0, attention: 1, info: 2 };

  function controler(ctx) {
    const { calc, h, totaux, recommandation, retenu, vuePhases, energie, lignes } = ctx;
    const alertes = [];
    const ajouter = (niveau, code, message, ids) => alertes.push({ niveau, code, message, lignes: ids || [] });
    const noms = (liste) => listeNoms(liste.map((c) => c.nom));

    if (!lignes.length) {
      ajouter('info', 'VIDE', 'Aucun équipement : ajoutez les appareils du stand pour lancer le calcul.');
      return alertes;
    }

    const sansPuissance = calc.filter((c) => !c.puissanceConnue);
    if (sansPuissance.length) {
      ajouter(
        'attention',
        'PUISSANCE_A_COMPLETER',
        'Puissance à compléter pour ' + ordinal(sansPuissance.length, 'équipement', 'équipements') + ' : ' + noms(sansPuissance) + '.',
        sansPuissance.map((c) => c.id)
      );
    }

    const tropHaut = calc.filter((c) => c.puissanceConnue && c.puissanceW > LIMITES.vraisemblanceHauteW);
    if (tropHaut.length) {
      ajouter(
        'attention',
        'VRAISEMBLANCE_HAUTE',
        'Puissance unitaire supérieure à ' + fmt(LIMITES.vraisemblanceHauteW / 1000) + ' kW pour ' + noms(tropHaut) + ' : vérifier l’unité (la saisie est en W, « 2,5 kW » est accepté).',
        tropHaut.map((c) => c.id)
      );
    }
    const tropBas = calc.filter((c) => c.puissanceConnue && c.puissanceW < LIMITES.vraisemblanceBasseW);
    if (tropBas.length) {
      ajouter(
        'attention',
        'VRAISEMBLANCE_BASSE',
        'Puissance unitaire inférieure à 1 W pour ' + noms(tropBas) + ' : vérifier l’unité.',
        tropBas.map((c) => c.id)
      );
    }

    if (retenu && retenu.statut === 'impossible') {
      const tri = calc.filter((c) => c.incluse && c.alimentation === 'tri');
      ajouter(
        'erreur',
        'TRI_SUR_MONO',
        'Raccordement monophasé imposé alors que ' + ordinal(tri.length, 'équipement est triphasé', 'équipements sont triphasés') + ' : ' + noms(tri) + '. Prévoir un raccordement triphasé.',
        tri.map((c) => c.id)
      );
    } else if (retenu && retenu.statut === 'surcharge') {
      ajouter(
        'erreur',
        'SURCHARGE',
        'Raccordement ' + retenu.libelle + ' en surcharge : ' + fmt(retenu.ibA) + '\u00a0A appelés pour ' + fmt(retenu.calibreA) + '\u00a0A (' + pourcent(retenu.taux) + ').'
      );
    } else if (retenu && retenu.statut === 'attention') {
      ajouter(
        'attention',
        'CHARGE_ELEVEE',
        'Raccordement ' + retenu.libelle + ' chargé à ' + pourcent(retenu.taux) + ', au-delà de l’objectif de ' + pourcent(h.tauxChargeMax) + '.'
      );
    }
    if (retenu && retenu.possible && retenu.phases === 1 && retenu.ibA > LIMITES.monoMaxA + EPS) {
      ajouter('attention', 'MONO_SUP_63', 'Courant monophasé de ' + fmt(retenu.ibA) + '\u00a0A, au-delà de 63\u00a0A (plus grande prise P17 monophasée) : passer en triphasé.');
    }

    if (recommandation.motif === 'hors_gamme' && !h.raccordementImpose) {
      ajouter(
        'attention',
        'HORS_GAMME',
        'Besoin supérieur aux raccordements proposés : ' + fmt(recommandation.ibA) + '\u00a0A sur la phase la plus chargée, soit un calibre d’au moins ' + fmt(Math.ceil(recommandation.calibreMinA - EPS), 0) + '\u00a0A pour rester sous ' + pourcent(h.tauxChargeMax) + ' de charge. Étude spécifique Dark Side Energy à prévoir.'
      );
    }
    if (recommandation.motif === 'tri_requis' && !h.raccordementImpose) {
      ajouter('attention', 'TRI_REQUIS', 'Équipements triphasés présents alors que seuls des raccordements monophasés sont proposés : cocher au moins un raccordement triphasé dans les hypothèses.');
    }
    if (recommandation.motif === 'aucune_offre' && !h.raccordementImpose) {
      ajouter('attention', 'AUCUNE_OFFRE', 'Aucun raccordement proposé dans les hypothèses : cocher au moins un raccordement.');
    }

    if (vuePhases.type === 'tri' && retenu && retenu.possible && vuePhases.desequilibre > h.desequilibreMax + EPS) {
      const monos = calc.filter((c) => c.incluse && c.alimentation === 'mono');
      const fixes = monos.filter((c) => c.phase !== 'auto');
      let conseil;
      let concernees = fixes.map((c) => c.id);
      if (fixes.length) {
        conseil = 'Revoir les phases imposées (' + noms(fixes) + ') ou les passer en répartition automatique.';
      } else {
        const dominant = monos.reduce((m, c) => (!m || c.iUnitaireA * c.foisonnement > m.iUnitaireA * m.foisonnement ? c : m), null);
        if (dominant) concernees = [dominant.id];
        conseil = dominant
          ? 'La répartition automatique est déjà appliquée : l’écart vient surtout de « ' + (dominant.nom || 'Sans nom') + ' » (' + fmt(dominant.iUnitaireA * dominant.foisonnement) + '\u00a0A par appareil). Une version triphasée de cet équipement réduirait le déséquilibre.'
          : 'Répartir les équipements monophasés.';
      }
      ajouter(
        'attention',
        'DESEQUILIBRE',
        'Déséquilibre entre phases de ' + pourcent(vuePhases.desequilibre) + ' (seuil ' + pourcent(h.desequilibreMax) + ') : ' + fmt(vuePhases.ecartA) + '\u00a0A d’écart entre la phase la plus chargée et la moins chargée. ' + conseil,
        concernees
      );
    }

    const grosAppareils = calc.filter((c) => c.puissanceConnue && c.alimentation === 'mono' && c.iUnitaireA > LIMITES.priseStandardA + EPS);
    if (grosAppareils.length) {
      ajouter(
        'info',
        'PRISE_SUP_16A',
        ordinal(grosAppareils.length, 'équipement appelle', 'équipements appellent') + ' plus de 16\u00a0A à l’unité (' + noms(grosAppareils) + ') : prévoir une prise adaptée (32\u00a0A ou plus).',
        grosAppareils.map((c) => c.id)
      );
    }

    const types = calc.filter((c) => c.puissanceConnue && (c.origine === 'type' || c.origine === 'en_ligne'));
    if (types.length) {
      ajouter(
        'info',
        'VALEURS_TYPES',
        ordinal(types.length, 'puissance est une valeur type', 'puissances sont des valeurs types') + ' (bibliothèque) : à confirmer avec la plaque signalétique ou la fiche technique.',
        types.map((c) => c.id)
      );
    }

    const quantiteNulle = calc.filter((c) => c.puissanceConnue && c.quantite <= 0);
    if (quantiteNulle.length) {
      ajouter('info', 'QUANTITE_NULLE', ordinal(quantiteNulle.length, 'ligne à quantité 0 n’est pas comptée', 'lignes à quantité 0 ne sont pas comptées') + ' : ' + noms(quantiteNulle) + '.', quantiteNulle.map((c) => c.id));
    }

    if (totaux.nbLignesIncluses > 0 && energie.lignesSansHeures.length) {
      ajouter(
        'info',
        'HEURES_A_COMPLETER',
        energie.eJourKWh == null
          ? 'Durée d’utilisation par jour à renseigner (hypothèses du projet) pour estimer l’énergie consommée.'
          : 'Durée d’utilisation à renseigner pour ' + ordinal(energie.lignesSansHeures.length, 'équipement', 'équipements') + ' : énergie partielle.',
        energie.lignesSansHeures
      );
    } else if (totaux.nbLignesIncluses > 0 && energie.jours == null) {
      ajouter('info', 'JOURS_A_COMPLETER', 'Dates ou nombre de jours d’exploitation à renseigner pour l’énergie totale.');
    }

    return alertes.sort((a, b) => ORDRE_NIVEAUX[a.niveau] - ORDRE_NIVEAUX[b.niveau]);
  }

  /** Calcul complet d'un bilan. */
  function calculer(projet) {
    const h = hypothesesEffectives(projet && projet.hypotheses);
    const info = (projet && projet.info) || {};
    const lignes = projet && Array.isArray(projet.lignes) ? projet.lignes : [];
    const calc = lignes.map((l) => calculerLigne(l, h));
    const incluses = calc.filter((c) => c.incluse);

    const totaux = {
      pInstW: somme(incluses, 'pInstW'),
      pFoisW: somme(incluses, 'pFoisW'),
      sVA: somme(incluses, 'sVA'),
      nbLignes: lignes.length,
      nbLignesIncluses: incluses.length,
      nbAppareils: somme(incluses, 'quantite'),
    };
    totaux.cosPhiGlobal = totaux.sVA > EPS ? totaux.pFoisW / totaux.sVA : null;
    totaux.foisonnementGlobal = totaux.pInstW > EPS ? totaux.pFoisW / totaux.pInstW : null;

    const tri = scenarioTriphase(calc, h);
    const mono = scenarioMonophase(calc, h);
    const evaluations = OFFRES.map((o) => evaluerRaccordement(o, mono, tri, h));
    const recommandation = recommander(mono, tri, h, totaux);
    let retenu = null;
    if (h.raccordementImpose) retenu = Object.assign({ source: 'impose' }, evaluerRaccordement(h.raccordementImpose, mono, tri, h));
    else if (recommandation.evaluation) retenu = Object.assign({ source: 'recommande' }, recommandation.evaluation);
    // Suggestion quand le raccordement imposé ne suffit pas.
    const alternative = retenu && retenu.source === 'impose' && retenu.statut !== 'ok' && recommandation.evaluation ? recommandation.evaluation : null;

    const vuePhases = construireVuePhases(retenu, mono, tri);
    const energie = calculerEnergie(calc, h, info);
    const sourceAutonome = dimensionnerSource(retenu, mono, tri, h);
    const parCategorie = repartirParCategorie(calc, totaux.pFoisW);
    const alertes = controler({ calc, h, totaux, recommandation, retenu, vuePhases, energie, lignes });

    return {
      version: VERSION_APP,
      hypotheses: h,
      lignes: calc,
      parId: calc.reduce((acc, c) => ((acc[c.id] = c), acc), {}),
      totaux,
      scenarioTri: tri,
      scenarioMono: mono,
      evaluations,
      recommandation,
      retenu,
      alternative,
      vuePhases,
      energie,
      sourceAutonome,
      parCategorie,
      alertes,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Saisie rapide et recherche                                          */
  /* ------------------------------------------------------------------ */

  /**
   * « 12 spots LED 30 W » → { quantite: 12, puissanceW: 30, requete: "spots LED" }.
   * Quantité en tête (« 12 spots », « 3x écran ») ou en fin précédée de x (« spot x12 ») ;
   * puissance suivie de W ou kW. Un nombre seul en fin reste dans le nom (« écran 55 »).
   */
  function analyserSaisieRapide(saisie) {
    let reste = String(saisie == null ? '' : saisie).replace(/\s+/g, ' ').trim();
    let quantite = null;
    let puissanceW = null;

    const rePuissance = /(^|\s)(\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+(?:[.,]\d+)?)\s*(kw|w)(?=\s|$|[),;])/i;
    const mp = reste.match(rePuissance);
    if (mp) {
      const valeur = analyserNombre(mp[2]) * (mp[3].toLowerCase() === 'kw' ? 1000 : 1);
      if (Number.isFinite(valeur) && valeur > 0 && valeur <= LIMITES.puissanceMaxW) {
        puissanceW = arrondir(valeur, 3);
        reste = (reste.slice(0, mp.index) + ' ' + reste.slice(mp.index + mp[0].length)).replace(/\s+/g, ' ').trim();
      }
    }

    const lireQuantite = (texte) => {
      const n = analyserNombre(texte);
      return Number.isFinite(n) && n > 0 && n <= LIMITES.quantiteMax ? n : null;
    };
    let m = reste.match(/^(\d+(?:[.,]\d+)?)\s*(?:x|×|\*)\s*(\S.*)$/i) || reste.match(/^(\d+(?:[.,]\d+)?)\s+(\S.*)$/);
    if (m && lireQuantite(m[1]) != null) {
      quantite = lireQuantite(m[1]);
      reste = m[2].trim();
    } else {
      m = reste.match(/^(.*\S)\s+(?:x|×|\*)\s*(\d+(?:[.,]\d+)?)$/i);
      if (m && lireQuantite(m[2]) != null) {
        quantite = lireQuantite(m[2]);
        reste = m[1].trim();
      }
    }
    return { quantite, puissanceW, requete: reste };
  }

  const MOTS_VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'a', 'au', 'aux', 'en', 'pour', 'avec', 'sur', 'un', 'une', 'par', 'm', 'ml', 'm2']);

  function normaliserRecherche(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/œ/g, 'oe')
      .replace(/æ/g, 'ae')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function racineMot(mot) {
    return mot.length > 3 && /[sx]$/.test(mot) ? mot.slice(0, -1) : mot;
  }

  function jetonsRecherche(s) {
    return normaliserRecherche(s)
      .split(' ')
      .filter((m) => m && !MOTS_VIDES.has(m))
      .map(racineMot);
  }

  function comparerJeton(j, mot) {
    if (j === mot) return 3;
    if (mot.startsWith(j)) return 2;
    if (j.length >= 3 && mot.includes(j)) return 1;
    return 0;
  }

  const indexCatalogues = new WeakMap();
  function indexer(catalogue) {
    let index = indexCatalogues.get(catalogue);
    if (!index) {
      index = catalogue.map((item) => ({
        item,
        nom: jetonsRecherche(item.nom),
        cles: jetonsRecherche((item.motsCles || []).join(' ') + ' ' + (CATEGORIES[item.categorie] || '')),
      }));
      indexCatalogues.set(catalogue, index);
    }
    return index;
  }

  /** Recherche tolérante (accents, pluriels, débuts de mots) dans la bibliothèque. */
  function rechercherCatalogue(catalogue, requete, limite = 8) {
    const jetons = jetonsRecherche(requete);
    if (!jetons.length || !Array.isArray(catalogue)) return [];
    const resultats = [];
    for (const entree of indexer(catalogue)) {
      let score = 0;
      let trouves = 0;
      for (const j of jetons) {
        let meilleur = 0;
        for (const mot of entree.nom) meilleur = Math.max(meilleur, comparerJeton(j, mot) * 1.5);
        for (const mot of entree.cles) meilleur = Math.max(meilleur, comparerJeton(j, mot));
        if (meilleur > 0) {
          trouves += 1;
          score += meilleur;
        }
      }
      if (!trouves) continue;
      const couverture = trouves / jetons.length;
      if (couverture < 0.5) continue;
      if (entree.nom[0] && comparerJeton(jetons[0], entree.nom[0]) >= 2) score += 1;
      resultats.push({ item: entree.item, score, couverture });
    }
    resultats.sort((a, b) => b.couverture - a.couverture || b.score - a.score || a.item.nom.length - b.item.nom.length);
    return resultats.slice(0, limite).map((r) => r.item);
  }

  /* ------------------------------------------------------------------ */
  /* Import de tableaux (copier-coller Excel, CSV)                        */
  /* ------------------------------------------------------------------ */

  function detecterSeparateur(texte) {
    const lignes = texte.split('\n').filter((l) => l.trim());
    if (!lignes.length) return null;
    if (lignes.some((l) => l.includes('\t'))) return '\t';
    if (lignes.some((l) => l.includes(';'))) return ';';
    const virgules = lignes.map((l) => (l.match(/,/g) || []).length);
    if (lignes.length >= 2 && virgules[0] > 0 && virgules.every((n) => n === virgules[0])) return ',';
    return null;
  }

  /** Découpe un texte délimité (guillemets et retours à la ligne dans les cellules gérés). */
  function decouperTexteDelimite(texte, sep) {
    const lignes = [];
    let ligne = [];
    let cellule = '';
    let guillemets = false;
    let debutCellule = true;
    for (let i = 0; i < texte.length; i++) {
      const ch = texte[i];
      if (guillemets) {
        if (ch === '"') {
          if (texte[i + 1] === '"') {
            cellule += '"';
            i++;
          } else guillemets = false;
        } else cellule += ch;
        continue;
      }
      if (ch === '"' && debutCellule) {
        guillemets = true;
        debutCellule = false;
        continue;
      }
      if (sep && ch === sep) {
        ligne.push(cellule);
        cellule = '';
        debutCellule = true;
        continue;
      }
      if (ch === '\n') {
        ligne.push(cellule);
        lignes.push(ligne);
        ligne = [];
        cellule = '';
        debutCellule = true;
        continue;
      }
      cellule += ch;
      if (ch !== ' ') debutCellule = false;
    }
    ligne.push(cellule);
    lignes.push(ligne);
    return lignes.map((l) => l.map((c) => c.trim())).filter((l) => l.some((c) => c !== ''));
  }

  function analyserTableau(texte) {
    const propre = String(texte == null ? '' : texte).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const separateur = detecterSeparateur(propre);
    const lignes = decouperTexteDelimite(propre, separateur);
    const largeur = lignes.reduce((m, l) => Math.max(m, l.length), 0);
    return { separateur, lignes: lignes.map((l) => l.concat(Array(largeur - l.length).fill(''))), largeur };
  }

  const ROLES_COLONNES = Object.freeze({
    ignorer: 'Ignorer',
    nom: 'Désignation',
    puissance: 'Puissance unitaire (W)',
    puissance_kw: 'Puissance unitaire (kW)',
    quantite: 'Quantité',
    foisonnement: 'Foisonnement',
    cosphi: 'cos φ',
    alimentation: 'Mono / tri',
    phase: 'Phase',
    categorie: 'Catégorie',
    heures: 'Heures par jour',
    note: 'Note',
  });

  const MOTIFS_ENTETES = [
    ['ignorer', /total/],
    ['cosphi', /\bcos\b|cosphi|facteur de puissance/],
    ['puissance_kw', /(puissance|conso|p\b|pu\b).*\bkw\b|^kw$|\(kw\)/],
    ['puissance', /puissance|watt|conso|^p\b|^pu\b|\(w\)|^w$/],
    ['quantite', /^(qte|qty|nb|nbre|nombre|quantite|quantity|q)\b|quantite/],
    ['foisonnement', /foisonnement|simultaneite|^ks\b|^ku\b|coef/],
    ['alimentation', /alimentation|^alim|mono.*tri|^tension|^reseau|^phases$/],
    ['phase', /^phase$|^ph$/],
    ['heures', /heure|duree|h ?\/ ?j|^h$/],
    ['categorie', /categorie|famille|^type$|^lot$|^poste/],
    ['note', /note|remarque|comment|observation/],
    ['nom', /designation|^nom|equipement|appareil|materiel|libelle|description|article|produit|^item|^name/],
  ];

  function roleEntete(texte) {
    const n = normaliserRecherche(texte);
    if (!n) return null;
    for (const [role, motif] of MOTIFS_ENTETES) if (motif.test(n)) return role;
    return null;
  }

  /** Devine le rôle de chaque colonne ; l'utilisateur confirme dans l'aperçu. */
  function detecterColonnes(lignes) {
    if (!lignes.length) return { entete: false, roles: [] };
    const largeur = lignes[0].length;
    const premiere = lignes[0];
    const rolesEntete = premiere.map(roleEntete);
    const numeriques = premiere.filter((c) => c && Number.isFinite(analyserPuissance(c))).length;
    const entete = rolesEntete.filter((r) => r && r !== 'ignorer').length >= 1 && numeriques === 0;
    let roles;
    if (entete) {
      const vus = new Set();
      roles = rolesEntete.map((r) => {
        if (!r || r === 'ignorer' || vus.has(r)) return 'ignorer';
        vus.add(r);
        return r;
      });
    } else {
      roles = Array(largeur).fill('ignorer');
      const donnees = lignes.slice(0, 50);
      const estNum = (i) => donnees.filter((l) => l[i] !== '' && Number.isFinite(analyserPuissance(l[i]))).length;
      const remplies = (i) => donnees.filter((l) => l[i] !== '').length;
      const colsNum = [];
      let colNom = -1;
      for (let i = 0; i < largeur; i++) {
        if (!remplies(i)) continue;
        if (estNum(i) >= remplies(i) * 0.8) colsNum.push(i);
        else if (colNom < 0) colNom = i;
      }
      if (colNom >= 0) roles[colNom] = 'nom';
      const mediane = (i) => {
        const v = donnees.map((l) => analyserPuissance(l[i])).filter(Number.isFinite).sort((a, b) => a - b);
        return v.length ? v[Math.floor(v.length / 2)] : 0;
      };
      if (colsNum.length === 1) roles[colsNum[0]] = 'puissance';
      else if (colsNum.length >= 2) {
        const [a, b] = colsNum;
        if (mediane(a) >= mediane(b)) {
          roles[a] = 'puissance';
          roles[b] = 'quantite';
        } else {
          roles[a] = 'quantite';
          roles[b] = 'puissance';
        }
      }
    }
    return { entete, roles };
  }

  function lireCategorie(texte) {
    const n = normaliserRecherche(texte);
    if (!n) return null;
    for (const cle of ORDRE_CATEGORIES) {
      if (n === cle || n === normaliserRecherche(CATEGORIES[cle])) return cle;
    }
    for (const cle of ORDRE_CATEGORIES) {
      const lib = normaliserRecherche(CATEGORIES[cle]);
      if (lib.startsWith(n) || n.startsWith(cle)) return cle;
    }
    return null;
  }

  function lireAlimentation(texte) {
    const n = normaliserRecherche(texte);
    if (!n) return null;
    if (/tri|400|^3/.test(n)) return 'tri';
    if (/mono|230|^1/.test(n)) return 'mono';
    return null;
  }

  function lirePhase(texte) {
    const n = normaliserRecherche(texte).replace(/\s/g, '');
    const m = n.match(/^(?:l|ph|phase)?([123])$/);
    return m ? 'L' + m[1] : null;
  }

  /**
   * Convertit les lignes d'un tableau en lignes d'équipement selon les rôles des colonnes.
   * Renvoie { lignes, ignorees: [{ rang, raison }], avertissements }.
   */
  function convertirImport(lignesTableau, roles, entete) {
    const resultat = { lignes: [], ignorees: [], avertissements: [] };
    const donnees = entete ? lignesTableau.slice(1) : lignesTableau;
    const col = (role) => roles.indexOf(role);
    const valeur = (l, role) => (col(role) >= 0 ? l[col(role)] : '');
    donnees.forEach((l, i) => {
      const rang = i + 1 + (entete ? 1 : 0);
      const nom = texteSimple(valeur(l, 'nom'), LIMITES.nomMax);
      let puissance = NaN;
      if (col('puissance') >= 0 && valeur(l, 'puissance') !== '') puissance = analyserPuissance(valeur(l, 'puissance'));
      else if (col('puissance_kw') >= 0 && valeur(l, 'puissance_kw') !== '') puissance = analyserNombre(valeur(l, 'puissance_kw')) * 1000;
      if (!nom && !Number.isFinite(puissance)) {
        resultat.ignorees.push({ rang, raison: 'ni désignation ni puissance' });
        return;
      }
      const partiel = { nom: nom || 'Équipement ' + rang, origine: 'saisie' };
      if (Number.isFinite(puissance)) partiel.puissanceW = arrondir(puissance, 3);
      const q = valeur(l, 'quantite');
      if (q !== '') partiel.quantite = q;
      const ks = valeur(l, 'foisonnement');
      if (ks !== '') partiel.foisonnement = ks;
      const cos = valeur(l, 'cosphi');
      if (cos !== '') partiel.cosPhi = cos;
      const alim = lireAlimentation(valeur(l, 'alimentation'));
      if (alim) partiel.alimentation = alim;
      const ph = lirePhase(valeur(l, 'phase'));
      if (ph) partiel.phase = ph;
      const cat = lireCategorie(valeur(l, 'categorie'));
      if (cat) partiel.categorie = cat;
      const hj = valeur(l, 'heures');
      if (hj !== '') partiel.heuresParJour = hj;
      const note = valeur(l, 'note');
      if (note) partiel.note = note;
      const { ligne, avertissements } = normaliserLigneAvecRapport(partiel, rang);
      if (!ligne) {
        resultat.ignorees.push({ rang, raison: 'ligne illisible' });
        return;
      }
      avertissements.forEach((a) => resultat.avertissements.push('Ligne ' + rang + ', ' + a));
      resultat.lignes.push(ligne);
    });
    return resultat;
  }

  /* ------------------------------------------------------------------ */
  /* Exports                                                             */
  /* ------------------------------------------------------------------ */

  function celluleCSV(v) {
    const s = v == null ? '' : String(v);
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function nombreCSV(n, decimales) {
    if (!estNombre(n)) return '';
    return String(arrondir(n, decimales)).replace('.', ',');
  }

  /** Tableau des équipements au format CSV pour Excel (séparateur « ; », virgule décimale). */
  function exporterCSV(projet, resultat) {
    const r = resultat || calculer(projet);
    const entetes = [
      'Désignation', 'Catégorie', 'Puissance unitaire (W)', 'Quantité', 'Foisonnement', 'cos φ', 'Alimentation', 'Phase',
      'Puissance installée (W)', 'Puissance foisonnée (W)', 'Puissance apparente (VA)', 'Courant (A)',
      'Heures par jour', 'Énergie par jour (kWh)', 'Provenance de la puissance', 'Note',
    ];
    const provenance = { saisie: 'Saisie', type: 'Valeur type (bibliothèque)', en_ligne: 'Valeur type (base en ligne)' };
    const lignes = [entetes.map(celluleCSV).join(';')];
    for (const l of projet.lignes) {
      const c = r.parId[l.id];
      let phase = '';
      if (l.alimentation === 'tri') phase = 'L1-L2-L3';
      else if (c.repartition && c.repartition.mode !== 'tri') {
        phase = PHASES.filter((ph) => c.repartition[ph] > 0).map((ph) => ph + (l.phase === 'auto' ? ' x' + fmt(c.repartition[ph], 3).replace(/\u202f/g, '') : '')).join(' ');
      } else phase = l.phase === 'auto' ? 'Auto' : l.phase;
      lignes.push(
        [
          celluleCSV(l.nom),
          celluleCSV(CATEGORIES[l.categorie] || ''),
          nombreCSV(l.puissanceW, 3),
          nombreCSV(l.quantite, 3),
          nombreCSV(c.foisonnement, 3),
          nombreCSV(c.cosPhi, 3),
          l.alimentation === 'tri' ? 'Triphasé' : 'Monophasé',
          celluleCSV(phase),
          nombreCSV(c.pInstW, 1),
          nombreCSV(c.pFoisW, 1),
          nombreCSV(c.sVA, 1),
          nombreCSV(c.iA, 2),
          nombreCSV(c.heures, 2),
          nombreCSV(c.eJourKWh, 3),
          celluleCSV(provenance[l.origine] || ''),
          celluleCSV(l.note),
        ].join(';')
      );
    }
    return '\uFEFF' + lignes.join('\r\n') + '\r\n';
  }

  /**
   * Récapitulatif de plusieurs bilans (un stand par ligne), avec la somme brute des
   * puissances : aucun foisonnement entre stands n'est appliqué.
   */
  function exporterRecapCSV(projets) {
    const entetes = [
      'Bilan', 'Exposant', 'Événement', 'Lieu', 'Stand', 'Début', 'Fin', 'Lignes', 'Appareils',
      'Puissance installée (kW)', 'Puissance foisonnée (kW)', 'Puissance apparente (kVA)', 'Courant max (A)',
      'Raccordement', 'Origine du raccordement', 'Charge (%)', 'Énergie par jour (kWh)', 'Énergie totale (kWh)',
      'Erreurs', 'Points d\u2019attention', 'Modifié le',
    ];
    const lignes = [entetes.map(celluleCSV).join(';')];
    const total = { pInst: 0, pFois: 0, s: 0, eJour: 0, eTot: 0, appareils: 0, lignes: 0 };
    for (const p of projets) {
      const r = calculer(p);
      const t = r.totaux;
      const compte = (niveau) => r.alertes.filter((a) => a.niveau === niveau).length;
      total.pInst += t.pInstW;
      total.pFois += t.pFoisW;
      total.s += t.sVA;
      total.eJour += r.energie.eJourKWh || 0;
      total.eTot += r.energie.eTotaleKWh || 0;
      total.appareils += t.nbAppareils;
      total.lignes += t.nbLignes;
      lignes.push(
        [
          celluleCSV(p.info.nom || 'Sans nom'),
          celluleCSV(p.info.exposant),
          celluleCSV(p.info.evenement),
          celluleCSV(p.info.lieu),
          celluleCSV(p.info.stand),
          p.info.dateDebut || '',
          p.info.dateFin || '',
          t.nbLignes,
          nombreCSV(t.nbAppareils, 3),
          nombreCSV(t.pInstW / 1000, 3),
          nombreCSV(t.pFoisW / 1000, 3),
          nombreCSV(t.sVA / 1000, 3),
          nombreCSV(r.vuePhases.iMaxA, 2),
          celluleCSV(r.retenu ? r.retenu.libelle.replace(/\u00a0/g, ' ') : r.recommandation.motif === 'hors_gamme' ? 'Hors gamme : étude spécifique' : ''),
          r.retenu ? (r.retenu.source === 'impose' ? 'Imposé' : 'Recommandé') : '',
          r.retenu && r.retenu.taux != null ? nombreCSV(r.retenu.taux * 100, 1) : '',
          nombreCSV(r.energie.eJourKWh, 2),
          nombreCSV(r.energie.eTotaleKWh, 2),
          compte('erreur'),
          compte('attention'),
          (p.modifieLe || '').slice(0, 10),
        ].join(';')
      );
    }
    lignes.push(
      [
        celluleCSV('Somme brute (sans foisonnement entre stands)'), '', '', '', '', '', '',
        total.lignes, nombreCSV(total.appareils, 3), nombreCSV(total.pInst / 1000, 3), nombreCSV(total.pFois / 1000, 3),
        nombreCSV(total.s / 1000, 3), '', '', '', '', nombreCSV(total.eJour, 2), nombreCSV(total.eTot, 2), '', '', '',
      ].join(';')
    );
    return '\uFEFF' + lignes.join('\r\n') + '\r\n';
  }

  function enveloppe(contenu) {
    return Object.assign({ format: FORMAT_ID, version: VERSION_FORMAT, application: VERSION_APP, exporteLe: new Date().toISOString() }, contenu);
  }

  function serialiserProjet(projet) {
    return JSON.stringify(enveloppe({ projet }), null, 2);
  }

  function serialiserSauvegarde(projets) {
    return JSON.stringify(enveloppe({ projets }), null, 2);
  }

  /**
   * Lit un fichier exporté (un bilan ou une sauvegarde de plusieurs bilans).
   * Renvoie { projets: [...], avertissements: [...] } ; lève une erreur explicite sinon.
   */
  function lireFichier(texte) {
    let obj;
    try {
      obj = JSON.parse(String(texte).replace(/^\uFEFF/, ''));
    } catch (e) {
      throw new Error('Fichier illisible : ce n’est pas un fichier de bilan (JSON invalide).');
    }
    if (!obj || typeof obj !== 'object') throw new Error('Fichier illisible : contenu vide ou inattendu.');
    const avertissements = [];
    let bruts;
    if (obj.format === FORMAT_ID) {
      if (estNombre(obj.version) && obj.version > VERSION_FORMAT) {
        avertissements.push('Fichier créé par une version plus récente de l’outil : certaines informations peuvent être ignorées.');
      }
      if (Array.isArray(obj.projets)) bruts = obj.projets;
      else if (obj.projet) bruts = [obj.projet];
      else throw new Error('Fichier sans bilan.');
    } else if (Array.isArray(obj.lignes)) {
      avertissements.push('Format non identifié : le fichier a été lu comme un bilan.');
      bruts = [obj];
    } else {
      throw new Error('Ce fichier ne provient pas du Calculateur d’Énergie Stand.');
    }
    const projets = [];
    bruts.forEach((b, i) => {
      try {
        const { projet, avertissements: av } = normaliserProjet(b);
        projets.push(projet);
        const prefixe = bruts.length > 1 ? 'Bilan ' + (i + 1) + ' : ' : '';
        av.forEach((a) => avertissements.push(prefixe + a));
      } catch (e) {
        avertissements.push('Bilan ' + (i + 1) + ' ignoré : ' + e.message);
      }
    });
    if (!projets.length) throw new Error('Aucun bilan lisible dans ce fichier.');
    return { projets, avertissements };
  }

  /* ------------------------------------------------------------------ */
  /* Lien de partage (bilan compressé dans l'adresse)                    */
  /* ------------------------------------------------------------------ */

  function versBase64Url(octets) {
    let binaire = '';
    const pas = 0x8000;
    for (let i = 0; i < octets.length; i += pas) binaire += String.fromCharCode.apply(null, octets.subarray(i, i + pas));
    return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function depuisBase64Url(texte) {
    const b64 = texte.replace(/-/g, '+').replace(/_/g, '/');
    const binaire = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
    return octets;
  }

  async function transformerFlux(octets, flux) {
    const reponse = new Response(new Blob([octets]).stream().pipeThrough(flux));
    return new Uint8Array(await reponse.arrayBuffer());
  }

  let compressionTestee = null;
  function compressionDisponible() {
    if (compressionTestee === null) {
      try {
        compressionTestee =
          typeof CompressionStream === 'function' &&
          typeof DecompressionStream === 'function' &&
          typeof Response === 'function' &&
          typeof Blob === 'function' &&
          !!new CompressionStream('deflate-raw');
      } catch (e) {
        compressionTestee = false;
      }
    }
    return compressionTestee;
  }

  function projetPourPartage(projet) {
    const copie = cloner(projet);
    delete copie.id;
    delete copie.creeLe;
    delete copie.modifieLe;
    copie.lignes = copie.lignes.map((l) => {
      const c = Object.assign({}, l);
      delete c.id;
      for (const cle of Object.keys(c)) if (c[cle] === null || c[cle] === '') delete c[cle];
      return c;
    });
    return copie;
  }

  /** Code compact à placer après « #b= » dans l'adresse. */
  async function encoderPartage(projet) {
    const json = JSON.stringify({ f: FORMAT_ID, v: VERSION_FORMAT, p: projetPourPartage(projet) });
    const octets = new TextEncoder().encode(json);
    if (compressionDisponible()) return 'z' + versBase64Url(await transformerFlux(octets, new CompressionStream('deflate-raw')));
    return 'j' + versBase64Url(octets);
  }

  async function decoderPartage(code) {
    const texte = String(code || '').trim();
    let octets;
    try {
      if (texte[0] === 'z') {
        if (!compressionDisponible()) throw new Error('navigateur');
        octets = await transformerFlux(depuisBase64Url(texte.slice(1)), new DecompressionStream('deflate-raw'));
      } else if (texte[0] === 'j') {
        octets = depuisBase64Url(texte.slice(1));
      } else throw new Error('format');
    } catch (e) {
      if (e && e.message === 'navigateur') throw new Error('Ce navigateur ne sait pas lire les liens compressés : mettez-le à jour.');
      throw new Error('Lien de partage incomplet ou endommagé.');
    }
    let obj;
    try {
      obj = JSON.parse(new TextDecoder().decode(octets));
    } catch (e) {
      throw new Error('Lien de partage incomplet ou endommagé.');
    }
    if (!obj || obj.f !== FORMAT_ID || !obj.p) throw new Error('Ce lien ne contient pas de bilan.');
    const { projet, avertissements } = normaliserProjet(obj.p);
    if (estNombre(obj.v) && obj.v > VERSION_FORMAT) avertissements.unshift('Lien créé par une version plus récente de l’outil.');
    return { projet, avertissements };
  }

  return Object.freeze({
    VERSION_APP,
    FORMAT_ID,
    VERSION_FORMAT,
    PHASES,
    CATEGORIES,
    ORDRE_CATEGORIES,
    OFFRES,
    OFFRES_PAR_ID,
    OFFRES_PROPOSEES_DEFAUT,
    HYPOTHESES_DEFAUT,
    BORNES_HYPOTHESES,
    BORNES_LIGNE,
    LIMITES,
    ROLES_COLONNES,
    // Modèle
    nouvelId,
    creerProjet,
    creerLigne,
    ligneVide,
    normaliserProjet,
    normaliserLigne: (brut, rang = 1) => normaliserLigneAvecRapport(brut, rang),
    dupliquerProjet,
    hypothesesParDefaut,
    hypothesesEffectives,
    hypothesesModifiees,
    valeurLigneValide,
    valeurHypotheseValide,
    // Saisies
    analyserNombre,
    analyserPuissance,
    analyserRatio,
    estDateISO,
    joursEntre,
    // Calculs
    calculer,
    calculerLigne,
    evaluerRaccordement,
    libelleRaccordement,
    capaciteVA,
    statutCharge,
    // Recherche
    analyserSaisieRapide,
    normaliserRecherche,
    rechercherCatalogue,
    // Import / export
    analyserTableau,
    detecterColonnes,
    convertirImport,
    lireCategorie,
    exporterCSV,
    exporterRecapCSV,
    serialiserProjet,
    serialiserSauvegarde,
    lireFichier,
    encoderPartage,
    decoderPartage,
    compressionDisponible,
    // Formatage
    fmt,
    pourcent,
    listeNoms,
  });
});
