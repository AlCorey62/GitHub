# Diffusion sur les réseaux sociaux

La tâche GitHub « Diffusion réseaux sociaux » (`.github/workflows/diffusion.yml`, script `tools/diffusion.mjs`) publie elle-même la publication du jour, du lundi au vendredi vers 8 h 30 (heure de Paris).

Depuis le 27/10/2026, c'est une tâche programmée Claude, du lundi au vendredi à 8 h 26, qui la lance (mode « publier ») après avoir vérifié que la semaine est validée et que le lien du jour répond : les déclenchements programmés de GitHub arrivent avec plusieurs heures de retard et ne servent plus que de secours. Le journal `diffusion.json` empêche tout doublon.

- Elle ne publie que les semaines validées : ligne `Statut : **validé par Damien le JJ/MM/AAAA**` dans `semaines/AAAA-MM-JJ/publications.md`.
- Elle prend le texte, le visuel et le lien du jour, et vérifie d'abord que le lien répond sur le site.
- Elle vérifie aussi que le jeton donne accès à la page Dark Side Energy et pas à une autre page gérée par le même compte. Sinon, elle n'envoie rien.
- Chaque envoi est noté dans `semaines/AAAA-MM-JJ/diffusion.json` : rien n'est publié deux fois, même avec les passages de secours.
- En cas d'échec, GitHub prévient par e-mail. La publication peut alors être relancée à la main (onglet *Actions*, « Diffusion réseaux sociaux », *Run workflow*, mode « publier »).
- Les accès sont rangés dans les secrets du dépôt GitHub. Ils ne sont jamais écrits dans le dépôt, ni envoyés par e-mail ou dans une conversation.

| Réseau | État | Secrets GitHub |
|---|---|---|
| Facebook | Prêt, jeton de la page créé le 20/10/2026 | `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_TOKEN` |
| LinkedIn | En attente de l'accord de LinkedIn sur l'accès à son API | `LINKEDIN_ORG_ID`, `LINKEDIN_TOKEN` (plus tard) |

Tant qu'un réseau n'a pas ses secrets, la tâche l'ignore sans erreur : on publie alors à la main (planification de la page LinkedIn, Meta Business Suite).

## Facebook : mise en place (une fois, environ 30 minutes, sur ordinateur)

Prérequis : avoir le contrôle total de la page Facebook Dark Side Energy. Les intitulés des écrans Meta sont souvent en anglais.

1. Aller sur https://developers.facebook.com, se connecter avec son compte Facebook et s'inscrire comme développeur si ce n'est pas déjà fait.
2. **My Apps** > **Create App**.
   - Nom : « Diffusion Dark Side Energy ». Adresse de contact : l'adresse professionnelle.
   - Cas d'usage : **Manage everything on your Page**.
   - Portefeuille business : celui de Dark Side Energy s'il existe, sinon aucun.
   - Créer l'application.
3. Dans **Dashboard**, ouvrir le cas d'usage **Manage everything on your Page** et cliquer sur **Customize**. Ajouter (**Add**) les autorisations suivantes :
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `pages_manage_engagement`
   - `pages_read_user_content` (nommée `pages_read_user_engagement` dans une page de la documentation Meta)

4. Mettre l'application en ligne. C'est indispensable : selon Meta, ce qu'une application en mode développement publie n'est visible que par les personnes qui ont un rôle sur l'application, donc pas par le public.
   - **App settings** > **Basic**, renseigner :
     - l'icône : https://www.darkside-energy.com/assets/img/icon-512.png ;
     - *Privacy policy URL* : https://www.darkside-energy.com/mentions-legales/ ;
     - *Data deletion instructions URL* : https://www.darkside-energy.com/mentions-legales/#donnees ;
     - la catégorie (*Business and pages*) ;
     - le contact pour la protection des données (vos coordonnées) ;
   - puis menu **Publish** à gauche, vérifier les exigences affichées et cliquer sur **Publish**.

   Hypothèse : pour publier sur notre propre page avec un compte administrateur de l'application, l'accès standard suffit, sans examen par Meta (*App Review*). Si Meta exige un examen pour `pages_manage_posts`, me le signaler avant d'aller plus loin.
