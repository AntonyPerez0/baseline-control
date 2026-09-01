/* Build the two single file bundles and the deployable site.
   No dependencies. Run: npm run build */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const html = read("index.html");

/* pull the ordered script list and the stylesheet out of index.html so this
   file never has to be kept in step with it by hand */
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const localCss = [...html.matchAll(/<link rel="stylesheet" href="(src\/[^"]+)"/g)].map((m) => m[1]);
if (!scripts.length) throw new Error("no local scripts found in index.html");
if (!localCss.length) throw new Error("no local stylesheet found in index.html");

const fontLink = (html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/) || [""])[0];
const preconnects = [...html.matchAll(/<link rel="preconnect"[^>]*>/g)].map((m) => m[0]).join("\n");
const title = (html.match(/<title>([^<]*)<\/title>/) || [, "Baseline Control"])[1];
const description = (html.match(/<meta name="description" content="([^"]*)"/) || [, ""])[1];

const css = localCss.map((p) => read(p)).join("\n");
const bundleFor = (list) =>
  list.map((p) => `/* ---- ${p} ---- */\n` + read(p)).join("\n");

const bodyMarkup = `<header class="topbar" id="topbar" hidden></header>
<main id="main"><div class="wrap" id="view"></div></main>
<div id="modal-root"></div>
<div id="toasts" aria-live="polite"></div>`;

/* 1. standalone: a complete document that works from disk or any static host */
const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="description" content="${description}">
<title>${title}</title>
${preconnects}
${fontLink}
<style>
${css}
</style>
</head>
<body>
${bodyMarkup}
<script>
${bundleFor(scripts.filter((p) => !p.includes("boot-sw")))}
</script>
</body>
</html>
`;

/* 2. artifact fragment: no document skeleton, the host supplies it */
const fragment = `<title>${title}</title>
${preconnects}
${fontLink}
<style>
${css}
</style>
${bodyMarkup}
<script>
${bundleFor(scripts.filter((p) => !p.includes("boot-sw")))}
</script>
`;

mkdirSync(join(root, "build"), { recursive: true });
writeFileSync(join(root, "build/baseline-control.html"), standalone);
writeFileSync(join(root, "build/artifact.html"), fragment);

/* 3. _site: exactly what gets published, nothing else */
const site = join(root, "_site");
rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
for (const p of ["index.html", "sw.js", "manifest.webmanifest", ".nojekyll", "src", "icons", "build"]) {
  if (existsSync(join(root, p))) cpSync(join(root, p), join(site, p), { recursive: true });
}

const kb = (s) => Math.round(s.length / 1024) + " KB";
console.log("build/baseline-control.html  " + kb(standalone));
console.log("build/artifact.html          " + kb(fragment));
console.log("_site                        " + scripts.length + " scripts, " + localCss.length + " stylesheet");
