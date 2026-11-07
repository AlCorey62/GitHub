# Repérage TDAH

Auto-questionnaire de repérage du TDAH chez l'adulte, construit sur les critères du DSM-5. Il ne fait pas partie du site : il est hors du dossier `site/` et n'est donc pas mis en ligne sur Netlify.

Ouvrir `index.html` dans un navigateur suffit. Les réponses restent dans le navigateur (stockage local), rien n'est envoyé.

## Ce que donne l'outil

- Nombre de symptômes d'inattention (A1) et d'hyperactivité-impulsivité (A2), comparé au seuil du DSM-5 (5 sur 9 à partir de 17 ans, 6 avant).
- Présentation compatible : inattentive, hyperactive-impulsive ou combinée.
- Niveau indicatif : léger, moyen ou sévère.
- Vérification des critères B (avant 12 ans), C (deux contextes), D (retentissement) et durée ; le critère E reste au médecin.
- Profil de fonctionnement inspiré du modèle de Thomas E. Brown (activation, focalisation, effort, émotion, mémoire, action), plus l'agitation.
- Pistes à aborder avec le médecin (troubles qui imitent un TDAH ou s'y ajoutent) et résumé à copier.

## Règles de calcul

| Élément | Règle | Origine |
| --- | --- | --- |
| Symptôme compté | Réponse « Souvent » ou « Très souvent » | Calcul de l'outil (le DSM-5 décrit chaque symptôme comme présent « souvent ») |
| Seuil | 5 symptômes sur 9 dans une dimension à partir de 17 ans, 6 avant | DSM-5 |
| Présentation | Combinée si les deux dimensions atteignent le seuil, sinon celle qui l'atteint | DSM-5 |
| Niveau sévère | Au moins 4 symptômes au-delà du seuil, ou 6 cotés « Très souvent », ou 2 domaines en gêne majeure | Calcul de l'outil |
| Niveau léger | Au plus 1 symptôme au-delà du seuil, 2 cotés « Très souvent », aucun domaine en gêne majeure, 1 au plus en gêne nette | Calcul de l'outil |
| Niveau moyen | Autres cas | Calcul de l'outil |
| Profil | Moyenne sur 4 des réponses rattachées à chaque fonction ; marqué dès 3, modéré dès 2 | Calcul de l'outil |

Les calculs sont dans le bloc `<script id="tdah-scoring">` de `index.html` et testés par `scoring.test.mjs` (lancé par `npm test`).

## Limites

- Les questions sont rédigées pour l'outil et ne sont pas validées scientifiquement. L'échelle ASRS v1.1 de l'OMS, validée, est soumise à licence pour une intégration web (NYU) : elle n'est donc pas reprise mot pour mot.
- Ce n'est pas un diagnostic. Le diagnostic est clinique et posé par un médecin formé au TDAH.

## Sources

- HyperSupers TDAH France : « Comprendre le TDAH », « Le diagnostic des adultes TDAH », « Comment savoir si c'est un TDAH ? » (tdah-france.fr, 2026).
- American Psychiatric Association, DSM-5 et DSM-5-TR, critères du TDAH (via La Revue du Praticien, 2020).
- Haute Autorité de Santé, recommandations TDAH de l'enfant et de l'adolescent, 2024.
- Kessler et al., Adult ADHD Self-Report Scale (ASRS), Psychological Medicine, 2005.
- Shaw, Stringaris, Nigg et Leibenluft, Emotion dysregulation in ADHD, American Journal of Psychiatry, 2014.
- Hupfeld, Abagis et Shah, Living « in the zone » : hyperfocus in adult ADHD, 2019.
