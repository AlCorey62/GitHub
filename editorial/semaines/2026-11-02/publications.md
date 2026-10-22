# Semaine du 2 novembre 2026

Statut : **à valider par Damien**. Publication conseillée entre 8 h et 9 h. Visuels dans ce dossier (1200 × 1200).

## Valeurs vérifiées le 22/10/2026

Sources techniques accessibles, lues par Pipo (lundi) et Mario (mardi) ; aucune norme payante lue en entier. Ce n'est pas une vérification de conformité.

- Lundi, groupe en sous-charge : combustion incomplète à faible charge (Kohler, Power Systems Topics 130, 06/2023, p. 2 ; Volvo Penta, manuel 47714681, 08/2023, p. 41) ; « wet stacking », gasoil imbrûlé et suie à l'échappement (Caterpillar LEXE0832, p. 2 ; LEXE20210-00, p. 2) ; pas de dommage immédiat (Caterpillar LEXE0832, p. 2 ; Volvo Penta 2023, p. 41 ; Kohler PST 130, p. 3) ; encrassement, dilution de l'huile, consommation d'huile (Volvo Penta 7745133, p. 17 ; Kohler PST 130, p. 2) ; lustrage des chemises dans les cas extrêmes (Caterpillar LEXE0832, p. 2).
- Seuils : 30 % le plus cité (Cummins PT-7007, p. 1 ; Caterpillar LEXE0832, p. 2 ; Kohler PST 130, p. 2) ; 20 % (Volvo Penta 2023, p. 42) ; plus de 60 % pour de petits groupes portables (SDMO, manuel 33522190901, § 8.2, p. 12) ; plage de 50 à 85 % pour les groupes de secours et de production (Caterpillar LEXE0832, p. 2). Pas de seuil unique : formulation « le plus souvent 30 % ». Exemple 160 kW et 24 kW : 24 ÷ 160 = 15 % (calcul).
- Stage V, filtre à particules colmaté à faible charge (Caterpillar LEXE0832, p. 3 ; Atlas Copco, livre Stage V 2020, p. 7 ; Avtron 2024, p. 3). Remèdes : dimensionnement (Caterpillar LEXE0832, p. 2), groupes arrêtés selon la charge (Cummins FAQ 2017, p. 2), batterie (Atlas Copco 2022, p. 5), banc de charge (Cummins PT-7007, p. 1 ; MTU 2017, p. 43), arrêt plutôt que marche à vide (Volvo Penta 2023, p. 42), remise en charge progressive (Kohler PST 130, p. 3 ; Avtron, p. 3). Groupe surdimensionné pour la pointe (Atlas Copco, page « Hybrid generators » ; Cummins FAQ 2019, p. 2). Noms des constructeurs retirés de l'article.
- Mardi, câble sur touret : chaleur non évacuée (HSA Irlande, alerte 2014) ; point le plus chaud entre les deuxième et troisième couches (IEC 61242 AMD1:2008, art. 19, note) ; risques (Nexans, guide 2014, p. 1 ; HSA). Coefficients 0,80 / 0,61 / 0,49 / 0,42 / 0,38 pour 1 à 5 couches (DIN VDE 0298-4, tableau 27, repris par Lapp, tables T12, table 12-5, et ABB 2CDC400027D0104, p. 10). H07RN-F 3G2,5 : 26 A à l'air libre, 30 °C (DIN VDE 0298-4, tableau 13, repris par Lapp, table 12-9) ; 26 × 0,49 = 12,74 A (calcul) ; 3G2,5 pour les câbles 16 A du parc (site/assets/js/elec.js). Enrouleur 25 m 3G2,5 : 1 000 W enroulé, 3 500 W déroulé (fiche fabricant, marque retirée). Consigne de déroulage (Suva, liste 67081.f, point 8 ; ESTI, bulletin 4/2017, p. 5 ; OPPBTP, 18/09/2023). Retirés : effet inductif, valeur pour un câble en tas, caractère obligatoire du double marquage.
- Mercredi, couleurs P17 (IEC 60309) : bleu 200 à 250 V, rouge 380 à 480 V, terre à 6 h pour le bleu 230 V et le rouge 400 V (vérifié le 19/10/2026 pour l'article du 27/10).
- Jeudi, calcul avec les formules de la calculette (site/assets/js/elec.js), cos φ 0,9 par défaut : 3G6 sur 80 m à 32 A, 7,59 % et 212,5 V en bout de ligne ; 10 mm² : 4,59 % ; charge du calibre 100 % de 32 A ; aucun câble monophasé du parc ne convient sur cette longueur. Limites de 3 % (éclairage) et 5 % (autres usages) pour une installation alimentée par le réseau public basse tension (NF C 15-100, d'après le Guide de l'installation électrique Schneider, page « Limite maximale de la chute de tension »).
- Vendredi : photo de l'armoire P17 (site/assets/img/armoire-p17-1500.jpg), étiquettes du fabricant des prises et autocollant d'un bureau de contrôle floutés pour le visuel ; repérage des câbles visible sur la photo.

---

## Lundi 2/11 · Le sais-tu ? (article du site)

**Visuel** : `2026-11-02-lundi.png`
**Lien** : https://www.darkside-energy.com/news/groupe-en-sous-charge/

**LinkedIn**

> Un groupe électrogène à 15 % de sa puissance toute la nuit ? Il n'aime pas ça.
>
> Peu chargé, le moteur diesel reste froid et brûle mal son gasoil : suie et gasoil imbrûlé s'accumulent dans l'échappement (le « wet stacking »), et le moteur s'encrasse. Le seuil dépend du constructeur, le plus souvent 30 % de la puissance du groupe.
>
> Le premier remède se décide au bilan de puissance : un groupe à la bonne taille. Sinon : des groupes qu'on arrête selon la charge, une batterie, un banc de charge.
>
> Toute l'explication dans notre « Le sais-tu ? » :
> https://www.darkside-energy.com/news/groupe-en-sous-charge/
>
> #événementiel #groupeélectrogène #distributionélectrique #énergie

**Facebook**

> 🔧 Un groupe électrogène trop gros pour sa charge ne s'use pas moins : il s'encrasse. On vous explique pourquoi, et comment l'éviter 👉 https://www.darkside-energy.com/news/groupe-en-sous-charge/

---

## Mardi 3/11 · Le sais-tu ? (article du site, en l'absence d'anecdote)

**Visuel** : `2026-11-03-mardi.png`
**Lien** : https://www.darkside-energy.com/news/cable-sur-touret/

**LinkedIn**

> 26 A déroulé, 12,7 A sur son touret : c'est le même câble.
>
> Enroulé, un câble n'évacue plus sa chaleur, et le point le plus chaud est au cœur du tambour, invisible. Selon la norme DIN VDE 0298-4, une seule couche restante fait déjà perdre 20 % de capacité, trois couches environ la moitié. Un 3G2,5 laissé en trois couches ne tient plus les 16 A de sa prise.
>
> Le bon réflexe : dérouler entièrement dès que la puissance est importante.
>
> Le détail dans notre « Le sais-tu ? » :
> https://www.darkside-energy.com/news/cable-sur-touret/
>
> #événementiel #distributionélectrique #sécuritéélectrique #câbles

**Facebook**

> 🔥 Un câble laissé sur son touret chauffe : en trois couches, un 3G2,5 ne tient plus les 16 A de sa prise. Déroulez-le entièrement 👉 https://www.darkside-energy.com/news/cable-sur-touret/

---

## Mercredi 4/11 · Vrai ou faux

**Visuel** : `2026-11-04-mercredi.png`
**Lien** : https://www.darkside-energy.com/news/lire-une-prise-p17/

**LinkedIn**

> Vrai ou faux : une prise P17 bleue, c'est du 230 V.
>
> Réponse : vrai.
>
> Sur une prise P17 (norme IEC 60309), le bleu correspond aux tensions de 200 à 250 V : c'est le 230 V courant. Le rouge correspond à 380 à 480 V, le 400 V triphasé.
>
> Et la couleur ne travaille pas seule : la position de la broche de terre sert de détrompeur, et une fiche prévue pour une autre tension n'entre pas.
>
> Pour lire une prise P17 d'un coup d'œil :
> https://www.darkside-energy.com/news/lire-une-prise-p17/
>
> #événementiel #distributionélectrique #P17

**Facebook**

> ❓ Vrai ou faux : une prise P17 bleue, c'est du 230 V ? Vrai ! Bleu, de 200 à 250 V ; rouge, de 380 à 480 V. Et le détrompeur évite les erreurs 👉 https://www.darkside-energy.com/news/lire-une-prise-p17/

---

## Jeudi 5/11 · La calculette en situation

**Visuel** : `2026-11-05-jeudi.png`
**Lien** (calcul déjà rempli) : https://www.darkside-energy.com/calculette-electro/?v=32&u=A&ph=1&n=eu&cos=0.9&l=80&lim=5

**LinkedIn**

> 32 A en monophasé sur 80 m : un câble 3G6 suffit ?
>
> Réponse : non.
>
> Avec un cos φ de 0,9 (valeur retenue par défaut), la calculette donne 7,59 % de chute de tension sur 80 m, au-dessus de la limite de 5 % pour les usages autres que l'éclairage : il ne reste que 212,5 V en bout de ligne.
>
> Il faut au moins une section de 10 mm², et la prise P17 32 A est en plus chargée à 100 %.
>
> Le calcul est déjà rempli, à vous d'essayer avec vos longueurs :
> https://www.darkside-energy.com/calculette-electro/?v=32&u=A&ph=1&n=eu&cos=0.9&l=80&lim=5
>
> #événementiel #distributionélectrique #calculette

**Facebook**

> ⚡ 32 A sur 80 m en 3G6 ? 7,59 % de chute de tension : il ne reste que 212,5 V au bout. La calculette vous le dit en deux secondes 👉 https://www.darkside-energy.com/calculette-electro/?v=32&u=A&ph=1&n=eu&cos=0.9&l=80&lim=5

---

## Vendredi 6/11 · Coulisses

**Visuel** : `2026-11-06-vendredi.png` (photo de l'armoire P17, marques tierces floutées)
**Lien** : https://www.darkside-energy.com/nos-produits/

**LinkedIn**

> Bagues de couleur, étiquettes, numéros de départ : sur une armoire, chaque câble se repère d'un coup d'œil.
>
> Sur la photo, une de nos armoires de distribution, avec ses prises P17 bleues (230 V) et rouges (400 V) et ses câbles repérés.
>
> Un repérage soigné permet de savoir d'où part chaque câble, au montage comme au dépannage.
>
> Notre matériel est toujours fourni avec nos équipes, qui l'installent et l'exploitent :
> https://www.darkside-energy.com/nos-produits/
>
> #événementiel #distributionélectrique #coulisses

**Facebook**

> 🏷️ Bagues de couleur, étiquettes, numéros : sur nos armoires, chaque câble se repère d'un coup d'œil 👉 https://www.darkside-energy.com/nos-produits/
