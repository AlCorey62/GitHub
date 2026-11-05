// Diffusion d'une vidéo (tools/diffusion.mjs) contre de fausses API Facebook et LinkedIn, en local :
// la vidéo part quand les réseaux l'acceptent, et le visuel la remplace quand ils la refusent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, readFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function semaine(dir, base) {
  const week = join(dir, "2026-11-16");
  mkdirSync(week, { recursive: true });
  copyFileSync(join(ROOT, "tools", "essai-video.mp4"), join(week, "essai.mp4"));
  copyFileSync(join(ROOT, "site", "assets", "img", "icon-512.png"), join(week, "lundi.png"));
  writeFileSync(
    join(week, "publications.md"),
    `# Semaine d'essai\n\nStatut : **validé par Damien le 01/01/2026**.\n\n## Lundi 16/11 · Essai\n\n**Vidéo** : \`essai.mp4\`\n**Visuel** : \`lundi.png\`\n**Lien** : ${base}/ok\n\n**LinkedIn**\n\n> Texte LinkedIn\n\n**Facebook**\n\n> Texte Facebook\n`
  );
  return week;
}

// Fausses API : enregistre les requêtes ; refuse les vidéos si refus = true
function fauxReseaux(refus) {
  const calls = [];
  const server = createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const url = new URL(req.url, "http://x");
      calls.push({ method: req.method, path: url.pathname, query: url.search, body });
      const json = (code, data, headers = {}) => {
        res.writeHead(code, { "Content-Type": "application/json", ...headers });
        res.end(JSON.stringify(data));
      };
      const base = `http://127.0.0.1:${server.address().port}`;
      const p = url.pathname;
      if (p === "/ok") return json(200, {});
      if (p === "/fb/123" && req.method === "GET") return json(200, { name: "Dark Side Energy" });
      if (p === "/fbvideo/123/videos") return refus ? json(400, { error: { message: "format refusé" } }) : json(200, { id: "fbvid1" });
      if (p === "/fb/123/photos") return json(200, { id: "fbphoto1", post_id: "123_9" });
      if (p === "/li/videos" && url.search.includes("initializeUpload")) {
        if (refus) return json(500, { message: "indisponible" });
        const size = JSON.parse(body).initializeUploadRequest.fileSizeBytes;
        return json(200, { value: { video: "urn:li:video:1", uploadToken: "", uploadInstructions: [{ uploadUrl: `${base}/upload/video`, firstByte: 0, lastByte: size - 1 }] } });
      }
      if (p === "/upload/video") return json(200, {}, { ETag: "etag-1" });
      if (p === "/li/videos" && url.search.includes("finalizeUpload")) return json(200, {});
      if (p.startsWith("/li/videos/")) return json(200, { status: "AVAILABLE" });
      if (p === "/li/images" && url.search.includes("initializeUpload")) return json(200, { value: { uploadUrl: `${base}/upload/image`, image: "urn:li:image:1" } });
      if (p === "/upload/image") return json(201, {});
      if (p.startsWith("/li/images/")) return json(200, { status: "AVAILABLE" });
      if (p === "/li/posts") return json(201, {}, { "x-restli-id": "urn:li:share:9" });
      json(404, { message: `inconnu : ${req.method} ${p}` });
    });
  });
  return new Promise((res) => server.listen(0, "127.0.0.1", () => res({ server, calls, base: `http://127.0.0.1:${server.address().port}` })));
}

async function diffuser(refus) {
  const { server, calls, base } = await fauxReseaux(refus);
  const dir = mkdtempSync(join(tmpdir(), "diffusion-video-"));
  const week = semaine(dir, base);
  const env = {
    ...process.env,
    GITHUB_ACTIONS: "",
    DIFFUSION_RESUME: "",
    DIFFUSION_SEMAINES: dir,
    FACEBOOK_PAGE_ID: "123",
    FACEBOOK_PAGE_TOKEN: "jeton-fb",
    FACEBOOK_GRAPH_URL: `${base}/fb`,
    FACEBOOK_GRAPH_VIDEO_URL: `${base}/fbvideo`,
    LINKEDIN_ORG_ID: "1",
    LINKEDIN_TOKEN: "jeton-li",
    LINKEDIN_REFRESH_TOKEN: "",
    LINKEDIN_API_URL: `${base}/li`,
    LINKEDIN_ATTENTE_MS: "1",
  };
  const run = spawn(process.execPath, [join(ROOT, "tools", "diffusion.mjs"), "--date", "2026-11-16"], { env });
  let out = "";
  run.stdout.on("data", (d) => (out += d));
  run.stderr.on("data", (d) => (out += d));
  const code = await new Promise((res) => run.on("close", res));
  server.close();
  const journal = JSON.parse(readFileSync(join(week, "diffusion.json"), "utf8"));
  rmSync(dir, { recursive: true, force: true });
  return { code, out, calls, journal };
}

test("diffusion : la vidéo part sur Facebook et LinkedIn quand elle est acceptée", async () => {
  const { code, out, calls, journal } = await diffuser(false);
  assert.equal(code, 0, out);
  const fb = calls.find((c) => c.path === "/fbvideo/123/videos");
  assert.ok(fb && fb.body.includes("video/mp4") && fb.body.includes("Texte Facebook"), "vidéo envoyée à Facebook avec sa description");
  assert.ok(!calls.some((c) => c.path === "/fb/123/photos"), "pas de visuel envoyé à Facebook");
  assert.ok(calls.some((c) => c.path === "/upload/video" && c.method === "PUT"), "vidéo envoyée à LinkedIn");
  const fin = calls.find((c) => c.query.includes("finalizeUpload"));
  assert.deepEqual(JSON.parse(fin.body).finalizeUploadRequest.uploadedPartIds, ["etag-1"]);
  const post = JSON.parse(calls.find((c) => c.path === "/li/posts").body);
  assert.equal(post.content.media.id, "urn:li:video:1");
  assert.equal(journal["2026-11-16"].facebook.video, "essai.mp4");
  assert.equal(journal["2026-11-16"].linkedin.video, "essai.mp4");
});

test("diffusion : le visuel remplace la vidéo refusée, sans double publication", async () => {
  const { code, out, calls, journal } = await diffuser(true);
  assert.equal(code, 0, out);
  assert.match(out, /Facebook : vidéo refusée/);
  assert.match(out, /LinkedIn : vidéo refusée/);
  assert.equal(calls.filter((c) => c.path === "/fb/123/photos").length, 1, "un seul visuel envoyé à Facebook");
  const posts = calls.filter((c) => c.path === "/li/posts");
  assert.equal(posts.length, 1, "une seule publication LinkedIn");
  assert.equal(JSON.parse(posts[0].body).content.media.id, "urn:li:image:1");
  assert.equal(journal["2026-11-16"].facebook.video, undefined);
  assert.equal(journal["2026-11-16"].linkedin.video, undefined);
});
