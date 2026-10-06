// Lexique : recherche dans les termes et leurs définitions, sans tenir compte des accents ni des majuscules.
// Sans JavaScript, le champ reste masqué et le lexique s'affiche en entier.
const EN = document.documentElement.lang === "en";
const T = EN
  ? {
      count: (n) => `${n} term${n === 1 ? "" : "s"}`,
      empty: (q) => `No term matches “${q}”.`,
    }
  : {
      count: (n) => `${n} terme${n > 1 ? "s" : ""}`,
      empty: (q) => `Aucun terme ne correspond à « ${q} ».`,
    };

const box = document.querySelector("[data-glossary-search]");
const input = document.getElementById("g-search");
const count = document.getElementById("g-count");
const empty = document.querySelector("[data-glossary-empty]");
const emptyText = empty.querySelector("[data-empty-text]");
const glossary = document.querySelector(".glossary");

const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const items = Array.from(glossary.querySelectorAll(".glossary__item")).map((el) => ({ el, text: norm(el.textContent) }));

function update() {
  const words = norm(input.value).split(" ").filter(Boolean);
  let shown = 0;
  for (const item of items) {
    const match = words.every((w) => item.text.includes(w));
    item.el.hidden = !match;
    if (match) shown++;
  }
  count.textContent = T.count(shown);
  empty.hidden = shown > 0;
  if (!shown) emptyText.textContent = T.empty(input.value.trim());
}

input.addEventListener("input", update);
input.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && input.value) {
    input.value = "";
    update();
  }
});

// Lien vers un autre terme depuis une définition : la recherche est vidée pour que la cible soit visible
glossary.addEventListener("click", (e) => {
  if (e.target.closest('a[href^="#"]') && input.value) {
    input.value = "";
    update();
  }
});

// Recherche transmise dans l'adresse (?q=)
const q = new URLSearchParams(window.location.search).get("q");
if (q) input.value = q;

box.hidden = false;
update();
