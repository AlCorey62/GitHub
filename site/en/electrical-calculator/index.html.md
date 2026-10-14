# Electrical calculator.

> Free electrical calculator, installable and offline: W, kVA and amps conversions, suggested socket and cable, voltage drop per NF C 15-100.

Source: https://www.darkside-energy.com/en/electrical-calculator/ · Dark Side Energy · Updated: 2026-10-14

Conversions, suggested connection and voltage drop, in France and abroad. The calculations run on your device: no data is sent.

- [Calculator](https://www.darkside-energy.com/en/electrical-calculator/#conversion)
- [Voltage drop](https://www.darkside-energy.com/en/electrical-calculator/#chute-de-tension)
- [Method](https://www.darkside-energy.com/en/electrical-calculator/#methode)
- [Figures per connector](https://www.darkside-energy.com/en/electrical-calculator/#reperes)
- [Install the app](https://www.darkside-energy.com/en/electrical-calculator/#installer)

## Formulas and assumptions used.

### Power and current

- Single-phase: S = U0 × I, where U0 is the phase-to-neutral voltage (230 V in Europe).
- Three-phase: S = √3 × U × I, where U is the phase-to-phase voltage (400 V in Europe). The current is given per phase.
- Two-phase, in Japan only (single-phase three-wire supply, 100/200 V): S = U × I, where U = 200 V between the two phases.
- Active power P = S × cos φ, reactive power Q = S × sin φ.
- Default assumption: cos φ = 0.9, adjustable.

### Networks abroad

- Europe and United Kingdom: 230/400 V, 50 Hz.
- United States and Canada: 120/208 V, 60 Hz.
- United States: 277/480 V, 60 Hz.
- Canada: 347/600 V, 60 Hz.
- Mexico: 127/220 V, 60 Hz.
- Japan, east (Tokyo): 100/200 V, 50 Hz.
- Japan, west (Osaka): 100/200 V, 60 Hz.

In Japan: 100 V single-phase, 200 V two-phase (single-phase three-wire) and three-phase. These are nominal voltages. A custom network is also possible. Always check the voltage actually supplied on site.

### Suggested connection

- The calculator picks the smallest rating in our fleet that is greater than or equal to the calculated current. Single-phase: 16 A socket (3G2.5 cable) and P17 32 A (3G6). Three-phase: P17 32, 63 and 125 A (5G6, 5G16, 5G35) and Powerlock 400 A (150 or 240 mm² single-core). Flexible copper cables.
- Above 80% of the rating, the margin is flagged as low.
- Above 32 A in single-phase or 400 A in three-phase, the connection needs to be engineered.
- In two-phase (Japan), the calculator gives the standard rating: our fleet does not list a two-phase cable.
- If the voltage drop exceeds the limit, the calculator gives the minimum cable size and, if there is one, the suitable cable from our fleet.

### Voltage drop

- u = b × (ρ × L ÷ S × cos φ + λ × L × sin φ) × I, with b = 1 in three-phase and b = 2 in single-phase and two-phase.
- ρ = 0.0225 Ω·mm²/m for copper and 0.036 Ω·mm²/m for aluminium (resistivity in normal service), λ = 0.08 mΩ/m at 50 Hz.
- At 60 Hz, λ is increased in proportion to the frequency (0.096 mΩ/m): assumption that cable reactance is proportional to frequency.
- ΔU% = 100 × u ÷ U0, where U0 is the phase-to-neutral voltage (U ÷ √3 in three-phase). In two-phase (Japan), ΔU% = 100 × u ÷ U, where U = 200 V.
- Limits of the French NF C 15-100 standard for an installation supplied by the public low-voltage network: 3% for lighting, 5% for other uses. Abroad, apply the local rules.

These calculations do not check the cable's current-carrying capacity for its installation method, nor protection against overloads and short circuits. Technical terms are explained in the [glossary](https://www.darkside-energy.com/en/glossary/).

## How many kVA behind each connector?

Theoretical maximum apparent power, without diversity or margin: S = U × I in single-phase 230 V, S = √3 × U × I in three-phase 400 V.

| Connector or equipment | Supply | Current | Apparent power |
| --- | --- | --- | --- |
| 16 A socket | Single-phase 230 V | 16 A | 3.7 kVA |
| P17 32 A single-phase | Single-phase 230 V | 32 A | 7.4 kVA |
| P17 16 A three-phase | Three-phase 400 V | 16 A | 11.1 kVA |
| P17 32 A three-phase | Three-phase 400 V | 32 A | 22.2 kVA |
| P17 63 A three-phase | Three-phase 400 V | 63 A | 43.6 kVA |
| P17 125 A three-phase | Three-phase 400 V | 125 A | 86.6 kVA |
| 250 A distribution cabinet | Three-phase 400 V | 250 A | 173.2 kVA |
| Powerlock 400 A | Three-phase 400 V | 400 A | 277.1 kVA |
| 1,000 A distribution cabinet | Three-phase 400 V | 1,000 A | 692.8 kVA |
| 1,600 A distribution cabinet | Three-phase 400 V | 1,600 A | 1,108.5 kVA |
| 2,000 A distribution cabinet | Three-phase 400 V | 2,000 A | 1,385.6 kVA |

## Install the calculator on your phone.

It opens like an app and works offline, even in a basement or on a site with no coverage. Your saved calculations stay on your device.

- On iPhone: open this page in Safari, tap “Share” then “Add to Home Screen”.
- On Android: open the browser menu, then “Install app” or “Add to Home screen”.

The calculator is installed on this device.

## A more complex calculation?

Selectivity, short-circuit currents, single-line diagrams: our engineering office takes over.

[Consult the engineering office](https://www.darkside-energy.com/en/contact/?objet=bureau)
[contact@darkside-energy.com](mailto:contact@darkside-energy.com)
