# Why do LEDs trip RCDs?

> Leakage and inrush currents: why LEDs and electronics trip 30 mA RCDs, and how to split circuits to avoid it.

Source: https://www.darkside-energy.com/en/did-you-know/leds-and-rcds/ · Dark Side Energy · Updated: 2026-10-28

26 October 2026 · 3 min read

- LED fixtures and earthed electronic equipment constantly leak a small current to earth: on the same RCD, these leakage currents add up.
- A 30 mA RCD may trip as soon as leakage exceeds 15 mA: its standard only forbids tripping up to half its sensitivity.
- Removing the protection is never the answer: spread the equipment over several circuits, each with its own RCD.

Picture this: one more bar of LED fixtures on a line that is already well loaded, and everything goes dark. No fixture is faulty, the power box is in good condition, the total load is far below the rating. Yet the [30 mA RCD](https://www.darkside-energy.com/en/glossary/#differentiel-30-ma) has tripped. It is not broken: it is doing exactly what it was designed to do.

## Leakage currents add up

LED fixtures, like most earthed electronic equipment (computers, screens, consoles, amplifiers), include a filter against electromagnetic interference. This filter connects the conductors to earth through capacitors: a small current flows to earth all the time, even when the equipment works perfectly.

For one device, this current stays low. But an RCD does not see devices one by one: it measures the sum of all leakage downstream. For example, twenty devices leaking 1 mA each make 20 mA of permanent leakage on the same RCD.

## A 30 mA RCD trips before 30 mA

A 30 mA RCD does not cut off at exactly 30 mA. Its product standard (IEC 61008) requires it not to trip up to half its sensitivity, 15 mA, and to trip at 30 mA. In between, it may trip at any point. With 20 mA of permanent leakage, very little is needed to cross the threshold: one more device, a switch-on, some moisture on a connection.

## At switch-on: inrush current

When powered up, each LED driver charges its input capacitors and draws, for a very brief moment, a current far higher than its operating current. Switched on all at once, dozens of drivers can trip the circuit [breaker](https://www.darkside-energy.com/en/glossary/#disjoncteur), even though the operating load is well within limits. RCD or breaker, each has its own job: we explain it in [Why does it “trip”?](https://www.darkside-energy.com/en/did-you-know/why-it-trips/)

## What we do

- **Split** electronic equipment over several circuits, each protected by its own RCD: leakage is shared instead of adding up.
- **Keep a margin**: since a 30 mA RCD may trip from 15 mA, the permanent leakage of each circuit must stay well below that.
- **Choose the right protection**: for large amounts of electronics, RCDs with enhanced immunity, designed to withstand this leakage and inrush current better.
- **Stagger switch-on** rather than powering everything up at once.

Removing the RCD, or replacing it with a less sensitive one, is never the answer: the 30 mA device is there to protect people.

> An RCD that trips with LEDs is not faulty: it is adding up leakage. The answer is to split the circuits.

Splitting circuits is part of our core business: [event power distribution](https://www.darkside-energy.com/en/power-distribution/).

How many circuits do you need? List your equipment in the power assessment.

[Open the power assessment](https://www.darkside-energy.com/en/power-assessment/)

[Blue, red, yellow: how do you read a P17 socket?](https://www.darkside-energy.com/en/did-you-know/reading-a-p17-socket/)
[kVA or kW: what's the difference?](https://www.darkside-energy.com/en/did-you-know/kva-vs-kw/)

## A project? Let's talk power.

Venue, dates, known requirements: tell us about your event and we will get back to you quickly.

[Request a quote](https://www.darkside-energy.com/en/contact/)
[contact@darkside-energy.com](mailto:contact@darkside-energy.com)
