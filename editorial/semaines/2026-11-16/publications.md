# Semaine du 16 novembre 2026

Statut : **à valider par Damien**. Publication conseillée entre 8 h et 9 h. Visuels dans ce dossier (1200 × 1200).

## Valeurs vérifiées le 05/11/2026

Règles françaises d'abord (demande de Damien du 04/11/2026) : textes et bases de données français en priorité ; aucune recommandation étrangère cette semaine. Aucune norme payante lue. Ce n'est pas une vérification de conformité.

- Lundi, HVO : nom « gazole XTL », « gazole paraffinique de synthèse et gazole obtenu par hydrotraitement », norme NF EN 15940:2023 ; suppression de la limitation aux flottes captives et distribution en station-service possible ; étiquetage spécifique sur les appareils de distribution ; usage limité aux « véhicules compatibles avec ce carburant », liste des véhicules routiers compatibles fixée par décision publiée au Journal officiel (arrêté du 26 juin 2024 modifiant l'arrêté du 28 février 2017, NOR ECOR2404819A, JORF n° 0153 du 30 juin 2024, lu sur Légifrance le 05/11/2026). L'arrêté ne parle ni des groupes électrogènes ni des engins non routiers : pour un groupe, l'article renvoie à l'accord du constructeur du moteur (même logique de compatibilité, formulée comme une précaution, sans valeur chiffrée). Matières premières citées : huiles alimentaires usagées et graisses animales (intitulés de la Base Carbone).
- Lundi, émissions (Base Carbone de l'ADEME, jeu de données ouvert « Base carbone® » sur data.ademe.fr, lu le 05/11/2026, éléments au statut « Valide générique ») : gazole non routier 89,4 kg CO2e/GJ PCI (élément 13990) et 3,16 kg CO2e/litre (élément 14015) ; HVO 100 à base d'huiles alimentaires usagées, sans changement d'affectation des sols, 15,8 kg CO2e/GJ PCI (élément 34920) et 0,544 kg CO2e/litre (élément 37112) ; HVO 100 à base de graisses animales, sans changement d'affectation des sols, 20,7 kg CO2e/GJ PCI (élément 34921) et 0,712 kg CO2e/litre (élément 37113). Écarts calculés à énergie égale : 1 − 15,8 ÷ 89,4 = 82,3 %, arrondi à 82 % ; 1 − 20,7 ÷ 89,4 = 76,8 %, arrondi à 77 % (calcul). Le chiffre de 83 % annoncé par un distributeur (comparaison par litre avec le gazole routier B7 à 3,1 kg CO2e/litre) et son « jusqu'à 90 % » ne sont pas repris. Retirés faute de vérification : comparaison de masse volumique et de consommation avec le gazole, avis de constructeurs.
- Lundi, offre de Dark Side Energy : groupes HVO et cuve HVO (pages Énergie responsable et Matériel du site). **À valider par Damien** : formulation « groupes au HVO » dans la phrase de liaison ; aucun modèle de groupe compatible n'est cité.
- Mardi, bilan de puissance : informations demandées par le bilan en ligne (désignation, zone, quantité, puissance unitaire en W, type mono ou tri, phase, cos φ, foisonnement, réseau disponible triphasé 400 V ou monophasé 230 V, réserve de puissance) et mentions « plaque signalétique ou fiche technique », « données terrain accumulées depuis 2016 », « conditions de pose, sélectivité, régimes de fonctionnement et criticité des charges restent à vérifier » (site/bilan-de-puissance/). Exemple calculé avec powerBalance de site/assets/js/elec.js, réserve de 20 % (valeur par défaut du bilan), cos φ 1 retenu pour l'exemple : 10 × 1 000 W, foisonnement 1 : 10 kVA, 43,48 A, 52,17 A avec la réserve, calibre 63 A, P17 63 A monophasé, source 12 kVA ; foisonnement 0,6 : 6 kVA, 26,09 A, 31,30 A avec la réserve, calibre 32 A, P17 32 A monophasé, source 7,2 kVA.
- Mercredi, vidéo du groupe Twin : textes repris de l'article en ligne « groupe Twin zéro coupure » (/news/groupe-twin-zero-coupure/) et du lexique (« Groupe Twin zéro coupure ») : deux groupes synchronisés, chacun 50 % de la charge, chacun dimensionné pour la reprendre seul, reprise sans coupure par le groupe déjà en route, ordinateurs et consoles son et lumière qui restent alimentés. Le vrai ou faux sur la longueur des câbles passe en réserve (calendrier).
- Vidéos : animations sans son (légendes à l'écran), 24 s, 1080 × 1080, fabriquées par tools/videos.mjs ; la vidéo du lundi reprend les valeurs du lundi ci-dessus (arrêté du 26/06/2024, Base Carbone de l'ADEME).
- Jeudi, calcul avec convert et recommendLine de site/assets/js/elec.js, cos φ 0,9 par défaut : 25 kW en monophasé 230 V : 27,78 kVA, 120,77 A ; 120,77 ÷ 32 = 3,77 (calcul) ; message de la calculette au-delà de 32 A en monophasé : « pas de câble monophasé dans notre parc, passez en triphasé » (site/assets/js/calculette.js) ; 25 kW en triphasé 400 V : 40,09 A, P17 63 A triphasé, câble 5G16, 63,6 % du calibre.
- Vendredi : photo des câbles au pied des conteneurs (site/assets/img/conteneurs-cables-1600.jpg, publiée sur la page d'accueil depuis le 12/10/2026 ; plaque du pick-up et étiquettes à droite déjà floutées). Nouvelles zones floutées pour le visuel : logo du pick-up, étiquettes des bouteilles d'eau, deux autocollants sur le conteneur sombre. Visibles sur la photo : câbles sortant des conteneurs sous des protections grises, posés au sol en faisceaux parallèles. **À valider par Damien** : droits sur la photo pour les réseaux sociaux (calendrier).

---

## Lundi 16/11 · Le sais-tu ? (article du site)

**Vidéo** : `hvo-emissions.mp4` (24 s, animation `editorial/videos/hvo-emissions.html`)
**Visuel** : `2026-11-16-lundi.png` (visuel de secours)
**Lien** : https://www.darkside-energy.com/news/hvo-groupe-electrogene/

**LinkedIn**

> Le HVO, on peut le mettre dans n'importe quel groupe électrogène ?
>
> Non. En France, ce carburant s'appelle « gazole XTL » et doit respecter la norme NF EN 15940. Depuis l'arrêté du 26 juin 2024, il peut être vendu en station-service, mais il ne s'utilise que dans des véhicules compatibles. Pour un groupe, c'est l'accord du constructeur du moteur qui compte.
>
> Le gain se mesure sur le cycle de vie : selon la Base Carbone de l'ADEME, de 77 à 82 % de gaz à effet de serre en moins que le gazole non routier, à énergie égale, selon la matière première.
>
> Toute l'explication dans notre « Le sais-tu ? » :
> https://www.darkside-energy.com/news/hvo-groupe-electrogene/
>
> #événementiel #groupeélectrogène #HVO #énergie

**Facebook**

> 🌱 Le HVO remplace le gazole, mais seulement dans un moteur qui l'accepte. Selon l'ADEME, de 77 à 82 % d'émissions en moins sur son cycle de vie 👉 https://www.darkside-energy.com/news/hvo-groupe-electrogene/

---

## Mardi 17/11 · Le sais-tu ? (article du site, aucune anecdote disponible)

**Visuel** : `2026-11-17-mardi.png`
**Lien** : https://www.darkside-energy.com/news/bilan-de-puissance-informations/

**LinkedIn**

> Avant de demander une étude électrique, que faut-il réunir ?
>
> Cinq informations : la liste des appareils et leurs quantités, la puissance unitaire de chacun, le raccordement (monophasé ou triphasé), le foisonnement et le réseau du lieu.
>
> Le foisonnement pèse lourd : dix appareils de 1 000 W en monophasé demandent une P17 63 A s'ils fonctionnent tous ensemble, une P17 32 A si six au plus tournent en même temps (réserve de 20 % comprise).
>
> Le détail dans notre « Le sais-tu ? » :
> https://www.darkside-energy.com/news/bilan-de-puissance-informations/
>
> #événementiel #distributionélectrique #bilandepuissance

**Facebook**

> 📋 Appareils, puissances, monophasé ou triphasé, foisonnement, réseau du lieu : les cinq informations pour lancer une étude électrique 👉 https://www.darkside-energy.com/news/bilan-de-puissance-informations/

---

## Mercredi 18/11 · En vidéo

**Vidéo** : `groupe-twin-zero-coupure.mp4` (24 s, animation `editorial/videos/groupe-twin-zero-coupure.html`)
**Visuel** : `2026-11-18-mercredi.png` (visuel de secours)
**Lien** : https://www.darkside-energy.com/news/groupe-twin-zero-coupure/

**LinkedIn**

> Groupe Twin zéro coupure : comment passe-t-on d'un groupe à l'autre sans coupure ?
>
> Deux groupes électrogènes synchronisés fournissent chacun 50 % de la charge, et chacun est dimensionné pour la reprendre seul. Si l'un tombe en panne, l'autre, déjà en route, reprend toute la charge : ordinateurs et consoles son et lumière restent alimentés.
>
> Toute l'explication dans notre « Le sais-tu ? » :
> https://www.darkside-energy.com/news/groupe-twin-zero-coupure/
>
> #événementiel #groupeélectrogène #distributionélectrique

**Facebook**

> 🎬 Deux groupes synchronisés, chacun à 50 % de la charge : si l'un tombe en panne, l'autre reprend tout, sans coupure 👉 https://www.darkside-energy.com/news/groupe-twin-zero-coupure/

---

## Jeudi 19/11 · La calculette en situation

**Visuel** : `2026-11-19-jeudi.png`
**Lien** (calcul déjà rempli) : https://www.darkside-energy.com/calculette-electro/?v=25&u=kW&ph=1&n=eu&cos=0.9

**LinkedIn**

> 25 kW en monophasé : une P17 32 A suffit ?
>
> Réponse : non, et de loin.
>
> Avec un cos φ de 0,9 (valeur retenue par défaut), 25 kW en 230 V demandent 120,77 A, près de quatre fois les 32 A de la prise. La calculette le dit : au-delà de 32 A en monophasé, passez en triphasé.
>
> En triphasé 400 V, les mêmes 25 kW ne demandent plus que 40,09 A par phase : une P17 63 A triphasée et un câble 5G16 suffisent.
>
> Le calcul est déjà rempli, à vous d'essayer avec vos puissances :
> https://www.darkside-energy.com/calculette-electro/?v=25&u=kW&ph=1&n=eu&cos=0.9
>
> #événementiel #distributionélectrique #calculette

**Facebook**

> ⚡ 25 kW en monophasé ? 120,77 A, près de quatre fois une P17 32 A. En triphasé, 40,09 A : une P17 63 A suffit 👉 https://www.darkside-energy.com/calculette-electro/?v=25&u=kW&ph=1&n=eu&cos=0.9

---

## Vendredi 20/11 · Coulisses

**Visuel** : `2026-11-20-vendredi.png` (photo des câbles au pied des conteneurs, marques tierces floutées)
**Lien** : https://www.darkside-energy.com/distribution-electrique/

**LinkedIn**

> Au pied des conteneurs, des dizaines de câbles de puissance, posés côte à côte.
>
> Sur la photo, les câbles sortent des conteneurs sous des protections grises, puis courent au sol en faisceaux parallèles, sans se croiser.
>
> Des câbles bien rangés se suivent d'un coup d'œil et se repèrent plus facilement, au montage comme au démontage. C'est le quotidien de nos techniciens électriciens :
> https://www.darkside-energy.com/distribution-electrique/
>
> #événementiel #distributionélectrique #coulisses

**Facebook**

> 🔌 Au pied des conteneurs, des dizaines de câbles posés côte à côte, sans se croiser 👉 https://www.darkside-energy.com/distribution-electrique/
