# Relecture des fiches vérifiées

Les fiches des titres les plus lus sont rédigées à partir de sources citées, puis relues par **Pipo (ChatGPT)** et **Mario (Gemini)** avant publication. Une fiche n'apparaît sur le site que si les deux relecteurs l'ont validée.

## Fichiers

| Fichier | Contenu |
|---|---|
| `fiches-a-relire.json` | Fiches en attente : texte complet, sources, points à vérifier en priorité (`notes_relecture`, jamais publiés) |
| `dossier-relecture.md` | Les mêmes fiches en clair |
| `lot-rN-1.md`, `lot-rN-2.md`… | Les fiches à relire dans leur révision actuelle, 10 par lot, avec pour chacune le relecteur attendu : un lot par conversation. Toujours utiliser les lots présents (N = révision la plus récente) |
| `consigne-relecteurs.md` | La consigne à donner à Pipo et à Mario, avec le format de réponse attendu |
| `retour-pipo-<lot>.json`, `retour-mario-<lot>.json` | Les réponses des relecteurs (à enregistrer ici) |
| `a-corriger.md` | Généré : fiches non publiées et remarques des relecteurs |

## Déroulé

1. Sur l'ordinateur, récupérer la branche du dépôt (`git pull`).
2. Donner à Pipo puis à Mario `consigne-relecteurs.md` et un lot (`lot-r3-1.md`, puis `lot-r3-2.md`…), un lot par conversation pour qu'ils aient le temps d'ouvrir les sources. Recherche web activée. Chaque lot indique, fiche par fiche, qui doit la relire.
3. Enregistrer chaque réponse JSON dans ce dossier sous le nom indiqué en tête du lot (`retour-pipo-r3-1.json`, `retour-mario-r3-1.json`…). Ne pas écraser les retours précédents.
4. Intégrer : `node manga/outils/relecture.mjs integrer`. Les fiches validées par les deux passent dans `site/donnees/fiches-verifiees.json` avec la mention « relue par Pipo (ChatGPT) et Mario (Gemini) » ; les autres restent ici, avec les remarques dans `a-corriger.md`.
5. Corriger les fiches signalées (Claude peut le faire à partir de `a-corriger.md`), puis les refaire relire. Une fiche corrigée passe à la révision suivante (« révision 2 » dans son titre) et liste la suite donnée à chaque remarque. Les retours portent le numéro de révision relu : une validation de la révision 1 ne vaut pas pour la révision 2. Enregistrer les nouveaux retours sous un autre nom, par exemple `retour-pipo-r2-1.json`.
6. **Après toute modification de `fiches-a-relire.json`**, régénérer le dossier et les lots : `node manga/outils/relecture.mjs dossier`. Sinon les relecteurs relisent une ancienne version, et leurs retours ne comptent pas pour la révision actuelle.

Une fiche est aussi bloquée si un relecteur propose un autre âge que celui de la fiche, ou si le contrôle de forme échoue (moins de 2 sources, lien manquant, âge hors échelle, tiret cadratin).

Sur le site, une fiche publiée indique qu'elle a été rédigée et relue par des assistants IA à partir des sources citées. Une lecture humaine reste recommandée pour les titres sensibles.