5. Ouvrir **Graph API Explorer** (https://developers.facebook.com/tools/explorer/) :
   - choisir l'application « Diffusion Dark Side Energy » ;
   - dans *User or Page*, choisir **Get User Access Token** ;
   - cocher les autorisations de l'étape 3, plus `pages_show_list` et `business_management` ;
   - cliquer sur **Generate Access Token** et choisir la page Dark Side Energy dans la fenêtre Facebook.
6. Ouvrir **Access Token Debugger** (https://developers.facebook.com/tools/debug/accesstoken/) :
   - coller le jeton obtenu, cliquer sur **Debug**, puis sur **Extend Access Token** en bas de page ;
   - copier le nouveau jeton, valable 60 jours.
7. Revenir dans **Graph API Explorer** :
   - coller ce jeton de 60 jours dans le champ *Access Token* ;
   - lancer la requête `GET` sur `me/accounts?fields=id,name,access_token` ;
   - si la réponse est vide (`"data": []`), la page dépend d'un portefeuille business : refaire les étapes 5 et 6 en cochant aussi `business_management` ;
   - si la page Dark Side Energy n'est pas dans la liste (seulement d'autres pages du compte), refaire l'étape 5 : dans la fenêtre Facebook, cliquer sur **Modifier l'accès** et cocher la page Dark Side Energy, puis refaire les étapes 6 et 7. Si elle n'est pas proposée, vérifier dans les paramètres de la page Dark Side Energy (*Accès à la Page*) que votre profil a l'accès Facebook avec contrôle total, ou ajouter `business_management` si elle est gérée dans Meta Business Suite ;
   - la réponse donne, pour la page Dark Side Energy, son `id` et son `access_token`. C'est le jeton de la page, sans date d'expiration.
8. Contrôle : coller ce jeton de page dans **Access Token Debugger**. Le type doit être *Page* et l'expiration **Never** (« Jamais »). Noter aussi la ligne « L'accès aux données expire » : Meta limite l'accès aux données à 90 jours d'inactivité pour les jetons utilisateur, et sa documentation ne précise pas le cas des jetons de page. Si une date s'affiche, prévoir de refaire les étapes 5 à 9 avant cette date.
9. Sur GitHub, dépôt `AlCorey62/GitHub`, aller dans **Settings** > **Secrets and variables** > **Actions** > **New repository secret** et créer deux secrets :
   - `FACEBOOK_PAGE_ID` : l'`id` de la page ;
   - `FACEBOOK_PAGE_TOKEN` : l'`access_token` de la page.
10. Essai sans rien publier : onglet **Actions** > **Diffusion réseaux sociaux** > **Run workflow**, mode « verifier ».
   - La tâche doit finir en vert, avec le nom de la page dans le journal.
   - Elle envoie une photo de test non publiée, puis la supprime aussitôt.

Le jeton de page reste valable tant que les droits ne changent pas. Il faut refaire les étapes 5 à 9 dans trois cas : changement du mot de passe Facebook, retrait des droits sur la page, ou suppression de l'application.

Jeton en place depuis le 20/10/2026 : expiration « Jamais », mais accès aux données limité à environ 3 mois (vers le 18/01/2027). Renouvellement prévu une semaine avant, en refaisant les étapes 5 à 9 (rappel programmé le 11/01/2027).

## LinkedIn : demande d'accès à l'API (une fois)

Pour publier sur une page entreprise, LinkedIn exige que l'application soit validée pour le produit « Community Management API ». C'est gratuit, mais LinkedIn reste libre d'accepter ou de refuser, et ne donne pas de délai.

Prérequis :
- être super administrateur de la page LinkedIn Dark Side Energy ;
- avoir sous la main l'adresse e-mail professionnelle, la raison sociale, l'adresse du siège (celles des mentions légales), le site https://www.darkside-energy.com et la politique de confidentialité https://www.darkside-energy.com/mentions-legales/.

1. Aller sur https://www.linkedin.com/developers/apps et cliquer sur **Create app**.
   - *App name* : « Dark Side Energy Diffusion ». Le nom ne doit contenir ni « LinkedIn » ni « In ».
   - *LinkedIn Page* : Dark Side Energy.
   - *Privacy policy URL* : https://www.darkside-energy.com/mentions-legales/
   - *App logo* : https://www.darkside-energy.com/assets/img/icon-512.png (à télécharger puis envoyer).
   - Accepter les conditions, puis **Create app**.
2. Onglet **Settings** : à côté de la page Dark Side Energy, cliquer sur **Verify**, puis **Generate URL**. Ouvrir ce lien en étant connecté comme super administrateur et confirmer.
3. Onglet **Products** : sur **Community Management API**, cliquer sur **Request access**. Ce produit doit être le seul de l'application : n'en ajouter aucun autre avant, sinon le bouton est grisé et il faut recréer une application.
4. Remplir le formulaire :
   - adresse e-mail professionnelle (LinkedIn envoie un lien de vérification, à surveiller aussi dans les indésirables) ;
   - raison sociale, adresse du siège, site, politique de confidentialité ;
   - cas d'usage : gestion de page (*Page Management*). Texte proposé pour la description :

     > We use the Community Management API only to publish our own organic posts (text and image) on our own LinkedIn Page, Dark Side Energy, from our internal editorial tool, about one post per working day. We do not collect, store or process any LinkedIn member data.

     Traduction : nous utilisons l'API uniquement pour publier nos propres publications (texte et image) sur notre page, depuis notre outil éditorial interne, environ une par jour ouvré ; nous ne collectons, ne stockons ni ne traitons aucune donnée de membres LinkedIn.
5. Envoyer la demande et attendre la réponse de LinkedIn par e-mail. En cas de refus, il faut créer une nouvelle application pour redemander.

Après l'accord :
- la diffusion LinkedIn est ajoutée au script ;
- le jeton se crée avec l'outil **OAuth Token Generator** du portail développeur (https://www.linkedin.com/developers/tools/oauth/token-generator), autorisations `w_organization_social` et `r_organization_social` ;
- il va dans le secret `LINKEDIN_TOKEN`, avec le numéro de la page (visible dans l'adresse de l'espace d'administration de la page) dans `LINKEDIN_ORG_ID`.

Ce jeton dure 60 jours. Il faut le recréer tous les deux mois : les jetons renouvelables sont réservés aux partenaires agréés par LinkedIn.

Le niveau d'accès de départ (*Development*) autorise 500 appels par jour, largement assez. LinkedIn demande que l'intégration soit construite dans les 12 mois suivant l'accord. Ensuite, il faudra probablement demander le niveau *Standard*, avec une courte vidéo de démonstration (à confirmer le moment venu).

## Sources

- Meta, jetons de page longue durée : https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/
- Meta, publier sur une page : https://developers.facebook.com/docs/pages-api/posts
- Meta, créer et publier l'application (cas d'usage Page) : https://developers.facebook.com/documentation/pages-api/create-an-app
- Meta, mode développement et mode en ligne : https://developers.facebook.com/docs/development/build-and-test/app-modes
- LinkedIn, demande d'accès Community Management API : https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review
- LinkedIn, niveaux d'accès et autorisations : https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access
- LinkedIn, durée des jetons : https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens
- LinkedIn, outil de création de jeton : https://learn.microsoft.com/en-us/linkedin/shared/authentication/developer-portal-tools
