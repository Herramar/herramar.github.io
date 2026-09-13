import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "_site");
const site = JSON.parse(await readFile(path.join(root, "src", "data", "site.json"), "utf8"));

async function files(dir) {
  const entries = await readdir(dir, {withFileTypes:true});
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
  return nested.flat();
}

const allFiles = await files(out);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
const expected = ["index.html", "research/index.html", "publications/index.html", "teaching/index.html", "engagement/index.html", "about/index.html", "404.html"];
const errors = [];
const basePath = site.basePath.replace(/\/$/, "");

for (const expectedFile of expected) {
  if (!allFiles.includes(path.join(out, expectedFile))) errors.push(`Missing ${expectedFile}`);
}

const idsByFile = new Map();
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const relative = path.relative(out, file);
  const h1s = html.match(/<h1\b/g) || [];
  if (h1s.length !== 1) errors.push(`${relative}: expected one H1, found ${h1s.length}`);
  for (const required of ['lang="en"', 'href="#main-content"', '<main id="main-content"', '<meta name="description"']) {
    if (!html.includes(required)) errors.push(`${relative}: missing ${required}`);
  }
  if (/\[(?:confirm|provide|placeholder|tbd|todo)/i.test(html)) errors.push(`${relative}: unresolved editorial marker`);
  if (/01-CV_FULL|membership number|EA4IDI/i.test(html)) errors.push(`${relative}: private or excluded content reference`);
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  idsByFile.set(file, ids);
  if (ids.size !== [...html.matchAll(/\sid="([^"]+)"/g)].length) errors.push(`${relative}: duplicate ID`);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref = match[1];
    if (/^(https?:|mailto:)/.test(ref)) continue;
    const [withoutFragment, fragment] = ref.split("#");
    if (!withoutFragment && fragment && !ids.has(fragment)) errors.push(`${relative}: missing local anchor #${fragment}`);
    if (!withoutFragment) continue;
    const clean = withoutFragment.split("?")[0];
    if (!clean.startsWith(`${basePath}/`)) {
      errors.push(`${relative}: unexpected local URL ${ref}`);
      continue;
    }
    const publicPath = clean.slice(basePath.length);
    const target = path.join(out, publicPath.endsWith("/") ? publicPath.slice(1) + "index.html" : publicPath.slice(1));
    try {
      await access(target);
      if (fragment) {
        const targetHtml = await readFile(target, "utf8");
        if (!new RegExp(`\\sid=["']${fragment}["']`).test(targetHtml)) errors.push(`${relative}: missing target ${ref}`);
      }
    } catch {
      errors.push(`${relative}: missing local asset or page ${ref}`);
    }
  }
}

const publicationHtml = await readFile(path.join(out, "publications", "index.html"), "utf8");
if ((publicationHtml.match(/data-publication(?:\s|>)/g) || []).length !== 8) errors.push("Publications page does not contain exactly eight records");
if ((publicationHtml.match(/https:\/\/doi\.org\//g) || []).length < 8) errors.push("Publications page is missing DOI links");

const jsFiles = allFiles.filter((file) => file.endsWith(".js"));
for (const file of jsFiles) {
  const source = await readFile(file, "utf8");
  if (/\beval\s*\(|innerHTML\s*=/.test(source)) errors.push(`${path.relative(out, file)}: unsafe dynamic code pattern`);
}

const socialImage = await readFile(path.join(out, "assets", "images", "social-preview.png"));
const width = socialImage.readUInt32BE(16);
const height = socialImage.readUInt32BE(20);
if (width !== 1200 || height !== 630) errors.push(`Social preview must be 1200x630, found ${width}x${height}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Checked ${htmlFiles.length} HTML files, ${jsFiles.length} scripts, eight publications, metadata, and privacy exclusions.`);
