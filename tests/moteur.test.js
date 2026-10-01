'use strict';
/* Tests du moteur de calcul : node --test tests/ */
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/moteur.js');

const R3 = Math.sqrt(3);
const proche = (reel, attendu, tolerance = 1e-6, message) =>
  assert.ok(Math.abs(reel - attendu) <= tolerance, (message || '') + ` attendu ${attendu}, obtenu ${reel}`);

function projetAvec(lignes, hypotheses = {}, info = {}) {
  const p = M.creerProjet('Test');
  Object.assign(p.hypotheses, hypotheses);
  Object.assign(p.info, info);
  p.lignes = lignes.map((l) => M.creerLigne(l));
  return p;
}

test.describe('lecture des saisies', () => {
  test('nombres à la française et à l’anglaise', () => {
    assert.equal(M.analyserNombre('1500'), 1500);
    assert.equal(M.analyserNombre('1 500,5'), 1500.5);
    assert.equal(M.analyserNombre('1\u202f500'), 1500);
    assert.equal(M.analyserNombre('1500.5'), 1500.5);
    assert.equal(M.analyserNombre('1.234,5'), 1234.5);
    assert.equal(M.analyserNombre('1,234.5'), 1234.5);
    assert.equal(M.analyserNombre('1.234.567'), 1234567);
    assert.equal(M.analyserNombre(' 3 '), 3);
    assert.equal(M.analyserNombre('-2'), -2);
    assert.equal(M.analyserNombre(42), 42);
    for (const invalide of ['', 'abc', '12,5,6', '1 500 W', '1.2.3', null, undefined, NaN, Infinity]) {
      assert.ok(Number.isNaN(M.analyserNombre(invalide)), String(invalide));
    }
  });

  test('puissances avec unité', () => {
    assert.equal(M.analyserPuissance('1,5 kW'), 1500);
    assert.equal(M.analyserPuissance('2.2kw'), 2200);
    assert.equal(M.analyserPuissance('150 W'), 150);
    assert.equal(M.analyserPuissance('150w'), 150);
    assert.equal(M.analyserPuissance('2 200'), 2200);
    assert.equal(M.analyserPuissance(300), 300);
    assert.ok(Number.isNaN(M.analyserPuissance('beaucoup')));
    assert.ok(Number.isNaN(M.analyserPuissance('')));
  });

  test('facteurs : décimal, pourcentage, entier compris comme pourcentage', () => {
    assert.equal(M.analyserRatio('0,8'), 0.8);
    assert.equal(M.analyserRatio('80 %'), 0.8);
    assert.equal(M.analyserRatio('80%'), 0.8);
    assert.equal(M.analyserRatio('80'), 0.8);
    assert.equal(M.analyserRatio('1'), 1);
    assert.equal(M.analyserRatio('100'), 1);
    assert.equal(M.analyserRatio('0'), 0);
    assert.equal(M.analyserRatio('150'), 150);
    assert.equal(M.analyserRatio('1,5'), 1.5, 'décimal > 1 : jamais pris pour un pourcentage');
    assert.equal(M.analyserRatio('85,5 %'), 0.855);
  });

  test('jours d’exploitation, bornes incluses', () => {
    assert.equal(M.joursEntre('2026-06-12', '2026-06-14'), 3);
    assert.equal(M.joursEntre('2026-06-12', '2026-06-12'), 1);
    assert.equal(M.joursEntre('2028-02-28', '2028-03-01'), 3);
    assert.equal(M.joursEntre('2026-03-28', '2026-03-30'), 3, 'passage à l’heure d’été');
    assert.equal(M.joursEntre('2026-06-14', '2026-06-12'), null);
    assert.equal(M.joursEntre('2026-02-30', '2026-03-01'), null);
    assert.equal(M.joursEntre('', '2026-03-01'), null);
  });
});

