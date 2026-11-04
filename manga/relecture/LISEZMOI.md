# Relecture des fiches vérifiées

Les fiches des titres les plus lus sont rédigées à partir de sources citées, puis relues par **Pipo (ChatGPT)** et **Mario (Gemini)** avant publication. Une fiche n'apparaît sur le site que si les deux relecteurs l'ont validée.

## Fichiers

| Fichier | Contenu |
|---|---|
| `fiches-a-relire.json` | Fiches en attente : texte complet, sources, points à vérifier en priorité (`notes_relecture`, jamais publiés) |
| `dossier-relecture.md` | Les mêmes fiches en clair, pratiques à lire ou à coller dans une conversation |
| `consigne-relecteurs.md` | La consigne à donner à Pipo et à Mario, avec le format de réponse attendu |
| `retour-pipo-<lot>.json`, `retour-mario-<lot>.json` | Les réponses des relecteurs (à enregistrer ici) |
| `a-corriger.md` | Généré : fiches non publiées et remarques des relecteurs |

## Déroulé

1. Sur l'ordinateur, récupérer la branche du dépôt (`git pull`).
2. Donner à Pipo puis à Mario `consigne-relecteurs.md` et un lot de fiches (10 fiches par conversation, pour qu'ils aient le temps d'ouvrir les sources). Recherche web activée.
3. Enregistrer chaque réponse JSON dans ce dossier : `retour-pipo-1.json`, `retour-mario-1.json`, etc.
4. Intégrer : `node manga/outils/relecture.mjs integrer`. Les fiches validées par les deux passent dans `site/donnees/fiches-verifiees.json` avec la mention « relue par Pipo (ChatGPT) et Mario (Gemini) » ; les autres restent ici, avec les remarques dans `a-corriger.md`.
5. Corriger les fiches signalées (Claude peut le faire à partir de `a-corriger.md`), puis les refaire relire.
6. Régénérer le dossier après correction : `node manga/outils/relecture.mjs dossier`.

Une fiche est aussi bloquée si un relecteur propose un autre âge que celui de la fiche, ou si le contrôle de forme échoue (moins de 2 sources, lien manquant, âge hors échelle, tiret cadratin).

Sur le site, une fiche publiée indique qu'elle a été rédigée et relue par des assistants IA à partir des sources citées. Une lecture humaine reste recommandée pour les titres sensibles.
