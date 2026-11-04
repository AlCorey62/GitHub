# Mangâge

Site de recherche de mangas (ainsi que manhwas et manhuas) avec un **âge conseillé** pour chaque titre, pensé pour les parents, les médiathèques et les jeunes lecteurs. Indépendant du site Dark Side Energy : il vit dans ce dossier et se publie à part.

- Toute la base AniList est accessible (plusieurs dizaines de milliers de titres), interrogée **en direct** depuis le navigateur du visiteur.
- Filtre principal : l'âge du lecteur (6, 8, 10, 12, 14, 16 ans, adulte). Filtres complémentaires : public visé au Japon, genres, origine, parution, longueur, période, fiabilité.
- Chaque fiche explique l'âge : public de départ, éléments en cause par catégorie (violence, nudité et sexualité, peur, thèmes sensibles), pourcentage de pertinence, indice de fiabilité. Les éléments qui dévoilent l'intrigue sont masqués par défaut.
- Page « Guide des âges » : les sept repères, le calcul pas à pas, le barème complet, les limites.
- Couvertures des titres pour adultes floutées par défaut.

Site statique en HTML, CSS et JavaScript, sans dépendance ni étape de construction.

## Arborescence

```
manga/
  site/                   Dossier publié
    index.html            Page unique : catalogue, fiche (fenêtre), guide (#guide)
    css/style.css         Charte graphique (thèmes clair et sombre)
    js/age.js             Calcul de l'âge conseillé : barème et règles (seul fichier à modifier pour ajuster le barème)
    js/anilist.js         Requêtes à l'API AniList et mise en forme des fiches
    js/app.js             Interface : recherche, filtres, fiche, guide, formulaire de correction
    donnees/ajustements.json  Âges vérifiés à la main (prioritaires sur l'estimation)
    polices/              Atkinson Hyperlegible et Dela Gothic One, auto-hébergées (licence OFL)
    favicon.svg
  outils/serve.mjs        Serveur local de prévisualisation
  tests/age.test.mjs      Tests du calcul de l'âge (lancés aussi par « npm test » à la racine du dépôt)
  netlify.toml            Configuration Netlify propre à ce site (sécurité, cache)
```

## Prévisualiser en local

```bash
node manga/outils/serve.mjs      # puis ouvrir http://localhost:8081
```

Le site doit être servi par un serveur web (pas d'ouverture directe du fichier) et a besoin d'Internet pour joindre AniList.

## Mettre en ligne (Netlify)

1. Netlify, « Add new site », « Import an existing project », choisir ce dépôt.
2. **Base directory : `manga`**. Laisser la commande de build vide. Le dossier publié (`site`) est lu dans `manga/netlify.toml`.
3. Le formulaire « Proposer une correction de l'âge » utilise Netlify Forms (nom `correction-age`). Les propositions arrivent dans l'onglet Forms du site Netlify ; activer une notification e-mail si besoin.

Le site Dark Side Energy n'est pas touché : sa configuration (`netlify.toml` à la racine) publie uniquement `site/`.

## Comment l'âge est calculé

Détail complet dans `site/js/age.js` et sur la page « Guide des âges ». En bref :

1. **Public visé** (étiquette AniList) : kodomo 6 ans, shōnen et shōjo 10 ans, seinen et josei 12 ans, inconnu 10 ans. Jeunesse avec action : 8 ans.
2. **Contenu** : chaque genre ou étiquette sensible déclenche un âge selon sa pertinence (part des contributeurs AniList qui la jugent justifiée). Exemple : Gore dès 30 % : 12 ans ; dès 55 % : 14 ans ; dès 80 % : 16 ans. Étiquettes sous 30 % ignorées.
3. **Contenu doux** : aucun élément sensible, genres paisibles et étiquette apaisante, familiale, éducative ou animalière (60 % ou plus) : 8 ans (6 en jeunesse).
4. **Prudence** : peu d'étiquettes et peu de lecteurs : 14 ans pour un public adulte, 12 ans si le public est inconnu.
5. L'âge retenu est le plus élevé. Les orientations amoureuses (Boys' Love, Yuri, LGBTQ+) ne changent jamais l'âge.

Indice de fiabilité : élevée (12 étiquettes ou plus et 3 000 membres ou plus), moyenne (6 étiquettes et 300 membres), faible sinon.

Les seuils ont été ajustés en contrôlant le résultat sur une quarantaine de titres connus (résultats au 04/11/2026 : One Piece et Naruto 10 ans, Death Note 12 ans, L'Attaque des Titans et Demon Slayer 14 ans, Tokyo Ghoul et Chainsaw Man 16 ans, Berserk adultes, Doraemon 6 ans). Ces ajustements sont des choix éditoriaux, à valider ou à revoir dans `age.js` ; les tests (`tests/age.test.mjs`) vérifient le comportement des règles. Les résultats évoluent avec les votes des contributeurs AniList.

## Vérifier un âge à la main

Ajouter une entrée dans `site/donnees/ajustements.json`. La clé est l'identifiant AniList du titre, visible dans l'adresse de sa fiche (`anilist.co/manga/<identifiant>`) ou dans le champ « manga » d'une proposition reçue par le formulaire. Format :

```json
{
  "<identifiant AniList>": { "age": 12, "source": "Indication de l'éditeur français", "note": "Précision facultative" }
}
```

L'âge vérifié remplace l'estimation, avec la mention « Vérifié » et sa source sur la fiche. L'estimation calculée reste affichée pour comparaison.

## Données et conditions d'utilisation d'AniList

- Source : [AniList](https://anilist.co), base communautaire, via son API publique (GraphQL). Conditions : [docs.anilist.co/guide/terms-of-use](https://docs.anilist.co/guide/terms-of-use).
- Usage gratuit autorisé pour un service non commercial (ou sous 150 dollars de revenus par mois).
- **La collecte massive et le stockage des données AniList sont interdits** : le site ne copie donc pas la base. Chaque visiteur interroge AniList page par page (40 titres par requête), et rien n'est conservé en dehors de sa visite.
- Limite actuelle de l'API : 30 requêtes par minute et par visiteur (90 en temps normal). Le site regroupe ses appels et affiche un message clair si la limite est atteinte.
- Le nom du site ne doit pas contenir « AniList » (règle de nommage de l'API).
- Les couvertures appartiennent à leurs éditeurs ; elles sont affichées depuis les serveurs d'AniList.

## Contrôles

```bash
node --test manga/tests/age.test.mjs   # calcul de l'âge
npm test                      # toute la suite du dépôt (inclut ces tests)
```
