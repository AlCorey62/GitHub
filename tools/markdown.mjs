// Conversion HTML vers Markdown, sans dépendance, pour les versions « lisibles par les IA »
// de chaque page (fichiers index.html.md, llms-full.txt). Conçu pour le HTML de ce site.

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const RAW = new Set(["script", "style", "textarea"]);
const SKIP_TAGS = new Set(["script", "style", "svg", "template", "form", "button", "input", "select", "textarea", "noscript", "picture", "img", "source", "iframe", "colgroup", "col"]);
const SKIP_CLASSES = ["breadcrumb", "visually-hidden", "hp", "card__index", "card__icon", "drawing", "no-md", "print-only", "skip-link", "eyebrow"];
const BLOCK = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "table", "blockquote", "dl", "div", "section", "article", "header", "footer", "figure", "figcaption", "main", "aside", "address", "nav", "details", "summary", "fieldset", "legend", "hr"]);

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "" };

function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return e.toLowerCase() in ENTITIES ? ENTITIES[e.toLowerCase()] : m;
  });
}

function parseAttrs(src) {
  const attrs = {};
  for (const m of src.matchAll(/([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

/** Analyse un fragment HTML bien formé et renvoie un arbre simple. */
export function parse(html) {
  const root = { tag: "#root", attrs: {}, children: [] };
  const stack = [root];
  let i = 0;
  while (i < html.length) {
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i);
      i = end < 0 ? html.length : end + 3;
      continue;
    }
    if (html[i] === "<") {
      const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/.exec(html.slice(i, i + 4000));
      if (!m) {
        stack[stack.length - 1].children.push({ text: "<" });
        i++;
        continue;
      }
      const [whole, closing, rawTag, attrSrc] = m;
      const tag = rawTag.toLowerCase();
      i += whole.length;
      if (closing) {
        for (let k = stack.length - 1; k > 0; k--) {
          if (stack[k].tag === tag) {
            stack.length = k;
            break;
          }
        }
        continue;
      }
      const node = { tag, attrs: parseAttrs(attrSrc), children: [] };
      stack[stack.length - 1].children.push(node);
      if (RAW.has(tag)) {
        const end = html.toLowerCase().indexOf(`</${tag}`, i);
        const stop = end < 0 ? html.length : end;
        node.children.push({ text: html.slice(i, stop) });
        i = html.indexOf(">", stop) + 1 || html.length;
        continue;
      }
      if (!VOID.has(tag) && !m[4]) stack.push(node);
      continue;
    }
    const next = html.indexOf("<", i);
    const stop = next < 0 ? html.length : next;
    stack[stack.length - 1].children.push({ text: decode(html.slice(i, stop)) });
    i = stop;
  }
  return root;
}

const cls = (n) => (n.attrs && n.attrs.class ? n.attrs.class.split(/\s+/) : []);
const hasClass = (n, c) => cls(n).includes(c);

function skipped(n) {
  if (!n.tag) return false;
  if (SKIP_TAGS.has(n.tag)) return true;
  // « Découvrir », « Lire » : libellés décoratifs des cartes cliquables
  if (n.tag === "span" && hasClass(n, "link-arrow")) return true;
  if (n.attrs["aria-hidden"] === "true") return true;
  if (n.tag === "nav" && hasClass(n, "breadcrumb")) return true;
  return SKIP_CLASSES.some((c) => hasClass(n, c));
}

const clean = (s) => s.replace(/[  ]/g, " ").replace(/­/g, "").replace(/\s+/g, " ");

function isBlock(n) {
  if (!n.tag) return false;
  if (BLOCK.has(n.tag)) return true;
  if (n.tag === "a") return n.children.some((c) => isBlock(c));
  return false;
}

function textOf(n) {
  if (n.text != null) return n.text;
  if (skipped(n)) return "";
  return n.children.map(textOf).join(n.tag === "p" && (hasClass(n, "post-meta") || hasClass(n, "post-card__meta")) ? " · " : "");
}

function inline(nodes, ctx) {
  let out = "";
  for (const n of nodes) {
    if (n.text != null) {
      out += n.text;
      continue;
    }
    if (skipped(n)) continue;
    const inner = () => inline(n.children, ctx);
    switch (n.tag) {
      case "a": {
        const t = clean(inner()).trim();
        const href = n.attrs.href || "";
        if (!t) break;
        out += href ? `[${t}](${ctx.resolve(href)})` : t;
        break;
      }
      case "strong":
      case "b": {
        const t = clean(inner()).trim();
        if (t) out += `**${t}**`;
        break;
      }
      case "em":
      case "i": {
        const t = clean(inner()).trim();
        if (t) out += `*${t}*`;
        break;
      }
      case "code": {
        const t = clean(inner()).trim();
        if (t) out += "`" + t + "`";
        break;
      }
      case "br":
        out += "\n";
        break;
      default:
        out += inner();
    }
  }
  return out;
}

const fmtInline = (s) =>
  s
    .split("\n")
    .map((l) => clean(l).trim())
    .filter(Boolean)
    .join("\n");

function renderList(n, ctx, depth) {
  const ordered = n.tag === "ol";
  const items = n.children.filter((c) => c.tag === "li" && !skipped(c));
  return items
    .map((li, idx) => {
      const marker = ordered ? `${idx + 1}.` : "-";
      const pad = "  ".repeat(depth);
      // Cas particulier : lieu + ville
      if (ctx.venues) {
        const name = li.children.find((c) => c.tag === "strong");
        const city = li.children.find((c) => c.tag === "span");
        if (name) return `${pad}${marker} **${clean(textOf(name)).trim()}**${city ? ` (${clean(textOf(city)).trim()})` : ""}`;
      }
      const parts = blocks(li.children, { ...ctx, depth: depth + 1 }).filter(Boolean);
      if (!parts.length) return "";
      const head = li.children.find((c) => /^h[1-6]$/.test(c.tag || ""));
      const when = li.children.find((c) => c.tag && hasClass(c, "when"));
      let text;
      if (head) {
        const title = (when ? `${clean(textOf(when)).trim()} : ` : "") + clean(inline(head.children, ctx)).trim();
        const rest = blocks(li.children.filter((c) => c !== head && c !== when), { ...ctx, depth: depth + 1 })
          .filter(Boolean)
          .map((b) => b.replace(/\n+/g, " "))
          .join(" ");
        text = rest ? `**${title}** : ${rest}` : `**${title}**`;
      } else {
        const nested = parts.filter((p) => /^\s*(-|\d+\.) /.test(p));
        const flat = parts.filter((p) => !/^\s*(-|\d+\.) /.test(p)).map((p) => p.replace(/\n+/g, " "));
        text = flat.join(" ") + (nested.length ? "\n" + nested.join("\n") : "");
      }
      return `${pad}${marker} ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

function renderTable(n, ctx) {
  const rows = [];
  let caption = "";
  let hasHead = false;
  const walk = (node, inHead) => {
    for (const c of node.children) {
      if (!c.tag || skipped(c)) continue;
      if (c.tag === "caption") caption = clean(inline(c.children, ctx)).trim();
      else if (c.tag === "thead") {
        hasHead = true;
        walk(c, true);
      } else if (c.tag === "tbody" || c.tag === "tfoot") walk(c, false);
      else if (c.tag === "tr") {
        rows.push({
          head: inHead,
          cells: c.children.filter((x) => x.tag === "th" || x.tag === "td").map((x) => clean(inline(x.children, ctx)).trim().replace(/\|/g, "\\|")),
        });
      }
    }
  };
  walk(n, false);
  if (!rows.length) return "";
  const out = [];
  if (caption) out.push(`*${caption}*`, "");
  if (hasHead) {
    const width = Math.max(...rows.map((r) => r.cells.length));
    const pad = (cells) => cells.concat(Array(width - cells.length).fill(""));
    const head = rows.find((r) => r.head);
    out.push(`| ${pad(head.cells).join(" | ")} |`, `| ${Array(width).fill("---").join(" | ")} |`);
    rows.filter((r) => !r.head).forEach((r) => out.push(`| ${pad(r.cells).join(" | ")} |`));
  } else {
    rows.forEach((r) => out.push(r.cells.length > 1 ? `- **${r.cells[0]}** : ${r.cells.slice(1).join(", ")}` : `- ${r.cells[0]}`));
  }
  return out.join("\n");
}

function renderDl(n, ctx) {
  const out = [];
  let dt = null;
  const visit = (node) => {
    for (const c of node.children) {
      if (!c.tag || skipped(c)) continue;
      if (c.tag === "div") visit(c);
      else if (c.tag === "dt") dt = clean(inline(c.children, ctx)).trim();
      else if (c.tag === "dd") {
        const dd = clean(inline(c.children, ctx)).trim();
        if (dd) out.push(dt ? `- **${dt}** : ${dd}` : `- ${dd}`);
        dt = null;
      }
    }
  };
  visit(n);
  return out.join("\n");
}

function blocks(nodes, ctx) {
  const out = [];
  let buf = [];
  const flush = () => {
    const t = fmtInline(inline(buf, ctx));
    if (t) out.push(t);
    buf = [];
  };
  for (const n of nodes) {
    if (n.text != null || (n.tag && !isBlock(n) && !skipped(n))) {
      buf.push(n);
      continue;
    }
    if (skipped(n)) continue;
    flush();
    const tag = n.tag;
    if (/^h[1-6]$/.test(tag)) {
      const t = clean(inline(n.children, ctx)).trim();
      if (t) out.push(`${"#".repeat(Number(tag[1]))} ${t}`);
    } else if (tag === "p" && (hasClass(n, "post-meta") || hasClass(n, "post-card__meta"))) {
      const parts = n.children.map((c) => clean(textOf(c)).trim()).filter(Boolean);
      if (parts.length) out.push(parts.join(" · "));
    } else if (tag === "p" || tag === "figcaption" || tag === "summary" || tag === "legend") {
      const t = fmtInline(inline(n.children, ctx));
      if (t) out.push(tag === "figcaption" ? `*${t}*` : t);
    } else if (tag === "ul" || tag === "ol") {
      const t = renderList(n, { ...ctx, venues: hasClass(n, "venues") }, ctx.depth || 0);
      if (t) out.push(t);
    } else if (tag === "table") {
      const t = renderTable(n, ctx);
      if (t) out.push(t);
    } else if (tag === "dl") {
      const t = renderDl(n, ctx);
      if (t) out.push(t);
    } else if (tag === "blockquote") {
      const inner = blocks(n.children, ctx).filter(Boolean);
      if (inner.length) out.push(inner.map((b) => b.split("\n").map((l) => `> ${l}`).join("\n")).join("\n>\n"));
    } else if (tag === "hr") {
      out.push("---");
    } else if (tag === "a") {
      // Lien englobant un bloc (carte) : titre lié puis contenu
      const href = ctx.resolve(n.attrs.href || "");
      const inner = blocks(n.children, ctx).filter(Boolean);
      const hi = inner.findIndex((b) => /^#{1,6} /.test(b));
      if (hi >= 0) {
        const m = /^(#{1,6}) (.*)$/.exec(inner[hi]);
        inner[hi] = `${m[1]} [${m[2]}](${href})`;
        out.push(...inner);
      } else if (inner.length) {
        out.push(`[${inner.join(" ").replace(/\n+/g, " ")}](${href})`);
      }
    } else if (hasClass(n, "marquee__track")) {
      const items = n.children.filter((c) => c.tag === "span" && !skipped(c)).map((c) => `- ${clean(textOf(c)).trim()}`);
      if (items.length) out.push(items.join("\n"));
    } else if (hasClass(n, "stats")) {
      const items = n.children
        .filter((c) => c.tag && hasClass(c, "stat"))
        .map((s) => {
          const v = s.children.find((c) => c.tag && hasClass(c, "stat__value"));
          const l = s.children.find((c) => c.tag && hasClass(c, "stat__label"));
          return `- **${clean(textOf(v || { text: "" })).trim()}** : ${clean(textOf(l || { text: "" })).trim()}`;
        });
      if (items.length) out.push(items.join("\n"));
    } else {
      out.push(...blocks(n.children, ctx));
    }
  }
  flush();
  return out;
}

/**
 * Convertit le contenu principal d'une page en Markdown.
 * @param {string} html page complète
 * @param {string} pageUrl URL absolue de la page (pour résoudre les liens relatifs)
 */
export function pageToMarkdown(html, pageUrl) {
  const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(html);
  const tree = parse(main ? main[1] : html);
  const ctx = {
    depth: 0,
    resolve: (href) => {
      if (/^(mailto:|tel:)/.test(href)) return href;
      try {
        return new URL(href, pageUrl).toString();
      } catch {
        return href;
      }
    },
  };
  return blocks(tree.children, ctx)
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}
