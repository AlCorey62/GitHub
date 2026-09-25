# Calculette électro.

> Calculette électrique gratuite : conversion W, kVA et ampères en mono 230 V et tri 400 V, chute de tension NF C 15-100, repères P17 et Powerlock.

Source : https://www.darkside-energy.com/calculette-electro/ · Dark Side Energy · Mise à jour : 2026-09-25

Les conversions et les calculs du quotidien de l'électro événementiel. Les calculs se font dans votre navigateur : aucune donnée n'est envoyée.

- [Puissance et intensité](https://www.darkside-energy.com/calculette-electro/#conversion)
- [Chute de tension](https://www.darkside-energy.com/calculette-electro/#chute-de-tension)
- [Repères par connecteur](https://www.darkside-energy.com/calculette-electro/#reperes)
- [L'appli mobile](https://www.darkside-energy.com/calculette-electro/#appli)

## Puissance et intensité.

Saisissez une valeur connue : la calculette en déduit l'intensité, les puissances active, apparente et réactive.

## La section dépend aussi de la longueur.

Calcul selon la méthode de la norme NF C 15-100. Indiquez la ligne à vérifier, la calculette donne la chute de tension et la section minimale pour rester dans la limite choisie.

Ce calcul ne vérifie ni le courant admissible du câble selon son mode de pose, ni l'échauffement, ni la protection contre les surcharges et les courts-circuits. Pour une installation réelle, faites valider votre dimensionnement par une étude.

## Formules et hypothèses utilisées.

### Puissance et intensité

- Monophasé 230 V : S = U × I, soit I = S ÷ 230.
- Triphasé 400 V : S = √3 × U × I, soit I = S ÷ (√3 × 400), intensité par phase.
- Puissance active P = S × cos φ, puissance réactive Q = S × sin φ.
- Hypothèse par défaut : cos φ = 0,9, modifiable.

### Chute de tension

- u = b × (ρ × L ÷ S × cos φ + λ × L × sin φ) × I, avec b = 1 en triphasé et b = 2 en monophasé.
- ρ = 0,0225 Ω·mm²/m pour le cuivre et 0,036 Ω·mm²/m pour l'aluminium (résistivité en service normal), λ = 0,08 mΩ/m.
- ΔU % = 100 × u ÷ U0, avec U0 = 230 V, tension entre phase et neutre.
- Limites de la norme NF C 15-100 pour une installation alimentée par le réseau public basse tension : 3 % pour l'éclairage, 5 % pour les autres usages.

Ces calculs ne vérifient ni le courant admissible du câble selon son mode de pose, ni la protection contre les surcharges et les courts-circuits. Les termes techniques sont expliqués dans le [lexique](https://www.darkside-energy.com/lexique/).

## Combien de kVA derrière chaque connecteur ?

Puissance apparente maximale théorique, sans foisonnement ni marge : S = U × I en monophasé 230 V, S = √3 × U × I en triphasé 400 V.

| Connecteur ou matériel | Réseau | Intensité | Puissance apparente |
| --- | --- | --- | --- |
| Prise 16 A | Monophasé 230 V | 16 A | 3,7 kVA |
| P17 32 A monophasé | Monophasé 230 V | 32 A | 7,4 kVA |
| P17 16 A triphasé | Triphasé 400 V | 16 A | 11,1 kVA |
| P17 32 A triphasé | Triphasé 400 V | 32 A | 22,2 kVA |
| P17 63 A triphasé | Triphasé 400 V | 63 A | 43,6 kVA |
| P17 125 A triphasé | Triphasé 400 V | 125 A | 86,6 kVA |
| Armoire 250 A | Triphasé 400 V | 250 A | 173,2 kVA |
| Powerlock 400 A | Triphasé 400 V | 400 A | 277,1 kVA |
| Armoire 1 000 A | Triphasé 400 V | 1 000 A | 692,8 kVA |
| Armoire 1 600 A | Triphasé 400 V | 1 600 A | 1 108,5 kVA |
| Armoire 2 000 A | Triphasé 400 V | 2 000 A | 1 385,6 kVA |

## Emportez la calculette dans votre poche.

Notre application mobile convertit W, A, VA et kVA en monophasé et en triphasé, avec un historique de vos calculs.

Elle s'installe sur l'écran d'accueil de votre téléphone : sur iPhone, ouvrez-la dans Safari puis « Partager » et « Sur l'écran d'accueil ».

[Ouvrir l'appli Calc Dark Side](https://darkside-energy.netlify.app/)

## Un calcul plus complexe ?

Sélectivité, courants de court-circuit, schémas unifilaires : notre bureau d'étude prend le relais.

[Consulter le bureau d'étude](https://www.darkside-energy.com/contact/?objet=bureau)
[contact@darkside-energy.com](mailto:contact@darkside-energy.com)
