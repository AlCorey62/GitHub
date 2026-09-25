// Dark Side Energy - comportements communs : menu, sous-menus, en-tête, apparitions, formulaire de contact.
(function () {
  "use strict";

  var header = document.querySelector("[data-header]");
  var nav = document.getElementById("main-nav");
  var toggle = document.querySelector(".nav-toggle");
  var mqMobile = window.matchMedia("(max-width: 1080px)");

  // En-tête : fond renforcé après défilement
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Menu mobile
  function setMenu(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".visually-hidden").textContent = open ? "Fermer le menu" : "Ouvrir le menu";
    document.body.classList.toggle("nav-open", open);
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
  }

  // Sous-menus
  var subs = Array.prototype.slice.call(document.querySelectorAll(".has-sub"));

  function closeSubs(except) {
    subs.forEach(function (li) {
      if (li === except) return;
      li.classList.remove("is-open");
      var b = li.querySelector("button");
      if (b) b.setAttribute("aria-expanded", "false");
    });
  }

  subs.forEach(function (li) {
    var btn = li.querySelector("button");
    var hoverTimer;
    btn.addEventListener("click", function () {
      var open = !li.classList.contains("is-open");
      closeSubs(li);
      li.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
    li.addEventListener("mouseenter", function () {
      if (mqMobile.matches || !window.matchMedia("(hover: hover)").matches) return;
      clearTimeout(hoverTimer);
      closeSubs(li);
      li.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
    });
    li.addEventListener("mouseleave", function () {
      if (mqMobile.matches || !window.matchMedia("(hover: hover)").matches) return;
      hoverTimer = setTimeout(function () {
        li.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      }, 160);
    });
    li.addEventListener("focusout", function (e) {
      if (mqMobile.matches) return;
      if (!li.contains(e.relatedTarget)) {
        li.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".has-sub")) closeSubs();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var openSub = document.querySelector(".has-sub.is-open");
    if (openSub) {
      closeSubs();
      openSub.querySelector("button").focus();
    } else if (nav && nav.classList.contains("is-open")) {
      setMenu(false);
      toggle.focus();
    }
  });

  mqMobile.addEventListener("change", function () {
    setMenu(false);
    closeSubs();
  });

  // Apparition au défilement
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  // Année courante
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  // Formulaire de contact : pré-remplissage et envoi (Netlify Forms)
  var form = document.querySelector("form[data-contact]");
  if (form) {
    var params = new URLSearchParams(window.location.search);
    var subject = params.get("objet");
    var select = form.querySelector("[name='objet']");
    if (subject && select) {
      Array.prototype.forEach.call(select.options, function (o) {
        if (o.value === subject) select.value = subject;
      });
    }
    var message = form.querySelector("[name='message']");
    var prefill = params.get("message");
    if (prefill && message && !message.value) message.value = prefill;

    var status = form.querySelector(".form-status");
    form.addEventListener("submit", function (e) {
      var invalid = Array.prototype.filter.call(form.querySelectorAll("[required]"), function (f) {
        var bad = f.type === "checkbox" ? !f.checked : !f.value.trim() || (f.type === "email" && !f.checkValidity());
        f.setAttribute("aria-invalid", bad ? "true" : "false");
        return bad;
      });
      if (invalid.length) {
        e.preventDefault();
        status.dataset.state = "error";
        status.textContent = "Merci de compléter les champs obligatoires signalés.";
        invalid[0].focus();
        return;
      }
      if (!window.fetch || form.dataset.ajax === "false") return;
      e.preventDefault();
      var btn = form.querySelector("[type='submit']");
      btn.disabled = true;
      status.dataset.state = "";
      status.textContent = "Envoi en cours…";
      var body = new URLSearchParams(new FormData(form)).toString();
      fetch(form.getAttribute("action") || "/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body,
      })
        .then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          form.reset();
          status.dataset.state = "ok";
          status.textContent = "Message réceptionné ! Nous revenons vers vous rapidement.";
        })
        .catch(function () {
          status.dataset.state = "error";
          status.innerHTML =
            "L'envoi n'a pas abouti. Écrivez-nous directement à <a href=\"mailto:contact@darkside-energy.com\">contact@darkside-energy.com</a>.";
        })
        .then(function () {
          btn.disabled = false;
        });
    });
  }
})();