test.describe('calcul d’une ligne et totaux', () => {
  test('projet vide : rien à recommander, une information', () => {
    const r = M.calculer(M.creerProjet('Vide'));
    assert.equal(r.totaux.pFoisW, 0);
    assert.equal(r.recommandation.motif, 'vide');
    assert.equal(r.retenu, null);
    assert.deepEqual(r.alertes.map((a) => a.code), ['VIDE']);
  });

  test('monophasé : P, S, I avec le cos φ du projet', () => {
    const r = M.calculer(projetAvec([{ nom: 'Appareil', puissanceW: 1000, quantite: 2 }]));
    const c = r.lignes[0];
    assert.equal(c.pInstW, 2000);
    assert.equal(c.pFoisW, 2000);
    proche(c.sVA, 2000 / 0.85);
    proche(c.iA, 2000 / 0.85 / 230);
    assert.equal(c.cosPhiDefaut, true);
    proche(r.totaux.cosPhiGlobal, 0.85);
  });

  test('foisonnement et cos φ propres à la ligne', () => {
    const r = M.calculer(projetAvec([{ nom: 'Bouilloire', puissanceW: 2000, quantite: 4, foisonnement: 0.5, cosPhi: 1 }]));
    const c = r.lignes[0];
    assert.equal(c.pInstW, 8000);
    assert.equal(c.pFoisW, 4000);
    proche(c.iA, 4000 / 230);
    assert.equal(c.cosPhiDefaut, false);
    proche(r.totaux.foisonnementGlobal, 0.5);
  });

  test('triphasé : I = S / (√3 U)', () => {
    const r = M.calculer(projetAvec([{ nom: 'Borne 11 kW', puissanceW: 11000, cosPhi: 1, alimentation: 'tri' }]));
    proche(r.lignes[0].iA, 11000 / (R3 * 400));
    for (const ph of r.scenarioTri.phases) proche(ph.iA, 11000 / (R3 * 400));
    assert.equal(r.scenarioMono.possible, false);
  });

  test('lignes sans puissance ou à quantité nulle : exclues et signalées', () => {
    const r = M.calculer(projetAvec([{ nom: 'Inconnu' }, { nom: 'Rangé', puissanceW: 500, quantite: 0 }, { nom: 'Spot', puissanceW: 30, quantite: 2 }]));
    assert.equal(r.totaux.nbLignesIncluses, 1);
    assert.equal(r.totaux.pFoisW, 60);
    const codes = r.alertes.map((a) => a.code);
    assert.ok(codes.includes('PUISSANCE_A_COMPLETER'));
    assert.ok(codes.includes('QUANTITE_NULLE'));
  });

  test('le calcul ne modifie pas le projet et reste déterministe', () => {
    const p = projetAvec([
      { nom: 'A', puissanceW: 1200, quantite: 3 },
      { nom: 'B', puissanceW: 400, quantite: 5, phase: 'L2' },
      { nom: 'C', puissanceW: 9000, alimentation: 'tri' },
    ]);
    const avant = JSON.stringify(p);
    const r1 = M.calculer(p);
    const r2 = M.calculer(p);
    assert.equal(JSON.stringify(p), avant);
    assert.deepEqual(JSON.parse(JSON.stringify(r1)), JSON.parse(JSON.stringify(r2)));
  });
});

