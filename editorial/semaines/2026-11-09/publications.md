# Semaine du 9 novembre 2026

Statut : **à valider par Damien**. Publication conseillée entre 8 h et 9 h. Visuels dans ce dossier (1200 × 1200).

## Valeurs vérifiées le 29/10/2026

Sources techniques accessibles ; aucune norme payante lue en entier. Ce n'est pas une vérification de conformité. Mercredi 11/11 férié : quatre publications cette semaine.

- Lundi, piquet de terre : en TN-S, le piquet de terre du groupe référence le neutre à la terre sans créer de schéma TT ; courant de défaut par le conducteur de protection ; résistance idéalement inférieure à 200 Ω ; mesure avec un appareil de mesure de résistance de terre, pas avec un appareil d'impédance de boucle ; bornes principales de terre des groupes reliées entre elles quand leurs appareils sont utilisés côte à côte (IET, Wiring Matters, été 2011, Mark Coles, « Operation of portable generators », p. 20 à 23). En TT : RA ≤ UB ÷ IΔN, UB = 50 V ; 30 mA : 1 650 Ω ; 300 mA : 165 Ω (ESTI, « Mesure et documentation de la résistance de terre », 01/2021, p. 3, tableau 1 ; calcul 50 ÷ 0,03 = 1 667 Ω, valeur arrondie par l'ESTI). Résistance de terre fonction du sol, de l'humidité et de la température (ESTI, p. 1). Règle RA × IΔn ≤ 50 V de la NF C 15-100 en TT (reprise par des supports de cours et guides de mesure ; texte de la norme non lu). Cohérent avec l'article « TT ou TN » en attente (choix du schéma à l'étude, TN-S avec liaison neutre-terre à la source).
- Mardi, Powerlock : connecteurs unipolaires 400 A et 660 A, jusqu'à 1 000 V en alternatif, cinq câbles en triphasé (quatre sans neutre), contacts protégés, couleurs, détrompage, verrouillage avec outil pour déconnecter, boîtiers séquentiels qui font connecter terre et neutre avant les phases, manipulation réservée à des professionnels formés (Wikipedia, article « Powerlock », lu le 29/10/2026). Ordre terre, neutre, L1, L2, L3 et principe « first mate, last break » (Phase 3 Connectors, page du boîtier Powersafe, nom du fabricant retiré de l'article). Débranchement dans l'ordre inverse (fiche du boîtier séquentiel ITT VEAM, d'après l'extrait du moteur de recherche, page non lisible directement). Perte du neutre : charges monophasées en série entre deux phases sous 400 V (principe électrique, sans valeur chiffrée au-delà de la tension du réseau 230/400 V). Retiré faute de source lisible : la consigne de ne pas déconnecter en charge, le système qui coupe l'alimentation tant que tous les connecteurs ne sont pas en place. Au-delà de 125 A en triphasé, la calculette propose Powerlock 400 A (site/assets/js/elec.js, connectorFor).
- Jeudi, calcul avec les formules de la calculette (site/assets/js/elec.js), cos φ 0,9 par défaut : 30 kW en triphasé, 48,11 A en 400 V (P17 63 A, câble 5G16, 76 % du calibre) et 92,52 A en 208 V (calibre 125 A, 74 %) ; rapport 400 ÷ 208 = 1,92. Réseau 208Y/120 V (ANSI C84.1, tensions nominales des réseaux 60 Hz) ; option « États-Unis et Canada » de la calculette (NETWORKS, us208). Le Canada n'est pas cité dans les publications faute de source lue.
- Vendredi : photo du parc de groupes de nuit (site/assets/img/parc-groupes-nuit-1600.jpg, déjà floutée sur les groupes), nouvelles zones floutées pour le visuel : marque du chariot élévateur et sa référence, étiquette d'un prestataire sur une caisse, petite étiquette sur un groupe. Mât d'éclairage, passages de câbles et extincteurs visibles sur la photo.

---

## Lundi 9/11 · Le sais-tu ? (article du site)

**Visuel** : `2026-11-09-lundi.png`
**Lien** : https://www.darkside-energy.com/news/piquet-de-terre-groupe/

**LinkedIn**

