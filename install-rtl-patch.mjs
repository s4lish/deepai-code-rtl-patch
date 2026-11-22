// Portable installer for the DeepAI Code RTL patch.
//
// Usage:
//   node install-rtl-patch.mjs              (patch %LOCALAPPDATA%\Programs\deepai-code-desktop)
//   node install-rtl-patch.mjs "C:\custom\install\resources"   (custom resources dir)
//
// Requirements: Node.js 18+ and npm (npx not required). Close the DeepAI Code
// app before running. Safe to re-run (idempotent).
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const log = (...a) => console.log("[rtl-patch]", ...a);
const die = (msg) => {
  console.error("[rtl-patch] ERROR:", msg);
  process.exit(1);
};

// ---------- resolve paths ----------
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const SNIPPET = path.join(scriptDir, "rtl-inject.snippet.html");

let resourcesDir = process.argv[2];
if (!resourcesDir) {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  resourcesDir = path.join(localAppData, "Programs", "deepai-code-desktop", "resources");
}
const ARCHIVE = path.join(resourcesDir, "server.asar");
const UNPACKED = path.join(resourcesDir, "server.asar.unpacked");
if (!fs.existsSync(ARCHIVE)) die(`server.asar not found at ${ARCHIVE}`);
if (!fs.existsSync(SNIPPET)) die(`snippet not found at ${SNIPPET} (keep it next to this script)`);
log("installing to:", resourcesDir);

const WORK = path.join(os.tmpdir(), "deepai-rtl-patch");
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });
const SRC_DIR = path.join(WORK, "src");
const NEW_ASAR = path.join(WORK, "server.asar.new");
const NEW_UNPACKED = path.join(WORK, "server.asar.new.unpacked");

// ---------- make @electron/asar available ----------
const modDir = path.join(WORK, "asar-mod");
fs.mkdirSync(modDir, { recursive: true });
fs.writeFileSync(path.join(modDir, "package.json"), JSON.stringify({ name: "asar-helper", private: true }));
log("ensuring @electron/asar is installed (npm) ...");
const r = spawnSync(
  "npm",
  ["install", "@electron/asar", "--prefix", modDir, "--no-audit", "--no-fund", "--loglevel", "error"],
  { shell: true, stdio: "inherit" },
);
if (r.status !== 0) die("npm install @electron/asar failed");
const asarModulePath = (() => {
  const found = spawnSync(
    process.execPath,
    ["-e", `try{console.log(require.resolve('@electron/asar',{paths:[${JSON.stringify(modDir)}]}))}catch(e){process.exit(1)}`],
    { encoding: "utf8" },
  );
  if (found.status !== 0) die("@electron/asar not resolvable");
  return found.stdout.trim();
})();
const asar = await import(pathToFileURL(asarModulePath).href);

// ---------- 1. extract ----------
log("extracting archive ...");
await asar.extractAll(ARCHIVE, SRC_DIR);
const indexHtmlPath = path.join(SRC_DIR, "apps", "server", "dist", "client", "index.html");
if (!fs.existsSync(indexHtmlPath)) die("apps/server/dist/client/index.html not found inside archive");

// ---------- 2. patch index.html ----------
const HEAD_CLOSE = "  </head>\n";
const PATCH_COMMENT = "// === DeepAI Code RTL patch";
const snippet = fs.readFileSync(SNIPPET, "utf8");
let html = fs.readFileSync(indexHtmlPath, "utf8");
if (html.includes(PATCH_COMMENT)) {
  log("existing patch found — removing it to install the current version");
  const commentIdx = html.indexOf(PATCH_COMMENT);
  const scriptStart = html.lastIndexOf("<script>", commentIdx);
  const styleEnd = html.indexOf("</style>", commentIdx);
  if (scriptStart < 0 || styleEnd < 0) die("could not locate previous patch block to replace");
  html = html.slice(0, scriptStart) + html.slice(styleEnd + "</style>".length);
}
if (!html.includes(HEAD_CLOSE)) die("</head> marker not found — app version may have changed the layout");
html = html.replace(HEAD_CLOSE, snippet + "\n" + HEAD_CLOSE);
fs.writeFileSync(indexHtmlPath, html);
log("index.html patched");

// ---------- 3. pack ----------
log("packing ...");
await asar.createPackageWithOptions(SRC_DIR, NEW_ASAR, { unpack: "**/*.{node,exe,dll,so}" });
log("packed ->", NEW_ASAR);

// ---------- 4. verify ----------
const { header } = asar.getRawHeader(NEW_ASAR);
let unpackedCount = 0, total = 0;
const walk = (node) => {
  for (const child of Object.values(node.files ?? {})) {
    if (child.files) walk(child);
    else { total++; if (child.unpacked) unpackedCount++; }
  }
};
walk(header);
log(`verification: total=${total} unpacked=${unpackedCount}`);
const rt = asar.extractFile(NEW_ASAR, "apps\\server\\dist\\client\\index.html").toString("utf8");
if (!rt.includes('root.setAttribute("dir"')) die("round-trip check failed");
log("round-trip content check OK");

// ---------- 5. install with backups ----------
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const bakAsar = path.join(resourcesDir, `server.asar.bak-${stamp}`);
if (!fs.existsSync(bakAsar)) {
  log("backing up server.asar ->", path.basename(bakAsar));
  fs.copyFileSync(ARCHIVE, bakAsar);
}
fs.copyFileSync(NEW_ASAR, ARCHIVE);
log("server.asar installed");

// replace unpacked dir only when contents differ
const same = (() => {
  if (!fs.existsSync(UNPACKED) || !fs.existsSync(NEW_UNPACKED)) return false;
  const list = (dir, base = "") =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? list(path.join(dir, e.name), `${base}${e.name}/`) : [`${base}${e.name}`],
    );
  const rels = list(UNPACKED);
  if (rels.length !== list(NEW_UNPACKED).length) return false;
  for (const rel of rels) {
    const h = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
    if (h(path.join(UNPACKED, rel)) !== h(path.join(NEW_UNPACKED, rel))) return false;
  }
  return true;
})();
if (!same) {
  const bakUnpacked = path.join(resourcesDir, `server.asar.unpacked.bak-${stamp}`);
  if (fs.existsSync(UNPACKED) && !fs.existsSync(bakUnpacked)) fs.renameSync(UNPACKED, bakUnpacked);
  fs.renameSync(NEW_UNPACKED, UNPACKED);
  log("server.asar.unpacked replaced");
} else {
  log("server.asar.unpacked identical, left untouched");
}

log("DONE. Restart DeepAI Code to activate the RTL patch.");
