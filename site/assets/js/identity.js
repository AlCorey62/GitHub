// Connexion des clients au bilan de puissance : Netlify Identity, comptes ouverts sur invitation.
// Client minimal de l'API Identity du site (/.netlify/identity), sans dépendance.
// La session (jetons d'accès) est conservée dans le stockage local du navigateur.

const API = "/.netlify/identity";
const KEY = "darkside-auth-v1";
// Sur l'aperçu publié hors Netlify (<html data-preview>), la connexion est simulée
const PREVIEW = document.documentElement.hasAttribute("data-preview");

export class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch (e) {
    return null;
  }
}

function store(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch (e) {
    /* stockage indisponible : la session ne durera que le temps de la page */
  }
}

function clear() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* rien à effacer */
  }
}

function errorFor(path, status, data) {
  const text = data ? String(data.error_description || data.msg || data.error || "") : "";
  if (status === 429) return new AuthError("rate", "Trop de tentatives. Patientez quelques minutes avant de réessayer.");
  if (status >= 500) return new AuthError("server", "Le service de connexion est indisponible. Réessayez plus tard.");
  if (path === "/token") {
    if (/confirm/i.test(text)) return new AuthError("unconfirmed", "Ce compte n'est pas encore activé : utilisez le lien reçu par e-mail.");
    return new AuthError("credentials", "E-mail ou mot de passe incorrect.");
  }
  if (path === "/verify") return new AuthError("token", "Ce lien n'est plus valable. Demandez un nouveau lien.");
  if (status === 401 || status === 403) return new AuthError("session", "Votre session a expiré. Connectez-vous à nouveau.");
  if (status === 422 && /password/i.test(text)) return new AuthError("password", "Mot de passe refusé : choisissez-en un plus long.");
  return new AuthError("unknown", "La demande n'a pas abouti. Réessayez ou contactez-nous.");
}

async function request(path, { method = "GET", json, form, token } = {}) {
  if (PREVIEW) return simulate(path, { json, form });
  const headers = {};
  let body;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(form).toString();
  } else if (json) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }
  let res;
  try {
    res = await fetch(API + path, { method, headers, body, credentials: "same-origin" });
  } catch (e) {
    throw new AuthError("network", "Connexion impossible. Vérifiez votre réseau et réessayez.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    /* réponse vide */
  }
  if (res.status === 404 && !data) {
    throw new AuthError("unavailable", "La connexion n'est pas encore activée sur ce site. Contactez-nous pour accéder au bilan complet.");
  }
  if (!res.ok) throw errorFor(path, res.status, data);
  return data;
}

// Réponses simulées pour l'aperçu : toute adresse et tout mot de passe sont acceptés
function simulate(path, { json, form }) {
  const tokens = { access_token: "apercu", refresh_token: "apercu", expires_in: 3600 };
  if (path === "/token") return tokens;
  if (path === "/verify") return tokens;
  if (path === "/user") return { email: (form && form.username) || (json && json.email) || read()?.email || "client@exemple.fr" };
  return {};
}

async function sessionFrom(tokens, email) {
  const session = {
    access: tokens.access_token,
    refresh: tokens.refresh_token,
    expires: Date.now() + (Number(tokens.expires_in) || 3600) * 1000,
    email,
  };
  if (!email) {
    const user = await request("/user", { token: session.access });
    session.email = user.email;
  }
  store(session);
  return session;
}

export async function login(email, password) {
  const tokens = await request("/token", { method: "POST", form: { grant_type: "password", username: email, password } });
  return sessionFrom(tokens, PREVIEW ? email : undefined);
}

// Session vérifiée par le serveur (rafraîchie si besoin), ou null
export async function currentSession() {
  const s = read();
  if (!s || !s.access) return null;
  try {
    if (Date.now() > s.expires - 60000) {
      const tokens = await request("/token", { method: "POST", form: { grant_type: "refresh_token", refresh_token: s.refresh } });
      return await sessionFrom(tokens);
    }
    await request("/user", { token: s.access });
    return s;
  } catch (e) {
    // Réseau coupé : la session est gardée pour la prochaine visite, sans être accordée maintenant
    if (e.code !== "network") clear();
    return null;
  }
}

export async function logout() {
  const s = read();
  clear();
  if (s && s.access) {
    try {
      await request("/logout", { method: "POST", token: s.access });
    } catch (e) {
      /* la session locale est déjà effacée */
    }
  }
}

// Lien d'invitation : le client choisit son mot de passe et son compte est activé
export async function acceptInvite(token, password) {
  return sessionFrom(await request("/verify", { method: "POST", json: { token, password, type: "signup" } }));
}

export async function confirmSignup(token) {
  return sessionFrom(await request("/verify", { method: "POST", json: { token, type: "signup" } }));
}

// Lien de récupération : connecte le client, qui choisit ensuite un nouveau mot de passe
export async function verifyRecovery(token) {
  return sessionFrom(await request("/verify", { method: "POST", json: { token, type: "recovery" } }));
}

export async function updatePassword(password) {
  const s = read();
  if (!s) throw new AuthError("session", "Votre session a expiré. Demandez un nouveau lien.");
  await request("/user", { method: "PUT", json: { password }, token: s.access });
}

export function requestRecovery(email) {
  return request("/recover", { method: "POST", json: { email } });
}
