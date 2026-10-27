# Programme éditorial « Le sais-tu ? »

Cinq publications par semaine sur LinkedIn et Facebook, du lundi au vendredi, dont deux articles sur le site (rubrique « Le sais-tu ? », en français et en anglais).

## Les fichiers

```
editorial/
  README.md            Ce mode d'emploi
  REGLES.md            Ligne éditoriale et règles d'écriture (à lire avant chaque rédaction)
  RESEAUX.md           Diffusion automatique sur Facebook et LinkedIn : fonctionnement et mise en place des accès
  calendrier.md        Sujets prévus semaine par semaine, avec leur statut
  anecdotes.md         Anecdotes de terrain fournies par Damien : matière des « cas terrain »
  modeles/             Pages modèles d'un article (français et anglais)
  a-paraitre/          Articles validés en attente de leur date de publication
    AAAA-MM-JJ-nom/      fr.html (obligatoire), en.html (facultatif)
  semaines/            Publications réseaux sociaux de chaque semaine
    AAAA-MM-JJ/          publications.md (textes LinkedIn et Facebook), visuels PNG et diffusion.json (journal des envois)
```

## La semaine type

| Jour | Format | Site | Réseaux |
|---|---|---|---|
| Lundi | Le sais-tu ? technique | Article FR et EN | Oui |
| Mardi | Cas terrain anonymisé (à défaut, second « Le sais-tu ? ») | Article FR et EN | Oui |
| Mercredi | Vrai ou faux | Non | Oui |
| Jeudi | La calculette en situation | Non (lien vers la calculette) | Oui |
| Vendredi | Coulisses et métiers | Non | Oui |

## Le circuit

1. **Rédaction** : chaque jeudi, la semaine suivante non encore préparée est rédigée (articles dans `a-paraitre/`, textes et visuels dans `semaines/`) et proposée dans une demande de fusion (PR) avec le récapitulatif lisible.
2. **Validation** : Damien relit la semaine sur la page de relecture (https://claude.ai/artifact/NTaN4bsPi1FPkt4mbPPStv, mise à jour à chaque rédaction avec `node tools/relecture.mjs`), puis corrige ou valide. Rien n'est publié sans son accord : à sa validation, le statut de `publications.md` devient `**validé par Damien le JJ/MM/AAAA**` et la PR est fusionnée.
3. **Publication des articles** : du lundi au vendredi à 8 h 26 (heure de Paris), une tâche programmée Claude lance la tâche GitHub « Publication programmée » (`.github/workflows/publication.yml`) quand un article validé est dû : `node tools/publier.mjs`, puis construction, contrôles et tests, puis envoi sur main, que Netlify publie en 1 à 2 minutes. Les déclenchements programmés de GitHub (4 h 17 et 5 h 47 UTC) restent en secours : depuis le 22/10/2026, ils arrivent avec plusieurs heures de retard. En cas d'échec, rien n'est envoyé, GitHub prévient par e-mail et Claude prévient Damien ; la tâche peut aussi être lancée à la main depuis l'onglet *Actions* du dépôt.
4. **Réseaux sociaux** : juste après, la même tâche programmée Claude lance la tâche GitHub « Diffusion réseaux sociaux » (`.github/workflows/diffusion.yml`) publie le texte et le visuel du jour des semaines validées, après avoir vérifié que le lien répond. Facebook dès que le jeton de la page est en place, LinkedIn après l'accord de LinkedIn : voir `RESEAUX.md`. D'ici là, les textes de `semaines/AAAA-MM-JJ/publications.md` se programment à la main (planification de la page LinkedIn, Meta Business Suite). Les flux RSS du site (`/news/feed.xml`, `/en/did-you-know/feed.xml`) restent disponibles pour un outil tiers.
5. **Mesure** : chaque mois, dans Google Analytics (sources linkedin.com et facebook.com, événement `generate_lead`) et dans les statistiques LinkedIn et Facebook, on garde les formats qui marchent.

## Publier un article à la main

```bash
node tools/publier.mjs --date 2026-10-26   # publie tout ce qui est daté du 26/10/2026 ou avant
npm run build && npm run check && npm test
```

Le script place les pages dans `site/`, relie l'article au précédent, ajoute sa carte en tête de « Le sais-tu ? » et des trois derniers articles de l'accueil, puis l'ajoute à llms.txt.

## Page de relecture

```bash
node tools/relecture.mjs editorial/semaines/2026-10-26 <dossier de sortie>
```

Rassemble sur une page, jour par jour : visuel, textes LinkedIn et Facebook (bouton Copier), lien et texte complet des articles du site. La page est republiée à la même adresse chaque semaine.

## Visuels

```bash
node tools/visuels.mjs editorial/semaines/2026-10-26
```

Produit un visuel 1200 × 1200 par publication à partir des champs « Visuel » de `publications.md` (Chromium et Playwright nécessaires).
