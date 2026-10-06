// Espace client : activation du compte (lien d'invitation), connexion, mot de passe oublié.
// Les liens des e-mails Netlify Identity arrivent avec un jeton dans l'adresse (#invite_token=…).
import * as auth from "./identity.js";

const $ = (id) => document.getElementById(id);
const status = $("c-status");
const views = Array.from(document.querySelectorAll("[data-view]"));

// Messages, selon la langue de la page
const T = {
  fr: {
    tooShort: "Le mot de passe doit compter au moins 8 caractères.",
    mismatch: "Les deux mots de passe ne sont pas identiques.",
    wait: "Un instant…",
    missing: "Saisissez votre e-mail et votre mot de passe.",
    signedIn: "Vous êtes connecté.",
    activated: "Compte activé.",
    welcome: "Bienvenue ! Votre mot de passe est enregistré et vous êtes connecté : le bilan de puissance complet est accessible.",
    changed: "Mot de passe modifié.",
    changedText: "Votre nouveau mot de passe est enregistré et vous êtes connecté.",
    missingEmail: "Saisissez l'adresse e-mail de votre compte.",
    sent: "Si un compte existe pour cette adresse, un e-mail vient de vous être envoyé. Pensez à vérifier les courriers indésirables.",
    signedOut: "Vous êtes déconnecté.",
    checking: "Vérification du lien…",
    active: "Votre compte client est actif : le bilan de puissance complet est accessible.",
  },
  en: {
    tooShort: "The password must be at least 8 characters long.",
    mismatch: "The two passwords do not match.",
    wait: "One moment…",
    missing: "Enter your email and password.",
    signedIn: "You are signed in.",
    activated: "Account activated.",
    welcome: "Welcome! Your password is saved and you are signed in: the full power assessment is available.",
    changed: "Password changed.",
    changedText: "Your new password is saved and you are signed in.",
    missingEmail: "Enter the email address of your account.",
    sent: "If an account exists for this address, an email has just been sent to you. Remember to check your spam folder.",
    signedOut: "You are signed out.",
    checking: "Checking the link…",
    active: "Your client account is active: the full power assessment is available.",
  },
}[document.documentElement.lang === "en" ? "en" : "fr"];

const hash = new URLSearchParams(window.location.hash.slice(1));
const token = {
  invite: hash.get("invite_token"),
  recovery: hash.get("recovery_token"),
  confirmation: hash.get("confirmation_token"),
};
// Le jeton ne doit pas rester dans l'adresse (historique, partage)
if (token.invite || token.recovery || token.confirmation || hash.has("email_change_token")) {
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

function show(name) {
  views.forEach((v) => {
    v.hidden = v.dataset.view !== name;
  });
}

function say(text, state = "") {
  status.dataset.state = state;
  status.textContent = text;
}

function message(title, text) {
  document.querySelector("[data-msg-title]").textContent = title;
  document.querySelector("[data-msg-text]").textContent = text;
  say("");
  show("message");
}

function showSession(session) {
  document.querySelector("[data-email]").textContent = session.email;
  show("session");
}

function newPassword(form) {
  const password = form.querySelector("[name='password']").value;
  const confirm = form.querySelector("[name='confirm']").value;
  if (password.length < 8) throw new Error(T.tooShort);
  if (password !== confirm) throw new Error(T.mismatch);
  return password;
}

function onSubmit(id, handler) {
  const form = $(id);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submit = form.querySelector("[type='submit']");
    submit.disabled = true;
    say(T.wait);
    try {
      await handler(form);
    } catch (err) {
      say(err.message, "error");
    } finally {
      submit.disabled = false;
    }
  });
}

onSubmit("c-login", async (form) => {
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email || !password) throw new Error(T.missing);
  const session = await auth.login(email, password);
  form.password.value = "";
  showSession(session);
  say(T.signedIn, "ok");
});

onSubmit("c-invite", async (form) => {
  await auth.acceptInvite(token.invite, newPassword(form));
  message(T.activated, T.welcome);
});

onSubmit("c-reset", async (form) => {
  await auth.updatePassword(newPassword(form));
  message(T.changed, T.changedText);
});

onSubmit("c-forgot", async (form) => {
  const email = form.email.value.trim();
  if (!email) throw new Error(T.missingEmail);
  try {
    await auth.requestRecovery(email);
  } catch (err) {
    // Même réponse qu'un compte existe ou non, sauf panne
    if (["network", "rate", "server", "unavailable"].includes(err.code)) throw err;
  }
  say(T.sent, "ok");
});

$("c-logout").addEventListener("click", async () => {
  await auth.logout();
  show("login");
  say(T.signedOut);
});

window.addEventListener("hashchange", () => {
  if (window.location.hash === "#oubli") show("forgot");
  if (window.location.hash === "#connexion") show("login");
  say("");
});

async function start() {
  if (token.invite) {
    show("invite");
    return;
  }
  if (token.recovery) {
    say(T.checking);
    try {
      await auth.verifyRecovery(token.recovery);
      say("");
      show("reset");
    } catch (err) {
      say(err.message, "error");
      show("forgot");
    }
    return;
  }
  if (token.confirmation) {
    try {
      await auth.confirmSignup(token.confirmation);
      message(T.activated, T.active);
    } catch (err) {
      say(err.message, "error");
      show("login");
    }
    return;
  }
  if (window.location.hash === "#oubli") {
    show("forgot");
    return;
  }
  const session = await auth.currentSession();
  if (session) showSession(session);
  else show("login");
}

start();
