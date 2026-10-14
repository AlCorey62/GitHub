// Dark Side Energy - comportements communs : liens de l'espace client, menu, sous-menus, en-tête, apparitions, formulaire de contact.
(function () {
  "use strict";

  var EN = document.documentElement.lang === "en";
  var T = EN
    ? {
        open: "Open the menu",
        close: "Close the menu",
        required: "Please fill in the required fields highlighted.",
        sending: "Sending…",
        sent: "Message received! We will get back to you shortly.",
        failed: "Sending failed. Email us directly at ",
      }
    : {
        open: "Ouvrir le menu",
        close: "Fermer le menu",
        required: "Merci de compléter les champs obligatoires signalés.",
        sending: "Envoi en cours…",
        sent: "Message réceptionné ! Nous revenons vers vous rapidement.",
        failed: "L'envoi n'a pas abouti. Écrivez-nous directement à ",
      };

  // Liens reçus par e-mail (invitation, mot de passe oublié) : traités par l'espace client.
  // Les e-mails pointent vers l'accueil français : espace client anglais depuis une page anglaise,
  // ou si le navigateur n'est pas réglé en français.
  if (/^#(invite|recovery|confirmation|email_change)_token=/.test(window.location.hash) && !/\/(compte|en\/account)\/(index\.html)?$/.test(window.location.pathname)) {
    var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "fr"];
    var english = EN || !/^fr\b/i.test(langs[0] || "fr");
    window.location.replace((english ? "/en/account/" : "/compte/") + window.location.hash);
    return;
  }

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
    toggle.querySelector(".visually-hidden").textContent = open ? T.close : T.open;
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

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Titres principaux : chaque mot est enveloppé pour monter l'un après l'autre
  if (!reduceMotion) {
    document.querySelectorAll(".hero h1, .page-hero h1").forEach(function (h1) {
      var i = 0;
      (function wrap(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 1) return wrap(child);
          if (child.nodeType !== 3 || !child.textContent.trim()) return;
          var frag = document.createDocumentFragment();
          var parts = child.textContent.split(/([ \t\n\r]+)/);
          // Ponctuation collée à l'élément précédent (« tension, ») : rattachée à son dernier mot
          var prev = child.previousSibling;
          var last = prev && prev.nodeType === 1 && prev.querySelectorAll(".w > span");
          if (parts[0] && last && last.length) {
            var tail = document.createElement("span");
            tail.style.color = getComputedStyle(node).color;
            tail.textContent = parts.shift();
            last[last.length - 1].appendChild(tail);
          }
          parts.forEach(function (part) {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) return frag.appendChild(document.createTextNode(part));
            var outer = document.createElement("span");
            var inner = document.createElement("span");
            outer.className = "w";
            inner.style.setProperty("--i", i++);
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, child);
        });
      })(h1);
      h1.classList.add("split-words");
    });
  }

  // Apparition au défilement : les éléments visibles en même temps arrivent l'un après l'autre.
  // Une fois l'apparition terminée, la classe reveal est retirée pour rendre aux éléments leurs propres transitions.
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(
      function (entries) {
        var batch = 0;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          if (!el.hasAttribute("data-delay")) el.style.transitionDelay = Math.min(batch, 6) * 0.08 + "s";
          batch++;
          el.classList.add("is-visible");
          io.unobserve(el);
          setTimeout(function () {
            el.style.transitionDelay = "";
            el.classList.remove("reveal");
          }, 1600);
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

  // Lueur qui suit le pointeur : cartes et haut de l'accueil
  if (finePointer) {
    var pending = null;
    document.addEventListener(
      "pointermove",
      function (e) {
        if (pending) return;
        pending = requestAnimationFrame(function () {
          pending = null;
          var card = e.target.closest && e.target.closest(".card");
          if (card) {
            var r = card.getBoundingClientRect();
            card.style.setProperty("--mx", e.clientX - r.left + "px");
            card.style.setProperty("--my", e.clientY - r.top + "px");
          }
          var hero = e.target.closest && e.target.closest(".hero");
          if (hero) {
            var h = hero.getBoundingClientRect();
            hero.style.setProperty("--px", e.clientX - h.left + "px");
            hero.style.setProperty("--py", e.clientY - h.top + "px");
          }
        });
      },
      { passive: true }
    );
  }

  // Grand bandeau des métiers : il dérive lentement et accélère avec le défilement
  var kinetic = document.querySelector(".kinetic");
  if (kinetic && !reduceMotion) {
    var rows = Array.prototype.map.call(kinetic.querySelectorAll(".kinetic__row"), function (row) {
      return { track: row.querySelector(".kinetic__track"), reverse: row.classList.contains("kinetic__row--reverse"), half: 0 };
    });
    var measure = function () {
      rows.forEach(function (r) {
        r.half = r.track.scrollWidth / 2;
      });
    };
    var running = false;
    var frame = function (t) {
      if (!running) return;
      var pos = t * 0.03 + window.scrollY * 0.45;
      rows.forEach(function (r) {
        if (!r.half) return;
        var offset = ((pos % r.half) + r.half) % r.half;
        r.track.style.setProperty("--shift", (r.reverse ? offset - r.half : -offset).toFixed(1) + "px");
      });
      requestAnimationFrame(frame);
    };
    measure();
    window.addEventListener("resize", measure, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        var visible = entries[entries.length - 1].isIntersecting;
        if (visible && !running) {
          running = true;
          measure();
          requestAnimationFrame(frame);
        } else if (!visible) {
          running = false;
        }
      }).observe(kinetic);
    }
  }

  // Mesure d'audience (Google Analytics 4) : bandeau de consentement ; Analytics n'est chargé qu'après
  // acceptation, et seulement sur l'adresse définitive du site. Sans identifiant (meta ga4), rien ne s'affiche.
  (function consent() {
    var meta = document.querySelector('meta[name="ga4"]');
    var id = meta && meta.getAttribute("content");
    if (!id) return;
    var KEY = "dse-consentement";
    var VALIDITY = 182 * 24 * 3600 * 1000; // choix conservé 6 mois
    var PROD = /(^|\.)darkside-energy\.com$/.test(location.hostname);
    var C = EN
      ? {
          label: "Cookie consent",
          title: "Audience measurement",
          text: "With your consent, we use Google Analytics to see which pages are read and improve the website. No advertising use.",
          more: "Our cookie policy",
          refuse: "Decline",
          accept: "Accept",
        }
      : {
          label: "Consentement aux cookies",
          title: "Mesure d'audience",
          text: "Avec votre accord, nous utilisons Google Analytics pour savoir quelles pages sont consultées et améliorer le site. Aucun usage publicitaire.",
          more: "Notre politique cookies",
          refuse: "Refuser",
          accept: "Accepter",
        };
    var legal = document.querySelector('.footer-bottom a[href*="mentions-legales"], .footer-bottom a[href*="legal-notice"]');
    var legalHref = legal ? legal.getAttribute("href") + "#cookies" : "#";
    var loaded = false;
    var banner = null;

    function read() {
      try {
        var v = JSON.parse(localStorage.getItem(KEY));
        if (v && Date.now() - v.t < VALIDITY) return v.choice;
      } catch (e) {
        /* stockage indisponible : le bandeau sera reproposé */
      }
      return null;
    }
    function write(choice) {
      try {
        localStorage.setItem(KEY, JSON.stringify({ choice: choice, t: Date.now() }));
      } catch (e) {
        /* stockage indisponible */
      }
    }
    function load() {
      if (loaded || !PROD) return;
      loaded = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
      window.gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "granted" });
      window.gtag("js", new Date());
      // Cookies limités à 13 mois, ni signaux Google ni personnalisation publicitaire
      window.gtag("config", id, { cookie_expires: 34128000, allow_google_signals: false, allow_ad_personalization_signals: false });
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
      document.head.appendChild(s);
    }
    function clearCookies() {
      var root = location.hostname.replace(/^www\./, "");
      document.cookie.split(";").forEach(function (c) {
        var name = c.split("=")[0].trim();
        if (!/^_ga/.test(name)) return;
        [location.hostname, "." + root, ""].forEach(function (d) {
          document.cookie = name + "=; Max-Age=0; path=/" + (d ? "; domain=" + d : "");
        });
      });
    }
    function decide(choice) {
      write(choice);
      if (banner) {
        banner.remove();
        banner = null;
      }
      if (choice === "granted") {
        load();
      } else {
        if (loaded && window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" });
        clearCookies();
      }
    }
    function open() {
      if (banner) return banner;
      banner = document.createElement("div");
      banner.className = "consent";
      banner.setAttribute("role", "region");
      banner.setAttribute("aria-label", C.label);
      banner.innerHTML =
        '<p class="consent__title">' + C.title + "</p>" +
        "<p>" + C.text + ' <a href="' + legalHref + '">' + C.more + "</a></p>" +
        '<div class="consent__actions">' +
        '<button class="btn btn--ghost btn--sm" type="button" data-choice="denied">' + C.refuse + "</button>" +
        '<button class="btn btn--ghost btn--sm" type="button" data-choice="granted">' + C.accept + "</button>" +
        "</div>";
      banner.addEventListener("click", function (e) {
        var b = e.target.closest("[data-choice]");
        if (b) decide(b.getAttribute("data-choice"));
      });
      document.body.appendChild(banner);
      return banner;
    }

    var choice = read();
    if (choice === "granted") load();
    else if (!choice) open();
    document.querySelectorAll("[data-consent-open]").forEach(function (b) {
      b.hidden = false;
      b.addEventListener("click", function () {
        open().querySelector("button").focus();
      });
    });
  })();

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
        status.textContent = T.required;
        invalid[0].focus();
        return;
      }
      if (!window.fetch || form.dataset.ajax === "false") return;
      e.preventDefault();
      var btn = form.querySelector("[type='submit']");
      btn.disabled = true;
      status.dataset.state = "";
      status.textContent = T.sending;
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
          status.textContent = T.sent;
          // Demande envoyée : compté dans Google Analytics si le visiteur l'a accepté
          if (window.gtag) window.gtag("event", "generate_lead", { form_name: form.getAttribute("name") || "contact" });
        })
        .catch(function () {
          status.dataset.state = "error";
          status.innerHTML = T.failed + "<a href=\"mailto:contact@darkside-energy.com\">contact@darkside-energy.com</a>.";
        })
        .then(function () {
          btn.disabled = false;
        });
    });
  }
})();
