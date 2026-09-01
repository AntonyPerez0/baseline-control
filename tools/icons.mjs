/* Render the SVG icon to the PNG sizes the web app manifest wants.
   Needs playwright, which is a dev only dependency. Run: node tools/icons.mjs */
import { createRequire } from "node:module";
const req = createRequire(import.meta.url);
const { chromium } = req(process.env.PW_PATH || "playwright");
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "icons/icon.svg"), "utf8")
  .replace(/\swidth="\d+"/, "")
  .replace(/\sheight="\d+"/, "");
const browser = await chromium.launch();

for (const [name, size, pad] of [["icon-192.png", 192, 0], ["icon-512.png", 512, 0], ["icon-maskable-512.png", 512, 0.1]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const inset = Math.round(size * pad);
  await page.setContent(
    `<style>html,body{margin:0;background:#0b2138;width:${size}px;height:${size}px;overflow:hidden}` +
    `svg{display:block;position:absolute;inset:${inset}px;width:${size - inset * 2}px;height:${size - inset * 2}px}</style>` + svg
  );
  const buf = await page.screenshot({ omitBackground: false });
  writeFileSync(join(root, "icons", name), buf);
  await page.close();
  console.log("wrote icons/" + name);
}
await browser.close();
