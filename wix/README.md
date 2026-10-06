# Passation : reconstruire le site dans Wix

Ce dossier permet de reconstruire dans Wix le nouveau site Dark Side Energy (dossier `site/` de cette branche). Il s'adresse à une session Claude ouverte dans l'app Claude desktop sur le Mac de Damien Nirel, avec le navigateur intégré, ou à toute personne qui fait le travail à la main.

- Site de référence : dossier `site/` et aperçu privé https://claude.ai/artifact/3oLiZYj3U6QwUrMFtGLf92
- Dépôt : `AlCorey62/GitHub`, branche `claude/dark-side-energy-website-t6a1qe`
- Site Wix actuel : https://www.darkside-energy.com (pages relevées le 25/09/2026)

## 1. Avant de commencer

1. Travailler depuis l'app Claude desktop sur le Mac : le navigateur intégré n'existe que là. L'app reste ouverte et en ligne pendant toute la session.
2. Damien se connecte lui-même à Wix dans le navigateur intégré (identifiant, double authentification). Claude ne saisit jamais de mot de passe et ne touche pas aux réglages du compte.
3. Sauvegarde : dupliquer le site Wix avant toute modification.
4. Recommandation : travailler sur le site existant (domaine, offre premium, blog et historique de référencement restent en place) sans publier avant la fin. Pendant les travaux, ne publier aucune correction sur le site en ligne : une publication publie tout le brouillon en cours.
5. Ne rien publier sans l'accord de Damien.
6. Si le connecteur Wix est disponible dans la session, l'utiliser pour les articles du blog et les réglages qu'il couvre. Le navigateur intégré sert à la mise en page.

## 2. Contenu du dossier

| Élément | Rôle |
|---|---|
| `wix/pages.csv` | Plan page par page : adresse Wix, action (mettre à jour, créer, renommer), titre et description SEO, titre H1, texte, images, données structurées |
| `wix/textes/` | Texte de chaque page dans l'ordre de lecture (titres, listes, tableaux, citations), liens déjà convertis aux adresses Wix |
| `wix/donnees-structurees/` | Blocs JSON-LD de chaque page, adresses déjà converties aux adresses Wix |
| `wix/llms.txt` | Résumé du site pour les assistants IA, adresses Wix |
| `site/<page>/index.html` | Mise en page de référence |
| `site/assets/img/` | Logo (SVG et PNG), photos, image de partage, icônes |
| `site/assets/fonts/` | Police Archivo (licence libre OFL) |
| `site/robots.txt` | Robots (moteurs de recherche et assistants IA) à laisser passer |

`pages.csv`, `textes/`, `donnees-structurees/` et `llms.txt` sont produits par `node tools/wix-kit.mjs` à partir de `site/`. Après une modification du site : `node tools/build.mjs`, puis `node tools/wix-kit.mjs`.

## 3. Règles de contenu

- Reprendre les textes tels quels : valeurs, unités et références inchangées.
- Typographie française : espace insécable avant « : ; ! ? », guillemets « ». Pas de tiret cadratin.
- Toujours écrire « Dark Side Energy » en entier, jamais d'abréviation.
- Aucun nom de client ni d'artiste (confidentialité), aucune référence olympique (termes protégés, Code du sport, article L141-5), aucun nom de membre de l'équipe hormis Damien Nirel.
- Ne rien inventer : une mention « à compléter » reste signalée tant que Damien n'a pas fourni l'information.

## 4. Charte graphique

- Thème sombre. Fond `#09090a`, surfaces `#141417` et `#1b1b1f`, filets `#26262b`.
- Texte `#f3f3f4`, secondaire `#b4b4bb`, discret `#8b8b94`.
- Rouge du logo `#c30000` (boutons), survol `#d4140c`. Rouge lisible sur fond sombre `#ff4a3d` (liens, accents).
- Police Archivo pour tout le site, titres en gras. La chercher dans les polices Wix, sinon importer les fichiers de `site/assets/fonts/`.
- Logo : `logo-dark-side-energy.svg` (horizontal), `logo-dark-side-energy-empile.svg` (empilé), `logo-dark-side-energy.png`.
- Favicon : `icon-512.png`. Image de partage (réseaux sociaux) : `og-image.png` (1 200 × 630 px).
- Photos : prendre la plus grande version de chaque image citée dans `pages.csv` (`site/assets/img/<nom>-<largeur>.jpg`). Texte alternatif : reprendre l'attribut `alt` de la page de référence.
- Sans équivalent direct dans Wix : le schéma unifilaire animé de l'accueil et les animations d'apparition. Les remplacer par une image fixe ou s'en passer.

## 5. Ordre des opérations

