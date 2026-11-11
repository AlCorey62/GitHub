/*
 * Moteur de calcul du simulateur de pack batterie (BESS).
 *
 * Toutes les valeurs de HYPOTHESES_BESS sont des hypothèses de test,
 * sauf kVA et kWh nominaux issus de la page Aggreko « 300 kVA / 540 kWh ».
 * À remplacer par les valeurs de la fiche technique avant tout usage réel.
 */
(function (racine, fabrique) {
  if (typeof module === 'object' && module.exports) {
    module.exports = fabrique();
  } else {
    racine.BessCalcul = fabrique();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const HYPOTHESES_BESS = {
    kva: 300,            // Source : page Aggreko 300 kVA / 540 kWh
    kwhNominal: 540,     // Source : page Aggreko 300 kVA / 540 kWh
    cosPhi: 0.9,         // Hypothèse
    socMin: 0.1,         // Hypothèse : 10 % de réserve
    rendement: 0.9,      // Hypothèse : rendement de décharge
    auxiliairesKw: 0     // Hypothèse : consommation auxiliaire (climatisation, BMS) non modélisée
  };

  // Exemple de kit son, vidéo et lumière : valeurs fictives pour test uniquement.
  const KIT_EXEMPLE = [
    { nom: 'Enceintes line array', puissanceW: 1200, quantite: 12, facteur: 0.5, cosPhi: 0.9 },
    { nom: 'Amplificateurs', puissanceW: 2500, quantite: 4, facteur: 0.5, cosPhi: 0.9 },
    { nom: 'Projecteurs LED', puissanceW: 400, quantite: 24, facteur: 0.7, cosPhi: 0.95 },
    { nom: 'Lyres', puissanceW: 350, quantite: 12, facteur: 0.6, cosPhi: 0.9 },
    { nom: 'Projecteurs vidéo', puissanceW: 1000, quantite: 4, facteur: 1, cosPhi: 1 },
    { nom: 'Régie et consoles', puissanceW: 800, quantite: 1, facteur: 0.8, cosPhi: 0.9 }
  ];

  /** Puissance moyenne et crête du kit, en kW et kVA. */
  function calculerCharge(equipements) {
    let pMoyenneKw = 0;
    let sMoyenneKva = 0;
    let pCreteKw = 0;
    let sCreteKva = 0;

    equipements.forEach(function (e) {
      const nominalKw = (e.puissanceW * e.quantite) / 1000;
      const moyenneKw = nominalKw * e.facteur;
      pMoyenneKw += moyenneKw;
      sMoyenneKva += moyenneKw / e.cosPhi;
      pCreteKw += nominalKw;
      sCreteKva += nominalKw / e.cosPhi;
    });

    return { pMoyenneKw, sMoyenneKva, pCreteKw, sCreteKva };
  }

  /** Puissance active du pack en kW, déduite du kVA et du cos φ. */
  function puissancePackKw(pack) {
    return pack.kva * pack.cosPhi;
  }

  /** Énergie utilisable en kWh, après réserve de SOC minimum. */
  function energieUtilisable(pack) {
    return pack.kwhNominal * (1 - pack.socMin);
  }

  /** Puissance soutirée côté batterie (kW), pertes de rendement et auxiliaires inclus. */
  function puissanceSoutiree(pChargeKw, pack) {
    return (pChargeKw + pack.auxiliairesKw) / pack.rendement;
  }

  /** Autonomie en heures, pour une puissance de charge donnée. */
  function autonomie(pChargeKw, pack) {
    const soutiree = puissanceSoutiree(pChargeKw, pack);
    if (soutiree <= 0) return Infinity;
    return energieUtilisable(pack) / soutiree;
  }

  /**
   * Courbe d'état de charge (en % de l'énergie nominale) de t = 0 à la fin de l'autonomie,
   * ou à la durée demandée si elle est plus courte.
   */
  function courbeSoc(pChargeKw, pack, dureeMaxH, pasH) {
    const soutiree = puissanceSoutiree(pChargeKw, pack);
    const fin = Math.min(autonomie(pChargeKw, pack), dureeMaxH);
    const pas = pasH || 0.25;
    const points = [];
    for (let t = 0; t < fin; t += pas) {
      points.push({ t: t, soc: 100 * (1 - (soutiree * t) / pack.kwhNominal) });
    }
    points.push({ t: fin, soc: 100 * (1 - (soutiree * fin) / pack.kwhNominal) });
    return points;
  }

  /** Vérifications : liste de messages (vide si tout est conforme). */
  function verifier(charge, pack, dureeH) {
    const messages = [];
    const kwPack = puissancePackKw(pack);

    if (charge.sCreteKva > pack.kva) {
      messages.push({
        niveau: 'alerte',
        texte: 'Pic apparent du kit (' + charge.sCreteKva.toFixed(1) + ' kVA) supérieur au calibre du pack (' + pack.kva + ' kVA).'
      });
    }
    if (charge.pMoyenneKw > kwPack) {
      messages.push({
        niveau: 'alerte',
        texte: 'Puissance moyenne du kit (' + charge.pMoyenneKw.toFixed(1) + ' kW) supérieure à la puissance active du pack (' + kwPack.toFixed(1) + ' kW).'
      });
    }

    const auto = autonomie(charge.pMoyenneKw, pack);
    if (auto < dureeH) {
      messages.push({
        niveau: 'alerte',
        texte: 'Autonomie insuffisante : ' + auto.toFixed(1) + ' h calculées pour ' + dureeH + ' h demandées.'
      });
    }
    return messages;
  }

  return {
    HYPOTHESES_BESS,
    KIT_EXEMPLE,
    calculerCharge,
    puissancePackKw,
    energieUtilisable,
    puissanceSoutiree,
    autonomie,
    courbeSoc,
    verifier
  };
});
