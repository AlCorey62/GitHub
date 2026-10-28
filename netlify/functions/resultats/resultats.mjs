// Résultats du questionnaire de satisfaction pour la page privée /resultats/ (lien secret).
// Lit en direct les réponses du formulaire Netlify « satisfaction » (API Netlify, réponses vérifiées : les
// spams et les réponses supprimées n'y sont pas) et les renvoie sans adresse IP ni navigateur.
//
// Accès : en-tête « Authorization: Bearer <clé> », comparé à la clé RESULTATS_CLE. La page lit la clé dans
// la fin du lien (#…), qui n'est jamais envoyée au serveur ni enregistrée dans les journaux.
// Variables d'environnement du site Netlify (portée Functions), jamais écrites dans le dépôt :
//   RESULTATS_CLE            clé du lien secret (24 caractères au moins)
//   RESULTATS_NETLIFY_TOKEN  jeton d'accès personnel Netlify, pour lire les réponses
import { createHash, timingSafeEqual } from "node:crypto";
import { normaliser } from "./normaliser.mjs";

const API = process.env.RESULTATS_API_URL || "https://api.netlify.com/api/v1"; // adresse modifiable pour les essais

const repondre = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });

// Comparaison à temps constant, sur les empreintes pour ne pas dépendre de la longueur de la clé
const empreinte = (s) => createHash("sha256").update(String(s)).digest();
const memeCle = (a, b) => timingSafeEqual(empreinte(a), empreinte(b));

export default async (req, context) => {
  if (req.method !== "GET") return repondre(405, { erreur: "Méthode non autorisée." });
  const cle = (process.env.RESULTATS_CLE || "").trim();
  const jeton = (process.env.RESULTATS_NETLIFY_TOKEN || "").trim();
  const site = context?.site?.id || process.env.SITE_ID;
  // Ce qui manque est nommé (jamais les valeurs), pour corriger la configuration sans deviner
  const manque = [
    !cle && "variable RESULTATS_CLE introuvable",
    cle && cle.length < 24 && "clé RESULTATS_CLE trop courte (24 caractères au moins)",
    !jeton && "variable RESULTATS_NETLIFY_TOKEN introuvable",
    !site && "numéro du site Netlify introuvable",
  ].filter(Boolean);
  if (manque.length) {
    return repondre(503, { erreur: `Page de résultats non configurée : ${manque.join(", ")}. Vérifier sur Netlify la portée Functions, le contexte Production, puis remettre le site en ligne.` });
  }
  const recue = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!recue || !memeCle(recue, cle)) {
    await new Promise((r) => setTimeout(r, 800)); // freine les essais au hasard
    return repondre(401, { erreur: "Lien invalide." });
  }

  const appel = async (chemin) => {
    const res = await fetch(`${API}${chemin}`, {
      headers: { Authorization: `Bearer ${jeton}`, "User-Agent": "Dark Side Energy, resultats (https://www.darkside-energy.com)" },
    });
    if (!res.ok) throw new Error(`API Netlify ${res.status}${res.status === 401 ? ", jeton RESULTATS_NETLIFY_TOKEN expiré ou invalide" : ""}`);
    return res.json();
  };
  try {
    const formulaire = (await appel(`/sites/${site}/forms`)).find((f) => f.name === "satisfaction");
    const reponses = [];
    if (formulaire) {
      for (let page = 1; page <= 50; page++) {
        const lot = await appel(`/forms/${formulaire.id}/submissions?per_page=100&page=${page}`);
        reponses.push(...lot);
        if (lot.length < 100) break;
      }
    }
    return repondre(200, { maj: new Date().toISOString(), reponses: reponses.map(normaliser) });
  } catch (e) {
    return repondre(502, { erreur: `Lecture des réponses impossible (${e.message}).` });
  }
};