1. Sauvegarde : dupliquer le site Wix.
2. Réglages du site : couleurs et polices du thème, logo, favicon, image de partage, informations de l'entreprise. À faire valider par Damien : la description actuelle de l'entreprise dans Wix mentionne « Vente et installation matériel électrique pour ERP » et « Vente et installation projecteurs innovants pour ERP », activités absentes du nouveau site.
3. En-tête et pied de page :
   - Menu : Métiers (Distribution électrique, Régie technique, Coordination générale, Bureau d'étude, Consulting), Matériel, Énergie responsable, Références, Ressources (Bilan de puissance, Calculette électro, Le sais-tu ?, Questions fréquentes, Lexique), L'entreprise.
   - Bouton « Demander un devis » vers /contact.
   - Pied de page : reprendre celui de `site/index.html` (coordonnées, métiers, ressources, réseaux sociaux, mentions légales).
4. Pages : suivre `pages.csv` dans l'ordre (colonne « Action »). Pour chaque page : sections et textes depuis `wix/textes/`, images, liens internes (liens de page Wix, pas d'adresse tapée à la main), puis réglages SEO (section 8). Montrer chaque page terminée à Damien.
5. Blog : mettre à jour les 8 articles existants. Leurs adresses ne changent pas, aucune redirection à créer. Puis la page /news.
6. Outils de calcul : section 6.
7. Formulaire de contact : section 7.
8. Référencement : section 8.
9. Contrôles (section 9), validation par Damien, publication.

## 6. Outils de calcul (bilan de puissance, calculette électro)

Faits :

- Les deux outils sont des programmes JavaScript (`site/assets/js/elec.js`, `bilan.js`, `calculette.js`, vérifiés par `tests/elec.test.mjs`). L'éditeur Wix ne permet pas de les recréer tels quels.
- Sur le site Wix actuel, la page /calculette-electro renvoie par un bouton vers l'application https://darkside-energy.netlify.app.

