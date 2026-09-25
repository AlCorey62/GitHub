// Données communes à tout le site : identité, coordonnées, navigation.
// Modifier ici puis lancer `node tools/build.mjs` pour mettre à jour toutes les pages.

export const SITE = {
  name: "Dark Side Energy",
  legalName: "DARK SIDE ENERGY",
  legalForm: "SARL",
  url: "https://www.darkside-energy.com",
  slogan: "La puissance de l'électricité, sans tension, avec intensité.",
  email: "contact@darkside-energy.com",
  phone: "07 68 24 40 88",
  phoneIntl: "+33768244088",
  address: {
    street: "37 rue Thibaut",
    postalCode: "62220",
    city: "Carvin",
    region: "Hauts-de-France",
    country: "FR",
  },
  siren: "879 105 377",
  siret: "879 105 377 00029",
  socials: [
    { key: "facebook", label: "Facebook", href: "https://www.facebook.com/darksideenergy", icon: "brand-facebook" },
    { key: "x", label: "X (Twitter)", href: "https://twitter.com/DarkSide_Energy", icon: "brand-x" },
  ],
  calcApp: "https://darkside-energy.netlify.app",
  themeColor: "#09090a",
  ogImage: "assets/img/og-image.png",
};

// Navigation principale. `key` sert à marquer la page active (champ "nav" des pages).
export const NAV = [
  {
    key: "metiers",
    label: "Métiers",
    children: [
      { key: "distribution", label: "Distribution électrique", desc: "Du coffret 16 A à l'armoire 2 000 A", href: "distribution-electrique/" },
      { key: "regie", label: "Régie technique", desc: "Équipes, sous-traitance et logistique", href: "regie-technique/" },
      { key: "coordination", label: "Coordination générale", desc: "Direction technique et régie générale", href: "coordination-generale/" },
      { key: "bureau", label: "Bureau d'étude", desc: "Bilans, schémas, plans et notes de calcul", href: "bureaudetude/" },
      { key: "consulting", label: "Consulting", desc: "Cahier des charges et solutions sur mesure", href: "consulting/" },
    ],
  },
  { key: "materiel", label: "Matériel", href: "nos-produits/" },
  { key: "rse", label: "Énergie responsable", href: "energie-responsable/" },
  { key: "references", label: "Références", href: "references/" },
  {
    key: "outils",
    label: "Outils",
    children: [
      { key: "bilan", label: "Bilan de puissance", desc: "Estimez vos besoins, phase par phase", href: "bilan-de-puissance/" },
      { key: "calculette", label: "Calculette électro", desc: "Conversions et chute de tension", href: "calculette-electro/" },
      { key: "news", label: "Le sais-tu ?", desc: "Les bases du métier, simplement", href: "news/" },
    ],
  },
  { key: "entreprise", label: "L'entreprise", href: "entreprise/" },
];

export const CTA = { label: "Demander un devis", href: "contact/" };
