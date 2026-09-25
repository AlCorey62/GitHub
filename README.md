# Site web Dark Side Energy

Nouveau site vitrine de Dark Side Energy : distribution électrique événementielle, régie technique, coordination générale, bureau d'étude, consulting, matériel, énergie responsable, références, et deux outils en ligne (bilan de puissance, calculette électro).

Site statique en HTML, CSS et JavaScript, **sans dépendance** : il s'ouvre et se déploie tel quel. Node.js (version 18 ou plus) sert uniquement aux scripts d'assemblage, de contrôle et de test.

## Arborescence

```
site/                      Dossier publié (c'est lui qui est mis en ligne)
  index.html               Accueil
  distribution-electrique/ regie-technique/ coordination-generale/ bureaudetude/ consulting/
  nos-produits/            Matériel, location et vente
  energie-responsable/     Démarche RSE
  references/              Lieux et historique
  entreprise/              L'entreprise, nous rejoindre
  news/                    Le sais-tu ? et actualités (8 articles)
  bilan-de-puissance/      Outil de bilan de puissance
  calculette-electro/      Conversions, chute de tension, repères par connecteur
  contact/                 Formulaire (Netlify Forms) et page de confirmation
  mentions-legales/        Mentions légales et confidentialité
  404.html, robots.txt, sitemap.xml, site.webmanifest, favicon.ico
  assets/css/main.css      Charte graphique complète
  assets/js/               main.js (menu, animations, formulaire), elec.js (formules), bilan.js, calculette.js
  assets/fonts/            Police Archivo auto-hébergée (licence OFL)
  assets/img/              Logos vectorisés, photos optimisées, icônes, image de partage
tools/
  site.config.mjs          Coordonnées, réseaux sociaux, menu : À MODIFIER ICI
  build.mjs                Assemble en-tête, pied de page, SEO, icônes et sitemap dans chaque page
  check.mjs                Contrôle qualité (liens, ancres, titres, images, mentions à compléter)
  serve.mjs                Serveur local de prévisualisation
  og-image.html            Modèle de l'image de partage réseaux sociaux
tests/elec.test.mjs        Tests des formules électriques
netlify.toml               Hébergement Netlify : build, redirections des anciennes URL, en-têtes de sécurité
app.html                   Ancien prototype « Calculateur d'Énergie Stand » (non publié, conservé)
```

## Prévisualiser en local

```bash
node tools/serve.mjs      # puis ouvrir http://localhost:8080
```

## Modifier le contenu

- **Texte d'une page** : éditer directement le fichier `site/<page>/index.html`, entre les balises `<main>`.
- **Titre et description (SEO)** d'une page : le bloc `<!--page { ... } -->` en haut du fichier.
- **Coordonnées, menu, réseaux sociaux** : `tools/site.config.mjs`.
- **Nouvelle page** : copier une page existante, adapter le bloc `<!--page -->` et le contenu.

Puis lancer :

```bash
node tools/build.mjs      # réassemble en-têtes, pieds de page, métadonnées, sitemap
node tools/check.mjs      # vérifie liens, ancres, titres, images
node --test               # vérifie les formules électriques
```

Les blocs entre `<!-- head:start -->` et `<!-- head:end -->` (de même `header`, `breadcrumb`, `cta`, `footer`) sont générés : ne pas les modifier à la main. Les icônes s'écrivent `<svg data-icon="nom"></svg>` (liste dans `tools/icons.json`).

## Mise en ligne sur Netlify

1. Sur Netlify : *Add new site*, *Import from Git*, choisir ce dépôt. Les réglages sont lus dans `netlify.toml` (dossier publié `site`, commande `node tools/build.mjs`).
2. Vérifier le site sur l'adresse provisoire `*.netlify.app`, et tester le formulaire de contact : les messages arrivent dans *Forms* sur Netlify, où l'on peut activer une notification par e-mail vers contact@darkside-energy.com.
3. Bascule du domaine : dans Netlify, *Domain management*, ajouter `www.darkside-energy.com` et `darkside-energy.com`, puis modifier les enregistrements DNS chez le gestionnaire du domaine (aujourd'hui relié à Wix) selon les indications de Netlify. Le certificat HTTPS est créé automatiquement.
4. Une fois la bascule faite, déclarer `https://www.darkside-energy.com/sitemap.xml` dans Google Search Console.

Les anciennes adresses Wix (`/test-externe`, `/single-post/...`, `/en/...`) sont redirigées en 301 vers les nouvelles pages (voir `netlify.toml`) : le référencement acquis est conservé. Les autres adresses (`/distribution-electrique`, `/regie-technique`, `/bureaudetude`, `/consulting`, `/nos-produits`, `/calculette-electro`, `/contact`, `/mentions-legales`, `/news`) sont identiques à l'ancien site.

Autre hébergeur : le dossier `site/` peut être publié tel quel sur n'importe quel hébergement statique. Il faudra alors reprendre les redirections et en-têtes de `netlify.toml` et remplacer Netlify Forms par un autre service de formulaire.

## Points à valider avant la mise en ligne

1. **Mentions légales** : capital social, greffe RCS, numéro de TVA intracommunautaire, hébergeur (surlignés en orange sur la page).
2. **Données issues de sources internes** (Rentman, mémoire technique de juin 2026, document « Métiers Site Internet ») : liste des lieux de référence, gamme de matériel, statut des labels (Label du Spectacle, Prestadd, ISO 20121), part de véhicules électriques (70 %).
3. **Citations** attribuées à Damien Nirel (extraites du mémoire technique).
4. **Durées de conservation des données** proposées dans la politique de confidentialité (3 ans prospects, 2 ans candidatures).
5. **Réseaux sociaux** : liens Facebook et X repris de l'ancien site, à confirmer ou compléter (LinkedIn par exemple) dans `tools/site.config.mjs`.
6. **Images des passages de câbles** : reprises de l'ancien site, vérifier les droits si elles proviennent d'un fournisseur.

## Images

Photos optimisées en WebP et JPEG, logo vectorisé depuis le logo officiel (rouge `#C30000`). Pour régénérer l'image de partage après un changement de slogan : ouvrir `tools/og-image.html` dans un navigateur à 1200 × 630 px et faire une capture vers `site/assets/img/og-image.png`.

## Crédits

Police Archivo (SIL Open Font License 1.1), icônes Lucide (ISC) et Simple Icons (CC0) : voir `site/assets/fonts/OFL-Archivo.txt` et `tools/icons.LICENSE.txt`.
