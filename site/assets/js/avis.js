// Questionnaire de satisfaction (/avis/ et /en/review/) : préremplissage par l'adresse, notes adaptées aux
// prestations cochées, envoi à Netlify Forms sans changer de page, puis remerciement avec l'invitation à
// laisser un avis Google.
// L'invitation Google est montrée à tout le monde, quelle que soit la note : Google interdit de filtrer les avis.

const form = document.querySelector("form[data-avis]");
const merci = document.querySelector("[data-avis-merci]");

const T =
  document.documentElement.lang === "en"
    ? {
        required: "Please fill in the required fields highlighted.",
        sending: "Sending…",
        failed: "Sending failed. Please try again in a moment or email us at ",
        copied: "Comment copied, all you have to do is paste it.",
        copyFailed: "Copying is not available here: select your comment below, copy it, then paste it on Google.",
      }
    : {
        required: "Merci de compléter les champs obligatoires signalés.",
        sending: "Envoi en cours…",
        failed: "L'envoi n'a pas abouti. Réessayez dans un instant ou écrivez-nous à ",
        copied: "Commentaire copié, il ne vous reste qu'à le coller.",
        copyFailed: "La copie n'est pas possible ici : sélectionnez votre commentaire ci-dessous, copiez-le, puis collez-le sur Google.",
      };

if (form && merci) {
  // Préremplissage : ?nom=…&structure=…&evt=… (les champs restent modifiables)
  const params = new URLSearchParams(window.location.search);
  for (const [param, name] of [["nom", "nom"], ["structure", "structure"], ["evt", "evenement"]]) {
    const value = (params.get(param) || "").trim();
    const field = form.elements[name];
    if (value && field && !field.value) field.value = value.slice(0, Number(field.maxLength) > 0 ? field.maxLength : 200);
  }

  // Prestations : ?presta=distribution,bureau coche les cases ; seules les notes des prestations cochées
  // s'affichent (toutes les notes restent dans la page pour que Netlify enregistre leurs champs)
  const choix = [...form.querySelectorAll("[data-presta-choix]")];
  const demandees = params.getAll("presta").flatMap((v) => v.split(",")).map((v) => v.trim());
  for (const box of choix) if (demandees.includes(box.dataset.prestaChoix)) box.checked = true;
  const adapter = () => {
    const actives = new Set(choix.filter((b) => b.checked).map((b) => b.dataset.prestaChoix));
    for (const note of form.querySelectorAll("[data-presta]")) {
      const visible = actives.has(note.dataset.presta);
      note.hidden = !visible;
      // Une note masquée n'est pas envoyée
      if (!visible) for (const r of note.querySelectorAll("input:checked")) r.checked = false;
    }
  };
  for (const box of choix) box.addEventListener("change", adapter);
  adapter();

  const status = form.querySelector(".form-status");
  const button = form.querySelector("[type='submit']");
  const globale = form.querySelector("[data-note-obligatoire]");

  // Un champ corrigé retire son signalement d'erreur, et le message une fois tout complété
  const corrige = () => {
    if (status.dataset.state === "error" && !form.querySelector("[aria-invalid='true']")) {
      status.dataset.state = "";
      status.textContent = "";
    }
  };
  globale.addEventListener("change", () => {
    globale.removeAttribute("aria-invalid");
    corrige();
  });
  for (const name of ["nom", "structure", "evenement"]) {
    form.elements[name].addEventListener("input", (e) => {
      e.target.removeAttribute("aria-invalid");
      corrige();
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const missing = [];
    for (const name of ["nom", "structure", "evenement"]) {
      const field = form.elements[name];
      const bad = !field.value.trim();
      field.setAttribute("aria-invalid", String(bad));
      if (bad) missing.push(field);
    }
    const checked = form.querySelector("input[name='note_globale']:checked");
    globale.setAttribute("aria-invalid", String(!checked));
    if (!checked) missing.push(form.querySelector("input[name='note_globale']"));
    if (missing.length) {
      status.dataset.state = "error";
      status.textContent = T.required;
      missing[0].focus();
      return;
    }

    // Liste lisible des prestations cochées, pour la notification de Netlify
    form.elements.prestations.value = choix.filter((b) => b.checked).map((b) => b.dataset.prestaNom).join(", ");
    const data = new FormData(form);
    const commentaire = String(data.get("commentaire_public") || "").trim();
    button.disabled = true;
    status.dataset.state = "";
    status.textContent = T.sending;
    // Méthode recommandée par Netlify : POST encodé vers « / », avec le champ form-name
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(data).toString(),
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        remercier(commentaire);
      })
      .catch(() => {
        status.dataset.state = "error";
        status.textContent = T.failed;
        const mail = document.createElement("a");
        mail.href = "mailto:contact@darkside-energy.com";
        mail.textContent = "contact@darkside-energy.com";
        status.append(mail, ".");
      })
      .finally(() => {
        button.disabled = false;
      });
  });
}

function remercier(commentaire) {
  const copie = merci.querySelector("[data-avis-google-copie]");
  const simple = merci.querySelector("[data-avis-google]");
  copie.hidden = !commentaire;
  simple.hidden = Boolean(commentaire);
  // Le lien ouvre l'avis Google dans un nouvel onglet ; le clic copie d'abord le commentaire
  if (commentaire) copie.addEventListener("click", () => copier(commentaire));
  form.hidden = true;
  merci.hidden = false;
  merci.focus({ preventScroll: true });
  // Remerciement en haut de l'écran, sous l'en-tête fixe
  const header = document.querySelector("header");
  const top = merci.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0) - 16;
  window.scrollTo({ top: Math.max(0, top) });
}

function copier(texte) {
  const message = merci.querySelector("[data-avis-copie]");
  const done = () => {
    message.dataset.state = "ok";
    message.textContent = T.copied;
  };
  const failed = () => {
    message.dataset.state = "error";
    message.textContent = T.copyFailed;
    const zone = merci.querySelector("[data-avis-texte]");
    zone.value = texte;
    zone.hidden = false;
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(texte).then(done, () => (copieDeSecours(texte) ? done() : failed()));
  } else if (copieDeSecours(texte)) done();
  else failed();
}

// Copie de secours, pour les navigateurs sans presse-papiers moderne
function copieDeSecours(texte) {
  const zone = document.createElement("textarea");
  zone.value = texte;
  zone.setAttribute("readonly", "");
  zone.style.position = "fixed";
  zone.style.opacity = "0";
  document.body.append(zone);
  zone.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (e) {
    ok = false;
  }
  zone.remove();
  return ok;
}
