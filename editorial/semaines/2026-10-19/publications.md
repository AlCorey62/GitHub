# Semaine du 19 octobre 2026 (essai de la chaîne de publication)

Statut : **à valider par Damien**. Publication le jour même, dès validation. Visuels dans ce dossier (1200 × 1200).

## Valeurs vérifiées le 20/10/2026 (après vérification par Pipo et Mario)

Sources techniques et institutionnelles accessibles. Le texte intégral des normes payantes (NF C 15-100, IEC 60364) n'a pas été lu ; les cahiers techniques Schneider datent de 1998 à 2002, avant la NF C 15-100-1 d'août 2024 (principes inchangés, numérotation à confirmer). Ce n'est pas une vérification de conformité.

- Lettres du schéma, « schéma des liaisons à la terre » : Schneider CT 172 (2002), p. 3 et 8 ; INRS ED 6187 (2015), glossaire p. 122-124. Neutre relié par une impédance élevée en IT : CT 178 (1998), p. 5 et 8.
- TT : courant limité par les résistances de terre, très inférieur aux réglages des protections à maximum de courant, d'où au moins un DDR en tête ; tension de défaut dangereuse : CT 172, p. 10-11. Réseau public BT en TT : Enedis-NMO-RES_011E (03/12/2024), p. 20.
- TN : défaut franc = court-circuit, coupure dans un temps maximal spécifié si le courant de défaut dépasse le seuil de la protection, vérification par le calcul : CT 172, p. 10 ; vérification par mesures (impédance de boucle) : INRS ED 6187, p. 97. DDR inapplicable en TN-C : CT 172, p. 15 et 20 (et ESTI, norme suisse, document 14_F_Amo131).
- PEN : installations fixes seulement, à partir de 10 mm² Cu ou 16 mm² Al : IEC 60364-5-54, 543.4.1, cité par extrait (texte non lu ; CT 172 p. 8 écrit « ≤ 10 mm² », divergence au cas limite). Interdit dans les câbles souples alimentant des appareils amovibles : INRS ED 6187, annexe III de la circulaire DGT/2012/12, p. 117. Interdit en BE2 et BE3 : même annexe, p. 119-120 ; CT 172, p. 15.
- IT : courant de premier défaut par les capacités du réseau et l'impédance éventuelle du neutre, pas par le CPI : CT 178, p. 5 et 9 ; CT 172, p. 11 et 21-22. CPI obligatoire, défaut à rechercher, coupure au second défaut : CT 172, p. 12-13. Courant croissant avec l'étendue du réseau : CT 172, p. 11 ; CT 178, p. 24. Usages : CT 178, p. 3 et 22.
- Événement : DDR 30 mA obligatoires pour les prises jusqu'à 32 A et les installations temporaires : INRS ED 6345 (2019), p. 27. Groupe électrogène, courant de court-circuit plus faible, vérifier en TN et IT, sinon DDR : CT 172, p. 16. Plusieurs schémas possibles, choix libre avec un poste privé : CT 172, p. 25 ; CT 173, p. 11. Liaison neutre-terre en un seul point pour des groupes couplés : IET, webinaire « Temporary power distribution » (2021). Groupes portables et installations temporaires : IET Wiring Matters (2011) et IEE Wiring Matters (2006). Royaume-Uni, PME restreinte en installation temporaire (version anglaise) : IET, « Fairgrounds » (BS 7671, 740.411.4.1).
- Retirés : prescriptions OPPBTP (propres aux chantiers), délais de coupure chiffrés, règles particulières de la NF C 15-100 partie 7-711 (non lue), décret 88-1056 (abrogé depuis 2010).

URL : CT 172 https://sti.eduscol.education.fr/sites/eduscol.education.fr.sti/files/ressources/techniques/3336/3336-ct172.pdf · CT 173 https://sti.eduscol.education.fr/sites/eduscol.education.fr.sti/files/ressources/techniques/3336/3336-ct173.pdf · CT 178 https://sti.eduscol.education.fr/sites/eduscol.education.fr.sti/files/ressources/techniques/3336/3336-ct178.pdf · INRS ED 6187 https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-6187.pdf · INRS ED 6345 https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-6345.pdf · Enedis https://www.enedis.fr/media/4383/download · ESTI https://www.esti.admin.ch/inhalte/pdf/Fachbeitraege/Franzoesisch/14_F_Amo131_0914.pdf · IET https://electrical.theiet.org/bs-7671/faqs/webinar-questions-and-answers/temporary-power-distribution-webinar · https://electrical.theiet.org/media/1550/operation-of-portable-generators.pdf · https://electrical.theiet.org/media/1677/temporary-power-distribution-systems-and-electrical-supplies-for-entertainment-related-purposes.pdf · https://electrical.theiet.org/media/1194/fairgrounds-what-you-need-to-know.pdf

---

## Mardi 20/10 · Le sais-tu ? (article du site)

**Visuel** : `2026-10-20-mardi.png`
**Lien** : https://www.darkside-energy.com/news/regimes-de-neutre/

**LinkedIn**

> TT, TN, IT : quand un appareil a un défaut d'isolement, qui coupe ?
>
> TT : le courant de défaut revient par la terre. C'est le différentiel qui coupe.
> TN : le défaut devient un court-circuit. Le disjoncteur ou le fusible coupe dans le temps prescrit, si le courant de défaut est assez fort : cela se vérifie par le calcul.
> IT : au premier défaut, l'alimentation est en principe maintenue. Le contrôleur permanent d'isolement donne l'alarme, et le défaut doit être réparé vite.
>
> Sur un événement, installation temporaire, les différentiels 30 mA sont obligatoires quel que soit le schéma, et le neutre reste séparé du conducteur de protection : pas de PEN dans les câbles souples.
>
> Schémas animés et explications dans notre « Le sais-tu ? » :
> https://www.darkside-energy.com/news/regimes-de-neutre/
>
> #événementiel #distributionélectrique #sécuritéélectrique #régimedeneutre

**Facebook**

> ⚡ TT, TN, IT : quand un appareil a un défaut, qui coupe ? Le différentiel en TT, le disjoncteur ou le fusible en TN… et en IT, en principe personne au premier défaut : une alarme prévient. Les régimes de neutre expliqués simplement, avec des schémas animés 👉 https://www.darkside-energy.com/news/regimes-de-neutre/
