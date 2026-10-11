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
const verificationFile = "google27ce735307a40d08.html";
const htmlFiles = allFiles.filter((file) => file.endsWith(".html") && path.basename(file) !== verificationFile);
const expected = ["index.html", "research/index.html", "publications/index.html", "github/index.html", "engagement/index.html", "404.html"];
const errors = [];
const configuredBase = (process.env.SITE_BASE_PATH ?? site.basePath ?? "").replace(/^\/$/, "").replace(/\/$/, "");
const basePath = configuredBase && !configuredBase.startsWith("/") ? `/${configuredBase}` : configuredBase;
const siteUrl = (process.env.SITE_URL ?? site.url ?? "").replace(/\/$/, "");

for (const expectedFile of expected) {
  if (!allFiles.includes(path.join(out, expectedFile))) errors.push(`Missing ${expectedFile}`);
}
if ((await readFile(path.join(out, verificationFile), "utf8")) !== (await readFile(path.join(root, verificationFile), "utf8"))) {
  errors.push(`${verificationFile}: published verification content differs from the source`);
}

// Check the actual deployment artifact: Google fetches these files at the site root.
const sitemap = await readFile(path.join(out, "sitemap.xml"), "utf8");
const robots = await readFile(path.join(out, "robots.txt"), "utf8");
if (!sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">') || !sitemap.includes("</urlset>")) {
  errors.push("sitemap.xml: missing sitemap namespace or URL set");
}
if (siteUrl) {
  const expectedUrls = expected.filter((file) => file !== "404.html").map((file) => `${siteUrl}/${file.replace(/index\.html$/, "")}`);
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (sitemapUrls.length !== expectedUrls.length || new Set(sitemapUrls).size !== expectedUrls.length || expectedUrls.some((url) => !sitemapUrls.includes(url))) {
    errors.push("sitemap.xml: must list each public canonical URL exactly once and exclude error pages");
  }
  if (!robots.split(/\r?\n/).includes(`Sitemap: ${siteUrl}/sitemap.xml`)) errors.push("robots.txt: missing absolute sitemap URL");
  for (const file of expected.filter((file) => file !== "404.html")) {
    const html = await readFile(path.join(out, file), "utf8");
    const canonical = `${siteUrl}/${file.replace(/index\.html$/, "")}`;
    if (!html.includes(`<link rel="canonical" href="${canonical}">`)) errors.push(`${file}: canonical does not match sitemap`);
    if (/<meta name="robots"[^>]*noindex/i.test(html)) errors.push(`${file}: public page blocks indexing`);
  }
  const homeHtml = await readFile(path.join(out, "index.html"), "utf8");
  const structuredData = homeHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  try {
    const profile = JSON.parse(structuredData?.[1] ?? "");
    if (profile["@type"] !== "ProfilePage" || profile.mainEntity?.["@type"] !== "Person" || !profile.mainEntity?.name) {
      errors.push("index.html: missing ProfilePage / Person identity");
    }
    if (!profile.mainEntity?.description || !homeHtml.includes(profile.mainEntity.description)) {
      errors.push("index.html: structured biography must also appear as visible page content");
    }
  } catch {
    errors.push("index.html: invalid profile JSON-LD");
  }
}
if (!/^User-agent: \*$/m.test(robots) || !/^Allow: \/$/m.test(robots) || /^Disallow: \/$/m.test(robots)) {
  errors.push("robots.txt: public crawling must be allowed");
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
console.log(`Checked ${htmlFiles.length} HTML files, ${jsFiles.length} scripts, eight publications, sitemap, crawler rules, profile metadata, and privacy exclusions.`);