test.describe('répartition sur les phases', () => {
  test('trois appareils identiques : un par phase, aucun déséquilibre', () => {
    const r = M.calculer(projetAvec([{ nom: 'Frigo', puissanceW: 300, quantite: 3, cosPhi: 1 }]));
    assert.deepEqual(r.lignes[0].repartition, { mode: 'auto', L1: 1, L2: 1, L3: 1 });
    assert.equal(r.scenarioTri.desequilibre, 0);
  });

  test('douze spots : quatre par phase', () => {
    const r = M.calculer(projetAvec([{ nom: 'Spot', puissanceW: 30, quantite: 12 }]));
    assert.deepEqual(r.lignes[0].repartition, { mode: 'auto', L1: 4, L2: 4, L3: 4 });
  });

  test('phase imposée respectée, les autres comblent', () => {
    const r = M.calculer(
      projetAvec([
        { nom: 'Fixe', puissanceW: 2000, phase: 'L1', cosPhi: 1 },
        { nom: 'Auto', puissanceW: 1000, quantite: 2, cosPhi: 1 },
      ])
    );
    assert.deepEqual(r.lignes[0].repartition, { mode: 'fixe', L1: 1, L2: 0, L3: 0 });
    assert.deepEqual(r.lignes[1].repartition, { mode: 'auto', L1: 0, L2: 1, L3: 1 });
  });

  test('plus puissants d’abord, sur la phase la moins chargée', () => {
    const r = M.calculer(
      projetAvec([
        { nom: 'Petit', puissanceW: 1000, cosPhi: 1 },
        { nom: 'Gros', puissanceW: 3000, cosPhi: 1 },
        { nom: 'Moyen', puissanceW: 2000, quantite: 2, cosPhi: 1 },
      ])
    );
    const p = Object.fromEntries(r.scenarioTri.phases.map((x) => [x.phase, x.pW]));
    assert.deepEqual(p, { L1: 3000, L2: 3000, L3: 2000 });
    assert.equal(r.parId[r.lignes[0].id].repartition.L2, 1, 'le petit complète la phase L2');
  });

  test('déséquilibre = (I max − I moyen) / I moyen', () => {
    const r = M.calculer(
      projetAvec([
        { nom: 'L1', puissanceW: 2300, phase: 'L1', cosPhi: 1 },
        { nom: 'L2', puissanceW: 1150, phase: 'L2', cosPhi: 1 },
      ])
    );
    proche(r.scenarioTri.iMaxA, 10);
    proche(r.scenarioTri.iMoyA, 5);
    proche(r.scenarioTri.desequilibre, 1);
    proche(r.scenarioTri.ecartA, 10);
    assert.equal(r.scenarioTri.phaseMax, 'L1');
  });

  test('quantités décimales (mètres, m²) réparties sans perte', () => {
    const r = M.calculer(projetAvec([{ nom: 'Ruban LED', puissanceW: 15, quantite: 4.5 }]));
    const rep = r.lignes[0].repartition;
    proche(rep.L1 + rep.L2 + rep.L3, 4.5);
  });

  test('propriété : la puissance totale se conserve sur les phases', () => {
    let graine = 12345;
    const alea = () => ((graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let essai = 0; essai < 200; essai++) {
      const lignes = [];
      const n = 1 + Math.floor(alea() * 12);
      for (let i = 0; i < n; i++) {
        const tri = alea() < 0.2;
        lignes.push({
          nom: 'L' + i,
          puissanceW: Math.round(alea() * 5000) + 1,
          quantite: Math.ceil(alea() * 8),
          foisonnement: Math.round((0.1 + alea() * 0.9) * 100) / 100,
          cosPhi: alea() < 0.5 ? null : Math.round((0.5 + alea() * 0.5) * 100) / 100,
          alimentation: tri ? 'tri' : 'mono',
          phase: tri ? 'auto' : ['auto', 'auto', 'L1', 'L2', 'L3'][Math.floor(alea() * 5)],
        });
      }
      const r = M.calculer(projetAvec(lignes));
      const pPhases = r.scenarioTri.phases.reduce((s, x) => s + x.pW, 0);
      proche(pPhases, r.totaux.pFoisW, 1e-6 * Math.max(1, r.totaux.pFoisW));
      const sPhases = r.scenarioTri.phases.reduce((s, x) => s + x.sVA, 0);
      proche(sPhases, r.totaux.sVA, 1e-6 * Math.max(1, r.totaux.sVA));
      for (const c of r.lignes) {
        if (c.repartition && c.repartition.mode === 'auto') proche(c.repartition.L1 + c.repartition.L2 + c.repartition.L3, c.quantite, 1e-6);
      }
      assert.ok(r.scenarioTri.iMaxA + 1e-9 >= r.scenarioTri.iMoyA);
    }
  });

  test('équilibrage glouton : écart borné par le plus gros appareil automatique', () => {
    const r = M.calculer(
      projetAvec([
        { nom: 'A', puissanceW: 1800, quantite: 5, cosPhi: 1 },
        { nom: 'B', puissanceW: 700, quantite: 7, cosPhi: 1 },
        { nom: 'C', puissanceW: 60, quantite: 25, cosPhi: 1 },
      ])
    );
    const iMax = 1800 / 230;
    assert.ok(r.scenarioTri.ecartA <= iMax + 1e-9, 'écart ' + r.scenarioTri.ecartA);
  });
});

test.describe('raccordement', () => {
  test('petit stand monophasé : 16 A mono', () => {
    const r = M.calculer(projetAvec([{ nom: 'Charge', puissanceW: 2300, cosPhi: 1 }]));
    assert.equal(r.recommandation.motif, 'ok');
    assert.equal(r.retenu.id, 'mono16');
    proche(r.retenu.taux, 10 / 16);
    assert.equal(r.retenu.statut, 'ok');
    assert.equal(r.vuePhases.type, 'mono');
  });

  test('100 % d’un 16 A : refusé, 32 A mono recommandé', () => {
    const r = M.calculer(projetAvec([{ nom: 'Charge', puissanceW: 3680, cosPhi: 1 }]));
    assert.equal(r.evaluations.find((e) => e.id === 'mono16').statut, 'attention');
    assert.equal(r.retenu.id, 'mono32');
  });

  test('exactement 80 % : accepté (tolérance numérique)', () => {
    const r = M.calculer(projetAvec([{ nom: 'Charge', puissanceW: 0.8 * 32 * 230, cosPhi: 1 }]));
    assert.equal(r.retenu.id, 'mono32');
    assert.equal(r.retenu.statut, 'ok');
  });

  test('au-delà du 32 A mono : triphasé, équilibré', () => {
    const r = M.calculer(projetAvec([{ nom: 'Bouilloire', puissanceW: 2000, quantite: 6, cosPhi: 1 }]));
    assert.equal(r.retenu.id, 'tri32');
    assert.equal(r.vuePhases.type, 'tri');
    proche(r.vuePhases.iMaxA, 4000 / 230);
  });

  test('équipement triphasé : offres monophasées impossibles', () => {
    const r = M.calculer(projetAvec([{ nom: 'Four', puissanceW: 11000, alimentation: 'tri', cosPhi: 1 }]));
    for (const e of r.evaluations.filter((x) => x.phases === 1)) assert.equal(e.statut, 'impossible');
    assert.equal(r.retenu.id, 'tri32');
  });

  test('besoin hors gamme : calibre minimal calculé', () => {
    const r = M.calculer(projetAvec([{ nom: 'Gros', puissanceW: 200 * R3 * 400, alimentation: 'tri', cosPhi: 1 }]));
    assert.equal(r.recommandation.motif, 'hors_gamme');
    proche(r.recommandation.ibA, 200, 1e-9);
    proche(r.recommandation.calibreMinA, 250, 1e-9);
    assert.equal(r.retenu, null);
    assert.ok(r.alertes.some((a) => a.code === 'HORS_GAMME' && a.message.includes('250')));
  });

  test('triphasé requis mais seules des offres mono proposées', () => {
    const r = M.calculer(projetAvec([{ nom: 'Four', puissanceW: 6000, alimentation: 'tri' }], { offresProposees: ['mono16', 'mono32'] }));
    assert.equal(r.recommandation.motif, 'tri_requis');
    assert.ok(r.alertes.some((a) => a.code === 'TRI_REQUIS'));
  });

  test('aucune offre proposée', () => {
    const r = M.calculer(projetAvec([{ nom: 'A', puissanceW: 100 }], { offresProposees: [] }));
    assert.equal(r.recommandation.motif, 'aucune_offre');
    assert.ok(r.alertes.some((a) => a.code === 'AUCUNE_OFFRE'));
  });

  test('raccordement imposé insuffisant : alerte et alternative', () => {
    const r = M.calculer(projetAvec([{ nom: 'Charge', puissanceW: 30 * 230, quantite: 3, cosPhi: 1 }], { raccordementImpose: { phases: 3, calibreA: 32 } }));
    assert.equal(r.retenu.source, 'impose');
    proche(r.retenu.taux, 30 / 32);
    assert.equal(r.retenu.statut, 'attention');
    assert.equal(r.alternative.id, 'tri63');
    assert.ok(r.alertes.some((a) => a.code === 'CHARGE_ELEVEE'));
  });

  test('raccordement imposé en surcharge', () => {
    const r = M.calculer(projetAvec([{ nom: 'Charge', puissanceW: 5000, cosPhi: 1 }], { raccordementImpose: { phases: 1, calibreA: 16 } }));
    assert.equal(r.retenu.statut, 'surcharge');
    assert.ok(r.alertes.some((a) => a.code === 'SURCHARGE' && a.niveau === 'erreur'));
  });

  test('monophasé imposé avec un équipement triphasé : erreur', () => {
    const r = M.calculer(projetAvec([{ nom: 'Four', puissanceW: 6000, alimentation: 'tri' }], { raccordementImpose: { phases: 1, calibreA: 63 } }));
    assert.equal(r.retenu.statut, 'impossible');
    assert.ok(r.alertes.some((a) => a.code === 'TRI_SUR_MONO' && a.niveau === 'erreur'));
  });

  test('monophasé au-delà de 63 A signalé', () => {
    const r = M.calculer(projetAvec([{ nom: 'Charge', puissanceW: 70 * 230, cosPhi: 1 }], { raccordementImpose: { phases: 1, calibreA: 100 } }));
    assert.ok(r.alertes.some((a) => a.code === 'MONO_SUP_63'));
  });

  test('déséquilibre au-delà du seuil signalé', () => {
    const r = M.calculer(
      projetAvec([
        { nom: 'Gros', puissanceW: 6000, phase: 'L1', cosPhi: 1 },
        { nom: 'Petit', puissanceW: 500, phase: 'L2', cosPhi: 1 },
      ])
    );
    assert.equal(r.vuePhases.type, 'tri');
    assert.ok(r.alertes.some((a) => a.code === 'DESEQUILIBRE'));
  });
});

test.describe('énergie et source autonome', () => {
  test('énergie journalière et totale (dates)', () => {
    const r = M.calculer(
      projetAvec([{ nom: 'A', puissanceW: 1000, quantite: 2, foisonnement: 0.5 }, { nom: 'Frigo', puissanceW: 200, heuresParJour: 24 }], { heuresParJour: 10 }, { dateDebut: '2026-06-12', dateFin: '2026-06-14' })
    );
    proche(r.energie.eJourKWh, 1000 * 10 / 1000 + 200 * 24 / 1000);
    assert.equal(r.energie.jours, 3);
    assert.equal(r.energie.joursSource, 'dates');
    proche(r.energie.eTotaleKWh, 14.8 * 3);
    assert.equal(r.energie.complete, true);
  });

  test('nombre de jours saisi prioritaire sur les dates', () => {
    const r = M.calculer(projetAvec([{ nom: 'A', puissanceW: 1000 }], { heuresParJour: 8, jours: 2 }, { dateDebut: '2026-06-12', dateFin: '2026-06-20' }));
    assert.equal(r.energie.jours, 2);
    assert.equal(r.energie.joursSource, 'hypothese');
  });

  test('durées manquantes : énergie partielle signalée', () => {
    const r = M.calculer(projetAvec([{ nom: 'A', puissanceW: 1000 }, { nom: 'B', puissanceW: 500, heuresParJour: 2 }]));
    proche(r.energie.eJourKWh, 1);
    assert.equal(r.energie.complete, false);
    assert.equal(r.energie.eTotaleKWh, null);
    assert.ok(r.alertes.some((a) => a.code === 'HEURES_A_COMPLETER'));
  });

  test('source autonome triphasée : √3 U I max / taux', () => {
    const r = M.calculer(projetAvec([{ nom: 'Four', puissanceW: 11000, alimentation: 'tri', cosPhi: 1 }]));
    proche(r.sourceAutonome.sMinVA, (R3 * 400 * (11000 / (R3 * 400))) / 0.8);
    assert.equal(r.sourceAutonome.phases, 3);
  });

  test('source autonome monophasée quand le raccordement retenu est mono', () => {
    const r = M.calculer(projetAvec([{ nom: 'A', puissanceW: 2300, cosPhi: 1 }]));
    assert.equal(r.sourceAutonome.phases, 1);
    proche(r.sourceAutonome.sMinVA, 2300 / 0.8);
  });
});

test.describe('contrôles de vraisemblance et informations', () => {
  test('pièges d’unités', () => {
    const r = M.calculer(projetAvec([{ nom: 'Énorme', puissanceW: 60000 }, { nom: 'Minuscule', puissanceW: 0.5 }]));
    const codes = r.alertes.map((a) => a.code);
    assert.ok(codes.includes('VRAISEMBLANCE_HAUTE'));
    assert.ok(codes.includes('VRAISEMBLANCE_BASSE'));
  });

  test('appareil de plus de 16 A : prise adaptée', () => {
    const r = M.calculer(projetAvec([{ nom: 'Borne 7,4 kW', puissanceW: 7400, cosPhi: 1 }]));
    const a = r.alertes.find((x) => x.code === 'PRISE_SUP_16A');
    assert.ok(a);
    assert.deepEqual(a.lignes, [r.lignes[0].id]);
  });

  test('valeurs types à confirmer', () => {
    const r = M.calculer(projetAvec([{ nom: 'Spot', puissanceW: 30, origine: 'type' }, { nom: 'Écran', puissanceW: 150, origine: 'saisie' }]));
    const a = r.alertes.find((x) => x.code === 'VALEURS_TYPES');
    assert.equal(a.lignes.length, 1);
  });

  test('alertes triées : erreurs, attentions, informations', () => {
    const r = M.calculer(projetAvec([{ nom: 'Charge', puissanceW: 9000, origine: 'type' }, { nom: 'Vide' }], { raccordementImpose: { phases: 1, calibreA: 16 } }));
    const rangs = r.alertes.map((a) => ({ erreur: 0, attention: 1, info: 2 })[a.niveau]);
    assert.deepEqual(rangs, [...rangs].sort((a, b) => a - b));
    assert.equal(r.alertes[0].niveau, 'erreur');
  });

  test('répartition par catégorie triée, parts sommées à 1', () => {
    const r = M.calculer(
      projetAvec([
        { nom: 'Spot', puissanceW: 30, quantite: 10, categorie: 'lumiere' },
        { nom: 'Écran', puissanceW: 150, quantite: 4, categorie: 'video' },
        { nom: 'Café', puissanceW: 1500, categorie: 'catering' },
      ])
    );
    assert.deepEqual(r.parCategorie.map((g) => g.categorie), ['catering', 'video', 'lumiere']);
    proche(r.parCategorie.reduce((s, g) => s + g.part, 0), 1);
  });
});

test.describe('validation des données', () => {
  test('normalisation : valeurs hors domaine écartées et signalées', () => {
    const { projet, avertissements } = M.normaliserProjet({
      info: { nom: '  Mon   stand ', dateDebut: '2026-13-01' },
      hypotheses: { cosPhi: 1.4, tauxChargeMax: '0,7', heuresParJour: 30, offresProposees: ['tri32', 'inconnue', 'mono16'] },
      lignes: [
        { id: 'a', nom: 'X', puissanceW: -5, quantite: 'deux', foisonnement: 2, categorie: 'fusée', alimentation: 'biphasé' },
        { id: 'a', nom: 'Y', puissanceW: '1,5 kW', phase: 'L4' },
        'pas une ligne',
      ],
    });
    assert.equal(projet.info.nom, 'Mon stand');
    assert.equal(projet.info.dateDebut, '');
    assert.equal(projet.hypotheses.cosPhi, 0.85);
    assert.equal(projet.hypotheses.tauxChargeMax, 0.7);
    assert.equal(projet.hypotheses.heuresParJour, null);
    assert.deepEqual(projet.hypotheses.offresProposees, ['mono16', 'tri32']);
    assert.equal(projet.lignes.length, 2);
    const [x, y] = projet.lignes;
    assert.equal(x.puissanceW, null);
    assert.equal(x.quantite, 1);
    assert.equal(x.foisonnement, 1);
    assert.equal(x.categorie, 'divers');
    assert.equal(x.alimentation, 'mono');
    assert.equal(y.puissanceW, 1500);
    assert.equal(y.phase, 'auto');
    assert.notEqual(x.id, y.id, 'identifiants dupliqués régénérés');
    assert.ok(avertissements.length >= 8, avertissements.join('\n'));
  });

  test('objet qui n’est pas un bilan : erreur explicite', () => {
    assert.throws(() => M.normaliserProjet(null), /bilan/);
    assert.throws(() => M.normaliserProjet([1, 2]), /bilan/);
  });

  test('duplication : nouveaux identifiants', () => {
    const p = projetAvec([{ nom: 'A', puissanceW: 10 }]);
    const c = M.dupliquerProjet(p);
    assert.notEqual(c.id, p.id);
    assert.notEqual(c.lignes[0].id, p.lignes[0].id);
    assert.equal(c.info.nom, 'Test (copie)');
    assert.equal(p.info.nom, 'Test');
  });

  test('hypothèses modifiées repérées', () => {
    const h = M.hypothesesParDefaut();
    assert.deepEqual(M.hypothesesModifiees(h), []);
    h.cosPhi = 0.9;
    h.offresProposees = ['tri32'];
    assert.deepEqual(M.hypothesesModifiees(h), ['cosPhi', 'offresProposees']);
  });
});

test.describe('fichiers et lien de partage', () => {
  test('aller-retour fichier JSON (un bilan, puis une sauvegarde)', () => {
    const p = projetAvec([{ nom: 'Écran 55"', puissanceW: 150, quantite: 2, categorie: 'video', note: 'Ligne 1\nLigne 2' }], { heuresParJour: 9 });
    const lu = M.lireFichier(M.serialiserProjet(p));
    assert.equal(lu.projets.length, 1);
    assert.deepEqual(lu.projets[0], p);
    const sauvegarde = M.lireFichier(M.serialiserSauvegarde([p, M.dupliquerProjet(p)]));
    assert.equal(sauvegarde.projets.length, 2);
  });

  test('fichiers refusés avec un message clair', () => {
    assert.throws(() => M.lireFichier('pas du json'), /JSON invalide/);
    assert.throws(() => M.lireFichier('{"a":1}'), /ne provient pas/);
    assert.throws(() => M.lireFichier(JSON.stringify({ format: M.FORMAT_ID, version: 1 })), /sans bilan/);
  });

  test('fichier d’une version plus récente : lu avec avertissement', () => {
    const texte = JSON.stringify({ format: M.FORMAT_ID, version: 99, projet: projetAvec([{ nom: 'A', puissanceW: 1 }]) });
    const lu = M.lireFichier(texte);
    assert.ok(lu.avertissements[0].includes('plus récente'));
  });

  test('lien de partage : aller-retour compressé', async () => {
    const p = projetAvec(
      [
        { nom: 'Spot LED', puissanceW: 30, quantite: 12, categorie: 'lumiere', origine: 'type' },
        { nom: 'Four', puissanceW: 11000, alimentation: 'tri', cosPhi: 1, note: 'Accents éàü & "guillemets"' },
      ],
      { heuresParJour: 10, raccordementImpose: { phases: 3, calibreA: 63 } },
      { nom: 'Stand B12', dateDebut: '2026-06-12', dateFin: '2026-06-14' }
    );
    const code = await M.encoderPartage(p);
    assert.match(code, /^z[A-Za-z0-9_-]+$/);
    const { projet } = await M.decoderPartage(code);
    assert.deepEqual(projet.info, p.info);
    assert.deepEqual(projet.hypotheses, p.hypotheses);
    assert.deepEqual(
      projet.lignes.map(({ id, ...reste }) => reste),
      p.lignes.map(({ id, ...reste }) => reste)
    );
  });

  test('lien de partage non compressé (repli) et lien abîmé', async () => {
    const json = JSON.stringify({ f: M.FORMAT_ID, v: 1, p: { info: { nom: 'Repli' }, lignes: [{ nom: 'A', puissanceW: 5 }] } });
    const code = 'j' + Buffer.from(json).toString('base64url');
    const { projet } = await M.decoderPartage(code);
    assert.equal(projet.info.nom, 'Repli');
    await assert.rejects(M.decoderPartage('zAAAA'), /endommagé/);
    await assert.rejects(M.decoderPartage('xyz'), /endommagé/);
    await assert.rejects(M.decoderPartage('j' + Buffer.from('{"f":"autre"}').toString('base64url')), /ne contient pas/);
  });

  test('export CSV pour Excel', () => {
    const p = projetAvec([
      { nom: 'Spot; "LED"', puissanceW: 30.5, quantite: 12, categorie: 'lumiere' },
      { nom: 'Four', puissanceW: 11000, alimentation: 'tri' },
    ]);
    const csv = M.exporterCSV(p);
    assert.ok(csv.startsWith('\uFEFF'));
    const lignes = csv.slice(1).trim().split('\r\n');
    assert.equal(lignes.length, 3);
    assert.equal(lignes[0].split(';').length, 16);
    assert.ok(lignes[1].startsWith('"Spot; ""LED"""'));
    assert.ok(lignes[1].includes(';30,5;12;'));
    assert.ok(lignes[2].includes('Triphasé;L1-L2-L3'));
  });
});

test.describe('saisie rapide', () => {
  const cas = [
    ['12 spots LED', { quantite: 12, puissanceW: null, requete: 'spots LED' }],
    ['spot led x12', { quantite: 12, puissanceW: null, requete: 'spot led' }],
    ['3x machine à café', { quantite: 3, puissanceW: null, requete: 'machine à café' }],
    ['3 × écran', { quantite: 3, puissanceW: null, requete: 'écran' }],
    ['écran 55', { quantite: null, puissanceW: null, requete: 'écran 55' }],
    ['PAR 64', { quantite: null, puissanceW: null, requete: 'PAR 64' }],
    ['2 frigos 150 W', { quantite: 2, puissanceW: 150, requete: 'frigos' }],
    ['projecteur 1,5 kW', { quantite: null, puissanceW: 1500, requete: 'projecteur' }],
    ['4 plancha 3000w', { quantite: 4, puissanceW: 3000, requete: 'plancha' }],
    ['box 4G', { quantite: null, puissanceW: null, requete: 'box 4G' }],
    ['box 4', { quantite: null, puissanceW: null, requete: 'box 4' }],
    ['2,5 m ruban LED', { quantite: 2.5, puissanceW: null, requete: 'm ruban LED' }],
    ['  ', { quantite: null, puissanceW: null, requete: '' }],
    ['0 spot', { quantite: null, puissanceW: null, requete: '0 spot' }],
    ['clim 2 200 W', { quantite: null, puissanceW: 2200, requete: 'clim' }],
  ];
  for (const [saisie, attendu] of cas) {
    test(JSON.stringify(saisie), () => assert.deepEqual(M.analyserSaisieRapide(saisie), attendu));
  }
});

test.describe('recherche dans la bibliothèque', () => {
  const catalogue = [
    { nom: 'Écran 55"', categorie: 'video', puissanceW: 150, motsCles: ['tv', 'télé', 'moniteur'] },
    { nom: 'Écran 65"', categorie: 'video', puissanceW: 200, motsCles: ['tv'] },
    { nom: 'Réfrigérateur', categorie: 'catering', puissanceW: 150, motsCles: ['frigo'] },
    { nom: 'Spot LED sur rail', categorie: 'lumiere', puissanceW: 30, motsCles: ['projecteur'] },
    { nom: 'Machine à café à capsules', categorie: 'catering', puissanceW: 1500, motsCles: ['expresso', 'cafetière'] },
  ];
  test('accents, majuscules et débuts de mots', () => {
    assert.equal(M.rechercherCatalogue(catalogue, 'ecran 55')[0].nom, 'Écran 55"');
    assert.equal(M.rechercherCatalogue(catalogue, 'ÉCRAN 6')[0].nom, 'Écran 65"');
    assert.equal(M.rechercherCatalogue(catalogue, 'refri')[0].nom, 'Réfrigérateur');
  });
  test('pluriels et mots-clés', () => {
    assert.equal(M.rechercherCatalogue(catalogue, 'frigos')[0].nom, 'Réfrigérateur');
    assert.equal(M.rechercherCatalogue(catalogue, 'spots')[0].nom, 'Spot LED sur rail');
    assert.equal(M.rechercherCatalogue(catalogue, 'cafetière')[0].nom, 'Machine à café à capsules');
    assert.equal(M.rechercherCatalogue(catalogue, 'télé')[0].categorie, 'video');
  });
  test('rien de pertinent : aucun résultat', () => {
    assert.deepEqual(M.rechercherCatalogue(catalogue, 'tronçonneuse'), []);
    assert.deepEqual(M.rechercherCatalogue(catalogue, ''), []);
    assert.deepEqual(M.rechercherCatalogue(catalogue, 'de la'), []);
  });
});

test.describe('import de tableaux', () => {
  test('copier-coller Excel avec en-têtes', () => {
    const texte = 'Désignation\tCatégorie\tPuissance (W)\tQté\tPuissance totale (W)\tAlimentation\n' + 'Spot LED\tLumière\t30\t12\t360\tMono\n' + 'Four mixte\tCatering\t11 000\t1\t11000\tTri 400 V\n';
    const t = M.analyserTableau(texte);
    assert.equal(t.separateur, '\t');
    const d = M.detecterColonnes(t.lignes);
    assert.equal(d.entete, true);
    assert.deepEqual(d.roles, ['nom', 'categorie', 'puissance', 'quantite', 'ignorer', 'alimentation']);
    const { lignes, ignorees } = M.convertirImport(t.lignes, d.roles, d.entete);
    assert.equal(ignorees.length, 0);
    assert.equal(lignes.length, 2);
    assert.equal(lignes[0].categorie, 'lumiere');
    assert.equal(lignes[0].quantite, 12);
    assert.equal(lignes[1].puissanceW, 11000);
    assert.equal(lignes[1].alimentation, 'tri');
  });

  test('CSV au point-virgule sans en-tête : colonnes devinées', () => {
    const t = M.analyserTableau('Spot LED;30;12\nÉcran 55;150;2\n');
    const d = M.detecterColonnes(t.lignes);
    assert.equal(d.entete, false);
    assert.deepEqual(d.roles, ['nom', 'puissance', 'quantite']);
  });

  test('cellules entre guillemets avec retour à la ligne', () => {
    const t = M.analyserTableau('Nom;Puissance\n"Écran\n55 pouces";150\n"Spot ""rail""";30');
    assert.deepEqual(t.lignes[1], ['Écran\n55 pouces', '150']);
    assert.deepEqual(t.lignes[2], ['Spot "rail"', '30']);
  });

  test('puissances en kW et lignes vides ignorées', () => {
    const t = M.analyserTableau('Équipement;P (kW);Nombre\nClim;1,2;2\n;;\nRien;;\n');
    const d = M.detecterColonnes(t.lignes);
    assert.deepEqual(d.roles, ['nom', 'puissance_kw', 'quantite']);
    const { lignes } = M.convertirImport(t.lignes, d.roles, d.entete);
    assert.equal(lignes[0].puissanceW, 1200);
    assert.equal(lignes[1].nom, 'Rien');
    assert.equal(lignes[1].puissanceW, null);
  });
});

test('version de l’application identique à package.json', () => {
  const pkg = require('../package.json');
  assert.equal(M.VERSION_APP, pkg.version);
});

test.describe('conseils de déséquilibre', () => {
  test('phases imposées : à revoir', () => {
    const r = M.calculer(
      projetAvec([
        { nom: 'Gros', puissanceW: 6000, phase: 'L1', cosPhi: 1 },
        { nom: 'Petit', puissanceW: 500, cosPhi: 1 },
      ])
    );
    const a = r.alertes.find((x) => x.code === 'DESEQUILIBRE');
    assert.ok(a.message.includes('Revoir les phases imposées'));
    assert.deepEqual(a.lignes, [r.lignes[0].id]);
  });

  test('répartition automatique déjà optimale : appareil dominant désigné', () => {
    const r = M.calculer(projetAvec([{ nom: 'Borne', puissanceW: 7400, cosPhi: 1 }, { nom: 'Spot', puissanceW: 30, quantite: 10 }]));
    assert.equal(r.retenu.id, 'tri63');
    const a = r.alertes.find((x) => x.code === 'DESEQUILIBRE');
    assert.ok(a.message.includes('« Borne »'), a.message);
    assert.deepEqual(a.lignes, [r.lignes[0].id]);
  });
});

test('récapitulatif CSV de plusieurs bilans, somme brute', () => {
  const a = projetAvec([{ nom: 'A', puissanceW: 1000, quantite: 2 }], { heuresParJour: 10, jours: 2 }, { nom: 'Stand A' });
  const b = projetAvec([{ nom: 'B', puissanceW: 500 }], {}, { nom: 'Stand; B' });
  const csv = M.exporterRecapCSV([a, b]);
  const lignes = csv.slice(1).trim().split('\r\n');
  assert.equal(lignes.length, 4);
  assert.equal(lignes[0].split(';').length, 21);
  assert.ok(lignes[1].startsWith('Stand A;'));
  assert.ok(lignes[2].startsWith('"Stand; B";'));
  assert.ok(lignes[3].startsWith('Somme brute'));
  assert.ok(lignes[3].includes(';2,5;2,5;'), lignes[3]);
  assert.ok(lignes[1].includes(';20;40;'), 'énergie par jour et totale');
});

test('validation des hypothèses saisies', () => {
  assert.equal(M.valeurHypotheseValide('cosPhi', 0.9), true);
  assert.equal(M.valeurHypotheseValide('cosPhi', 0), false);
  assert.equal(M.valeurHypotheseValide('cosPhi', null), false);
  assert.equal(M.valeurHypotheseValide('heuresParJour', null), true);
  assert.equal(M.valeurHypotheseValide('heuresParJour', 25), false);
  assert.equal(M.valeurHypotheseValide('jours', 2.5), false);
  assert.equal(M.valeurHypotheseValide('jours', 3), true);
  assert.equal(M.valeurHypotheseValide('inconnue', 1), false);
});
