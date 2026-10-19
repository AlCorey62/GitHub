# Ligne éditoriale et règles d'écriture

À relire avant chaque rédaction. Une publication qui ne respecte pas ces règles n'est pas proposée.

## Pour qui, pour quoi

- **Lecteurs** : organisateurs d'événements, régisseurs, prestataires techniques, exploitants de salles, électriciens. Clientèle exclusivement professionnelle.
- **But** : être utile en une minute de lecture, montrer notre maîtrise du terrain et amener le lecteur vers la calculette, le bilan de puissance ou une demande d'étude.
- **Une publication = une idée**, un chiffre ou une règle concrète, une phrase à retenir, un lien vers le site.

## Exactitude

- Ne jamais inventer une donnée : chiffres, normes, valeurs, durées, retours d'expérience. En cas de doute, ne pas l'écrire ou le signaler à Damien dans la PR.
- Normes et valeurs : citer la référence (NF C 15-100, NF C 18-510, IEC 60309…) et rester aux valeurs établies. Les calculs sont faits avec `site/assets/js/elec.js` (mêmes formules que la calculette) et le détail est donné.
- Hypothèses signalées comme telles (« cos φ de 0,9 retenu par défaut »).
- Les cas terrain viennent uniquement de `anecdotes.md` : pas d'anecdote inventée.

## Confidentialité

- Aucun nom de client, d'artiste, d'événement, de salon ou de prestataire. Lieux en France : nom de la salle possible ; à l'international : ville seulement.
- Pas de mention des Jeux olympiques et paralympiques ni de la FIFA.
- Photos : flouter les marques tierces, les noms d'événements et les plaques d'immatriculation.
- Ne jamais citer Damien ni lui attribuer de propos.

## Ton et forme

- Voix de l'entreprise : « nous ».
- **« Le sais-tu ? »** : seule rubrique où le tutoiement est permis (choix de Damien). Les articles récents s'adressent au lecteur en « vous » : garder ce choix pour la cohérence. Partout ailleurs, et sur les réseaux sociaux : vouvoiement.
- « Dark Side Energy » toujours en entier, jamais d'abréviation.
- Pas de tiret cadratin. Typographie française (espaces avant « : ; ? ! », guillemets « »).
- Phrases courtes, vocabulaire du métier expliqué (lien vers le lexique quand le terme y figure).

## Formats

| Format | Longueur | Contenu |
|---|---|---|
| Le sais-tu ? (site) | 300 à 600 mots | Encadré « À retenir » (3 points), explication, exemple chiffré, phrase à retenir en citation, lien calculette ou bilan |
| Cas terrain (site) | 300 à 500 mots | Situation, ce qui se passait, cause, solution, ce qu'il faut retenir. Anonymisé |
| Vrai ou faux | 60 à 120 mots | Affirmation, réponse, explication en 2 ou 3 phrases, lien vers l'article qui développe |
| Calculette en situation | 60 à 120 mots | Cas chiffré, résultat de la calculette, conclusion pratique, lien vers la calculette |
| Coulisses et métiers | 40 à 100 mots | Photo de terrain, ce qu'on y voit, le savoir-faire derrière |

## Réseaux sociaux

- **LinkedIn** : accroche en une ligne (question ou chiffre), 3 à 6 lignes aérées, lien vers le site, 3 à 5 mots-clés (#événementiel #distributionélectrique…).
- **Facebook** : plus court et plus direct, 1 à 3 émojis au plus, lien vers le site.
- Chaque publication a son visuel (format carré 1200 × 1200).
- Heure conseillée : entre 8 h et 9 h, du lundi au vendredi.

## Avant de proposer une semaine

- Relire `calendrier.md` pour éviter les répétitions avec les articles existants (liste dans `site/news/index.html`).
- Lancer `npm test` : il vérifie les articles en attente (configuration, dates, emplacements libres).
- Récapitulatif lisible dans la PR : texte des articles et des publications, sources des chiffres, points à faire valider.
