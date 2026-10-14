# Calculette électro.

> Calculette électrique gratuite, installable et hors ligne : conversions W, kVA et ampères, prise et câble conseillés, chute de tension NF C 15-100.

Source : https://www.darkside-energy.com/calculette-electro/ · Dark Side Energy · Mise à jour : 2026-10-14

Conversions, raccordement conseillé et chute de tension, en France comme à l'étranger. Les calculs se font sur votre appareil : aucune donnée n'est envoyée.

- [Calculette](https://www.darkside-energy.com/calculette-electro/#conversion)
- [Chute de tension](https://www.darkside-energy.com/calculette-electro/#chute-de-tension)
- [Méthode](https://www.darkside-energy.com/calculette-electro/#methode)
- [Repères par connecteur](https://www.darkside-energy.com/calculette-electro/#reperes)
- [Installer l'appli](https://www.darkside-energy.com/calculette-electro/#installer)

## Formules et hypothèses utilisées.

### Puissance et intensité

- Monophasé : S = U0 × I, avec U0 la tension simple, entre phase et neutre (230 V en Europe).
- Triphasé : S = √3 × U × I, avec U la tension composée, entre phases (400 V en Europe). L'intensité est donnée par phase.
- Biphasé, au Japon uniquement (réseau monophasé à trois fils 100/200 V) : S = U × I, avec U = 200 V entre les deux phases.
- Puissance active P = S × cos φ, puissance réactive Q = S × sin φ.
- Hypothèse par défaut : cos φ = 0,9, modifiable.

### Réseaux à l'étranger

- Europe et Royaume-Uni : 230/400 V, 50 Hz.
- États-Unis et Canada : 120/208 V, 60 Hz.
- États-Unis : 277/480 V, 60 Hz.
- Canada : 347/600 V, 60 Hz.
- Mexique : 127/220 V, 60 Hz.
- Japon, est (Tokyo) : 100/200 V, 50 Hz.
- Japon, ouest (Osaka) : 100/200 V, 60 Hz.

Au Japon : 100 V en monophasé, 200 V en biphasé (monophasé à trois fils) et en triphasé. Ce sont des tensions nominales. Un réseau personnalisé est possible. Vérifiez toujours sur place la tension réellement fournie.

### Raccordement conseillé

- La calculette retient le plus petit calibre de notre parc supérieur ou égal à l'intensité calculée. En monophasé : prise 16 A (câble 3G2,5) et P17 32 A (3G6). En triphasé : P17 32, 63 et 125 A (5G6, 5G16, 5G35) et Powerlock 400 A (unifilaires 150 ou 240 mm²). Câbles souples en cuivre.
- Au-delà de 80 % du calibre, la marge est signalée comme faible.
- Au-delà de 32 A en monophasé ou de 400 A en triphasé, le raccordement est à étudier.
- En biphasé (Japon), la calculette donne le calibre normalisé : notre parc ne liste pas de câble biphasé.
- Si la chute de tension dépasse la limite, la calculette indique la section minimale et, s'il existe, le câble du parc qui convient.

### Chute de tension

- u = b × (ρ × L ÷ S × cos φ + λ × L × sin φ) × I, avec b = 1 en triphasé et b = 2 en monophasé et en biphasé.
- ρ = 0,0225 Ω·mm²/m pour le cuivre et 0,036 Ω·mm²/m pour l'aluminium (résistivité en service normal), λ = 0,08 mΩ/m à 50 Hz.
- À 60 Hz, λ est augmentée dans le rapport des fréquences (0,096 mΩ/m) : hypothèse d'une réactance proportionnelle à la fréquence.
- ΔU % = 100 × u ÷ U0, avec U0 la tension simple (U ÷ √3 en triphasé). En biphasé (Japon), ΔU % = 100 × u ÷ U, avec U = 200 V.
- Limites de la norme NF C 15-100 pour une installation alimentée par le réseau public basse tension : 3 % pour l'éclairage, 5 % pour les autres usages. À l'étranger, appliquez les règles locales.

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

## Installez la calculette sur votre téléphone.

Elle s'ouvre comme une application et fonctionne sans réseau, même en sous-sol ou sur un site sans couverture. Vos calculs enregistrés restent sur votre appareil.

- Sur iPhone : ouvrez cette page dans Safari, touchez « Partager » puis « Sur l'écran d'accueil ».
- Sur Android : menu du navigateur, puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».

La calculette est installée sur cet appareil.

## Un calcul plus complexe ?

Sélectivité, courants de court-circuit, schémas unifilaires : notre bureau d'étude prend le relais.

[Consulter le bureau d'étude](https://www.darkside-energy.com/contact/?objet=bureau)
[contact@darkside-energy.com](mailto:contact@darkside-energy.com)
