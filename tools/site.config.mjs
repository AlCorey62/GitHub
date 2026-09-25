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
  // Clé IndexNow (Bing, Copilot, Yandex, Seznam, Naver) : le fichier site/<clé>.txt doit rester publié
  indexNowKey: "3b437b0f739a59eb3e76ac976d8c0458",
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
    label: "Ressources",
    children: [
      { key: "bilan", label: "Bilan de puissance", desc: "Estimez vos besoins, phase par phase", href: "bilan-de-puissance/" },
      { key: "calculette", label: "Calculette électro", desc: "Conversions et chute de tension", href: "calculette-electro/" },
      { key: "news", label: "Le sais-tu ?", desc: "Les bases du métier, simplement", href: "news/" },
      { key: "faq", label: "Questions fréquentes", desc: "Nos réponses, en bref", href: "faq/" },
      { key: "lexique", label: "Lexique", desc: "P17, Powerlock, foisonnement, TGBT…", href: "lexique/" },
    ],
  },
  { key: "entreprise", label: "L'entreprise", href: "entreprise/" },
];

export const CTA = { label: "Demander un devis", href: "contact/" };

// Données structurées et informations pour les moteurs de recherche et les IA (GEO).
// Les réseaux et fiches à ajouter dès qu'ils existent : LinkedIn, fiche Google Business Profile, Wikidata.
export const ENTITY = {
  foundingDate: "2016",
  description:
    "Dark Side Energy est une entreprise française de distribution électrique événementielle, créée en 2016 et basée à Carvin (Pas-de-Calais). Ses équipes interviennent en France et à l'international en distribution électrique, régie technique, coordination générale, bureau d'étude et consulting, pour des salons, concerts, événements sportifs, festivals et cérémonies. Elle loue et vend aussi du matériel de distribution électrique.",
  knowsAbout: [
    "Distribution électrique événementielle",
    "Régie technique",
    "Coordination générale d'événements",
    "Bureau d'étude électrique",
    "Bilan de puissance",
    "Schéma unifilaire",
    "Raccordement électrique temporaire",
    "Groupes électrogènes",
    "Groupes électrogènes Twin zéro coupure",
    "Packs batteries",
    "Carburant HVO",
    "Connecteurs P17 (CEI 60309)",
    "Connecteurs Powerlock",
    "Passages de câbles PMR",
    "Norme NF C 15-100",
    "Chute de tension",
    "Habilitations électriques",
  ],
  areaServed: ["France"],
  languages: ["French", "English"],
  // Liens vers d'autres profils officiels de l'entreprise (ajoutés aux réseaux sociaux dans le balisage)
  sameAs: [],
  person: {
    id: "damien-nirel",
    name: "Damien Nirel",
    jobTitle: "Gérant et directeur technique",
    description: "Plus de 15 ans d'expérience en énergie événementielle internationale.",
  },
};

// Contenu du fichier /llms.txt (résumé du site pour les assistants IA, format llmstxt.org)
export const LLMS = {
  facts: [
    "Raison sociale : DARK SIDE ENERGY, SARL, SIREN 879 105 377",
    "Siège : 37 rue Thibaut, 62220 Carvin, France (Pas-de-Calais, Hauts-de-France)",
    "Activité : distribution électrique événementielle (code NAF 90.02Z, activités de soutien au spectacle vivant)",
    "Création : 2016 ; SARL immatriculée en novembre 2019",
    "Capacités : de la distribution 16 A jusqu'aux armoires 2 000 A, groupes électrogènes de 6 à 2 000 kVA, expertise haute et basse tension",
    "Zone d'intervention : France et international",
    "Lieux où les équipes sont intervenues (sélection) : Zénith de Lille, Lille Grand Palais, Stade de France, Accor Arena, Paris La Défense Arena, Decathlon Arena Stade Pierre Mauroy, Arena Grand Paris, Grand Palais, Musée du Louvre, Allianz Riviera, Stade Vélodrome",
    "Contact : contact@darkside-energy.com, +33 7 68 24 40 88, https://www.darkside-energy.com/contact/",
    "Slogan : « La puissance de l'électricité, sans tension, avec intensité. »",
  ],
  sections: [
    ["Métiers", ["/distribution-electrique/", "/regie-technique/", "/coordination-generale/", "/bureaudetude/", "/consulting/"]],
    ["Matériel et énergie", ["/nos-produits/", "/energie-responsable/"]],
    ["Outils de calcul gratuits", ["/bilan-de-puissance/", "/calculette-electro/"]],
    ["Ressources", ["/faq/", "/lexique/", "/news/", "/news/distribution-electrique-evenementielle/", "/news/groupe-twin-zero-coupure/", "/news/section-de-cable/", "/news/pourquoi-ca-saute/"]],
    ["Entreprise", ["/entreprise/", "/references/", "/contact/"]],
    ["Optional", ["/mentions-legales/", "/news/creation-dark-side-energy/", "/news/fetes-maritimes-brest-2016/", "/news/lille-grand-palais-2016/", "/news/repertoire-national-des-electros/"]],
  ],
};
