// Traduction automatique des résumés AniList (en anglais) vers le français.
// Elle est faite sur l'appareil du visiteur par le traducteur intégré au navigateur (API Translator,
// disponible dans Chrome et Edge récents sur ordinateur). Aucun texte n'est envoyé à un service tiers
// ni conservé, ce qui respecte les conditions d'AniList (pas de stockage). Ailleurs, le résumé reste en anglais.

const LANGUES = { sourceLanguage: 'en', targetLanguage: 'fr' };
const DELAI_MS = 15000;

let promesse = null;

/** Vrai si le navigateur propose un traducteur intégré. */
export function traducteurDisponible() {
  return typeof globalThis.Translator?.create === 'function';
}

/**
 * Prépare le traducteur. À appeler au plus tôt après un clic du visiteur : le premier usage
 * télécharge le modèle de langue, ce que le navigateur n'autorise qu'après une action de l'utilisateur.
 * Renvoie une promesse du traducteur, ou de null s'il n'est pas utilisable.
 */
export function preparerTraducteur() {
  if (!traducteurDisponible()) return Promise.resolve(null);
  if (!promesse) {
    promesse = (async () => {
      const dispo = await globalThis.Translator.availability(LANGUES);
      if (dispo === 'unavailable') return null;
      return globalThis.Translator.create(LANGUES);
    })().catch(() => {
      promesse = null; // nouvel essai au prochain clic
      return null;
    });
  }
  return promesse;
}

/** Traduit un texte en conservant les paragraphes. Renvoie null si la traduction est impossible. */
export async function traduireEnFrancais(texte) {
  if (!texte) return null;
  const travail = (async () => {
    const traducteur = await preparerTraducteur();
    if (!traducteur) return null;
    const paragraphes = texte.split(/\n{2,}/);
    const sortie = [];
    for (const p of paragraphes) sortie.push(p.trim() ? await traducteur.translate(p) : p);
    return sortie.join('\n\n').trim() || null;
  })();
  const delai = new Promise((resoudre) => { setTimeout(() => resoudre(null), DELAI_MS); });
  try {
    return await Promise.race([travail, delai]);
  } catch {
    return null;
  }
}