Recommandation : héberger les deux outils hors de Wix (par exemple sur l'application Netlify existante) et les afficher dans les pages Wix /bilan-de-puissance et /calculette-electro avec l'élément d'intégration de Wix (iframe). Les textes d'explication (méthode, repères, limites) restent en texte Wix sous l'outil, pour le référencement.

Prérequis non réalisé à ce jour : une version intégrable des outils (pages sans en-tête ni pied de page, intégration autorisée depuis www.darkside-energy.com, bouton « Envoyer mon bilan » qui ouvre /contact dans la fenêtre principale). Sur Wix, le formulaire ne sera pas pré-rempli avec le bilan : prévoir une copie du bilan à coller dans le message.

À défaut : un bouton vers l'outil hébergé, comme aujourd'hui.

Accès : le bilan de puissance est en démo jusqu'à 4 lignes, l'accès complet est réservé aux comptes clients (Netlify Identity, sur invitation). Il doit donc rester hébergé sur Netlify, avec sa page `/compte/` (activation, connexion, mot de passe oublié).

## 7. Formulaire de contact

Champs, dans l'ordre (référence : `site/contact/index.html`) :

| Champ | Type | Obligatoire |
|---|---|---|
| Nom et prénom | Texte | Oui |
| Société | Texte | Non |
| E-mail | E-mail | Oui |
| Téléphone | Téléphone | Non |
| Objet | Liste : Distribution électrique ; Régie technique ou personnel ; Coordination générale ; Bureau d'étude ou audit ; Consulting ; Location de matériel clé en main ; Validation d'un bilan de puissance ; Accès au bilan de puissance en ligne ; Candidature ; Autre demande | Oui |
| Dates de l'événement | Texte, aide « ex. montage le 12, exploitation du 13 au 15 » | Non |
| Lieu | Texte, aide « ex. Lille Grand Palais, hall 1 » | Non |
| Message | Texte long, aide « Décrivez votre projet : type d'événement, besoins connus, puissance, plans disponibles… » | Oui |
| Consentement | Case à cocher : « J'accepte que les informations saisies soient utilisées par Dark Side Energy pour répondre à ma demande. Elles ne sont jamais transmises à des tiers. », lien « En savoir plus » vers /mentions-legales | Oui |

- Message après envoi (remplace la page /contact/merci) : « Message réceptionné ! Merci, votre demande est bien arrivée chez Dark Side Energy. Nous revenons vers vous rapidement. »
- Notifications : contact@darkside-energy.com.
- Les liens du site qui présélectionnent l'objet (`/contact/?objet=...`) pointent simplement vers /contact sur Wix.

## 8. Référencement (moteurs de recherche et assistants IA)

Par page (réglages SEO de la page dans Wix) :

- Adresse, titre et description : colonnes de `pages.csv`.
- Données structurées : ajouter chaque bloc de `wix/donnees-structurees/<page>/` dans le balisage de données structurées de la page, dans l'ordre des fichiers. Avant de coller, remplacer `{{URL_WIX:logo-dark-side-energy.png}}` et `{{URL_WIX:og-image.png}}` par l'adresse de ces images une fois importées dans Wix (adresse en `https://static.wixstatic.com/media/...`). Si Wix refuse un bloc (taille, format), le signaler à Damien sans le tronquer.
- FAQ et lexique : les données structurées ne sont valables que si les questions, réponses et définitions sont visibles sur la page, mot pour mot. Ne pas les reformuler.
- Articles : pas de bloc à ajouter. Wix Blog produit son propre balisage d'article (à vérifier sur un article publié).

Pour le site :

- Redirection 301 : /test-externe vers /bilan-de-puissance. Si Wix ne la crée pas au changement d'adresse de la page, l'ajouter dans le gestionnaire de redirections.
- Version anglaise : le nouveau site a une version anglaise complète sous /en/, avec des adresses en anglais (`site/en/`). Ce dossier ne couvre que le français : dans Wix, l'anglais passe par l'application Wix Multilingual, page par page, à partir des pages de `site/en/`. L'adresse /en/test-externe a été relevée sur l'ancien site : vérifier si une version anglaise est encore active dans Wix.
- robots.txt (éditeur robots.txt de Wix) : vérifier qu'aucun robot listé dans `site/robots.txt` n'est bloqué (pas de « Disallow: / » pour lui). Ne pas ajouter de groupe « Allow: / » par robot : sur Wix, un groupe nommé ferait perdre au robot les exclusions techniques que Wix déclare pour tous (« User-agent: * »).
- llms.txt : d'après la documentation Wix consultée lors de la préparation, Wix le génère automatiquement et permet de le modifier, sous conditions (offre premium, domaine connecté, site indexé), avec un déploiement d'abord en anglais. À vérifier pour un site en français. S'il est modifiable, partir de `wix/llms.txt`. Les versions Markdown des pages et `llms-full.txt` du nouveau site n'ont pas d'équivalent sur Wix.
- Plan du site : Wix génère /sitemap.xml. Le déclarer dans Google Search Console et Bing Webmaster Tools.
- Mentions légales : la section « Cookies et stockage local » est écrite pour le site autonome (« ni outil de mesure d'audience, ni service tiers de suivi »). Sur Wix, elle devient inexacte : Wix dépose ses propres cookies (liste dans la politique de cookies de Wix). La réécrire avec Damien et activer la bannière de consentement de Wix. Hébergeur : Wix.com Ltd., coordonnées à reprendre des conditions d'utilisation de Wix.

## 9. Contrôles avant publication

- Chaque ligne de `pages.csv` : page présente à la bonne adresse, titre, description et H1 conformes.
- Menu, pied de page et liens internes : chaque lien mène à la bonne page.
- Affichage mobile vérifié page par page.
- Formulaire : un envoi de test arrive bien sur contact@darkside-energy.com.
- Outils de calcul : affichés et utilisables, y compris sur mobile.
- Après publication : tester l'accueil, /faq et /bureaudetude avec le test des résultats enrichis de Google (https://search.google.com/test/rich-results) et le validateur Schema.org (https://validator.schema.org).
- Relecture : aucun nom de client, aucun tiret cadratin, aucune abréviation du nom de l'entreprise.

## 10. Limites de la voie Wix (par rapport au site autonome)

- Rendu approché : grilles, polices et animations dépendent de l'éditeur Wix.
- Outils de calcul intégrés depuis un autre hébergement, sans préremplissage du formulaire.
- Moins de maîtrise du balisage : pas de versions Markdown, llms.txt géré par Wix, en-têtes de sécurité gérés par Wix.
- Construction avec le navigateur intégré : lente (éditeur par glisser-déposer, 17 pages et 8 articles). Damien garde l'app ouverte sur son Mac et reste disponible pour la connexion, les autorisations et la publication.

## 11. Points à valider par Damien

À trancher avant publication :

- Mentions légales : capital social, RCS, TVA intracommunautaire, hébergeur.
- Données issues de Rentman et du mémoire technique : lieux de références, labels, « 70 % de nos salariés équipés de véhicules électriques ».
- Citations attribuées à Damien Nirel.
- Durées de conservation des données : 3 ans pour les demandes commerciales, 2 ans pour les candidatures.
- Liens des réseaux sociaux (Facebook, X).
- Droits sur les photos de passages de câbles.
- Relecture technique de la FAQ et du lexique.

Incohérences relevées :

- Anciennes mentions légales Wix : adresse à Phalempin et SIRET 879 105 377 00011 (établissement fermé). Siège actuel : Carvin, SIRET 879 105 377 00029 (adresse complète dans les mentions légales seulement).
- Calibre maximal des armoires : « Du coffret 16 A à l'armoire 2 000 A » (/distribution-electrique et menu, repris de l'ancien site) contre « De 16 A à 1 600 A » (/nos-produits, catalogue de location Rentman).
- Description de l'entreprise dans Wix (projecteurs pour ERP) : voir section 5.

## 12. Message à coller dans la session sur le Mac

```
Construis le nouveau site Dark Side Energy dans Wix avec le navigateur intégré, en suivant la note wix/README.md et le plan wix/pages.csv de la branche claude/dark-side-energy-website-t6a1qe du dépôt GitHub AlCorey62/GitHub. Commence par la section « Avant de commencer » : je me connecte moi-même à Wix dans le navigateur. Avance page par page, montre-moi chaque page terminée et ne publie rien sans mon accord.
```
