#!/usr/bin/env node
// Petit serveur local sans dépendance pour prévisualiser le site : node tools/serve.mjs [port]
// Sert le dossier site/, résout /page/ vers /page/index.html et renvoie 404.html si besoin.
// Simule aussi la connexion client (Netlify Identity), pour tester le bilan de puissance en local :
// compte test@darkside-energy.com, mot de passe essai-local ; jetons de lien « invitation » et « recuperation ».

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "site");
const PORT = Number(process.argv[2]) || 8080;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

async function resolve(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  let file = join(ROOT, clean);
  if (!file.startsWith(ROOT)) return null;
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, "index.html");
    await stat(file);
    return file;
  } catch {
    try {
      const withIndex = join(file, "index.html");
      await stat(withIndex);
      return withIndex;
    } catch {
      return null;
    }
  }
}

// --- Simulation locale de Netlify Identity (/.netlify/identity) --------------------------
const TEST_USER = { email: "test@darkside-energy.com", password: "essai-local" };
const tokens = new Set();

function issue() {
  const access = `local-${Math.random().toString(36).slice(2)}`;
  tokens.add(access);
  return { access_token: access, token_type: "bearer", expires_in: 3600, refresh_token: `r-${access}` };
}

async function identity(req, res, path) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const json = (status, data) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(data === undefined ? "" : JSON.stringify(data));
  };
  const bearer = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (path === "/token" && req.method === "POST") {
    const f = new URLSearchParams(raw);
    if (f.get("grant_type") === "password") {
      if (f.get("username") === TEST_USER.email && f.get("password") === TEST_USER.password) return json(200, issue());
      return json(400, { error: "invalid_grant", error_description: "Invalid Password" });
    }
    if (f.get("grant_type") === "refresh_token" && tokens.has(String(f.get("refresh_token")).slice(2))) return json(200, issue());
    return json(400, { error: "invalid_grant", error_description: "Invalid Refresh Token" });
  }
  if (path === "/user") {
    if (!tokens.has(bearer)) return json(401, { code: 401, msg: "Invalid token" });
    if (req.method === "PUT") {
      const body = JSON.parse(raw || "{}");
      if (body.password) TEST_USER.password = body.password;
    }
    return json(200, { email: TEST_USER.email });
  }
  if (path === "/verify" && req.method === "POST") {
    const body = JSON.parse(raw || "{}");
    if (body.type === "signup" && body.token === "invitation") {
      if (body.password) TEST_USER.password = body.password;
      return json(200, issue());
    }
    if (body.type === "recovery" && body.token === "recuperation") return json(200, issue());
    return json(404, { code: 404, msg: "User not found" });
  }
  if (path === "/recover" && req.method === "POST") return json(200, {});
  if (path === "/logout" && req.method === "POST") {
    tokens.delete(bearer);
    return json(204);
  }
  return json(404, { code: 404, msg: "Not found" });
}

createServer(async (req, res) => {
  const pathname = req.url.split("?")[0];
  if (pathname.startsWith("/.netlify/identity/")) {
    await identity(req, res, pathname.slice("/.netlify/identity".length));
    return;
  }
  if (req.method === "POST") {
    // Simule la réception du formulaire (en production, Netlify Forms s'en charge)
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }
  const file = await resolve(req.url);
  if (!file) {
    res.writeHead(404, { "Content-Type": TYPES[".html"] });
    res.end(await readFile(join(ROOT, "404.html")));
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
  res.end(await readFile(file));
}).listen(PORT, () => {
  console.log(`Site disponible sur http://localhost:${PORT}`);
});
