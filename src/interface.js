/*
 * Calculateur d'Énergie Stand : interface (Dark Side Energy).
 * S'appuie sur window.MoteurStand (calculs) et window.CatalogueStand (bibliothèque).
 */
(function () {
  'use strict';

  const M = window.MoteurStand;
  const C = window.CatalogueStand;
  if (!M || !C) {
    document.body.textContent = 'Erreur de chargement du calculateur.';
    return;
  }

  /* ================================================================== */
  /* Outils                                                              */
  /* ================================================================== */

  const NS = 'http://www.w3.org/2000/svg';
  const NBSP = '\u00a0';
  const $ = (sel, racine) => (racine || document).querySelector(sel);
  const $$ = (sel, racine) => Array.from((racine || document).querySelectorAll(sel));
  const fmt = M.fmt;
  const pourcent = M.pourcent;

  function h(tag, attrs, ...enfants) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const cle of Object.keys(attrs)) {
        const v = attrs[cle];
        if (v == null || v === false) continue;
        if (cle === 'class') el.className = v;
        else if (cle === 'text') el.textContent = v;
        else if (cle === 'dataset') {
          for (const k of Object.keys(v)) if (v[k] != null) el.dataset[k] = v[k];
        } else if (cle.startsWith('on') && typeof v === 'function') el.addEventListener(cle.slice(2), v);
        else if (cle === 'value') el.value = v;
        else if (cle === 'checked' || cle === 'disabled' || cle === 'hidden' || cle === 'selected') el[cle] = !!v;
        else el.setAttribute(cle, v === true ? '' : String(v));
      }
    }
    ajouterEnfants(el, enfants);
    return el;
  }

  function ajouterEnfants(el, enfants) {
    for (const e of enfants) {
      if (e == null || e === false) continue;
      if (Array.isArray(e)) ajouterEnfants(el, e);
      else el.append(e instanceof Node ? e : String(e));
    }
  }

  function svg(tag, attrs, ...enfants) {
    const el = document.createElementNS(NS, tag);
    for (const k of Object.keys(attrs || {})) el.setAttribute(k, String(attrs[k]));
    for (const e of enfants) if (e) el.append(e);
    return el;
  }

  function icone(nom, classe) {
    const s = svg('svg', { class: 'ic' + (classe ? ' ' + classe : ''), 'aria-hidden': 'true', focusable: 'false' });
    s.append(svg('use', { href: '#i-' + nom }));
    return s;
  }

  function vider(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function echapperCSS(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
  }

  function debounce(fn, ms) {
    let t = 0;
    const f = (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
    f.annuler = () => clearTimeout(t);
    return f;
  }

  function pluriel(n, singulier, plurielTexte) {
    return fmt(n, 2) + ' ' + (n >= 2 ? plurielTexte : singulier);
  }

  function majuscule(s) {
    const t = String(s || '').trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
  }

  const mouvementReduit = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const dansIframe = (() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  })();

  /* Formats d'affichage */

  function partsPuissance(w, unites) {
    const [petite, grande] = unites || ['W', 'kW'];
    if (w == null || !Number.isFinite(w)) return { texte: '–', valeur: null, unite: '', decimales: 0 };
    const a = Math.abs(w);
    if (a < 1000) {
      const d = a < 10 && a !== Math.round(a) ? 1 : 0;
      return { texte: fmt(w, d), valeur: w, unite: petite, decimales: d };
    }
    const k = w / 1000;
    const d = Math.abs(k) < 10 ? 2 : Math.abs(k) < 100 ? 1 : 0;
    return { texte: fmt(k, d), valeur: k, unite: grande, decimales: d };
  }
  function fmtPuissance(w) {
    const p = partsPuissance(w);
    return p.unite ? p.texte + NBSP + p.unite : p.texte;
  }
  function fmtApparente(va) {
    const p = partsPuissance(va, ['VA', 'kVA']);
    return p.unite ? p.texte + NBSP + p.unite : p.texte;
  }
  function fmtCourant(a) {
    if (a == null || !Number.isFinite(a)) return '–';
    return fmt(a, Math.abs(a) < 1 && a !== 0 ? 2 : 1) + NBSP + 'A';
  }
  function fmtEnergie(kwh) {
    if (kwh == null || !Number.isFinite(kwh)) return '–';
    return fmt(kwh, kwh < 10 ? 2 : kwh < 100 ? 1 : 0) + NBSP + 'kWh';
  }
  /** Valeur éditable : sans séparateur de milliers, virgule décimale. */
  function fmtSaisie(n) {
    if (n == null || !Number.isFinite(n)) return '';
    return String(Number(n.toFixed(6))).replace('.', ',');
  }
  const formatDateCourte = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatDateLongue = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  function dateLocale(iso) {
    const [a, m, j] = iso.split('-').map(Number);
    return new Date(a, m - 1, j, 12);
  }
  function fmtDate(iso) {
    return M.estDateISO(iso) ? formatDateCourte.format(dateLocale(iso)) : '';
  }
  function fmtPeriode(info) {
    const d1 = fmtDate(info.dateDebut);
    const d2 = fmtDate(info.dateFin);
    if (d1 && d2) return d1 === d2 ? d1 : d1 + ' → ' + d2;
    return d1 ? 'à partir du ' + d1 : d2 ? 'jusqu\u2019au ' + d2 : '';
  }
  function fmtRelatif(iso) {
    const t = Date.parse(iso);
    if (isNaN(t)) return '';
    const s = (Date.now() - t) / 1000;
    if (s < 45) return 'à l\u2019instant';
    if (s < 3600) return 'il y a ' + Math.max(1, Math.round(s / 60)) + ' min';
    if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h';
    if (s < 172800) return 'hier';
    return 'le ' + formatDateCourte.format(new Date(t));
  }
  function dateFichier() {
    const d = new Date();
    const z = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  }
  function nomFichier(base, suffixe) {
    const propre = String(base || 'Bilan')
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\.+/, '')
      .slice(0, 120);
    return (propre || 'Bilan') + suffixe;
  }

  const LIBELLES_PROVENANCE = {
    saisie: 'Saisie (donnée confirmée)',
    type: 'Valeur type de la bibliothèque, à confirmer',
    en_ligne: 'Valeur type de la base en ligne, à confirmer',
  };
  const LIBELLES_NIVEAU = { erreur: 'Non conforme', attention: 'À vérifier', info: 'Information' };
  const ICONES_NIVEAU = { erreur: 'erreur', attention: 'alerte', info: 'info' };

  function telecharger(nom, contenu, type) {
    const blob = contenu instanceof Blob ? contenu : new Blob([contenu], { type });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: nom, hidden: true });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function copierTexte(texte) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texte);
        return true;
      }
    } catch (e) {
      /* repli ci-dessous */
    }
    try {
      const zone = h('textarea', { style: 'position:fixed;top:0;left:0;opacity:0', 'aria-hidden': 'true' });
      zone.value = texte;
      document.body.append(zone);
      zone.select();
      const ok = document.execCommand('copy');
      zone.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  /* ================================================================== */
  /* Stockage local                                                      */
  /* ================================================================== */

  const PREFIXE = 'calculateur-energie-stand/';

  // Repli quand le stockage local est bloqué : les bilans restent disponibles pendant la session.
  const memoireSession = new Map();
  const zoneMemoire = {
    getItem: (k) => (memoireSession.has(k) ? memoireSession.get(k) : null),
    setItem: (k, v) => memoireSession.set(k, String(v)),
    removeItem: (k) => memoireSession.delete(k),
    cles: () => Array.from(memoireSession.keys()),
  };
  const zoneLocale = {
    getItem: (k) => window.localStorage.getItem(k),
    setItem: (k, v) => window.localStorage.setItem(k, v),
    removeItem: (k) => window.localStorage.removeItem(k),
    cles: () => {
      const cles = [];
      for (let i = 0; i < window.localStorage.length; i++) cles.push(window.localStorage.key(i));
      return cles;
    },
  };

  const Stockage = {
    ok: false,
    zone: zoneMemoire,
    init() {
      try {
        const cle = PREFIXE + 'essai';
        window.localStorage.setItem(cle, '1');
        window.localStorage.removeItem(cle);
        this.ok = true;
        this.zone = zoneLocale;
      } catch (e) {
        this.ok = false;
        this.zone = zoneMemoire;
      }
      return this.ok;
    },
    cle(id) {
      return PREFIXE + 'bilan/' + id;
    },
    lireTous() {
      const projets = [];
      let illisibles = 0;
      let cles;
      try {
        cles = this.zone.cles().filter((k) => k && k.startsWith(PREFIXE + 'bilan/'));
      } catch (e) {
        return { projets, illisibles };
      }
      for (const k of cles) {
        let brut = null;
        try {
          brut = this.zone.getItem(k);
          const { projet } = M.normaliserProjet(JSON.parse(brut));
          projet.id = k.slice((PREFIXE + 'bilan/').length) || projet.id;
          projets.push(projet);
        } catch (e) {
          // Bilan illisible : mis de côté (jamais effacé), pour ne pas bloquer l'outil.
          illisibles += 1;
          try {
            this.zone.setItem(PREFIXE + 'illisible/' + Date.now() + '-' + k.slice(-14), brut == null ? '' : brut);
            this.zone.removeItem(k);
          } catch (e2) {
            /* stockage plein : on laisse en place */
          }
        }
      }
      projets.sort((a, b) => String(b.modifieLe).localeCompare(String(a.modifieLe)));
      return { projets, illisibles };
    },
    lire(id) {
      try {
        const brut = this.zone.getItem(this.cle(id));
        return brut ? M.normaliserProjet(JSON.parse(brut)).projet : null;
      } catch (e) {
        return null;
      }
    },
    existe(id) {
      try {
        return this.zone.getItem(this.cle(id)) != null;
      } catch (e) {
        return false;
      }
    },
    ecrire(projet) {
      try {
        this.zone.setItem(this.cle(projet.id), JSON.stringify(projet));
        return true;
      } catch (e) {
        return false;
      }
    },
    supprimer(id) {
      try {
        this.zone.removeItem(this.cle(id));
      } catch (e) {
        /* rien */
      }
    },
    lirePrefs() {
      try {
        const p = JSON.parse(this.zone.getItem(PREFIXE + 'preferences') || '{}');
        return p && typeof p === 'object' ? p : {};
      } catch (e) {
        return {};
      }
    },
    ecrirePrefs(p) {
      try {
        this.zone.setItem(PREFIXE + 'preferences', JSON.stringify(p));
      } catch (e) {
        /* rien */
      }
    },
  };

  /* ================================================================== */
  /* État, historique, sauvegarde                                        */
  /* ================================================================== */

  const etat = {
    projet: null,
    resultat: null,
    ligneOuverte: null,
    groupesReplies: new Set(),
    erreurEnregistrementSignalee: false,
  };
  let prefs = { theme: 'sombre', rechercheEnLigne: true, dernierBilan: null };
  const historique = { passe: [], futur: [], fusion: null, heure: 0 };

  function memoriser(fusion) {
    const t = Date.now();
    if (fusion && historique.fusion === fusion && t - historique.heure < 1500) {
      historique.heure = t;
      return;
    }
    historique.passe.push(JSON.stringify(etat.projet));
    if (historique.passe.length > 150) historique.passe.shift();
    historique.futur.length = 0;
    historique.fusion = fusion || null;
    historique.heure = t;
  }

  /**
   * Point d'entrée unique des modifications : historique, horodatage, recalcul,
   * sauvegarde différée, rendu. rendu : 'tout' | 'lignes' | 'calculs' | 'resultats'.
   */
  function modifier(mutation, options) {
    const o = options || {};
    if (o.historique !== false) memoriser(o.fusion);
    mutation(etat.projet);
    etat.projet.modifieLe = new Date().toISOString();
    recalculer();
    planifierSauvegarde();
    rendre(o.rendu || 'tout');
  }

  function recalculer() {
    etat.resultat = M.calculer(etat.projet);
  }

  function rendre(niveau) {
    if (niveau === 'tout') {
      rendreProjet();
      rendreLignes();
    } else if (niveau === 'lignes') rendreLignes();
    // Les cellules calculées dépendent aussi du raccordement et des hypothèses :
    // mises à jour à chaque rendu (seules les lignes modifiées touchent au DOM).
    else majCalculsLignes();
    rendreResultats();
    majBoutonsHistorique();
  }

  function restaurer(json) {
    const p = JSON.parse(json);
    p.modifieLe = new Date().toISOString();
    etat.projet = p;
    historique.fusion = null;
    if (etat.ligneOuverte && !p.lignes.some((l) => l.id === etat.ligneOuverte)) etat.ligneOuverte = null;
    recalculer();
    planifierSauvegarde();
    rendre('tout');
  }

  function annuler() {
    if (!historique.passe.length) return;
    historique.futur.push(JSON.stringify(etat.projet));
    restaurer(historique.passe.pop());
    annoncer('Modification annulée.');
  }

  function retablir() {
    if (!historique.futur.length) return;
    historique.passe.push(JSON.stringify(etat.projet));
    restaurer(historique.futur.pop());
    annoncer('Modification rétablie.');
  }

  function majBoutonsHistorique() {
    $('#btn-annuler').disabled = !historique.passe.length;
    $('#btn-retablir').disabled = !historique.futur.length;
  }

  let minuteurSauvegarde = 0;
  function planifierSauvegarde() {
    clearTimeout(minuteurSauvegarde);
    minuteurSauvegarde = setTimeout(sauvegarderMaintenant, 350);
  }

  function sauvegarderMaintenant() {
    clearTimeout(minuteurSauvegarde);
    minuteurSauvegarde = 0;
    if (!etat.projet) return;
    const ok = Stockage.ecrire(etat.projet);
    majEtatSauvegarde(!Stockage.ok ? 'indisponible' : ok ? 'ok' : 'erreur');
    if (!ok && !etat.erreurEnregistrementSignalee) {
      etat.erreurEnregistrementSignalee = true;
      toast('Enregistrement impossible : le stockage du navigateur est plein ou bloqué. Enregistrez le fichier du bilan pour le conserver.', {
        type: 'erreur',
        duree: 10000,
        action: { libelle: 'Enregistrer', fn: exporterJSON },
      });
    }
  }

  function majEtatSauvegarde(statut) {
    const el = $('#etat-sauvegarde');
    el.className = 'entete-etat ' + statut;
    vider(el);
    el.removeAttribute('title');
    if (statut === 'ok') {
      el.append(icone('valide'), h('span', { class: 'lib', text: 'Enregistré' }));
      el.title = 'Enregistré dans ce navigateur à ' + new Date().toLocaleTimeString('fr-FR');
    }
    else if (statut === 'erreur') el.append(icone('alerte'), h('span', { class: 'lib', text: 'Non enregistré' }));
    else if (statut === 'indisponible') {
      el.append(icone('alerte'), h('span', { class: 'lib', text: 'Enregistrement local indisponible' }));
      el.title = 'Les bilans sont gardés pendant cette session seulement : enregistrez leurs fichiers pour les conserver.';
    }
  }

  function ouvrirProjet(projet) {
    if (etat.projet && (minuteurSauvegarde || (!Stockage.ok && !projetVierge(etat.projet)))) sauvegarderMaintenant();
    etat.projet = projet;
    etat.ligneOuverte = null;
    historique.passe = [];
    historique.futur = [];
    historique.fusion = null;
    recalculer();
    rendre('tout');
    prefs.dernierBilan = projet.id;
    Stockage.ecrirePrefs(prefs);
    majEtatSauvegarde(Stockage.ok ? (Stockage.existe(projet.id) ? 'ok' : 'aucun') : 'indisponible');
  }

  function projetVierge(p) {
    return !p.lignes.length && !p.info.nom && !p.info.exposant && !p.info.evenement;
  }

  function nouveauBilan() {
    fermerDialogues();
    ouvrirProjet(M.creerProjet(''));
    $('#projet-nom').focus();
    toast('Nouveau bilan : nommez-le puis ajoutez les équipements.', { type: 'ok' });
  }

  function dupliquerBilanCourant() {
    const copie = M.dupliquerProjet(etat.projet);
    ouvrirProjet(copie);
    sauvegarderMaintenant();
    toast('Bilan dupliqué : vous travaillez maintenant sur la copie.', { type: 'ok' });
  }

  function chargerExemple(id) {
    const ex = C.exemples.find((e) => e.id === id);
    if (!ex) return;
    const { projet } = M.normaliserProjet(JSON.parse(JSON.stringify(ex.projet)));
    fermerDialogues();
    ouvrirProjet(projet);
    sauvegarderMaintenant();
    toast('Exemple chargé : « ' + ex.titre + ' ». Données fictives, puissances indicatives.', { type: 'ok', duree: 5000 });
  }

  /* ================================================================== */
  /* Notifications et annonces                                           */
  /* ================================================================== */

  /**
   * Les notifications suivent la dernière fenêtre modale ouverte : sinon, le fond inerte
   * d'une fenêtre (Mes bilans…) rendrait leur bouton « Annuler » inaccessible.
   */
  function placerToasts() {
    const ouverts = $$('dialog[open]');
    const hote = ouverts.length ? ouverts[ouverts.length - 1] : document.body;
    const conteneur = $('#toasts');
    if (conteneur.parentElement !== hote) hote.append(conteneur);
  }

  function toast(message, options) {
    const o = options || {};
    placerToasts();
    const conteneur = $('#toasts');
    if (o.cle) {
      const ancien = conteneur.querySelector('[data-cle="' + o.cle + '"]');
      if (ancien) ancien.remove();
    }
    // Une seule action « Annuler » proposée à la fois : la plus récente.
    if (o.action) for (const ancien of $$('.toast[data-avec-action]', conteneur)) ancien.remove();
    while (conteneur.children.length >= 3) conteneur.firstElementChild.remove();
    const type = o.type || 'info';
    const el = h(
      'div',
      { class: 'toast ' + type, role: type === 'erreur' ? 'alert' : 'status', dataset: { cle: o.cle || null, avecAction: o.action ? '1' : null } },
      icone(type === 'ok' ? 'valide' : ICONES_NIVEAU[type] || 'info'),
      h('div', { class: 'toast-texte', text: message })
    );
    let minuteur = 0;
    const fermer = () => {
      clearTimeout(minuteur);
      el.classList.add('sortie');
      setTimeout(() => el.remove(), 210);
    };
    if (o.action) {
      el.append(
        h('button', {
          type: 'button',
          class: 'toast-action',
          text: o.action.libelle,
          onclick: () => {
            fermer();
            o.action.fn();
          },
        })
      );
    }
    el.append(h('button', { type: 'button', class: 'btn-icone petit', 'aria-label': 'Fermer la notification', onclick: fermer }, icone('x')));
    conteneur.append(el);
    const duree = o.duree || (o.action ? 6500 : 4000);
    const lancer = () => {
      clearTimeout(minuteur);
      minuteur = setTimeout(fermer, duree);
    };
    el.addEventListener('mouseenter', () => clearTimeout(minuteur));
    el.addEventListener('mouseleave', lancer);
    el.addEventListener('focusin', () => clearTimeout(minuteur));
    lancer();
    return el;
  }

  function annoncer(texte) {
    const zone = $('#annonce');
    zone.textContent = '';
    setTimeout(() => (zone.textContent = texte), 30);
  }

  const annoncerResultats = debounce(() => {
    const r = etat.resultat;
    if (!r || !r.totaux.nbLignesIncluses) return;
    let texte = 'Puissance appelée ' + fmtPuissance(r.totaux.pFoisW) + '.';
    if (r.retenu && r.retenu.possible) texte += ' Raccordement ' + r.retenu.libelle + ', charge ' + pourcent(r.retenu.taux) + '.';
    annoncer(texte);
  }, 1800);

  /* ================================================================== */
  /* Rendu : projet                                                      */
  /* ================================================================== */

  function rendreProjet() {
    const info = etat.projet.info;
    const nom = $('#projet-nom');
    if (document.activeElement !== nom) nom.value = info.nom;
    for (const champ of $$('[data-info]')) {
      if (document.activeElement !== champ) champ.value = info[champ.dataset.info] || '';
    }
    rendreResumeProjet();
  }

  function rendreResumeProjet() {
    const info = etat.projet.info;
    const el = $('#projet-resume');
    vider(el);
    const items = [info.exposant, info.evenement, info.lieu, info.stand ? 'Stand ' + info.stand : ''].filter(Boolean);
    for (const t of items) el.append(h('span', { class: 'item', text: t }));
    const periode = fmtPeriode(info);
    if (periode) {
      const jours = M.joursEntre(info.dateDebut, info.dateFin);
      el.append(h('span', { class: 'item' }, icone('calendrier'), periode + (jours ? ' (' + pluriel(jours, 'jour', 'jours') + ')' : '')));
    }
    if (!el.childNodes.length) el.append(h('span', { class: 'manquant', text: 'Exposant, événement, lieu, dates d\u2019exploitation…' }));
    document.title = (info.nom ? info.nom + ' · ' : '') + 'Calculateur d\u2019Énergie Stand';
  }

  /* ================================================================== */
  /* Rendu : équipements                                                 */
  /* ================================================================== */

  function memoriserFocus() {
    const a = document.activeElement;
    if (!a || !a.closest || !a.closest('#table-lignes')) return null;
    const conteneur = a.closest('[data-id]');
    if (!conteneur || (!a.dataset.champ && !a.dataset.action)) return null;
    let debut = null;
    let fin = null;
    try {
      debut = a.selectionStart;
      fin = a.selectionEnd;
    } catch (e) {
      /* sans sélection */
    }
    return { id: conteneur.dataset.id, details: conteneur.classList.contains('ligne-details'), champ: a.dataset.champ, action: a.dataset.action, debut, fin };
  }

  function restaurerFocus(f) {
    if (!f) return;
    const ligne = (f.details ? 'tr.ligne-details' : 'tr.ligne') + '[data-id="' + echapperCSS(f.id) + '"] ';
    const el = $(ligne + (f.champ ? '[data-champ="' + f.champ + '"]' : '[data-action="' + f.action + '"]'));
    if (!el) return;
    el.focus({ preventScroll: true });
    if (f.debut != null && typeof el.setSelectionRange === 'function') {
      try {
        el.setSelectionRange(f.debut, f.fin);
      } catch (e) {
        /* rien */
      }
    }
  }

  // Rendu incrémental : les lignes existantes sont réutilisées (saisie fluide même sur un gros bilan).
  const cacheLignes = new Map();
  const cacheGroupes = new Map();

  function cleStructure(l) {
    return l.alimentation + '|' + (l.origine === 'saisie' ? 's' : 't');
  }

  function rendreLignes() {
    const table = $('#table-lignes');
    const focus = memoriserFocus();
    const lignes = etat.projet.lignes;
    const groupes = new Map();
    for (const l of lignes) {
      if (!groupes.has(l.categorie)) groupes.set(l.categorie, []);
      groupes.get(l.categorie).push(l);
    }
    const vues = new Set();
    let precedent = table.tHead;
    for (const cat of M.ORDRE_CATEGORIES) {
      const membres = groupes.get(cat);
      if (!membres) continue;
      let tb = cacheGroupes.get(cat);
      if (!tb) {
        tb = construireGroupeVide(cat);
        cacheGroupes.set(cat, tb);
      }
      majEnteteGroupe(tb, cat, membres.length);
      let curseur = tb.firstElementChild;
      for (const l of membres) {
        vues.add(l.id);
        let entree = cacheLignes.get(l.id);
        const cle = cleStructure(l);
        if (!entree || entree.cle !== cle) {
          if (entree) {
            entree.tr.remove();
            entree.det.remove();
          }
          entree = { tr: construireLigne(l), det: h('tr', { class: 'ligne-details', dataset: { id: l.id }, hidden: true }), cle, sig: null };
          cacheLignes.set(l.id, entree);
        } else {
          synchroniserLigne(entree, l);
        }
        appliquerOuverture(entree, l, etat.ligneOuverte === l.id);
        if (curseur.nextElementSibling !== entree.tr) curseur.after(entree.tr);
        if (entree.tr.nextElementSibling !== entree.det) entree.tr.after(entree.det);
        curseur = entree.det;
      }
      while (curseur.nextElementSibling) curseur.nextElementSibling.remove();
      if (precedent.nextElementSibling !== tb) precedent.after(tb);
      precedent = tb;
    }
    for (const [cat, tb] of cacheGroupes) {
      if (!groupes.has(cat)) {
        tb.remove();
        cacheGroupes.delete(cat);
      }
    }
    for (const [id, e] of cacheLignes) {
      if (!vues.has(id)) {
        e.tr.remove();
        e.det.remove();
        cacheLignes.delete(id);
      }
    }
    table.classList.toggle('a-lignes', lignes.length > 0);
    $('#etat-vide').hidden = lignes.length > 0;
    majCalculsLignes();
    restaurerFocus(focus);
  }

  function construireGroupeVide(cat) {
    const tb = h('tbody', { class: 'groupe', dataset: { categorie: cat } });
    tb.append(
      h(
        'tr',
        { class: 'groupe-entete' },
        h(
          'th',
          { colspan: 9, scope: 'rowgroup' },
          h(
            'div',
            { class: 'groupe-ligne' },
            h(
              'button',
              { type: 'button', class: 'groupe-bascule', 'aria-expanded': 'true', dataset: { action: 'basculer-groupe', categorie: cat } },
              icone('chevron-bas'),
              M.CATEGORIES[cat],
              h('span', { class: 'compteur' })
            ),
            h('span', { class: 'groupe-total', dataset: { totalCategorie: cat } })
          )
        )
      )
    );
    return tb;
  }

  function majEnteteGroupe(tb, cat, n) {
    const replie = etat.groupesReplies.has(cat);
    tb.classList.toggle('replie', replie);
    const bouton = $('.groupe-bascule', tb);
    bouton.setAttribute('aria-expanded', String(!replie));
    $('.compteur', bouton).textContent = String(n);
  }

  function valeurAffichee(champ, l) {
    if (champ === 'nom' || champ === 'note') return l[champ] || '';
    if (champ === 'alimentation' || champ === 'phase' || champ === 'categorie') return l[champ];
    return fmtSaisie(l[champ]);
  }

  /** Remet les champs d'une ligne réutilisée en accord avec l'état (sauf le champ en cours de saisie). */
  function synchroniserChamps(conteneur, l) {
    for (const el of conteneur.querySelectorAll('[data-champ]')) {
      if (el === document.activeElement) continue;
      const v = valeurAffichee(el.dataset.champ, l);
      if (el.value !== v) {
        el.value = v;
        if (el.classList.contains('invalide')) signalerChamp(el, null);
      }
    }
  }

  function synchroniserLigne(entree, l) {
    synchroniserChamps(entree.tr, l);
    const nom = l.nom || 'Sans nom';
    const champNom = $('[data-champ="nom"]', entree.tr);
    if (champNom) champNom.title = l.nom || '';
    $('[data-action="details"]', entree.tr).setAttribute('aria-label', 'Détails de « ' + nom + ' »');
    $('[data-action="supprimer"]', entree.tr).setAttribute('aria-label', 'Supprimer « ' + nom + ' »');
    if (entree.det.firstChild) {
      if (entree.det.contains(document.activeElement)) synchroniserChamps(entree.det, l);
      else vider(entree.det);
    }
  }

  function appliquerOuverture(entree, l, ouverte) {
    entree.tr.classList.toggle('ouverte', ouverte);
    entree.det.hidden = !ouverte;
    const bouton = $('[data-action="details"]', entree.tr);
    if (bouton) bouton.setAttribute('aria-expanded', String(ouverte));
    if (ouverte && !entree.det.firstChild) remplirDetails(entree.det, l);
  }

  function saisieNumerique(champ, valeur, attrs) {
    return h(
      'input',
      Object.assign(
        { class: 'cellule-saisie num', type: 'text', inputmode: 'decimal', value: fmtSaisie(valeur), autocomplete: 'off', spellcheck: 'false', dataset: { champ } },
        attrs || {}
      )
    );
  }

  function construireLigne(l) {
    const ouverte = etat.ligneOuverte === l.id;
    const tr = h('tr', { class: 'ligne' + (ouverte ? ' ouverte' : ''), dataset: { id: l.id } });
    const estType = l.origine === 'type' || l.origine === 'en_ligne';
    tr.append(
      h(
        'td',
        { class: 'c-nom cellule' },
        h(
          'div',
          { class: 'nom-conteneur' },
          h('input', {
            class: 'cellule-saisie',
            type: 'text',
            value: l.nom,
            maxlength: M.LIMITES.nomMax,
            placeholder: 'Nom de l\u2019équipement',
            title: l.nom || null,
            'aria-label': 'Désignation',
            autocomplete: 'off',
            spellcheck: 'false',
            dataset: { champ: 'nom' },
          }),
          h('span', { class: 'marque-alerte', hidden: true, dataset: { calc: 'alerte' } }, icone('alerte')),
          estType
            ? h(
                'button',
                {
                  type: 'button',
                  class: 'badge-type',
                  dataset: { action: 'confirmer' },
                  title: 'Valeur type (' + (l.origine === 'en_ligne' ? 'base en ligne' : 'bibliothèque') + '), à confirmer avec la plaque signalétique. Cliquer pour confirmer la valeur.',
                  'aria-label': 'Valeur type à confirmer : confirmer la puissance',
                },
                icone('livre', 'ic-type'),
                icone('check', 'ic-ok'),
                'Type'
              )
            : null
        )
      )
    );
    tr.append(
      h(
        'td',
        { class: 'c-puissance cellule cellule-unite', dataset: { lib: 'Puissance unit.' } },
        saisieNumerique('puissanceW', l.puissanceW, {
          class: 'cellule-saisie num' + (l.puissanceW == null ? ' a-completer' : ''),
          placeholder: 'à compléter',
          'aria-label': 'Puissance unitaire en W',
        }),
        h('em', { text: 'W' })
      )
    );
    tr.append(h('td', { class: 'c-qte cellule', dataset: { lib: 'Qté' } }, saisieNumerique('quantite', l.quantite, { 'aria-label': 'Quantité' })));
    tr.append(
      h('td', { class: 'c-ks cellule', dataset: { lib: 'Fois.' } }, saisieNumerique('foisonnement', l.foisonnement, { placeholder: '1', 'aria-label': 'Foisonnement, entre 0 et 1' }))
    );
    const alim = h(
      'select',
      { class: 'cellule-saisie', 'aria-label': 'Alimentation', dataset: { champ: 'alimentation' } },
      h('option', { value: 'mono', text: 'Mono' }),
      h('option', { value: 'tri', text: 'Tri' })
    );
    alim.value = l.alimentation;
    tr.append(h('td', { class: 'c-alim cellule', dataset: { lib: 'Alim.' } }, alim));
    const tdPhase = h('td', { class: 'c-phase cellule', dataset: { lib: 'Phase' } });
    if (l.alimentation === 'tri') {
      tdPhase.append(h('span', { class: 'phase-tri', text: 'L1 L2 L3' }));
    } else {
      const choix = h(
        'select',
        { class: 'cellule-saisie', 'aria-label': 'Phase', dataset: { champ: 'phase' } },
        ['auto', 'L1', 'L2', 'L3'].map((v) => h('option', { value: v, text: v === 'auto' ? 'Auto' : v }))
      );
      choix.value = l.phase;
      tdPhase.append(choix, h('span', { class: 'repartition-mini', dataset: { calc: 'repartition' } }));
    }
    tr.append(tdPhase);
    tr.append(h('td', { class: 'c-pfois calc', dataset: { lib: 'P. foisonnée', calc: 'pfois' } }));
    tr.append(h('td', { class: 'c-i calc', dataset: { lib: 'Courant', calc: 'i' } }));
    tr.append(
      h(
        'td',
        { class: 'c-actions' },
        h(
          'div',
          { class: 'actions-ligne' },
          h(
            'button',
            {
              type: 'button',
              class: 'btn-icone petit',
              dataset: { action: 'details' },
              'aria-expanded': String(ouverte),
              'aria-label': 'Détails de « ' + (l.nom || 'Sans nom') + ' »',
              title: 'Détails : catégorie, cos φ, durée, note',
            },
            icone('chevron-bas')
          ),
          h(
            'button',
            { type: 'button', class: 'btn-icone petit', dataset: { action: 'supprimer' }, 'aria-label': 'Supprimer « ' + (l.nom || 'Sans nom') + ' »', title: 'Supprimer' },
            icone('corbeille')
          )
        )
      )
    );
    return tr;
  }

  function remplirDetails(tr, l) {
    vider(tr);
    const hyp = etat.projet.hypotheses;
    const categorie = h(
      'select',
      { dataset: { champ: 'categorie' } },
      M.ORDRE_CATEGORIES.map((c) => h('option', { value: c, text: M.CATEGORIES[c] }))
    );
    categorie.value = l.categorie;
    const note = h('textarea', { rows: 2, maxlength: M.LIMITES.noteMax, dataset: { champ: 'note' }, placeholder: 'Modèle, marque, remarque…' });
    note.value = l.note || '';
    const estType = l.origine === 'type' || l.origine === 'en_ligne';
    tr.append(
      h(
        'td',
        { colspan: 9 },
        h(
          'div',
          { class: 'details-grille' },
          h('label', { class: 'champ' }, h('span', { text: 'Catégorie' }), categorie),
          h(
            'label',
            { class: 'champ cellule' },
            h('span', { text: 'cos φ' }),
            h('input', {
              type: 'text',
              inputmode: 'decimal',
              value: fmtSaisie(l.cosPhi),
              placeholder: fmtSaisie(hyp.cosPhi) + ' (hypothèse du projet)',
              autocomplete: 'off',
              dataset: { champ: 'cosPhi' },
            })
          ),
          h(
            'label',
            { class: 'champ cellule' },
            h('span', { text: 'Heures par jour' }),
            h('input', {
              type: 'text',
              inputmode: 'decimal',
              value: fmtSaisie(l.heuresParJour),
              placeholder: hyp.heuresParJour != null ? fmtSaisie(hyp.heuresParJour) + ' (hypothèse du projet)' : 'à renseigner',
              autocomplete: 'off',
              dataset: { champ: 'heuresParJour' },
            })
          ),
          h('label', { class: 'champ' }, h('span', { text: 'Note' }), note),
          h('div', { class: 'details-calculs', dataset: { calc: 'details' } }),
          h(
            'div',
            { class: 'details-actions' },
            h('span', { class: 'provenance', text: 'Puissance : ' + LIBELLES_PROVENANCE[l.origine] }),
            estType ? h('button', { type: 'button', class: 'btn', dataset: { action: 'confirmer' } }, icone('check'), 'Confirmer la valeur') : null,
            h('button', { type: 'button', class: 'btn', dataset: { action: 'dupliquer' } }, icone('copie'), 'Dupliquer'),
            h('button', { type: 'button', class: 'btn', dataset: { action: 'supprimer' } }, icone('corbeille'), 'Supprimer')
          )
        )
      )
    );
    const c = etat.resultat && etat.resultat.parId[l.id];
    if (c) majDetailsCalculs(tr, c);
  }

  function niveauAlerteLigne(id) {
    let niveau = null;
    let messages = [];
    for (const a of etat.resultat.alertes) {
      if (a.niveau === 'info' || !a.lignes.includes(id)) continue;
      if (a.niveau === 'erreur' || !niveau) niveau = a.niveau;
      messages.push(a.message);
    }
    return { niveau, messages };
  }

  function texteRepartition(c, compact) {
    const vue = etat.resultat.vuePhases;
    if (!c.repartition || c.repartition.mode !== 'auto' || vue.type === 'mono') return '';
    const phases = M.PHASES.filter((ph) => c.repartition[ph] > 0);
    if (compact) return phases.join(' ');
    return phases.map((ph) => ph + NBSP + '×' + fmt(c.repartition[ph], 2)).join(' · ');
  }

  function majCalculsLigne(entree, l) {
    const c = etat.resultat.parId[l.id];
    if (!c) return;
    const tr = entree.tr;
    const mono = etat.resultat.vuePhases.type === 'mono';
    const alerte = niveauAlerteLigne(l.id);
    const signature = [c.incluse, c.pFoisW, c.pInstW, c.foisonnement, c.iA, c.alimentation, JSON.stringify(c.repartition), mono, alerte.niveau, alerte.messages.join('|'), l.puissanceW == null].join('§');
    if (!entree.det.hidden && entree.det.firstChild) majDetailsCalculs(entree.det, c);
    if (signature === entree.sig) return;
    entree.sig = signature;
    const pf = $('[data-calc="pfois"]', tr);
    vider(pf);
    pf.append(c.incluse ? fmtPuissance(c.pFoisW) : '–');
    if (c.incluse && c.foisonnement < 1) pf.append(h('small', { text: 'sur ' + fmtPuissance(c.pInstW) }));
    const ci = $('[data-calc="i"]', tr);
    vider(ci);
    ci.append(c.incluse ? fmtCourant(c.iA) : '–');
    if (c.incluse && c.alimentation === 'tri') ci.append(h('small', { text: 'par phase' }));
    const rep = $('[data-calc="repartition"]', tr);
    if (rep) {
      rep.textContent = texteRepartition(c, true);
      rep.title = texteRepartition(c) ? 'Répartition automatique : ' + texteRepartition(c) : '';
    }
    tr.classList.toggle('exclue', !c.incluse);
    const { niveau, messages } = alerte;
    const marque = $('[data-calc="alerte"]', tr);
    marque.hidden = !niveau;
    marque.classList.toggle('erreur', niveau === 'erreur');
    marque.title = messages.join('\n');
    const puissance = $('[data-champ="puissanceW"]', tr);
    if (puissance && document.activeElement !== puissance) puissance.classList.toggle('a-completer', l.puissanceW == null);
    const phase = $('[data-champ="phase"]', tr);
    if (phase) {
      phase.disabled = mono;
      phase.title = mono ? 'Raccordement monophasé : une seule phase' : '';
    }
  }

  function majDetailsCalculs(tr, c) {
    const zone = $('[data-calc="details"]', tr);
    if (!zone) return;
    vider(zone);
    const item = (lib, val) => h('span', null, lib + ' ', h('strong', { text: val }));
    if (!c.incluse) {
      zone.append(
        h('span', {
          text: !c.puissanceConnue ? 'Puissance à compléter : ligne non comptée.' : c.puissanceW === 0 ? 'Puissance nulle : ligne sans effet sur le bilan.' : 'Quantité nulle : ligne non comptée.',
        })
      );
      return;
    }
    zone.append(
      item('P. installée', fmtPuissance(c.pInstW)),
      item('P. foisonnée', fmtPuissance(c.pFoisW)),
      item('S', fmtApparente(c.sVA)),
      item('cos φ', fmt(c.cosPhi, 3) + (c.cosPhiDefaut ? ' (projet)' : '')),
      item('I ligne', fmtCourant(c.iA) + (c.alimentation === 'tri' ? ' par phase' : '')),
      item('I par appareil', fmtCourant(c.iUnitaireA)),
      item('Énergie', c.eJourKWh != null ? fmtEnergie(c.eJourKWh) + ' par jour' : 'durée à renseigner')
    );
    const rep = texteRepartition(c);
    if (rep) zone.append(item('Phases', rep));
  }

  function majCalculsLignes() {
    for (const l of etat.projet.lignes) {
      const entree = cacheLignes.get(l.id);
      if (entree) majCalculsLigne(entree, l);
    }
    const r = etat.resultat;
    const parCategorie = new Map(r.parCategorie.map((g) => [g.categorie, g]));
    for (const el of $$('[data-total-categorie]')) {
      const g = parCategorie.get(el.dataset.totalCategorie);
      vider(el);
      el.append(h('strong', { text: g ? fmtPuissance(g.pFoisW) : '–' }));
      if (g) el.append(' · ' + pourcent(g.part));
    }
    $('#compteur-lignes').textContent = etat.projet.lignes.length ? String(etat.projet.lignes.length) : '';
    const total = $('#lignes-total');
    vider(total);
    if (etat.projet.lignes.length) {
      total.append(
        pluriel(r.totaux.nbAppareils, 'appareil', 'appareils') + ' · installé ',
        h('strong', { text: fmtPuissance(r.totaux.pInstW) }),
        ' · foisonné ',
        h('strong', { text: fmtPuissance(r.totaux.pFoisW) })
      );
    }
  }

  function trouverLigne(id) {
    return etat.projet.lignes.find((l) => l.id === id) || null;
  }

  const MESSAGES_CHAMP = {
    puissanceW: 'Puissance en W : 1500 ou 1,5 kW',
    quantite: 'Quantité positive : 12 ou 4,5',
    foisonnement: 'Entre 0 et 1 : 0,8 ou 80 %',
    cosPhi: 'Entre 0 et 1 : 0,9',
    heuresParJour: 'Entre 0 et 24 h',
  };

  function lireChampLigne(champ, brut) {
    const t = brut.trim();
    switch (champ) {
      case 'puissanceW':
        return t === '' ? null : M.analyserPuissance(t);
      case 'quantite':
        return t === '' ? NaN : M.analyserNombre(t);
      case 'foisonnement':
        return t === '' ? 1 : M.analyserRatio(t);
      case 'cosPhi':
        return t === '' ? null : M.analyserRatio(t);
      case 'heuresParJour':
        return t === '' ? null : M.analyserNombre(t);
      default:
        return brut;
    }
  }

  function signalerChamp(input, message) {
    const cellule = input.closest('.cellule') || input.parentElement;
    let bulle = cellule.querySelector('.erreur-champ');
    if (!message) {
      input.classList.remove('invalide');
      input.removeAttribute('aria-invalid');
      if (bulle) bulle.remove();
      return;
    }
    input.classList.add('invalide');
    input.setAttribute('aria-invalid', 'true');
    if (!bulle) {
      bulle = h('span', { class: 'erreur-champ', role: 'alert' });
      cellule.append(bulle);
    }
    bulle.textContent = message;
  }

  function surSaisieLigne(input) {
    const conteneur = input.closest('[data-id]');
    const id = conteneur && conteneur.dataset.id;
    const champ = input.dataset.champ;
    if (!trouverLigne(id)) return;
    if (champ === 'nom' || champ === 'note') {
      const max = champ === 'nom' ? M.LIMITES.nomMax : M.LIMITES.noteMax;
      const valeur = input.value.slice(0, max);
      if (champ === 'nom') input.title = valeur;
      modifier(
        (p) => {
          const l = p.lignes.find((x) => x.id === id);
          if (l) l[champ] = valeur;
        },
        { fusion: champ + ':' + id, rendu: 'resultats' }
      );
      return;
    }
    const valeur = lireChampLigne(champ, input.value);
    const valide = valeur === null || M.valeurLigneValide(champ, valeur);
    if (!valide) {
      signalerChamp(input, MESSAGES_CHAMP[champ]);
      return;
    }
    signalerChamp(input, null);
    if (champ === 'puissanceW') input.classList.remove('a-completer');
    modifier(
      (p) => {
        const l = p.lignes.find((x) => x.id === id);
        if (!l) return;
        l[champ] = valeur;
        if (champ === 'puissanceW' && l.origine !== 'saisie') l.origine = 'saisie';
      },
      { fusion: champ + ':' + id, rendu: 'calculs' }
    );
    if (champ === 'puissanceW') {
      const badge = $('tr.ligne[data-id="' + echapperCSS(id) + '"] .badge-type');
      if (badge) badge.remove();
    }
  }

  /** À la sortie du champ : valeur remise en forme, ou valeur invalide abandonnée. */
  function surValidationLigne(input) {
    const conteneur = input.closest('[data-id]');
    const l = conteneur && trouverLigne(conteneur.dataset.id);
    if (!l) return;
    const champ = input.dataset.champ;
    if (champ === 'nom' || champ === 'note') {
      const propre = champ === 'nom' ? input.value.replace(/\s+/g, ' ').trim() : input.value.trim();
      if (propre !== l[champ]) {
        l[champ] = propre;
        etat.projet.modifieLe = new Date().toISOString();
        planifierSauvegarde();
      }
      input.value = l[champ];
      return;
    }
    if (input.classList.contains('invalide')) {
      const saisie = input.value;
      signalerChamp(input, null);
      toast('« ' + saisie + ' » n\u2019est pas une valeur valide (' + MESSAGES_CHAMP[champ] + ') : valeur précédente conservée.', { type: 'attention', duree: 6000 });
    }
    input.value = fmtSaisie(l[champ]);
    if (champ === 'puissanceW') input.classList.toggle('a-completer', l.puissanceW == null);
  }

  function surChoixLigne(select) {
    const conteneur = select.closest('[data-id]');
    const id = conteneur && conteneur.dataset.id;
    if (!trouverLigne(id)) return;
    const champ = select.dataset.champ;
    const valeur = select.value;
    if (champ === 'alimentation') {
      modifier(
        (p) => {
          const l = p.lignes.find((x) => x.id === id);
          l.alimentation = valeur === 'tri' ? 'tri' : 'mono';
          if (l.alimentation === 'tri') l.phase = 'auto';
        },
        { rendu: 'lignes' }
      );
    } else if (champ === 'phase') {
      modifier((p) => (p.lignes.find((x) => x.id === id).phase = valeur), { rendu: 'calculs' });
    } else if (champ === 'categorie') {
      etat.groupesReplies.delete(valeur);
      modifier((p) => (p.lignes.find((x) => x.id === id).categorie = valeur), { rendu: 'lignes' });
      surligner([id], false);
    }
  }

  function basculerDetails(id) {
    const precedente = etat.ligneOuverte;
    etat.ligneOuverte = precedente === id ? null : id;
    for (const lid of [precedente, etat.ligneOuverte]) {
      if (!lid) continue;
      const entree = cacheLignes.get(lid);
      const l = trouverLigne(lid);
      if (entree && l) appliquerOuverture(entree, l, etat.ligneOuverte === lid);
    }
  }

  function supprimerLigne(id) {
    const index = etat.projet.lignes.findIndex((l) => l.id === id);
    if (index < 0) return;
    const focusDansLigne = !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-id="' + echapperCSS(id) + '"]'));
    let voisine = null;
    if (focusDansLigne) {
      const visibles = $$('#table-lignes tr.ligne');
      const i = visibles.findIndex((tr) => tr.dataset.id === id);
      voisine = (visibles[i + 1] || visibles[i - 1] || null) && (visibles[i + 1] || visibles[i - 1]).dataset.id;
    }
    const ligne = JSON.parse(JSON.stringify(etat.projet.lignes[index]));
    const projetId = etat.projet.id;
    if (etat.ligneOuverte === id) etat.ligneOuverte = null;
    modifier((p) => p.lignes.splice(index, 1), { rendu: 'lignes' });
    if (focusDansLigne) {
      const cible = voisine ? $('tr.ligne[data-id="' + echapperCSS(voisine) + '"] [data-action="supprimer"]') : $('#saisie');
      if (cible) cible.focus({ preventScroll: true });
    }
    toast('« ' + (ligne.nom || 'Sans nom') + ' » supprimé.', {
      cle: 'suppression',
      action: {
        libelle: 'Annuler',
        fn: () => {
          if (etat.projet.id !== projetId || trouverLigne(ligne.id)) return;
          modifier((p) => p.lignes.splice(Math.min(index, p.lignes.length), 0, ligne), { rendu: 'lignes' });
          surligner([ligne.id]);
        },
      },
    });
  }

  function dupliquerLigne(id) {
    const index = etat.projet.lignes.findIndex((l) => l.id === id);
    if (index < 0) return;
    const copie = JSON.parse(JSON.stringify(etat.projet.lignes[index]));
    copie.id = M.nouvelId('l');
    modifier((p) => p.lignes.splice(index + 1, 0, copie), { rendu: 'lignes' });
    surligner([copie.id]);
    toast('Ligne dupliquée.', { type: 'ok', cle: 'duplication' });
  }

  function confirmerValeur(id) {
    const l = trouverLigne(id);
    if (!l) return;
    modifier((p) => (p.lignes.find((x) => x.id === id).origine = 'saisie'), { rendu: 'lignes' });
    toast('Valeur confirmée : ' + fmtPuissance(l.puissanceW) + ' pour « ' + (l.nom || 'Sans nom') + ' ».', { type: 'ok', cle: 'confirmation' });
  }

  function basculerGroupe(cat, bouton) {
    const tb = bouton.closest('tbody');
    const replie = !etat.groupesReplies.has(cat);
    if (replie) etat.groupesReplies.add(cat);
    else etat.groupesReplies.delete(cat);
    tb.classList.toggle('replie', replie);
    bouton.setAttribute('aria-expanded', String(!replie));
  }

  function surligner(ids, defiler) {
    let premier = null;
    for (const id of ids) {
      const tr = $('tr.ligne[data-id="' + echapperCSS(id) + '"]');
      if (!tr) continue;
      const tb = tr.closest('tbody');
      if (tb && tb.classList.contains('replie')) {
        etat.groupesReplies.delete(tb.dataset.categorie);
        tb.classList.remove('replie');
        const b = $('.groupe-bascule', tb);
        if (b) b.setAttribute('aria-expanded', 'true');
      }
      tr.classList.remove('surligne');
      void tr.offsetWidth;
      tr.classList.add('surligne');
      setTimeout(() => tr.classList.remove('surligne'), 1900);
      if (!premier) premier = tr;
    }
    if (premier && defiler) premier.scrollIntoView({ block: 'center', behavior: mouvementReduit() ? 'auto' : 'smooth' });
    return premier;
  }

  function voirLignes(ids, code) {
    const tr = surligner(ids, true);
    if (tr && code === 'PUISSANCE_A_COMPLETER') {
      const champ = $('[data-champ="puissanceW"]', tr);
      if (champ) setTimeout(() => champ.focus({ preventScroll: true }), 350);
    }
  }

  function ajouterLigne(partiel) {
    const ligne = M.creerLigne(partiel);
    etat.groupesReplies.delete(ligne.categorie);
    modifier((p) => p.lignes.push(ligne), { rendu: 'lignes' });
    surligner([ligne.id]);
    const quantite = ligne.quantite !== 1 ? fmt(ligne.quantite, 3) + ' × ' : '';
    const detail =
      ligne.puissanceW == null
        ? ' : puissance à compléter'
        : ' (' + fmtPuissance(ligne.puissanceW) + (ligne.origine === 'saisie' ? '' : ', valeur type à confirmer') + ')';
    toast('Ajouté : ' + quantite + ligne.nom + detail + '.', {
      type: 'ok',
      cle: 'ajout',
      duree: 4500,
      action: {
        libelle: 'Annuler',
        fn: () => {
          const index = etat.projet.lignes.findIndex((l) => l.id === ligne.id);
          if (index >= 0) modifier((p) => p.lignes.splice(index, 1), { rendu: 'lignes' });
        },
      },
    });
    return ligne;
  }

  function partielDepuisItem(item, analyse) {
    const a = analyse || {};
    return {
      nom: item.nom,
      categorie: item.categorie,
      puissanceW: a.puissanceW != null ? a.puissanceW : item.puissanceW,
      quantite: a.quantite || 1,
      alimentation: item.alimentation,
      cosPhi: item.cosPhi,
      foisonnement: item.foisonnement || 1,
      origine: a.puissanceW != null ? 'saisie' : item.enLigne ? 'en_ligne' : 'type',
    };
  }

  function lierTableau() {
    const table = $('#table-lignes');
    table.addEventListener('input', (e) => {
      const el = e.target;
      if (el.matches('input[data-champ], textarea[data-champ]')) surSaisieLigne(el);
    });
    table.addEventListener('change', (e) => {
      const el = e.target;
      if (el.matches('select[data-champ]')) surChoixLigne(el);
      else if (el.matches('input[data-champ], textarea[data-champ]')) surValidationLigne(el);
    });
    table.addEventListener('focusout', (e) => {
      const el = e.target;
      if (el.matches && el.matches('input.invalide[data-champ]')) surValidationLigne(el);
    });
    table.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (!b || !table.contains(b)) return;
      const conteneur = b.closest('[data-id]');
      const id = conteneur && conteneur.dataset.id;
      switch (b.dataset.action) {
        case 'details':
          basculerDetails(id);
          break;
        case 'supprimer':
          supprimerLigne(id);
          break;
        case 'dupliquer':
          dupliquerLigne(id);
          break;
        case 'confirmer':
          confirmerValeur(id);
          break;
        case 'basculer-groupe':
          basculerGroupe(b.dataset.categorie, b);
          break;
        default:
          break;
      }
    });
    table.addEventListener('keydown', (e) => {
      const el = e.target;
      if (e.key === 'Enter' && el.matches('input.cellule-saisie')) {
        e.preventDefault();
        const tr = el.closest('tr.ligne');
        const lignes = $$('#table-lignes tr.ligne').filter((x) => x.offsetParent !== null);
        const suivante = lignes[lignes.indexOf(tr) + (e.shiftKey ? -1 : 1)];
        const cible = suivante && $('[data-champ="' + el.dataset.champ + '"]', suivante);
        if (cible) {
          cible.focus();
          if (cible.select) cible.select();
        } else {
          el.blur();
          if (!e.shiftKey) $('#saisie').focus();
        }
      } else if (e.key === 'Escape' && el.matches('.cellule-saisie')) {
        el.blur();
      }
    });
  }

  /* ================================================================== */
  /* Rendu : résultats                                                   */
  /* ================================================================== */

  function animerNombre(el, parts) {
    const precedent = el._parts;
    el._parts = parts;
    cancelAnimationFrame(el._raf || 0);
    if (parts.valeur == null || !precedent || precedent.unite !== parts.unite || precedent.valeur == null || mouvementReduit() || precedent.valeur === parts.valeur) {
      el.textContent = parts.texte;
      return;
    }
    const depart = precedent.valeur;
    const t0 = performance.now();
    const duree = 340;
    const pas = (t) => {
      const k = Math.min(1, (t - t0) / duree);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = k < 1 ? fmt(depart + (parts.valeur - depart) * e, parts.decimales) : parts.texte;
      if (k < 1) el._raf = requestAnimationFrame(pas);
    };
    el._raf = requestAnimationFrame(pas);
  }

  function valeurAvecUnite(el, texte, manquant) {
    vider(el);
    el.classList.toggle('manquant', !!manquant);
    if (manquant) {
      el.textContent = manquant;
      return;
    }
    const i = texte.lastIndexOf(NBSP);
    if (i < 0) el.textContent = texte;
    else el.append(texte.slice(0, i), h('small', { text: texte.slice(i + 1) }));
  }

  function rendreResultats() {
    const r = etat.resultat;
    const hyp = r.hypotheses;
    const t = r.totaux;
    const aDesLignes = t.nbLignesIncluses > 0;

    $('#resultats').classList.toggle('sans-calcul', !aDesLignes);
    const parts = aDesLignes ? partsPuissance(t.pFoisW) : { texte: '0', valeur: 0, unite: 'kW', decimales: 0 };
    animerNombre($('#r-pfois'), parts);
    $('#r-pfois-unite').textContent = parts.unite || 'kW';
    const sous = $('#r-hero-sous');
    vider(sous);
    if (aDesLignes) {
      sous.append('Foisonnée · installée ', h('strong', { text: fmtPuissance(t.pInstW) }), ' · ', h('strong', { text: fmt(t.nbAppareils, 2) }), t.nbAppareils >= 2 ? ' appareils' : ' appareil');
    } else {
      sous.append(etat.projet.lignes.length ? 'Puissances à compléter pour lancer le calcul.' : 'Ajoutez des équipements pour lancer le calcul.');
    }
    $('#resume-hypotheses').textContent =
      fmt(hyp.tensionMonoV, 0) + '/' + fmt(hyp.tensionTriV, 0) + NBSP + 'V · cos' + NBSP + 'φ ' + fmt(hyp.cosPhi, 2) + ' · ≤' + NBSP + pourcent(hyp.tauxChargeMax);
    $('#resume-hypotheses').title = 'Hypothèses : tensions ' + fmt(hyp.tensionMonoV, 0) + ' V et ' + fmt(hyp.tensionTriV, 0) + ' V, cos φ par défaut ' + fmt(hyp.cosPhi, 2) + ', charge maximale visée ' + pourcent(hyp.tauxChargeMax) + '. Cliquer pour modifier.';

    valeurAvecUnite($('#r-s'), aDesLignes ? fmtApparente(t.sVA) : '–');
    valeurAvecUnite($('#r-imax'), aDesLignes ? fmtCourant(r.vuePhases.iMaxA) : '–');
    const noteImax = $('#r-imax-note');
    noteImax.textContent = !aDesLignes ? '' : r.vuePhases.type === 'mono' ? 'monophasé' : r.vuePhases.phaseMax ? 'phase ' + r.vuePhases.phaseMax : '';
    const e = r.energie;
    const ejour = $('#r-ejour');
    const noteJour = $('#r-ejour-note');
    vider(noteJour);
    if (!aDesLignes) valeurAvecUnite(ejour, '–');
    else if (e.eJourKWh == null) {
      valeurAvecUnite(ejour, '', 'À renseigner');
      noteJour.append(h('button', { type: 'button', class: 'lien', dataset: { action: 'ouvrir-hypotheses', champ: 'heuresParJour' }, text: 'durée par jour' }));
    } else {
      valeurAvecUnite(ejour, fmtEnergie(e.eJourKWh));
      noteJour.textContent = !e.complete ? 'partielle' : e.eTotaleKWh != null ? fmtEnergie(e.eTotaleKWh) + ' en ' + fmt(e.jours, 0) + NBSP + 'j' : 'jours à renseigner';
    }

    rendreRaccordement(r);
    rendrePhases(r);
    rendreComparatif(r);
    rendreAlertes(r);
    rendreEnergie(r);
    rendreRepartition(r);
    rendreBarreMobile(r);
    annoncerResultats();
  }

  function svgPrise(phases) {
    const s = svg('svg', { viewBox: '0 0 56 56', 'aria-hidden': 'true' });
    const couleur = phases === 1 ? '#1f6fd1' : phases === 3 ? '#c62828' : '#4b5161';
    s.append(svg('circle', { cx: 28, cy: 28, r: 26, fill: couleur }));
    s.append(svg('circle', { cx: 28, cy: 28, r: 25.2, fill: 'none', stroke: 'rgba(255,255,255,0.24)', 'stroke-width': 1.4 }));
    s.append(svg('circle', { cx: 28, cy: 28, r: 19, fill: 'rgba(0,0,0,0.42)' }));
    s.append(svg('rect', { x: 25, y: 4.6, width: 6, height: 6, rx: 1.6, fill: 'rgba(0,0,0,0.42)' }));
    const broches =
      phases === 1
        ? [[28, 39, 3.6], [19, 24.5, 2.7], [37, 24.5, 2.7]]
        : phases === 3
          ? [[28, 40, 3.4], [16.1, 31.9, 2.5], [20.6, 17.9, 2.5], [35.4, 17.9, 2.5], [39.9, 31.9, 2.5]]
          : [];
    for (const [x, y, r] of broches) s.append(svg('circle', { cx: x, cy: y, r, fill: '#eef1f5', stroke: 'rgba(0,0,0,0.35)', 'stroke-width': 0.8 }));
    if (!phases) s.append(svg('path', { d: 'M30 17 22 30h6l-2 9 8-13h-6z', fill: 'rgba(255,255,255,0.7)' }));
    return s;
  }

  function classeStatut(statut) {
    return statut === 'ok' ? 'ok' : statut === 'attention' ? 'attention' : statut === 'surcharge' || statut === 'impossible' ? 'critique' : '';
  }

  function libelleStatut(statut) {
    return { ok: 'Conforme', attention: 'Au-delà de l\u2019objectif', surcharge: 'Surcharge', impossible: 'Incompatible' }[statut] || '';
  }

  function majJauge(jauge, taux, seuil, statut) {
    jauge.className = 'jauge' + (classeStatut(statut) && classeStatut(statut) !== 'ok' ? ' ' + classeStatut(statut) : '');
    $('.jauge-remplissage', jauge).style.width = Math.max(0, Math.min(1, taux || 0)) * 100 + '%';
    const s = $('.jauge-seuil', jauge);
    if (s) {
      s.hidden = seuil == null;
      if (seuil != null) s.style.left = Math.min(1, seuil) * 100 + '%';
    }
  }

  function valeurChoixRaccordement(hyp) {
    const impose = hyp.raccordementImpose;
    if (!impose) return 'auto';
    const o = M.OFFRES.find((x) => x.phases === impose.phases && x.calibreA === impose.calibreA);
    return o ? o.id : 'perso';
  }

  function rendreChoixRaccordement(r) {
    const choix = $('#choix-raccordement');
    const impose = r.hypotheses.raccordementImpose;
    const valeur = valeurChoixRaccordement(r.hypotheses);
    const perso = valeur === 'perso' ? M.libelleRaccordement(impose).replace(NBSP, ' ') : '';
    if (choix.dataset.perso !== perso || !choix.options.length) {
      vider(choix);
      choix.append(h('option', { value: 'auto', text: 'Automatique' }));
      const groupe = h('optgroup', { label: 'Raccordement imposé' });
      for (const o of M.OFFRES) groupe.append(h('option', { value: o.id, text: M.libelleRaccordement(o).replace(NBSP, ' ') }));
      if (perso) groupe.append(h('option', { value: 'perso', text: perso }));
      groupe.append(h('option', { value: 'autre', text: 'Autre calibre…' }));
      choix.append(groupe);
      choix.dataset.perso = perso;
    }
    if (choix.value !== valeur) choix.value = valeur;
  }

  function rendreRaccordement(r) {
    rendreChoixRaccordement(r);
    const ret = r.retenu;
    const reco = r.recommandation;
    const hyp = r.hypotheses;
    const prise = $('#racc-prise');
    const titre = $('#racc-titre-texte');
    const sous = $('#racc-sous');
    const statut = $('#racc-statut');
    const blocJauge = $('#racc-jauge-bloc');
    vider(prise);
    vider(sous);
    vider(statut);
    statut.className = 'statut';
    titre.classList.remove('moyen');
    if (!ret) {
      prise.append(svgPrise(null));
      titre.classList.add('moyen');
      blocJauge.hidden = true;
      if (reco.motif === 'hors_gamme') {
        titre.textContent = 'Étude spécifique';
        sous.append(
          fmtCourant(reco.ibA) + ' sur la phase la plus chargée : au-delà des raccordements proposés. Calibre minimal ' + fmt(Math.ceil(reco.calibreMinA - 1e-9), 0) + NBSP + 'A (Powerlock, armoire dédiée).'
        );
        statut.className = 'statut attention';
        statut.append(icone('alerte'), 'Hors gamme');
      } else if (reco.motif === 'tri_requis') {
        titre.textContent = 'Triphasé requis';
        sous.append('Des équipements sont triphasés : cochez un raccordement triphasé dans les hypothèses.');
      } else if (reco.motif === 'aucune_offre') {
        titre.textContent = 'Aucun raccordement proposé';
        sous.append('Cochez au moins un raccordement dans les hypothèses.');
      } else {
        titre.textContent = 'En attente';
        sous.append('Le raccordement adapté s\u2019affichera dès le premier équipement.');
      }
      return;
    }
    prise.append(svgPrise(ret.phases));
    titre.textContent = ret.libelle;
    const elements = [];
    elements.push(ret.prise ? 'Prise ' + ret.prise + (ret.phases === 1 ? ' bleue' : ' rouge') : 'Calibre imposé');
    elements.push(ret.phases === 1 ? fmt(hyp.tensionMonoV, 0) + NBSP + 'V' : fmt(hyp.tensionTriV, 0) + NBSP + 'V');
    elements.push(fmtApparente(ret.capaciteVA) + ' disponibles');
    sous.append((ret.source === 'impose' ? 'Imposé · ' : 'Recommandé · ') + elements.join(' · '));
    if (r.alternative) {
      sous.append(h('br'), 'Recommandé à la place : ', h('strong', { text: r.alternative.libelle }), ' ');
      sous.append(h('button', { type: 'button', class: 'lien', dataset: { action: 'retour-recommandation' }, text: 'appliquer' }));
    }
    const cls = classeStatut(ret.statut);
    statut.className = 'statut ' + cls;
    statut.append(icone(cls === 'ok' ? 'valide' : cls === 'attention' ? 'alerte' : 'erreur'), libelleStatut(ret.statut));
    blocJauge.hidden = !ret.possible;
    if (ret.possible) {
      const seuilProche = Math.abs(ret.taux - 1) < Math.abs(ret.taux - hyp.tauxChargeMax) ? 1 : hyp.tauxChargeMax;
      $('#racc-taux').textContent = M.pourcentCompare(ret.taux, seuilProche) + ' · ' + fmtCourant(ret.ibA) + ' / ' + fmt(ret.calibreA, 1) + NBSP + 'A';
      majJauge($('#racc-jauge'), ret.taux, hyp.tauxChargeMax, ret.statut);
      $('#racc-jauge').setAttribute('role', 'meter');
      $('#racc-jauge').setAttribute('aria-label', 'Charge du raccordement');
      $('#racc-jauge').setAttribute('aria-valuenow', String(Math.round(ret.taux * 100)));
      $('#racc-jauge').setAttribute('aria-valuemin', '0');
      $('#racc-jauge').setAttribute('aria-valuemax', '100');
    }
  }

  function rendrePhases(r) {
    const vue = r.vuePhases;
    const conteneur = $('#phases');
    const note = $('#note-phases');
    const hyp = r.hypotheses;
    vider(note);
    const lignes = vue.type === 'mono' ? [Object.assign({}, vue.phases[0], { phase: 'Ph' })] : vue.phases;
    const calibre = r.retenu && r.retenu.possible ? vue.calibreA : null;
    const echelle = calibre || Math.max(1e-9, ...lignes.map((p) => p.iA));
    const existants = $$('.phase', conteneur);
    while (existants.length > lignes.length) existants.pop().remove();
    lignes.forEach((p, i) => {
      let ligne = $$('.phase', conteneur)[i];
      if (!ligne) {
        ligne = h(
          'div',
          { class: 'phase', tabindex: '0' },
          h('span', { class: 'phase-nom' }),
          h('div', { class: 'jauge' }, h('div', { class: 'jauge-remplissage' }), h('div', { class: 'jauge-seuil' })),
          h('span', { class: 'phase-val' })
        );
        conteneur.append(ligne);
      }
      $('.phase-nom', ligne).textContent = p.phase;
      const taux = p.iA / echelle;
      const statut = calibre ? M.statutCharge(p.iA / calibre, hyp.tauxChargeMax) : 'ok';
      majJauge($('.jauge', ligne), taux, calibre ? hyp.tauxChargeMax : null, statut);
      const val = $('.phase-val', ligne);
      vider(val);
      val.append(fmtCourant(p.iA));
      if (calibre) val.append(h('small', { text: ' / ' + fmt(calibre, 1) + NBSP + 'A' }));
      ligne.dataset.bulleTitre = (p.phase === 'Ph' ? 'Phase unique' : 'Phase ' + p.phase) + ' : ' + fmtCourant(p.iA);
      ligne.dataset.bulleTexte = fmtPuissance(p.pW) + ' · ' + fmtApparente(p.sVA) + (calibre ? ' · ' + pourcent(p.iA / calibre) + ' du calibre' : '');
      ligne.setAttribute('aria-label', ligne.dataset.bulleTitre + ', ' + ligne.dataset.bulleTexte);
    });
    if (!r.totaux.nbLignesIncluses) return;
    if (vue.type === 'mono') {
      note.append('Raccordement monophasé : toutes les charges sur une phase.');
    } else {
      const d = vue.desequilibre;
      const depasse = d > hyp.desequilibreMax + 1e-9;
      const ic = icone(depasse ? 'alerte' : 'valide');
      ic.style.color = depasse ? 'var(--attention-icone)' : 'var(--ok-texte)';
      note.append(ic, ' Déséquilibre ', h('strong', { text: M.pourcentCompare(d, hyp.desequilibreMax) }), ' (seuil ' + pourcent(hyp.desequilibreMax) + ')');
      if (vue.ecartA > 0.05) note.append(' · écart ' + fmtCourant(vue.ecartA));
    }
  }

  function rendreComparatif(r) {
    const table = $('#table-comparatif');
    vider(table);
    const proposees = new Set(r.hypotheses.offresProposees);
    const recoId = r.recommandation.evaluation ? r.recommandation.evaluation.id : null;
    table.append(h('thead', null, h('tr', null, h('th', { text: 'Raccordement' }), h('th', { class: 'num', text: 'Charge' }), h('th', { text: 'Résultat' }))));
    const corps = h('tbody');
    const lignes = r.evaluations.slice();
    if (r.retenu && r.retenu.source === 'impose' && !r.retenu.id) lignes.push(r.retenu);
    lignes.sort((a, b) => a.capaciteVA - b.capaciteVA);
    for (const e of lignes) {
      const cls = classeStatut(e.statut);
      const libelleResultat = { ok: 'Conforme', attention: '> ' + pourcent(r.hypotheses.tauxChargeMax), surcharge: 'Surcharge', impossible: 'Tri requis' }[e.statut];
      const tr = h(
        'tr',
        { class: (recoId && e.id === recoId ? 'recommande' : '') + (e.id && !proposees.has(e.id) ? ' non-propose' : '') },
        h('td', null, e.libelle, recoId && e.id === recoId ? [' ', h('span', { class: 'etiquette accent', text: 'Recommandé' })] : null, !e.id ? ' (imposé)' : null, h('small', { text: fmtApparente(e.capaciteVA) + ' disponibles' })),
        h('td', { class: 'num', text: e.possible && r.totaux.nbLignesIncluses ? pourcent(e.taux) : '–' }),
        h('td', null, r.totaux.nbLignesIncluses ? h('span', { class: 'etiquette ' + cls }, icone(cls === 'ok' ? 'valide' : cls === 'attention' ? 'alerte' : 'erreur'), libelleResultat) : '–')
      );
      if (e.id && !proposees.has(e.id)) tr.title = 'Non proposé dans les hypothèses : jamais recommandé.';
      corps.append(tr);
    }
    table.append(corps);
    const note = $('#note-comparatif');
    if (note) {
      note.textContent = r.totaux.nbLignesIncluses
        ? 'Courant appelé : ' + (r.scenarioMono.possible ? fmtCourant(r.scenarioMono.iA) + ' en monophasé, ' : 'monophasé impossible (équipements triphasés), ') + fmtCourant(r.scenarioTri.iMaxA) + ' sur la phase la plus chargée en triphasé.'
        : '';
    }
  }

  function actionsAlerte(a) {
    const boutons = [];
    if (a.lignes.length) {
      boutons.push(
        h('button', {
          type: 'button',
          class: 'lien',
          dataset: { action: 'voir-lignes', lignes: a.lignes.join(','), code: a.code },
          text: a.lignes.length > 1 ? 'Voir les ' + a.lignes.length + ' équipements' : 'Voir l\u2019équipement',
        })
      );
    }
    if (a.code === 'HEURES_A_COMPLETER' && !a.lignes.length) boutons.push(h('button', { type: 'button', class: 'lien', dataset: { action: 'ouvrir-hypotheses', champ: 'heuresParJour' }, text: 'Renseigner la durée' }));
    if (a.code === 'HEURES_A_COMPLETER' && a.lignes.length && etat.projet.hypotheses.heuresParJour == null)
      boutons.push(h('button', { type: 'button', class: 'lien', dataset: { action: 'ouvrir-hypotheses', champ: 'heuresParJour' }, text: 'Durée commune' }));
    if (a.code === 'JOURS_A_COMPLETER') boutons.push(h('button', { type: 'button', class: 'lien', dataset: { action: 'ouvrir-infos' }, text: 'Renseigner les dates' }));
    if (a.code === 'AUCUNE_OFFRE' || a.code === 'TRI_REQUIS') boutons.push(h('button', { type: 'button', class: 'lien', dataset: { action: 'ouvrir-hypotheses' }, text: 'Ouvrir les hypothèses' }));
    if ((a.code === 'SURCHARGE' || a.code === 'CHARGE_ELEVEE' || a.code === 'TRI_SUR_MONO') && etat.projet.hypotheses.raccordementImpose)
      boutons.push(h('button', { type: 'button', class: 'lien', dataset: { action: 'retour-recommandation' }, text: 'Revenir à la recommandation' }));
    return boutons.length ? h('div', { class: 'alerte-actions' }, boutons.map((b, i) => (i ? [' · ', b] : b))) : null;
  }

  function rendreAlertes(r) {
    const liste = $('#alertes');
    vider(liste);
    $('#compteur-alertes').textContent = r.alertes.length ? String(r.alertes.length) : '';
    if (!r.alertes.length) {
      liste.append(h('li', { class: 'aucune-alerte' }, icone('valide'), 'Aucun point de vigilance.'));
      return;
    }
    for (const a of r.alertes) {
      liste.append(
        h(
          'li',
          { class: 'alerte ' + a.niveau },
          icone(ICONES_NIVEAU[a.niveau]),
          h('div', null, h('span', { class: 'alerte-niveau', text: LIBELLES_NIVEAU[a.niveau] }), a.message, actionsAlerte(a))
        )
      );
    }
  }

  function rendreEnergie(r) {
    const dl = $('#energie');
    vider(dl);
    const e = r.energie;
    const s = r.sourceAutonome;
    const t = r.totaux;
    const ligne = (terme, valeur, manquant) => {
      dl.append(h('dt', { text: terme }), h('dd', { class: manquant ? 'manquant' : null, text: manquant || valeur }));
    };
    dl.append(h('div', { class: 'titre-groupe' }, icone('courbe'), 'Consommation estimée'));
    if (!t.nbLignesIncluses) {
      ligne('Énergie par jour', '', '–');
    } else {
      ligne('Énergie par jour', fmtEnergie(e.eJourKWh), e.eJourKWh == null ? 'durée à renseigner' : null);
      if (e.eJourKWh != null && !e.complete) dl.append(h('p', { class: 'detail', text: 'Partielle : ' + pluriel(e.lignesSansHeures.length, 'équipement', 'équipements') + ' sans durée d\u2019utilisation.' }));
      ligne('Jours d\u2019exploitation', e.jours != null ? pluriel(e.jours, 'jour', 'jours') + (e.joursSource === 'dates' ? ' (dates)' : '') : '', e.jours == null ? 'dates à renseigner' : null);
      ligne('Énergie sur la période', fmtEnergie(e.eTotaleKWh), e.eTotaleKWh == null ? '–' : null);
      if (e.eJourKWh != null && t.pFoisW > 0) {
        dl.append(h('p', { class: 'detail', text: 'Soit ' + fmt((e.eJourKWh * 1000) / t.pFoisW, 1) + ' h par jour à la puissance foisonnée.' }));
      }
    }
    dl.append(h('div', { class: 'sep' }));
    dl.append(h('div', { class: 'titre-groupe' }, icone('batterie'), 'Si alimentation autonome'));
    if (!t.nbLignesIncluses) {
      ligne('Puissance minimale', '', '–');
      return;
    }
    ligne('Puissance apparente minimale', fmtApparente(s.sMinVA));
    dl.append(
      h('p', {
        class: 'detail',
        text:
          'Groupe ou batterie ' +
          (s.phases === 3 ? 'triphasé ' + fmt(r.hypotheses.tensionTriV, 0) + NBSP + 'V' : 'monophasé ' + fmt(r.hypotheses.tensionMonoV, 0) + NBSP + 'V') +
          ', charge ≤ ' +
          pourcent(s.tauxChargeMax) +
          ' sur la phase la plus chargée, hors appels de courant au démarrage.',
      })
    );
    ligne('Puissance active à fournir', fmtPuissance(t.pFoisW));
    ligne('Énergie utile par jour', fmtEnergie(e.eJourKWh), e.eJourKWh == null ? 'durée à renseigner' : null);
  }

  function rendreRepartition(r) {
    const conteneur = $('#repartition');
    vider(conteneur);
    if (!r.parCategorie.length) {
      conteneur.append(h('p', { class: 'vide-resultat', text: 'Aucune donnée pour l\u2019instant.' }));
      return;
    }
    const max = Math.max(...r.parCategorie.map((g) => g.part)) || 1;
    for (const g of r.parCategorie) {
      const titre = g.libelle + ' : ' + fmtPuissance(g.pFoisW);
      const texte = pourcent(g.part, 1) + ' de la puissance foisonnée · ' + pluriel(g.nbAppareils, 'appareil', 'appareils') + (g.pInstW > g.pFoisW + 1e-9 ? ' · installé ' + fmtPuissance(g.pInstW) : '');
      conteneur.append(
        h(
          'div',
          { class: 'barre', tabindex: '0', 'aria-label': titre + ', ' + texte, dataset: { bulleTitre: titre, bulleTexte: texte } },
          h('span', { class: 'barre-lib', text: g.libelle }),
          h('span', { class: 'barre-val' }, fmtPuissance(g.pFoisW), h('small', { text: pourcent(g.part) })),
          h('div', { class: 'barre-trace', 'aria-hidden': 'true' }, h('span', { style: 'width:' + ((g.part / max) * 100).toFixed(2) + '%' }))
        )
      );
    }
  }

  function rendreBarreMobile(r) {
    $('#bm-p').textContent = r.totaux.nbLignesIncluses ? fmtPuissance(r.totaux.pFoisW) : '0' + NBSP + 'kW';
    let texte = 'Raccordement en attente';
    if (r.retenu) texte = r.retenu.libelle + ' · ' + (r.retenu.possible ? pourcent(r.retenu.taux) + ' · ' : '') + libelleStatut(r.retenu.statut);
    else if (r.recommandation.motif === 'hors_gamme') texte = 'Étude spécifique (hors gamme)';
    const alertes = r.alertes.filter((a) => a.niveau !== 'info').length;
    if (alertes) texte += ' · ' + pluriel(alertes, 'point à vérifier', 'points à vérifier');
    $('#bm-racc').textContent = texte;
  }

  /* ================================================================== */
  /* Saisie rapide : suggestions                                          */
  /* ================================================================== */

  const EnLigne = {
    URL: 'https://www.darkside-energy.com/_functions/searchDevices',
    etat: 'inconnu',
    echecs: 0,
    controleur: null,
    cache: new Map(),
    actif() {
      return prefs.rechercheEnLigne !== false && this.etat !== 'indisponible' && navigator.onLine !== false;
    },
    nettoyer(d, i) {
      if (!d || typeof d !== 'object') return null;
      const nom = String(d.name == null ? '' : d.name).replace(/\s+/g, ' ').trim().slice(0, M.LIMITES.nomMax);
      const p = typeof d.power === 'number' ? d.power : M.analyserPuissance(String(d.power == null ? '' : d.power));
      if (!nom || !(p > 0) || p > M.LIMITES.puissanceMaxW) return null;
      const ks = typeof d.diversity === 'number' ? d.diversity : M.analyserRatio(d.diversity);
      return {
        id: 'en-ligne-' + i,
        nom,
        categorie: M.lireCategorie(d.category) || 'divers',
        puissanceW: p,
        foisonnement: ks > 0 && ks <= 1 ? ks : 1,
        alimentation: 'mono',
        cosPhi: null,
        enLigne: true,
      };
    },
    async chercher(requete) {
      const cle = M.normaliserRecherche(requete);
      if (this.cache.has(cle)) return this.cache.get(cle);
      if (this.controleur) this.controleur.abort();
      const controleur = new AbortController();
      this.controleur = controleur;
      let delaiDepasse = false;
      const minuteur = setTimeout(() => {
        delaiDepasse = true;
        controleur.abort();
      }, 6000);
      try {
        const reponse = await fetch(this.URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: requete, limit: 5 }),
          signal: controleur.signal,
          credentials: 'omit',
          cache: 'no-store',
        });
        if (!reponse.ok) throw new Error('HTTP ' + reponse.status);
        const donnees = await reponse.json();
        const liste = (donnees && Array.isArray(donnees.devices) ? donnees.devices : []).map((d, i) => this.nettoyer(d, i)).filter(Boolean).slice(0, 5);
        this.etat = 'ok';
        this.echecs = 0;
        this.cache.set(cle, liste);
        return liste;
      } catch (e) {
        if (controleur.signal.aborted && !delaiDepasse) return null;
        this.echecs += 1;
        if (this.echecs >= 2) this.etat = 'indisponible';
        return null;
      } finally {
        clearTimeout(minuteur);
        if (this.controleur === controleur) this.controleur = null;
      }
    },
  };

  const Combo = {
    input: null,
    liste: null,
    options: [],
    actif: -1,
    resultatsEnLigne: { cle: null, liste: [] },

    init() {
      this.input = $('#saisie');
      this.liste = $('#suggestions');
      const rechercheDifferee = debounce(() => this.lancerRechercheEnLigne(), 380);
      this.input.addEventListener('input', () => {
        this.actif = -1;
        this.majSuggestions();
        rechercheDifferee();
      });
      this.input.addEventListener('focus', () => this.majSuggestions());
      this.input.addEventListener('keydown', (e) => this.surTouche(e));
      this.input.addEventListener('paste', (e) => {
        const texte = e.clipboardData && e.clipboardData.getData('text/plain');
        if (texte && /[\n\t]/.test(texte.trim())) {
          e.preventDefault();
          this.fermer();
          Import.ouvrir(texte);
        }
      });
      this.liste.addEventListener('mousedown', (e) => e.preventDefault());
      this.liste.addEventListener('click', (e) => {
        const opt = e.target.closest('[role="option"]');
        if (opt) {
          this.choisir(Number(opt.dataset.index));
          return;
        }
        const b = e.target.closest('[data-combo]');
        if (b) this.actionPied(b.dataset.combo);
      });
      document.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('#combo')) this.fermer();
      });
      this.input.addEventListener('blur', () => setTimeout(() => {
        if (document.activeElement !== this.input) this.fermer();
      }, 120));
    },

    ouvrir() {
      this.liste.hidden = false;
      this.input.setAttribute('aria-expanded', 'true');
    },

    fermer() {
      this.liste.hidden = true;
      this.input.setAttribute('aria-expanded', 'false');
      this.input.removeAttribute('aria-activedescendant');
      this.actif = -1;
    },

    async lancerRechercheEnLigne() {
      const a = M.analyserSaisieRapide(this.input.value);
      const requete = a.requete;
      if (!EnLigne.actif() || M.normaliserRecherche(requete).length < 3) return;
      const cle = M.normaliserRecherche(requete);
      const liste = await EnLigne.chercher(requete);
      if (liste === null) {
        if (document.activeElement === this.input) this.majSuggestions();
        return;
      }
      if (M.normaliserRecherche(M.analyserSaisieRapide(this.input.value).requete) !== cle) return;
      this.resultatsEnLigne = { cle, liste };
      if (document.activeElement === this.input) this.majSuggestions(true);
    },

    majSuggestions(conserverActif) {
      const texte = this.input.value;
      const a = M.analyserSaisieRapide(texte);
      const clePrecedente = this.actif >= 0 && this.options[this.actif] ? this.cleOption(this.options[this.actif]) : null;
      this.options = [];
      vider(this.liste);
      const ajouterOption = (opt) => {
        const index = this.options.length;
        this.options.push(opt);
        const item = opt.item;
        const puissance = a.puissanceW != null ? a.puissanceW : item ? item.puissanceW : null;
        const droite = h('span', { class: 'sugg-p' });
        if (a.quantite) droite.append(h('strong', { text: fmt(a.quantite, 3) + ' × ' }));
        if (puissance != null) droite.append((a.puissanceW != null ? '' : '≈ ') + fmtPuissance(puissance));
        else droite.append('puissance à compléter');
        const el = h(
          'div',
          { class: 'sugg', role: 'option', id: 'sugg-' + index, 'aria-selected': 'false', dataset: { index: String(index) } },
          h('span', { class: 'sugg-icone' }, icone(opt.type === 'perso' ? 'plus' : opt.type === 'enligne' ? 'globe' : 'livre')),
          h(
            'span',
            { class: 'sugg-textes' },
            h('span', { class: 'sugg-nom', text: opt.type === 'perso' ? 'Ajouter « ' + (majuscule(a.requete) || 'Équipement') + ' »' : item.nom }),
            h('span', {
              class: 'sugg-cat',
              text: opt.type === 'perso' ? 'Équipement personnalisé' + (a.puissanceW == null ? ', puissance à saisir' : '') : M.CATEGORIES[item.categorie] + (item.alimentation === 'tri' ? ' · triphasé' : '') + (opt.type === 'enligne' ? ' · base en ligne' : ''),
            })
          ),
          droite
        );
        this.liste.append(el);
      };

      if (!texte.trim()) {
        this.liste.append(h('div', { class: 'sugg-groupe' }, icone('eclair'), 'Équipements courants'));
        for (const item of C.equipements.filter((e) => e.populaire).slice(0, 8)) ajouterOption({ type: 'catalogue', item });
      } else {
        const trouves = a.requete ? M.rechercherCatalogue(C.equipements, a.requete, 7) : [];
        if (trouves.length) {
          this.liste.append(h('div', { class: 'sugg-groupe' }, icone('livre'), 'Bibliothèque · valeurs types'));
          for (const item of trouves) ajouterOption({ type: 'catalogue', item });
        }
        const cle = M.normaliserRecherche(a.requete);
        if (this.resultatsEnLigne.cle === cle && this.resultatsEnLigne.liste.length) {
          this.liste.append(h('div', { class: 'sugg-groupe' }, icone('globe'), 'Base Dark Side Energy en ligne'));
          for (const item of this.resultatsEnLigne.liste) ajouterOption({ type: 'enligne', item });
        }
        if (a.requete || a.puissanceW != null) {
          if (!trouves.length) this.liste.append(h('div', { class: 'sugg-vide', text: 'Aucun équipement type ne correspond : ajoutez-le avec sa puissance (« ' + (a.requete || 'équipement') + ' 1500 W »).' }));
          this.liste.append(h('div', { class: 'sugg-groupe' }, icone('plus'), 'Personnalisé'));
          ajouterOption({ type: 'perso', item: null });
        }
      }
      this.liste.append(this.pied());
      this.analyse = a;
      const retrouve = conserverActif && clePrecedente ? this.options.findIndex((o) => this.cleOption(o) === clePrecedente) : -1;
      if (retrouve >= 0) this.activer(retrouve);
      else if (texte.trim() && this.options.length) this.activer(0);
      else this.actif = -1;
      if (document.activeElement === this.input) this.ouvrir();
    },

    pied() {
      const pied = h('div', { class: 'sugg-pied' });
      let texte;
      let action = null;
      if (prefs.rechercheEnLigne === false) {
        texte = 'Base en ligne Dark Side Energy : désactivée';
        action = ['activer', 'Activer'];
      } else if (EnLigne.etat === 'indisponible') {
        texte = 'Base en ligne indisponible : bibliothèque locale utilisée';
        action = ['reessayer', 'Réessayer'];
      } else {
        texte = EnLigne.etat === 'ok' ? 'Base en ligne Dark Side Energy : connectée' : 'Bibliothèque locale et base en ligne Dark Side Energy';
        action = ['desactiver', 'Désactiver la base en ligne'];
      }
      pied.append(h('span', null, icone('globe'), ' ', texte));
      pied.append(h('button', { type: 'button', class: 'lien', dataset: { combo: action[0] }, text: action[1] }));
      return pied;
    },

    actionPied(action) {
      if (action === 'activer' || action === 'reessayer') {
        prefs.rechercheEnLigne = true;
        EnLigne.etat = 'inconnu';
        EnLigne.echecs = 0;
        Stockage.ecrirePrefs(prefs);
        this.lancerRechercheEnLigne();
      } else if (action === 'desactiver') {
        prefs.rechercheEnLigne = false;
        Stockage.ecrirePrefs(prefs);
      }
      this.majSuggestions();
      this.input.focus();
    },

    cleOption(opt) {
      return opt.type + ':' + (opt.item ? opt.item.id + ':' + opt.item.nom : '');
    },

    activer(i) {
      const opts = $$('[role="option"]', this.liste);
      opts.forEach((o) => o.setAttribute('aria-selected', 'false'));
      this.actif = i;
      const el = opts[i];
      if (el) {
        el.setAttribute('aria-selected', 'true');
        this.input.setAttribute('aria-activedescendant', el.id);
        el.scrollIntoView({ block: 'nearest' });
      } else this.input.removeAttribute('aria-activedescendant');
    },

    surTouche(e) {
      const n = this.options.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.liste.hidden) this.majSuggestions();
        if (n) this.activer((this.actif + 1 + n) % n);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.liste.hidden) {
          this.majSuggestions();
          return;
        }
        if (n) this.activer((this.actif - 1 + n) % n);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.actif >= 0) this.choisir(this.actif);
        else if (this.input.value.trim() && n) this.choisir(0);
      } else if (e.key === 'Escape') {
        if (!this.liste.hidden) {
          e.preventDefault();
          this.fermer();
        } else if (this.input.value) {
          e.preventDefault();
          this.input.value = '';
        }
      } else if (e.key === 'Tab') {
        this.fermer();
      }
    },

    choisir(i) {
      const opt = this.options[i];
      if (!opt) return;
      const a = this.analyse || M.analyserSaisieRapide(this.input.value);
      let partiel;
      if (opt.type === 'perso') {
        partiel = { nom: majuscule(a.requete) || 'Équipement', puissanceW: a.puissanceW, quantite: a.quantite || 1, origine: 'saisie' };
        const proche = a.requete ? M.rechercherCatalogue(C.equipements, a.requete, 1)[0] : null;
        if (proche) partiel.categorie = proche.categorie;
      } else {
        partiel = partielDepuisItem(opt.item, a);
      }
      ajouterLigne(partiel);
      this.input.value = '';
      this.resultatsEnLigne = { cle: null, liste: [] };
      this.majSuggestions();
      this.fermer();
      this.input.focus();
    },
  };

  function construirePuces() {
    const conteneur = $('#puces-populaires');
    vider(conteneur);
    for (const item of C.equipements.filter((e) => e.populaire).slice(0, 8)) {
      conteneur.append(h('button', { type: 'button', class: 'puce', dataset: { action: 'ajouter-item', item: item.id } }, icone('plus'), item.nom, h('small', { text: fmtPuissance(item.puissanceW) })));
    }
  }

  /* ================================================================== */
  /* Dialogues                                                           */
  /* ================================================================== */

  function ouvrirDialogue(id) {
    const d = $('#' + id);
    Menu.fermer();
    if (!d.open) {
      try {
        d.showModal();
      } catch (e) {
        d.setAttribute('open', '');
      }
    }
    placerToasts();
    return d;
  }

  function fermerDialogues() {
    for (const d of $$('dialog[open]')) d.close();
  }

  function confirmer(options) {
    const o = options || {};
    return new Promise((resolve) => {
      const d = $('#dlg-confirmer');
      $('#titre-confirmer').textContent = o.titre || 'Confirmer';
      const texte = $('#texte-confirmer');
      vider(texte);
      if (Array.isArray(o.texte)) texte.append(h('ul', null, o.texte.map((t) => h('li', { text: t }))));
      else texte.textContent = o.texte || '';
      const oui = $('#btn-confirmer-oui');
      const non = $('#btn-confirmer-non');
      oui.textContent = o.oui || 'Confirmer';
      oui.className = 'btn ' + (o.danger ? 'btn-danger' : 'btn-primaire');
      non.hidden = !!o.information;
      d.returnValue = '';
      const finir = () => {
        d.removeEventListener('close', finir);
        oui.onclick = null;
        non.onclick = null;
        resolve(d.returnValue === 'oui');
      };
      oui.onclick = () => d.close('oui');
      non.onclick = () => d.close('non');
      d.addEventListener('close', finir);
      try {
        d.showModal();
      } catch (e) {
        resolve(window.confirm(o.texte || o.titre));
        return;
      }
      placerToasts();
      (o.danger ? non : oui).focus();
    });
  }

  function afficherAvertissements(titre, avertissements) {
    if (!avertissements.length) return;
    const liste = avertissements.slice(0, 12);
    if (avertissements.length > 12) liste.push('… et ' + (avertissements.length - 12) + ' autres.');
    confirmer({ titre, texte: liste, oui: 'Compris', information: true });
  }

  /* Mes bilans */

  function tousLesBilans() {
    const { projets } = Stockage.lireTous();
    if (!projets.some((p) => p.id === etat.projet.id) && !projetVierge(etat.projet)) projets.unshift(etat.projet);
    return projets.map((p) => (p.id === etat.projet.id ? etat.projet : p));
  }

  function ouvrirBilans() {
    if (minuteurSauvegarde) sauvegarderMaintenant();
    $('#filtre-bilans').value = '';
    rendreListeBilans();
    ouvrirDialogue('dlg-bilans');
  }

  function rendreListeBilans() {
    const filtre = M.normaliserRecherche($('#filtre-bilans').value);
    const projets = tousLesBilans();
    const liste = $('#liste-bilans');
    vider(liste);
    const visibles = projets.filter((p) => !filtre || M.normaliserRecherche([p.info.nom, p.info.exposant, p.info.evenement, p.info.lieu, p.info.stand].join(' ')).includes(filtre));
    if (!visibles.length) {
      liste.append(h('li', { class: 'liste-vide', text: projets.length ? 'Aucun bilan ne correspond à la recherche.' : 'Aucun bilan enregistré pour l\u2019instant.' }));
    }
    for (const p of visibles) {
      const r = M.calculer(p);
      const courant = p.id === etat.projet.id;
      const meta = [p.info.exposant, p.info.evenement, p.info.lieu, p.info.stand ? 'stand ' + p.info.stand : '', fmtPeriode(p.info)].filter(Boolean).join(' · ');
      const alertes = r.alertes.filter((a) => a.niveau !== 'info').length;
      liste.append(
        h(
          'li',
          { class: 'bilan' + (courant ? ' courant' : '') },
          h(
            'button',
            { type: 'button', class: 'bilan-ouvrir', dataset: { action: 'ouvrir-bilan', id: p.id } },
            h('span', { class: 'bilan-nom' }, p.info.nom || 'Sans nom', courant ? h('span', { class: 'etiquette accent', text: 'Ouvert' }) : null),
            meta ? h('span', { class: 'bilan-meta', text: meta }) : null,
            h(
              'span',
              { class: 'bilan-kpis' },
              h('span', null, h('strong', { text: fmtPuissance(r.totaux.pFoisW) })),
              h('span', { text: r.retenu ? r.retenu.libelle : r.recommandation.motif === 'hors_gamme' ? 'Étude spécifique' : '–' }),
              h('span', { text: pluriel(p.lignes.length, 'équipement', 'équipements') }),
              alertes ? h('span', { text: pluriel(alertes, 'point à vérifier', 'points à vérifier') }) : null,
              h('span', { text: 'modifié ' + fmtRelatif(p.modifieLe) })
            )
          ),
          h(
            'div',
            { class: 'bilan-actions' },
            h('button', { type: 'button', class: 'btn-icone', dataset: { action: 'dupliquer-bilan-id', id: p.id }, 'aria-label': 'Dupliquer « ' + (p.info.nom || 'Sans nom') + ' »', title: 'Dupliquer' }, icone('copie')),
            h('button', { type: 'button', class: 'btn-icone', dataset: { action: 'exporter-bilan-id', id: p.id }, 'aria-label': 'Enregistrer le fichier de « ' + (p.info.nom || 'Sans nom') + ' »', title: 'Enregistrer le fichier' }, icone('telecharger')),
            h('button', { type: 'button', class: 'btn-icone', dataset: { action: 'supprimer-bilan-id', id: p.id }, 'aria-label': 'Supprimer « ' + (p.info.nom || 'Sans nom') + ' »', title: 'Supprimer' }, icone('corbeille'))
          )
        )
      );
    }
    $('#info-bilans').textContent = Stockage.ok
      ? pluriel(projets.length, 'bilan enregistré', 'bilans enregistrés') + ' dans ce navigateur'
      : pluriel(projets.length, 'bilan gardé', 'bilans gardés') + ' pendant cette session seulement';
  }

  function bilanParId(id) {
    if (etat.projet && etat.projet.id === id) return etat.projet;
    return Stockage.lire(id);
  }

  async function actionBilan(action, id) {
    const p = bilanParId(id);
    if (!p) {
      toast('Bilan introuvable (supprimé dans un autre onglet ?).', { type: 'attention' });
      rendreListeBilans();
      return;
    }
    if (action === 'ouvrir-bilan') {
      fermerDialogues();
      if (p.id !== etat.projet.id) {
        ouvrirProjet(p);
        toast('Bilan ouvert : « ' + (p.info.nom || 'Sans nom') + ' ».', { type: 'ok', cle: 'ouverture' });
      }
    } else if (action === 'dupliquer-bilan-id') {
      const copie = M.dupliquerProjet(p);
      Stockage.ecrire(copie);
      rendreListeBilans();
      toast('Copie créée : « ' + copie.info.nom + ' ».', { type: 'ok' });
    } else if (action === 'exporter-bilan-id') {
      telecharger(nomFichier(p.info.nom, '.bilan-stand.json'), M.serialiserProjet(p), 'application/json');
    } else if (action === 'supprimer-bilan-id') {
      const ok = await confirmer({
        titre: 'Supprimer ce bilan ?',
        texte: '« ' + (p.info.nom || 'Sans nom') + ' » (' + pluriel(p.lignes.length, 'équipement', 'équipements') + ') sera supprimé de ce navigateur.',
        oui: 'Supprimer',
        danger: true,
      });
      if (!ok) return;
      const sauvegarde = JSON.parse(JSON.stringify(p));
      Stockage.supprimer(p.id);
      if (p.id === etat.projet.id) {
        const restants = Stockage.lireTous().projets;
        ouvrirProjet(restants[0] || M.creerProjet(''));
      }
      rendreListeBilans();
      toast('Bilan « ' + (p.info.nom || 'Sans nom') + ' » supprimé.', {
        duree: 8000,
        action: {
          libelle: 'Annuler',
          fn: () => {
            Stockage.ecrire(sauvegarde);
            if (projetVierge(etat.projet)) ouvrirProjet(sauvegarde);
            if ($('#dlg-bilans').open) rendreListeBilans();
            toast('Bilan restauré.', { type: 'ok' });
          },
        },
      });
    }
  }

  function exporterRecap() {
    const projets = tousLesBilans();
    if (!projets.length) {
      toast('Aucun bilan à exporter.', { type: 'attention' });
      return;
    }
    telecharger('Récapitulatif des bilans - ' + dateFichier() + '.csv', M.exporterRecapCSV(projets), 'text/csv;charset=utf-8');
    toast('Récapitulatif exporté : ' + pluriel(projets.length, 'bilan', 'bilans') + '.', { type: 'ok' });
  }

  function exporterSauvegarde() {
    const projets = tousLesBilans();
    if (!projets.length) {
      toast('Aucun bilan à sauvegarder.', { type: 'attention' });
      return;
    }
    telecharger('Sauvegarde des bilans - ' + dateFichier() + '.json', M.serialiserSauvegarde(projets), 'application/json');
    toast('Sauvegarde complète enregistrée : ' + pluriel(projets.length, 'bilan', 'bilans') + '.', { type: 'ok' });
  }

  /* Hypothèses */

  const MESSAGES_HYPOTHESES = {
    tensionMonoV: 'Entre 100 et 300 V.',
    tensionTriV: 'Entre 100 et 1 000 V.',
    cosPhi: 'Entre 0 (exclu) et 1.',
    tauxChargeMax: 'Entre 1 et 100 %.',
    desequilibreMax: 'Entre 1 et 100 %.',
    heuresParJour: 'Entre 0 et 24 h, ou vide.',
    jours: 'Nombre entier de 1 à 366, ou vide.',
  };

  function ouvrirHypotheses(champ) {
    rendreFormHypotheses(true);
    ouvrirDialogue('dlg-hypotheses');
    if (champ) {
      const el = $('[data-hyp="' + champ + '"]') || $('#' + champ);
      if (el) setTimeout(() => el.focus(), 30);
    }
  }

  function rendreFormHypotheses(force) {
    const hyp = etat.projet.hypotheses;
    for (const input of $$('[data-hyp]')) {
      if (!force && document.activeElement === input) continue;
      const v = hyp[input.dataset.hyp];
      input.value = v == null ? '' : input.hasAttribute('data-pourcent') ? fmtSaisie(Math.round(v * 10000) / 100) : fmtSaisie(v);
      signalerChamp(input, null);
    }
    const jd = M.joursEntre(etat.projet.info.dateDebut, etat.projet.info.dateFin);
    $('#hyp-jours').placeholder = jd ? jd + ' (dates)' : 'à renseigner';
    $('#aide-jours').textContent = jd ? 'Vide : ' + pluriel(jd, 'jour', 'jours') + ' d\u2019après les dates du projet.' : 'Vide : déduit des dates du projet (non renseignées).';
    const cases = $('#cases-offres');
    vider(cases);
    const effectives = M.hypothesesEffectives(hyp);
    for (const o of M.OFFRES) {
      cases.append(
        h(
          'label',
          { class: 'case-offre' },
          h('input', { type: 'checkbox', checked: hyp.offresProposees.includes(o.id), dataset: { offre: o.id } }),
          M.libelleRaccordement(o),
          h('small', { text: fmtApparente(M.capaciteVA(o, effectives)) })
        )
      );
    }
    const phases = $('#impose-phases');
    const calibre = $('#impose-calibre');
    if (force || document.activeElement !== phases) phases.value = hyp.raccordementImpose ? String(hyp.raccordementImpose.phases) : '';
    if (force || document.activeElement !== calibre) calibre.value = hyp.raccordementImpose ? fmtSaisie(hyp.raccordementImpose.calibreA) : '';
    calibre.disabled = !phases.value;
  }

  function lireHypothese(input) {
    const cle = input.dataset.hyp;
    const brut = input.value.trim();
    if (brut === '') return null;
    if (input.hasAttribute('data-pourcent')) {
      const n = M.analyserNombre(brut.replace(/%$/, ''));
      return Number.isFinite(n) ? n / 100 : NaN;
    }
    if (cle === 'cosPhi') return M.analyserRatio(brut);
    return M.analyserNombre(brut);
  }

  function appliquerRaccordementImpose() {
    const phases = $('#impose-phases').value;
    const champ = $('#impose-calibre');
    champ.disabled = !phases;
    if (!phases) {
      signalerChamp(champ, null);
      if (etat.projet.hypotheses.raccordementImpose) modifier((p) => (p.hypotheses.raccordementImpose = null), { rendu: 'resultats' });
      return;
    }
    const calibre = M.analyserNombre(champ.value);
    if (!(calibre > 0 && calibre <= M.LIMITES.calibreMaxA)) {
      if (champ.value.trim()) signalerChamp(champ, 'Calibre en A, par exemple 32.');
      return;
    }
    signalerChamp(champ, null);
    const r = { phases: Number(phases), calibreA: calibre };
    const actuel = etat.projet.hypotheses.raccordementImpose;
    if (actuel && actuel.phases === r.phases && actuel.calibreA === r.calibreA) return;
    modifier((p) => (p.hypotheses.raccordementImpose = r), { fusion: 'impose', rendu: 'resultats' });
  }

  function lierHypotheses() {
    const form = $('#form-hypotheses');
    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('input', (e) => {
      const el = e.target;
      if (el.dataset.hyp) {
        const cle = el.dataset.hyp;
        const v = lireHypothese(el);
        if (!M.valeurHypotheseValide(cle, v)) {
          signalerChamp(el, MESSAGES_HYPOTHESES[cle]);
          return;
        }
        signalerChamp(el, null);
        modifier((p) => (p.hypotheses[cle] = v), { fusion: 'hyp:' + cle, rendu: 'tout' });
      } else if (el.id === 'impose-calibre') {
        appliquerRaccordementImpose();
      }
    });
    form.addEventListener('change', (e) => {
      const el = e.target;
      if (el.dataset.offre) {
        const coche = el.checked;
        modifier(
          (p) => {
            const ensemble = new Set(p.hypotheses.offresProposees);
            if (coche) ensemble.add(el.dataset.offre);
            else ensemble.delete(el.dataset.offre);
            p.hypotheses.offresProposees = M.OFFRES.map((o) => o.id).filter((id) => ensemble.has(id));
          },
          { rendu: 'resultats' }
        );
      } else if (el.id === 'impose-phases') {
        appliquerRaccordementImpose();
        if (el.value && !$('#impose-calibre').value) $('#impose-calibre').focus();
      } else if (el.dataset.hyp && el.classList.contains('invalide')) {
        rendreFormHypotheses(true);
      } else if (el.dataset.hyp) {
        const v = etat.projet.hypotheses[el.dataset.hyp];
        el.value = v == null ? '' : el.hasAttribute('data-pourcent') ? fmtSaisie(Math.round(v * 10000) / 100) : fmtSaisie(v);
      }
    });
    $('#btn-hyp-defaut').addEventListener('click', () => {
      const avant = JSON.stringify(etat.projet.hypotheses);
      const projetId = etat.projet.id;
      modifier((p) => (p.hypotheses = M.hypothesesParDefaut()), { rendu: 'tout' });
      rendreFormHypotheses(true);
      toast('Hypothèses par défaut rétablies.', {
        type: 'ok',
        action: {
          libelle: 'Annuler',
          fn: () => {
            if (etat.projet.id !== projetId) return;
            modifier((p) => (p.hypotheses = JSON.parse(avant)), { rendu: 'tout' });
            if ($('#dlg-hypotheses').open) rendreFormHypotheses(true);
          },
        },
      });
    });
    $('#dlg-hypotheses').addEventListener('close', () => {
      for (const el of $$('#form-hypotheses .invalide')) signalerChamp(el, null);
    });
  }

  function surChoixRaccordement(select) {
    const v = select.value;
    if (v === 'autre') {
      select.value = valeurChoixRaccordement(etat.projet.hypotheses);
      ouvrirHypotheses('impose-phases');
      return;
    }
    if (v === 'perso') return;
    const o = M.OFFRES_PAR_ID[v];
    modifier((p) => (p.hypotheses.raccordementImpose = o ? { phases: o.phases, calibreA: o.calibreA } : null), { rendu: 'resultats' });
  }

  /* Import de tableaux et de fichiers */

  const Import = {
    resultat: { lignes: [], ignorees: [], avertissements: [] },
    roles: null,
    largeur: 0,
    tableau: null,

    ouvrir(texte) {
      ouvrirDialogue('dlg-import');
      $('#import-texte').value = texte || '';
      $('#import-remplacer').checked = false;
      this.roles = null;
      this.analyser();
      if (!texte) setTimeout(() => $('#import-texte').focus(), 30);
    },

    analyser() {
      const texte = $('#import-texte').value;
      const t = M.analyserTableau(texte);
      this.tableau = t;
      const apercu = $('#import-apercu');
      vider(apercu);
      if (!t.lignes.length) {
        this.resultat = { lignes: [], ignorees: [], avertissements: [] };
        apercu.append(h('p', { class: 'note', text: 'Collez une liste pour voir l\u2019aperçu.' }));
        this.majBouton();
        return;
      }
      if (t.largeur <= 1) {
        this.resultat = convertirPhrases(t.lignes.map((l) => l[0]));
        this.apercuPhrases(apercu);
      } else {
        if (!this.roles || this.largeur !== t.largeur) {
          const d = M.detecterColonnes(t.lignes);
          this.roles = d.roles;
          this.entete = d.entete;
          this.largeur = t.largeur;
        }
        this.resultat = M.convertirImport(t.lignes, this.roles, this.entete);
        this.apercuTableau(apercu, t);
      }
      this.majBouton();
    },

    majBouton() {
      const n = this.resultat.lignes.length;
      const b = $('#btn-importer');
      b.disabled = !n;
      b.textContent = n ? 'Importer ' + pluriel(n, 'équipement', 'équipements') : 'Importer';
    },

    resume(conteneur) {
      const r = this.resultat;
      const bloc = h('div', { class: 'import-resume' }, h('span', null, h('strong', { text: pluriel(r.lignes.length, 'équipement', 'équipements') }), ' à importer'));
      if (r.ignorees.length) bloc.append(h('span', { text: pluriel(r.ignorees.length, 'ligne ignorée', 'lignes ignorées') + ' (vides ou illisibles)' }));
      const sansPuissance = r.lignes.filter((l) => l.puissanceW == null).length;
      if (sansPuissance) bloc.append(h('span', { class: 'manquant', text: pluriel(sansPuissance, 'puissance à compléter', 'puissances à compléter') }));
      conteneur.append(bloc);
    },

    apercuTableau(conteneur, t) {
      this.resume(conteneur);
      const table = h('table');
      const entete = h('tr');
      t.lignes[0].forEach((_, i) => {
        const choix = h(
          'select',
          { 'aria-label': 'Rôle de la colonne ' + (i + 1), dataset: { colonne: String(i) } },
          Object.keys(M.ROLES_COLONNES).map((role) => h('option', { value: role, text: M.ROLES_COLONNES[role] }))
        );
        choix.value = this.roles[i] || 'ignorer';
        entete.append(h('th', null, choix));
      });
      table.append(h('thead', null, entete));
      const corps = h('tbody');
      t.lignes.slice(0, 12).forEach((ligne, rang) => {
        const estEntete = this.entete && rang === 0;
        corps.append(
          h(
            'tr',
            null,
            ligne.map((cellule, i) => h('td', { class: estEntete || this.roles[i] === 'ignorer' ? 'ignore' : null, title: cellule, text: cellule }))
          )
        );
      });
      table.append(corps);
      conteneur.append(h('div', { class: 'import-tableau' }, table));
      if (t.lignes.length > 12) conteneur.append(h('p', { class: 'note', text: '… et ' + (t.lignes.length - 12) + ' autres lignes.' }));
      conteneur.append(
        h(
          'label',
          { class: 'case', style: 'margin-top:10px' },
          h('input', { type: 'checkbox', checked: this.entete, id: 'import-entete' }),
          h('span', { text: 'La première ligne contient les titres des colonnes' })
        )
      );
      this.avertissements(conteneur);
    },

    apercuPhrases(conteneur) {
      this.resume(conteneur);
      const table = h('table');
      table.append(h('thead', null, h('tr', null, h('th', { text: 'Désignation' }), h('th', { text: 'Qté' }), h('th', { text: 'Puissance unitaire' }), h('th', { text: 'Provenance' }))));
      const corps = h('tbody');
      for (const l of this.resultat.lignes.slice(0, 30)) {
        corps.append(
          h(
            'tr',
            null,
            h('td', { text: l.nom }),
            h('td', { text: fmt(l.quantite, 3) }),
            h('td', { class: l.puissanceW == null ? 'manquant' : null, text: l.puissanceW == null ? 'à compléter' : fmtPuissance(l.puissanceW) }),
            h('td', { text: l.origine === 'type' ? 'Valeur type : ' + (l._correspondance || '') : 'Saisie' })
          )
        );
      }
      table.append(corps);
      conteneur.append(h('div', { class: 'import-tableau' }, table));
      conteneur.append(h('p', { class: 'note', text: 'Liste simple : quantité et puissance lues dans chaque ligne, puissance type de la bibliothèque si elle manque (à confirmer).' }));
      this.avertissements(conteneur);
    },

    avertissements(conteneur) {
      const av = this.resultat.avertissements || [];
      if (!av.length) return;
      conteneur.append(h('ul', { class: 'import-avertissements' }, av.slice(0, 8).map((a) => h('li', { text: a })), av.length > 8 ? h('li', { text: '… et ' + (av.length - 8) + ' autres.' }) : null));
    },

    importer() {
      const lignes = this.resultat.lignes.map((l) => {
        const copie = Object.assign({}, l);
        delete copie._correspondance;
        copie.id = M.nouvelId('l');
        return copie;
      });
      if (!lignes.length) return;
      const remplacer = $('#import-remplacer').checked;
      const place = M.LIMITES.lignesMax - (remplacer ? 0 : etat.projet.lignes.length);
      if (place <= 0) {
        toast('Le bilan contient déjà ' + M.LIMITES.lignesMax + ' équipements : import impossible.', { type: 'erreur' });
        return;
      }
      const retenues = lignes.slice(0, place);
      const avant = JSON.stringify(etat.projet.lignes);
      const projetId = etat.projet.id;
      modifier(
        (p) => {
          if (remplacer) p.lignes = [];
          p.lignes.push(...retenues);
        },
        { rendu: 'lignes' }
      );
      $('#dlg-import').close();
      surligner(retenues.map((l) => l.id));
      toast(pluriel(retenues.length, 'équipement importé', 'équipements importés') + (remplacer ? ' (liste remplacée)' : '') + (retenues.length < lignes.length ? ' ; limite de ' + M.LIMITES.lignesMax + ' atteinte' : '') + '.', {
        type: 'ok',
        action: {
          libelle: 'Annuler',
          fn: () => {
            if (etat.projet.id === projetId) modifier((p) => (p.lignes = JSON.parse(avant)), { rendu: 'lignes' });
          },
        },
      });
    },

    lier() {
      const zone = $('#import-texte');
      const differer = debounce(() => this.analyser(), 250);
      zone.addEventListener('input', () => {
        this.roles = null;
        differer();
      });
      $('#import-apercu').addEventListener('change', (e) => {
        const el = e.target;
        if (el.dataset.colonne != null) {
          this.roles[Number(el.dataset.colonne)] = el.value;
          this.resultat = M.convertirImport(this.tableau.lignes, this.roles, this.entete);
          const apercu = $('#import-apercu');
          vider(apercu);
          this.apercuTableau(apercu, this.tableau);
          this.majBouton();
        } else if (el.id === 'import-entete') {
          this.entete = el.checked;
          this.resultat = M.convertirImport(this.tableau.lignes, this.roles, this.entete);
          const apercu = $('#import-apercu');
          vider(apercu);
          this.apercuTableau(apercu, this.tableau);
          this.majBouton();
        }
      });
      $('#btn-importer').addEventListener('click', () => this.importer());
    },
  };

  /** Liste simple (« 12 spots LED ») : quantité et puissance lues, puissance type si absente. */
  function convertirPhrases(textes) {
    const lignes = [];
    const ignorees = [];
    textes.forEach((texte, i) => {
      const a = M.analyserSaisieRapide(texte);
      if (!a.requete && a.puissanceW == null) {
        ignorees.push({ rang: i + 1, raison: 'ligne vide' });
        return;
      }
      const item = a.requete ? M.rechercherCatalogue(C.equipements, a.requete, 1)[0] : null;
      const partiel = { nom: majuscule(a.requete) || 'Équipement ' + (i + 1), quantite: a.quantite || 1, puissanceW: a.puissanceW, origine: 'saisie' };
      if (item) {
        partiel.categorie = item.categorie;
        partiel.alimentation = item.alimentation;
        partiel.cosPhi = item.cosPhi;
        if (a.puissanceW == null) {
          partiel.puissanceW = item.puissanceW;
          partiel.origine = 'type';
        }
      }
      const ligne = M.creerLigne(partiel);
      if (item && a.puissanceW == null) ligne._correspondance = item.nom;
      lignes.push(ligne);
    });
    return { lignes, ignorees, avertissements: [] };
  }

  async function lireFichierChoisi(fichier) {
    if (!fichier) return;
    if (fichier.size > 5 * 1024 * 1024) {
      toast('Fichier trop volumineux (5 Mo au maximum).', { type: 'erreur' });
      return;
    }
    let texte;
    try {
      texte = await fichier.text();
    } catch (e) {
      toast('Lecture du fichier impossible.', { type: 'erreur' });
      return;
    }
    if (/\.json$/i.test(fichier.name) || /^\uFEFF?\s*[{[]/.test(texte)) importerFichierBilan(texte);
    else {
      fermerDialogues();
      Import.ouvrir(texte);
    }
  }

  function importerFichierBilan(texte) {
    let lu;
    try {
      lu = M.lireFichier(texte);
    } catch (e) {
      toast(e.message, { type: 'erreur', duree: 9000 });
      return;
    }
    const existants = new Set(Stockage.lireTous().projets.map((p) => p.id));
    if (etat.projet) existants.add(etat.projet.id);
    let renommes = 0;
    for (const p of lu.projets) {
      if (existants.has(p.id)) {
        p.id = M.nouvelId('p');
        renommes += 1;
      }
      existants.add(p.id);
      Stockage.ecrire(p);
    }
    fermerDialogues();
    ouvrirProjet(lu.projets[0]);
    if (!Stockage.ok) majEtatSauvegarde('indisponible');
    let message = lu.projets.length > 1 ? pluriel(lu.projets.length, 'bilan importé', 'bilans importés') + ' ; le premier est ouvert.' : 'Bilan importé : « ' + (lu.projets[0].info.nom || 'Sans nom') + ' ».';
    if (renommes) message += ' Déjà présent : importé comme nouveau bilan, sans rien écraser.';
    toast(message, { type: 'ok', duree: 6000 });
    afficherAvertissements('Points relevés à l\u2019import', lu.avertissements);
  }

  /* Partage */

  async function partager() {
    let code;
    try {
      code = await M.encoderPartage(etat.projet);
    } catch (e) {
      toast('Lien impossible à créer : ' + e.message, { type: 'erreur' });
      return;
    }
    const url = location.href.split('#')[0] + '#b=' + code;
    $('#partage-url').value = url;
    const note = $('#partage-note');
    note.className = 'note';
    if (location.protocol === 'file:') {
      note.classList.add('attention');
      note.textContent = 'L\u2019outil est ouvert depuis un fichier sur cet ordinateur : ce lien ne fonctionnera pas ailleurs. Envoyez plutôt le fichier du bilan, ou hébergez l\u2019outil (GitHub Pages).';
    } else if (url.length > 7000) {
      note.classList.add('attention');
      note.textContent = 'Lien long (' + fmt(url.length, 0) + ' caractères) : certaines messageries le coupent. Le fichier du bilan est plus sûr.';
    } else {
      note.textContent = 'Lien de ' + fmt(url.length, 0) + ' caractères. Il reflète le bilan au moment de sa création.';
    }
    const nom = etat.projet.info.nom || 'Bilan';
    const corps = 'Bonjour,\n\nVoici le bilan de puissance « ' + nom + ' » :\n' + url + '\n';
    const courriel = $('#partage-courriel');
    courriel.href = 'mailto:?subject=' + encodeURIComponent('Bilan de puissance : ' + nom) + '&body=' + encodeURIComponent(corps);
    courriel.hidden = url.length > 1800;
    ouvrirDialogue('dlg-partage');
    $('#partage-url').select();
  }

  async function traiterLienPartage() {
    const m = location.hash.match(/^#b=([A-Za-z0-9_-]+)$/);
    if (!m) return;
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch (e) {
      location.hash = '';
    }
    let res;
    try {
      res = await M.decoderPartage(m[1]);
    } catch (e) {
      toast(e.message, { type: 'erreur', duree: 9000 });
      return;
    }
    const p = res.projet;
    const ok = await confirmer({
      titre: 'Ouvrir le bilan partagé ?',
      texte: '« ' + (p.info.nom || 'Sans nom') + ' », ' + pluriel(p.lignes.length, 'équipement', 'équipements') + '. Il sera ajouté à vos bilans, sans modifier les autres.',
      oui: 'Ouvrir',
    });
    if (!ok) return;
    p.modifieLe = new Date().toISOString();
    ouvrirProjet(p);
    sauvegarderMaintenant();
    toast('Bilan partagé ajouté à vos bilans.', { type: 'ok' });
    afficherAvertissements('Points relevés à l\u2019ouverture du lien', res.avertissements);
  }

  /* Exports */

  function exporterCSV() {
    telecharger(nomFichier(etat.projet.info.nom, ' - équipements.csv'), M.exporterCSV(etat.projet, etat.resultat), 'text/csv;charset=utf-8');
    toast('Tableau exporté (CSV pour Excel).', { type: 'ok' });
  }

  function exporterJSON() {
    telecharger(nomFichier(etat.projet.info.nom, '.bilan-stand.json'), M.serialiserProjet(etat.projet), 'application/json');
    toast('Fichier du bilan enregistré : il se rouvre avec « Ouvrir un fichier ».', { type: 'ok' });
  }

  /* ================================================================== */
  /* Rapport                                                             */
  /* ================================================================== */

  function logo() {
    const id = 'degrade-' + Math.random().toString(36).slice(2, 8);
    const s = svg('svg', { viewBox: '0 0 64 64', 'aria-hidden': 'true' });
    s.append(svg('defs', {}, svg('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 }, svg('stop', { offset: 0, 'stop-color': '#3987e5' }), svg('stop', { offset: 1, 'stop-color': '#7c5cf0' }))));
    s.append(svg('rect', { width: 64, height: 64, rx: 15, fill: 'url(#' + id + ')' }));
    s.append(svg('path', { d: 'M35.5 9 16 36h13l-3.5 19L46 27H33z', fill: '#fff' }));
    return s;
  }

  function tagNiveau(niveau) {
    return h('span', { class: 'tag ' + niveau, text: LIBELLES_NIVEAU[niveau] });
  }

  function construireRapport(p, r) {
    const hyp = r.hypotheses;
    const t = r.totaux;
    const defaut = M.hypothesesParDefaut();
    const art = h('article', { class: 'rapport' });
    const titreSection = (n, texte) => h('h2', null, h('span', { class: 'num-section', text: n }), texte);
    const jours = M.joursEntre(p.info.dateDebut, p.info.dateFin);

    art.append(
      h(
        'header',
        { class: 'rapport-entete' },
        h('div', null, h('div', { class: 'rapport-marque' }, logo(), h('span', { text: 'Dark Side Energy' })), h('h1', { text: 'Bilan de puissance' }), h('div', { class: 'rapport-sous-titre', text: p.info.nom || 'Bilan sans nom' })),
        h('div', { class: 'rapport-date' }, 'Édité le ' + formatDateLongue.format(new Date()), h('br'), 'Calculateur d\u2019Énergie Stand ' + M.VERSION_APP)
      )
    );
    const infos = [
      ['Exposant ou client', p.info.exposant],
      ['Événement', p.info.evenement],
      ['Lieu', p.info.lieu],
      ['Stand', p.info.stand],
      ['Exploitation', fmtPeriode(p.info) + (jours ? ' (' + pluriel(jours, 'jour', 'jours') + ')' : '')],
      ['Contact', p.info.contact],
    ];
    art.append(h('div', { class: 'rapport-infos' }, infos.map(([k, v]) => h('div', null, h('span', { text: k }), v || '–'))));
    if (p.info.notes) art.append(h('p', { class: 'legende', text: 'Notes : ' + p.info.notes }));

    // 1. Synthèse
    art.append(titreSection('1', 'Synthèse'));
    const kpi = (lib, val, fort) => h('div', { class: 'rapport-kpi' + (fort ? ' fort' : '') }, h('span', { text: lib }), h('b', { text: val }));
    art.append(
      h(
        'div',
        { class: 'rapport-kpis' },
        kpi('Puissance foisonnée', fmtPuissance(t.pFoisW), true),
        kpi('Puissance installée', fmtPuissance(t.pInstW)),
        kpi('Puissance apparente', fmtApparente(t.sVA)),
        kpi('Courant max par phase', fmtCourant(r.vuePhases.iMaxA) + (r.vuePhases.phaseMax && r.vuePhases.type === 'tri' ? ' (' + r.vuePhases.phaseMax + ')' : '')),
        kpi('Énergie par jour', r.energie.eJourKWh != null ? fmtEnergie(r.energie.eJourKWh) + (r.energie.complete ? '' : ' (partielle)') : 'non calculée'),
        kpi('Énergie sur la période', r.energie.eTotaleKWh != null ? fmtEnergie(r.energie.eTotaleKWh) : 'non calculée'),
        kpi('cos φ global', t.cosPhiGlobal != null ? fmt(t.cosPhiGlobal, 2) : '–'),
        kpi('Appareils', fmt(t.nbAppareils, 2) + ' (' + pluriel(t.nbLignes, 'ligne', 'lignes') + ')')
      )
    );
    const encart = h('div', { class: 'rapport-encart' });
    if (r.retenu) {
      encart.append(
        svgPrise(r.retenu.phases),
        h(
          'div',
          null,
          h('span', { class: 'legende', text: r.retenu.source === 'impose' ? 'Raccordement imposé' : 'Raccordement recommandé' }),
          h('b', { text: r.retenu.libelle + (r.retenu.prise ? ' · prise ' + r.retenu.prise : '') }),
          r.retenu.possible
            ? 'Charge ' + pourcent(r.retenu.taux) + ' (' + fmtCourant(r.retenu.ibA) + ' sur ' + fmt(r.retenu.calibreA, 1) + NBSP + 'A), objectif ≤ ' + pourcent(hyp.tauxChargeMax) + ' · ' + fmtApparente(r.retenu.capaciteVA) + ' disponibles. '
            : 'Raccordement incompatible avec les équipements triphasés. ',
          tagNiveau(r.retenu.statut === 'ok' ? 'ok' : r.retenu.statut === 'attention' ? 'attention' : 'erreur')
        )
      );
      $('.tag', encart).textContent = libelleStatut(r.retenu.statut);
    } else {
      encart.append(
        svgPrise(null),
        h(
          'div',
          null,
          h('b', { text: r.recommandation.motif === 'hors_gamme' ? 'Étude spécifique' : 'Aucun raccordement déterminé' }),
          r.recommandation.motif === 'hors_gamme'
            ? fmtCourant(r.recommandation.ibA) + ' sur la phase la plus chargée : calibre minimal ' + fmt(Math.ceil(r.recommandation.calibreMinA - 1e-9), 0) + NBSP + 'A.'
            : r.recommandation.motif === 'vide'
              ? 'Aucun équipement chiffré.'
              : 'Voir les points à vérifier.'
        )
      );
    }
    art.append(encart);

    // 2. Données saisies
    art.append(titreSection('2', 'Équipements (données saisies)'));
    const tableau = h('table');
    tableau.append(
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          ['Désignation', 'Catégorie', 'P unit. (W)', 'Qté', 'Fois.', 'cos φ', 'Alim.', 'Phases', 'P fois. (W)', 'I (A)', 'h/j', 'Prov.'].map((x, i) => h('th', { class: i >= 2 && i <= 5 ? 'num' : i >= 8 && i <= 10 ? 'num' : null, text: x }))
        )
      )
    );
    const corps = h('tbody');
    let nbTypes = 0;
    for (const l of p.lignes) {
      const c = r.parId[l.id];
      const type = l.origine !== 'saisie';
      if (type) nbTypes += 1;
      let phases = '';
      if (l.alimentation === 'tri') phases = 'L1 L2 L3';
      else if (r.vuePhases.type === 'mono') phases = 'Unique';
      else if (c.repartition) phases = M.PHASES.filter((ph) => c.repartition[ph] > 0).map((ph) => ph + (l.phase === 'auto' && c.quantite !== 1 ? '×' + fmt(c.repartition[ph], 2) : '')).join(' ') + (l.phase === 'auto' ? '' : ' (imposée)');
      corps.append(
        h(
          'tr',
          null,
          h('td', null, l.nom || 'Sans nom', l.note ? h('div', { class: 'legende', text: l.note }) : null),
          h('td', { text: M.CATEGORIES[l.categorie] }),
          h('td', { class: 'num', text: l.puissanceW == null ? 'à compléter' : fmt(l.puissanceW, 1) }),
          h('td', { class: 'num', text: fmt(l.quantite, 3) }),
          h('td', { class: 'num', text: fmt(c.foisonnement, 2) }),
          h('td', { class: 'num' }, c.cosPhiDefaut ? h('i', { text: fmt(c.cosPhi, 2) }) : fmt(c.cosPhi, 2)),
          h('td', { text: l.alimentation === 'tri' ? 'Tri' : 'Mono' }),
          h('td', { text: phases || '–' }),
          h('td', { class: 'num', text: c.incluse ? fmt(c.pFoisW, 0) : '–' }),
          h('td', { class: 'num', text: c.incluse ? fmt(c.iA, 2) : '–' }),
          h('td', { class: 'num' }, c.heures == null ? '–' : c.heuresDefaut ? h('i', { text: fmt(c.heures, 1) }) : fmt(c.heures, 1)),
          h('td', null, type ? h('span', { class: 'tag type', text: 'Type' }) : 'S')
        )
      );
    }
    if (!p.lignes.length) corps.append(h('tr', null, h('td', { colspan: 12, text: 'Aucun équipement saisi.' })));
    tableau.append(corps);
    tableau.append(
      h(
        'tfoot',
        null,
        h('tr', null, h('td', { text: 'Total' }), h('td'), h('td'), h('td', { class: 'num', text: fmt(t.nbAppareils, 2) }), h('td'), h('td'), h('td'), h('td'), h('td', { class: 'num', text: fmt(t.pFoisW, 0) }), h('td'), h('td'), h('td'))
      )
    );
    art.append(tableau);
    art.append(h('p', { class: 'legende', text: 'Prov. : S = saisie ; Type = valeur type de la bibliothèque, à confirmer. En italique : hypothèse du projet appliquée (cos φ, durée). Phases : répartition calculée des appareils monophasés.' }));

    // 3. Hypothèses
    art.append(titreSection('3', 'Hypothèses'));
    const origine = (cle) => (hyp[cle] === defaut[cle] ? 'Défaut de l\u2019outil' : 'Modifiée pour ce bilan');
    const nbCosDefaut = r.lignes.filter((c) => c.incluse && c.cosPhiDefaut).length;
    const nbHeuresDefaut = r.lignes.filter((c) => c.incluse && c.heuresDefaut).length;
    const lignesHyp = [
      ['Tension simple / composée', fmt(hyp.tensionMonoV, 0) + ' V / ' + fmt(hyp.tensionTriV, 0) + ' V', hyp.tensionMonoV === defaut.tensionMonoV && hyp.tensionTriV === defaut.tensionTriV ? 'Défaut de l\u2019outil' : 'Modifiée pour ce bilan'],
      ['cos φ par défaut', fmt(hyp.cosPhi, 2) + ' (appliqué à ' + pluriel(nbCosDefaut, 'équipement', 'équipements') + ')', origine('cosPhi')],
      ['Taux de charge maximal visé', pourcent(hyp.tauxChargeMax), origine('tauxChargeMax')],
      ['Déséquilibre maximal toléré', pourcent(hyp.desequilibreMax) + ', (I max − I moyen) / I moyen', origine('desequilibreMax')],
      ['Durée d\u2019utilisation par jour', hyp.heuresParJour != null ? fmt(hyp.heuresParJour, 1) + ' h (appliquée à ' + pluriel(nbHeuresDefaut, 'équipement', 'équipements') + ')' : 'Non renseignée', hyp.heuresParJour != null ? 'Saisie' : '–'],
      ['Jours d\u2019exploitation', r.energie.jours != null ? pluriel(r.energie.jours, 'jour', 'jours') : 'Non renseignés', r.energie.joursSource === 'hypothese' ? 'Saisie' : r.energie.joursSource === 'dates' ? 'Dates du projet' : '–'],
      ['Raccordements proposés', hyp.offresProposees.map((id) => M.libelleRaccordement(M.OFFRES_PAR_ID[id])).join(', ') || 'Aucun', JSON.stringify(hyp.offresProposees) === JSON.stringify(defaut.offresProposees) ? 'Défaut de l\u2019outil' : 'Modifiée pour ce bilan'],
      ['Raccordement imposé', hyp.raccordementImpose ? M.libelleRaccordement(hyp.raccordementImpose) : 'Aucun (recommandation automatique)', hyp.raccordementImpose ? 'Saisie' : 'Défaut de l\u2019outil'],
      ['Répartition des monophasés « Auto »', 'Appareil par appareil, du plus puissant au moins puissant, sur la phase la moins chargée', 'Méthode de l\u2019outil'],
      ['Puissances unitaires', nbTypes ? pluriel(nbTypes, 'valeur type', 'valeurs types') + ' de la bibliothèque, à confirmer ; autres valeurs saisies' : 'Toutes saisies ou confirmées', nbTypes ? 'À confirmer' : 'Saisie'],
    ];
    art.append(
      h(
        'table',
        null,
        h('thead', null, h('tr', null, h('th', { text: 'Hypothèse' }), h('th', { text: 'Valeur' }), h('th', { text: 'Origine' }))),
        h('tbody', null, lignesHyp.map(([a, b, c]) => h('tr', null, h('td', { text: a }), h('td', { text: b }), h('td', { text: c }))))
      )
    );

    // 4. Calculs
    art.append(titreSection('4', 'Calculs'));
    art.append(
      h(
        'ul',
        { class: 'formule' },
        h('li', { text: 'P foisonnée = P unitaire × quantité × foisonnement ; S = P / cos φ.' }),
        h('li', { text: 'I = S / V en monophasé (V = ' + fmt(hyp.tensionMonoV, 0) + ' V) ; I = S / (√3 × U) par phase en triphasé (U = ' + fmt(hyp.tensionTriV, 0) + ' V).' }),
        h('li', { text: 'Taux de charge = I de la phase la plus chargée / calibre du raccordement.' })
      )
    );
    const vue = r.vuePhases;
    const calibre = r.retenu && r.retenu.possible ? vue.calibreA : null;
    const deux = h('div', { class: 'rapport-deux-colonnes' });
    deux.append(
      h(
        'div',
        null,
        h('p', null, h('b', { text: vue.type === 'mono' ? 'Phase unique' : 'Charge par phase' })),
        h(
          'table',
          null,
          h('thead', null, h('tr', null, ['Phase', 'P (W)', 'S (VA)', 'I (A)', 'Charge'].map((x, i) => h('th', { class: i ? 'num' : null, text: x })))),
          h(
            'tbody',
            null,
            vue.phases.map((ph) =>
              h(
                'tr',
                null,
                h('td', { text: vue.type === 'mono' ? 'Ph' : ph.phase }),
                h('td', { class: 'num', text: fmt(ph.pW, 0) }),
                h('td', { class: 'num', text: fmt(ph.sVA, 0) }),
                h('td', { class: 'num', text: fmt(ph.iA, 2) }),
                h('td', { class: 'num', text: calibre ? pourcent(ph.iA / calibre) : '–' })
              )
            )
          )
        ),
        vue.type === 'tri' ? h('p', { class: 'legende', text: 'Déséquilibre ' + pourcent(vue.desequilibre) + ' (seuil ' + pourcent(hyp.desequilibreMax) + '), écart ' + fmtCourant(vue.ecartA) + '.' }) : null
      )
    );
    const recoId = r.recommandation.evaluation ? r.recommandation.evaluation.id : null;
    deux.append(
      h(
        'div',
        null,
        h('p', null, h('b', { text: 'Raccordements comparés' })),
        h(
          'table',
          null,
          h('thead', null, h('tr', null, ['Raccordement', 'Disponible', 'Appelé', 'Charge', ''].map((x, i) => h('th', { class: i && i < 4 ? 'num' : null, text: x })))),
          h(
            'tbody',
            null,
            r.evaluations.map((e) =>
              h(
                'tr',
                null,
                h('td', { text: e.libelle + (hyp.offresProposees.includes(e.id) ? '' : ' (non proposé)') }),
                h('td', { class: 'num', text: fmtApparente(e.capaciteVA) }),
                h('td', { class: 'num', text: e.possible ? fmtCourant(e.ibA) : '–' }),
                h('td', { class: 'num', text: e.possible ? pourcent(e.taux) : '–' }),
                h('td', null, recoId && e.id === recoId ? h('span', { class: 'tag ok', text: 'Recommandé' }) : e.statut === 'impossible' ? 'Tri requis' : e.statut === 'surcharge' ? 'Surcharge' : e.statut === 'attention' ? '> objectif' : '')
              )
            )
          )
        )
      )
    );
    art.append(deux);
    const s = r.sourceAutonome;
    art.append(
      h(
        'p',
        { class: 'legende' },
        'Source autonome : S min = ' + (s.phases === 3 ? '√3 × U × I max' : 'V × I') + ' / ' + pourcent(s.tauxChargeMax) + ' = ' + fmtApparente(s.sMinVA) + '. Énergie = P foisonnée × heures par jour × jours.'
      )
    );

    // 5. Recommandations
    art.append(titreSection('5', 'Recommandations'));
    const recos = [];
    if (r.retenu && r.retenu.statut === 'ok') {
      recos.push((r.retenu.source === 'impose' ? 'Raccordement imposé ' : 'Prévoir un raccordement ') + r.retenu.libelle + (r.retenu.prise ? ' (prise ' + r.retenu.prise + ')' : '') + ' : charge de ' + pourcent(r.retenu.taux) + ', dans l\u2019objectif de ' + pourcent(hyp.tauxChargeMax) + '.');
    } else if (r.retenu) {
      recos.push('Le raccordement ' + r.retenu.libelle + ' ne convient pas (' + libelleStatut(r.retenu.statut).toLowerCase() + ').' + (r.alternative ? ' Prévoir plutôt ' + r.alternative.libelle + (r.alternative.prise ? ' (prise ' + r.alternative.prise + ')' : '') + '.' : ''));
    } else if (r.recommandation.motif === 'hors_gamme') {
      recos.push('Besoin au-delà des raccordements proposés : étude de distribution Dark Side Energy (calibre minimal ' + fmt(Math.ceil(r.recommandation.calibreMinA - 1e-9), 0) + ' A, raccordement Powerlock ou armoire dédiée).');
    }
    if (t.nbLignesIncluses) recos.push('En alimentation autonome (groupe électrogène ou batterie) : source d\u2019au moins ' + fmtApparente(s.sMinVA) + (r.energie.eJourKWh != null ? ', capable de fournir ' + fmtEnergie(r.energie.eJourKWh) + ' par jour' : '') + ', hors appels de courant au démarrage.');
    if (nbTypes) recos.push('Confirmer les ' + pluriel(nbTypes, 'puissance type', 'puissances types') + ' avec les plaques signalétiques avant de valider le raccordement.');
    for (const a of r.alertes) if (a.code === 'DESEQUILIBRE' || a.code === 'PRISE_SUP_16A' || a.code === 'MONO_SUP_63') recos.push(a.message);
    art.append(recos.length ? h('ul', null, recos.map((x) => h('li', { text: x }))) : h('p', { text: 'Aucune recommandation : bilan vide.' }));

    // 6. Points à vérifier
    art.append(titreSection('6', 'Points à vérifier'));
    art.append(r.alertes.length ? h('ul', null, r.alertes.map((a) => h('li', null, tagNiveau(a.niveau), ' ', a.message))) : h('p', { text: 'Aucun point de vigilance relevé.' }));

    art.append(
      h('footer', {
        class: 'rapport-pied',
        text: 'Estimation établie à partir des données saisies et des hypothèses ci-dessus. Les puissances de la bibliothèque sont des valeurs types, à confirmer. Ce document ne remplace pas l\u2019étude de distribution (sections de câbles, protections, sélectivité, courants harmoniques), réalisée par Dark Side Energy.',
      })
    );
    return art;
  }

  function ouvrirRapport() {
    const apercu = $('#apercu-rapport');
    vider(apercu);
    apercu.append(construireRapport(etat.projet, etat.resultat));
    ouvrirDialogue('dlg-rapport');
    apercu.scrollTop = 0;
  }

  let titreAvantImpression = null;
  function preparerImpression() {
    const zone = $('#zone-impression');
    vider(zone);
    zone.append(construireRapport(etat.projet, etat.resultat));
    titreAvantImpression = document.title;
    document.title = 'Bilan de puissance - ' + (etat.projet.info.nom || 'Sans nom');
  }

  function imprimer() {
    try {
      window.print();
    } catch (e) {
      toast('Impression impossible ici : ouvrez l\u2019outil dans un onglet dédié.', { type: 'erreur' });
    }
  }

  /* ================================================================== */
  /* Menu, thème, raccourcis, divers                                     */
  /* ================================================================== */

  const Menu = {
    bouton: null,
    menu: null,
    init() {
      this.bouton = $('#btn-menu');
      this.menu = $('#menu-principal');
      this.bouton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.menu.hidden) this.ouvrir();
        else this.fermer(true);
      });
      document.addEventListener('pointerdown', (e) => {
        if (!this.menu.hidden && !e.target.closest('.menu-conteneur')) this.fermer();
      });
      this.menu.addEventListener('keydown', (e) => {
        const items = $$('[role="menuitem"]', this.menu).filter((x) => !x.hidden);
        const i = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          items[(i + 1) % items.length].focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          items[(i - 1 + items.length) % items.length].focus();
        } else if (e.key === 'Home') {
          e.preventDefault();
          items[0].focus();
        } else if (e.key === 'End') {
          e.preventDefault();
          items[items.length - 1].focus();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.fermer(true);
        } else if (e.key === 'Tab') this.fermer();
      });
    },
    ouvrir() {
      this.menu.hidden = false;
      this.bouton.setAttribute('aria-expanded', 'true');
      const premier = $('[role="menuitem"]', this.menu);
      if (premier) premier.focus();
    },
    fermer(rendreFocus) {
      if (!this.menu || this.menu.hidden) return;
      this.menu.hidden = true;
      this.bouton.setAttribute('aria-expanded', 'false');
      if (rendreFocus) this.bouton.focus();
    },
  };

  function appliquerTheme() {
    const clair = prefs.theme === 'clair';
    document.documentElement.dataset.theme = clair ? 'clair' : 'sombre';
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', clair ? '#f4f5f7' : '#08090c');
    $('#lib-theme').textContent = clair ? 'Thème sombre' : 'Thème clair';
    const use = $('[data-action="theme"] use');
    if (use) use.setAttribute('href', clair ? '#i-lune' : '#i-soleil');
  }

  function basculerTheme() {
    prefs.theme = prefs.theme === 'clair' ? 'sombre' : 'clair';
    Stockage.ecrirePrefs(prefs);
    appliquerTheme();
  }

  function lierInfobulles() {
    const bulle = $('#infobulle');
    const montrer = (el) => {
      vider(bulle);
      if (el.dataset.bulleTitre) bulle.append(h('strong', { text: el.dataset.bulleTitre }));
      if (el.dataset.bulleTexte) bulle.append(h('span', { text: el.dataset.bulleTexte }));
      bulle.hidden = false;
      const r = el.getBoundingClientRect();
      const b = bulle.getBoundingClientRect();
      const x = Math.max(8, Math.min(r.left + r.width / 2 - b.width / 2, window.innerWidth - b.width - 8));
      let y = r.top - b.height - 8;
      if (y < 8) y = r.bottom + 8;
      bulle.style.left = x + 'px';
      bulle.style.top = y + 'px';
    };
    const cacher = () => (bulle.hidden = true);
    document.addEventListener('pointerover', (e) => {
      const el = e.target.closest && e.target.closest('[data-bulle-titre]');
      if (el) montrer(el);
    });
    document.addEventListener('pointerout', (e) => {
      const el = e.target.closest && e.target.closest('[data-bulle-titre]');
      if (el && !el.contains(e.relatedTarget)) cacher();
    });
    document.addEventListener('focusin', (e) => {
      const el = e.target.closest && e.target.closest('[data-bulle-titre]');
      if (el) montrer(el);
      else cacher();
    });
    window.addEventListener('scroll', cacher, true);
  }

  function focusSaisie() {
    fermerDialogues();
    const champ = $('#saisie');
    champ.focus();
    champ.select();
  }

  const ACTIONS = {
    nouveau: nouveauBilan,
    'dupliquer-bilan': dupliquerBilanCourant,
    'export-csv': exporterCSV,
    'export-json': exporterJSON,
    importer: () => $('#fichier').click(),
    coller: () => Import.ouvrir(''),
    'exemple-stand-salon': () => chargerExemple('stand-salon'),
    'exemple-bar-festival': () => chargerExemple('bar-festival'),
    theme: basculerTheme,
    aide: () => ouvrirDialogue('dlg-aide'),
    'plein-ecran': () => window.open(location.href.split('#')[0], '_blank', 'noopener'),
    'recap-csv': exporterRecap,
    'sauvegarde-json': exporterSauvegarde,
    'voir-lignes': (b) => voirLignes(b.dataset.lignes.split(','), b.dataset.code),
    'ouvrir-hypotheses': (b) => ouvrirHypotheses(b.dataset.champ),
    'ouvrir-infos': () => {
      const d = $('#projet-details');
      d.open = true;
      d.scrollIntoView({ block: 'center', behavior: mouvementReduit() ? 'auto' : 'smooth' });
      const champ = $('[data-info="dateDebut"]');
      setTimeout(() => champ.focus({ preventScroll: true }), 300);
    },
    'retour-recommandation': () => modifier((p) => (p.hypotheses.raccordementImpose = null), { rendu: 'resultats' }),
    'ajouter-item': (b) => {
      const item = C.parId[b.dataset.item];
      if (item) ajouterLigne(partielDepuisItem(item, null));
    },
    'ouvrir-bilan': (b) => actionBilan('ouvrir-bilan', b.dataset.id),
    'dupliquer-bilan-id': (b) => actionBilan('dupliquer-bilan-id', b.dataset.id),
    'exporter-bilan-id': (b) => actionBilan('exporter-bilan-id', b.dataset.id),
    'supprimer-bilan-id': (b) => actionBilan('supprimer-bilan-id', b.dataset.id),
  };

  function lierEvenements() {
    lierTableau();
    lierHypotheses();
    Import.lier();
    Menu.init();
    Combo.init();
    lierInfobulles();

    document.addEventListener('click', (e) => {
      const fermeture = e.target.closest('[data-fermer]');
      if (fermeture) {
        const d = fermeture.closest('dialog');
        if (d) d.close();
        return;
      }
      const b = e.target.closest('[data-action]');
      if (!b || b.closest('#table-lignes')) return;
      const action = ACTIONS[b.dataset.action];
      if (!action) return;
      e.preventDefault();
      Menu.fermer();
      action(b);
    });

    for (const d of $$('dialog')) {
      d.addEventListener('close', () => setTimeout(placerToasts, 0));
      d.addEventListener('click', (e) => {
        if (e.target !== d) return;
        const r = d.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
      });
    }

    $('#btn-annuler').addEventListener('click', annuler);
    $('#btn-retablir').addEventListener('click', retablir);
    $('#btn-hypotheses').addEventListener('click', () => ouvrirHypotheses());
    $('#resume-hypotheses').addEventListener('click', () => ouvrirHypotheses());
    $('#btn-bilans').addEventListener('click', ouvrirBilans);
    $('#btn-partager').addEventListener('click', partager);
    $('#btn-rapport').addEventListener('click', ouvrirRapport);
    $('#btn-imprimer').addEventListener('click', imprimer);
    $('#marque').addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: mouvementReduit() ? 'auto' : 'smooth' });
    });
    $('#btn-copier-lien').addEventListener('click', async () => {
      const champ = $('#partage-url');
      const ok = await copierTexte(champ.value);
      if (ok) toast('Lien copié.', { type: 'ok' });
      else {
        champ.select();
        toast('Copie automatique impossible : le lien est sélectionné, copiez-le avec Ctrl+C.', { type: 'attention' });
      }
    });
    $('#filtre-bilans').addEventListener('input', debounce(rendreListeBilans, 120));
    $('#choix-raccordement').addEventListener('change', (e) => surChoixRaccordement(e.target));

    const nom = $('#projet-nom');
    nom.addEventListener('input', () => {
      const valeur = nom.value.slice(0, M.LIMITES.infoMax);
      modifier((p) => (p.info.nom = valeur), { fusion: 'info:nom', rendu: 'resultats' });
      rendreResumeProjet();
    });
    nom.addEventListener('change', () => {
      const propre = nom.value.replace(/\s+/g, ' ').trim();
      if (propre !== etat.projet.info.nom) {
        etat.projet.info.nom = propre;
        planifierSauvegarde();
      }
      nom.value = propre;
      rendreResumeProjet();
    });
    nom.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('#saisie').focus();
      }
    });
    for (const champ of $$('[data-info]')) {
      const cle = champ.dataset.info;
      const appliquer = () => {
        const valeur = champ.type === 'date' ? (M.estDateISO(champ.value) ? champ.value : '') : champ.value.slice(0, cle === 'notes' ? M.LIMITES.notesProjetMax : M.LIMITES.infoMax);
        if (valeur === etat.projet.info[cle]) return;
        modifier((p) => (p.info[cle] = valeur), { fusion: 'info:' + cle, rendu: 'resultats' });
        rendreResumeProjet();
        if ($('#dlg-hypotheses').open) rendreFormHypotheses();
      };
      champ.addEventListener(champ.type === 'date' ? 'change' : 'input', appliquer);
      if (champ.type !== 'date') {
        champ.addEventListener('change', () => {
          const propre = cle === 'notes' ? champ.value.trim() : champ.value.replace(/\s+/g, ' ').trim();
          if (propre !== etat.projet.info[cle]) {
            etat.projet.info[cle] = propre;
            planifierSauvegarde();
          }
          champ.value = propre;
          rendreResumeProjet();
        });
      }
    }

    const fichier = $('#fichier');
    fichier.addEventListener('change', () => {
      const f = fichier.files && fichier.files[0];
      fichier.value = '';
      lireFichierChoisi(f);
    });

    let profondeurGlisser = 0;
    const avecFichiers = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    window.addEventListener('dragenter', (e) => {
      if (!avecFichiers(e)) return;
      e.preventDefault();
      profondeurGlisser += 1;
      $('#zone-depot').hidden = false;
    });
    window.addEventListener('dragover', (e) => {
      if (avecFichiers(e)) e.preventDefault();
    });
    window.addEventListener('dragleave', (e) => {
      if (!avecFichiers(e)) return;
      profondeurGlisser = Math.max(0, profondeurGlisser - 1);
      if (!profondeurGlisser) $('#zone-depot').hidden = true;
    });
    window.addEventListener('drop', (e) => {
      if (!avecFichiers(e)) return;
      e.preventDefault();
      profondeurGlisser = 0;
      $('#zone-depot').hidden = true;
      lireFichierChoisi(e.dataTransfer.files[0]);
    });

    document.addEventListener('keydown', (e) => {
      const cible = e.target;
      const enSaisie = !!(cible && cible.closest && cible.closest('input, textarea, select, [contenteditable="true"]'));
      const dialogueOuvert = !!$('dialog[open]');
      const mod = e.ctrlKey || e.metaKey;
      const touche = (e.key || '').toLowerCase();
      if (mod && !e.altKey && touche === 'k') {
        e.preventDefault();
        focusSaisie();
        return;
      }
      if (mod && !e.altKey && touche === 'z' && !enSaisie && !dialogueOuvert) {
        e.preventDefault();
        if (e.shiftKey) retablir();
        else annuler();
        return;
      }
      if (mod && !e.altKey && touche === 'y' && !enSaisie && !dialogueOuvert) {
        e.preventDefault();
        retablir();
        return;
      }
      if (enSaisie || mod || e.altKey || dialogueOuvert) return;
      if (e.key === '/') {
        e.preventDefault();
        focusSaisie();
      } else if (e.key === '?') {
        e.preventDefault();
        ouvrirDialogue('dlg-aide');
      }
    });

    window.addEventListener('beforeprint', preparerImpression);
    window.addEventListener('afterprint', () => {
      if (titreAvantImpression) document.title = titreAvantImpression;
      titreAvantImpression = null;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && minuteurSauvegarde) sauvegarderMaintenant();
    });
    window.addEventListener('pagehide', () => {
      if (minuteurSauvegarde) sauvegarderMaintenant();
    });

    window.addEventListener('storage', (e) => {
      if (!e.key || !etat.projet || e.key !== Stockage.cle(etat.projet.id)) return;
      if (e.newValue == null) {
        toast('Ce bilan a été supprimé dans un autre onglet. Il reste ouvert ici : la prochaine modification le recréera.', { type: 'attention', duree: 9000 });
        return;
      }
      try {
        const { projet } = M.normaliserProjet(JSON.parse(e.newValue));
        if (String(projet.modifieLe) <= String(etat.projet.modifieLe)) return;
        etat.projet = projet;
        historique.passe = [];
        historique.futur = [];
        historique.fusion = null;
        recalculer();
        rendre('tout');
        toast('Bilan mis à jour depuis un autre onglet.', { type: 'info', cle: 'synchro' });
      } catch (err) {
        /* valeur illisible : ignorée */
      }
    });

    window.addEventListener('hashchange', traiterLienPartage);

    let erreurAffichee = false;
    const surErreur = (e) => {
      if (erreurAffichee) return;
      erreurAffichee = true;
      if (window.console) console.error(e && (e.error || e.reason || e.message || e));
      toast('Une erreur inattendue est survenue. Vos données sont enregistrées ; rechargez la page si l\u2019affichage semble incorrect.', { type: 'erreur', duree: 10000 });
    };
    window.addEventListener('error', surErreur);
    window.addEventListener('unhandledrejection', surErreur);
  }

  function observerBarreMobile() {
    if (!('IntersectionObserver' in window)) return;
    const barre = $('#barre-mobile');
    const obs = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) barre.classList.toggle('masquee', e.isIntersecting);
      },
      { threshold: 0.08 }
    );
    obs.observe($('#resultats'));
  }

  function activerApplication() {
    if (!/^https?:$/.test(location.protocol) || dansIframe || !window.fetch) return;
    fetch('manifest.webmanifest', { method: 'HEAD', cache: 'no-store' })
      .then((r) => {
        if (!r.ok) return;
        document.head.append(h('link', { rel: 'manifest', href: 'manifest.webmanifest' }));
        document.head.append(h('link', { rel: 'apple-touch-icon', href: 'icone-180.png' }));
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
      })
      .catch(() => {});
  }

  /* ================================================================== */
  /* Démarrage                                                           */
  /* ================================================================== */

  function demarrer() {
    Stockage.init();
    prefs = Object.assign(prefs, Stockage.lirePrefs());
    appliquerTheme();
    $('#bandeau-stockage').hidden = Stockage.ok;
    if (dansIframe) $('#menu-plein-ecran').hidden = false;
    const { projets, illisibles } = Stockage.lireTous();
    const projet = projets.find((p) => p.id === prefs.dernierBilan) || projets[0] || M.creerProjet('');
    lierEvenements();
    construirePuces();
    ouvrirProjet(projet);
    if (illisibles) toast(pluriel(illisibles, 'bilan illisible a été mis de côté', 'bilans illisibles ont été mis de côté') + ' (données conservées dans le navigateur).', { type: 'attention', duree: 9000 });
    traiterLienPartage();
    observerBarreMobile();
    activerApplication();
    document.documentElement.classList.add('pret');
  }

  // Accès de diagnostic (tests automatisés, assistance).
  window.CalculateurStand = Object.freeze({
    version: M.VERSION_APP,
    etat: () => JSON.parse(JSON.stringify(etat.projet)),
    resultat: () => etat.resultat,
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