> Un piquet de terre à côté du groupe électrogène : à quoi sert-il vraiment ?
>
> Tout dépend du schéma de liaison à la terre. En TN-S, il sert de référence : le neutre du groupe est relié au sol, et le courant de défaut revient par le conducteur de protection. En TT, il est sur le chemin du courant de défaut : sa résistance doit permettre au différentiel de couper, 1 650 Ω au plus avec un 30 mA.
>
> Dans les deux cas, un piquet de terre se mesure, avec un appareil de mesure de résistance de terre.
>
> Toute l'explication dans notre « Le sais-tu ? » :
> https://www.darkside-energy.com/news/piquet-de-terre-groupe/
>
> #événementiel #groupeélectrogène #sécuritéélectrique #distributionélectrique

**Facebook**

> ⚡ Le piquet de terre près du groupe électrogène : une référence en TN-S, le chemin du courant de défaut en TT. Et dans tous les cas, il se mesure 👉 https://www.darkside-energy.com/news/piquet-de-terre-groupe/

---

## Mardi 10/11 · Le sais-tu ? (article du site, en l'absence d'anecdote)

**Visuel** : `2026-11-10-mardi.png`
**Lien** : https://www.darkside-energy.com/news/powerlock-terre-en-premier/

**LinkedIn**

> Terre en premier, terre en dernier.
>
> Un raccordement Powerlock triphasé, ce sont cinq câbles unipolaires : la terre, le neutre et trois phases. On les branche dans cet ordre : terre, neutre, puis L1, L2 et L3. Et on débranche dans l'ordre inverse.
>
> La terre en premier : si un appareil a un défaut d'isolement, sa carcasse est déjà reliée au conducteur de protection quand arrive la première phase. Le neutre avant les phases : sans lui, des appareils monophasés peuvent recevoir bien plus que 230 V.
>
> Le détail dans notre « Le sais-tu ? » :
> https://www.darkside-energy.com/news/powerlock-terre-en-premier/
>
> #événementiel #distributionélectrique #Powerlock #sécuritéélectrique

**Facebook**

> 🔌 Powerlock : la terre se branche en premier et se débranche en dernier, le neutre passe avant les phases. On vous explique pourquoi 👉 https://www.darkside-energy.com/news/powerlock-terre-en-premier/

---

## Jeudi 12/11 · La calculette en situation

**Visuel** : `2026-11-12-jeudi.png`
**Lien** (calcul déjà rempli) : https://www.darkside-energy.com/calculette-electro/?v=30&u=kW&ph=3&n=us208&cos=0.9

**LinkedIn**

> 30 kW en triphasé : 48 A en Europe, 93 A aux États-Unis.
>
> Même puissance, mais pas la même tension : 400 V entre phases chez nous, 208 V sur le réseau 120/208 V courant aux États-Unis. Avec un cos φ de 0,9 (valeur retenue par défaut), la calculette donne 48,11 A en 400 V et 92,52 A en 208 V : presque deux fois plus d'ampères.
>
> Le calibre passe de 63 A à 125 A, et les câbles suivent.
>
> Le calcul est déjà rempli, à vous de changer de réseau :
> https://www.darkside-energy.com/calculette-electro/?v=30&u=kW&ph=3&n=us208&cos=0.9
>
> #événementiel #distributionélectrique #calculette #international

**Facebook**

> 🌎 30 kW en triphasé : 48 A en 400 V, mais 93 A en 208 V aux États-Unis. La calculette change de réseau en un clic 👉 https://www.darkside-energy.com/calculette-electro/?v=30&u=kW&ph=3&n=us208&cos=0.9

---

## Vendredi 13/11 · Coulisses

**Visuel** : `2026-11-13-vendredi.png` (photo du parc de groupes de nuit, marques tierces floutées)
**Lien** : https://www.darkside-energy.com/distribution-electrique/

**LinkedIn**

> Un parc de groupes électrogènes, de nuit, sous un mât d'éclairage.
>
> Au sol, des passages de câbles protègent les liaisons ; au pied des groupes, des extincteurs.
>
> Un parc éclairé, dégagé et protégé, de jour comme de nuit : c'est le travail de nos équipes, du montage au démontage.
> https://www.darkside-energy.com/distribution-electrique/
>
> #événementiel #distributionélectrique #coulisses #groupeélectrogène

**Facebook**

> 🌙 De nuit aussi, le parc reste éclairé : mât d'éclairage, passages de câbles au sol, extincteurs au pied des groupes 👉 https://www.darkside-energy.com/distribution-electrique/
