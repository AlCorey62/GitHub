# Pourquoi les LED font-elles sauter les différentiels ?

> Courants de fuite et appels de courant : pourquoi les LED et l'électronique font déclencher les différentiels 30 mA, et comment répartir les circuits.

Source : https://www.darkside-energy.com/news/led-et-differentiel/ · Dark Side Energy · Mise à jour : 2026-10-28

26 octobre 2026 · 3 min de lecture

- Les projecteurs LED et les appareils électroniques reliés à la terre laissent fuir en permanence un petit courant vers la terre : sur un même différentiel, ces fuites s'additionnent.
- Un différentiel 30 mA peut déclencher dès que la fuite dépasse 15 mA : sa norme lui interdit seulement de couper jusqu'à la moitié de sa sensibilité.
- La solution n'est jamais de retirer la protection : on répartit les appareils sur plusieurs circuits, chacun avec son différentiel.

Imaginez : une rampe de projecteurs LED de plus sur une ligne déjà bien remplie, et tout s'éteint. Aucun appareil n'est en défaut, le coffret est en bon état, la puissance totale est loin du calibre. Pourtant, le [différentiel 30 mA](https://www.darkside-energy.com/lexique/#differentiel-30-ma) a déclenché. Il n'est pas en panne : il fait exactement ce pour quoi il est conçu.

## Des fuites qui s'additionnent

Les projecteurs LED, comme la plupart des appareils électroniques reliés à la terre (ordinateurs, écrans, consoles, amplificateurs), intègrent un filtre contre les perturbations électromagnétiques. Ce filtre relie les conducteurs à la terre par des condensateurs : un petit courant s'écoule en permanence vers la terre, même quand l'appareil fonctionne parfaitement.

Pour un appareil, ce courant reste faible. Mais un différentiel ne voit pas les appareils un par un : il mesure la somme de toutes les fuites en aval. Par exemple, vingt appareils qui laissent fuir chacun 1 mA, ce sont 20 mA de fuite permanente sur le même différentiel.

## Un 30 mA déclenche avant 30 mA

Un différentiel 30 mA ne coupe pas pile à 30 mA. Sa norme de fabrication (IEC 61008) impose qu'il ne déclenche pas jusqu'à la moitié de sa sensibilité, soit 15 mA, et qu'il déclenche à 30 mA. Entre les deux, il peut couper à tout moment. Avec 20 mA de fuite permanente, il suffit de peu pour franchir le seuil : un appareil de plus, une mise sous tension, de l'humidité sur une liaison.

## À l'allumage, l'appel de courant

À la mise sous tension, chaque driver de LED charge ses condensateurs d'entrée et appelle, pendant un instant très bref, un courant bien supérieur à son courant de fonctionnement. Allumés tous en même temps, des dizaines de drivers peuvent faire déclencher le [disjoncteur](https://www.darkside-energy.com/lexique/#disjoncteur) du circuit, alors que la puissance en fonctionnement est largement dans les limites. Différentiel ou disjoncteur, chacun a son rôle : nous l'expliquons dans [Pourquoi « ça saute » ?](https://www.darkside-energy.com/news/pourquoi-ca-saute/)

## Ce que nous faisons

- **Répartir** les appareils électroniques sur plusieurs circuits, chacun protégé par son propre différentiel : les fuites se partagent au lieu de s'additionner.
- **Garder de la marge** : puisqu'un 30 mA peut couper dès 15 mA, la fuite permanente de chaque circuit doit rester nettement en dessous.
- **Choisir la bonne protection** : pour les ensembles importants d'électronique, des différentiels à immunité renforcée, conçus pour mieux supporter ces fuites et ces appels de courant.
- **Échelonner les allumages** plutôt que tout mettre sous tension d'un coup.

Retirer le différentiel, ou le remplacer par un modèle moins sensible, n'est jamais la solution : le 30 mA est là pour protéger les personnes.

> Un différentiel qui saute avec des LED n'est pas en panne : il additionne des fuites. La réponse, c'est la répartition.

Répartir les circuits fait partie de notre métier : la [distribution électrique événementielle](https://www.darkside-energy.com/distribution-electrique/).

Combien de circuits prévoir ? Listez vos appareils dans le bilan de puissance.

[Ouvrir le bilan de puissance](https://www.darkside-energy.com/bilan-de-puissance/)

[Bleue, rouge, jaune : comment lire une prise P17 ?](https://www.darkside-energy.com/news/lire-une-prise-p17/)
[kVA ou kW : quelle différence ?](https://www.darkside-energy.com/news/kva-ou-kw/)

## Un projet ? Parlons puissance.

Lieu, dates, besoins connus : décrivez-nous votre événement, nous revenons vers vous rapidement.

[Demander un devis](https://www.darkside-energy.com/contact/)
[contact@darkside-energy.com](mailto:contact@darkside-energy.com)
