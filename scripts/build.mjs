import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "src", "data");
const outDir = path.join(root, "_site");

const load = async (name) => JSON.parse(await readFile(path.join(dataDir, name), "utf8"));
const [site, person, themes, publications, projects, organizations, awards, education, experience] = await Promise.all([
  load("site.json"), load("person.json"), load("themes.json"), load("publications.json"), load("projects.json"),
  load("organizations.json"), load("awards.json"), load("education.json"), load("experience.json")
]);

const cleanBase = (process.env.SITE_BASE_PATH ?? site.basePath ?? "").replace(/^\/$/, "").replace(/\/$/, "");
const base = cleanBase && !cleanBase.startsWith("/") ? `/${cleanBase}` : cleanBase;
const siteUrl = (process.env.SITE_URL ?? site.url ?? "").replace(/\/$/, "");
const url = (route = "/") => `${base}${route === "/" ? "/" : route}`;
const asset = (file) => `${base}/assets/${file}`;
const absolute = (route) => siteUrl ? `${siteUrl}${route}` : "";
const esc = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
const slugLabel = {"integrated-sige-front-ends":"Integrated SiGe", "antennas-radiometry-measurement":"Antennas & measurement", "space-communications":"Communications hardware"};
const typeLabel = {"journal-article":"Journal article", "conference-paper":"Conference paper"};

function profileLinks(className = "profile-links") {
  return `<ul class="${className}">${person.profiles.map((profile) => `<li><a href="${esc(profile.url)}">${esc(profile.label)}</a></li>`).join("")}</ul>`;
}

function header(active) {
  const nav = [["home", "/", "Home"], ["research", "/research/", "Research"], ["publications", "/publications/", "Publications"], ["engagement", "/engagement/", "Engagement"]];
  return `<a class="skip-link" href="#main-content">Skip to main content</a>
  <header class="site-header" data-site-header>
    <div class="wide-container header-inner">
      <a class="wordmark" href="${url("/")}" aria-label="${esc(person.name)}, home"><span class="wordmark-mark" aria-hidden="true">JMH</span><span class="wordmark-name"><strong>Juan María</strong><small>Herrera Martín</small></span></a>
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="primary-navigation" data-menu-button><span class="menu-label">Menu</span><span class="menu-icon" aria-hidden="true"></span></button>
      <nav id="primary-navigation" class="primary-navigation" aria-label="Primary" data-navigation>
        <ul>${nav.map(([id, route, label]) => `<li><a href="${url(route)}"${active === id ? ` aria-current="page"` : ""}>${label}</a></li>`).join("")}</ul>
      </nav>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="wide-container footer-grid">
      <div><p class="footer-name">${esc(person.name)}</p><p>${esc(person.role)} · ${esc(person.institutionShort)} · ${esc(person.groupShort)}</p><a href="mailto:${esc(person.email)}">${esc(person.email)}</a></div>
      <nav aria-label="Footer"><ul><li><a href="${url("/research/")}">Research</a></li><li><a href="${url("/publications/")}">Publications</a></li><li><a href="mailto:${esc(person.email)}">Contact</a></li></ul></nav>
      <div>${profileLinks("footer-profiles")}<p class="copyright">© 2026 ${esc(person.name)}. Content verified 13 September 2026.</p></div>
    </div>
  </footer>`;
}

function layout({ title, description, active, content, route = "/", bodyClass = "", jsonLd = false }) {
  const canonical = absolute(route);
  const documentTitle = active === "home" ? `${person.name} | RF & Antenna Researcher at UC3M` : `${title} | ${person.name}`;
  const ld = jsonLd && siteUrl ? `<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Person","name":person.name,"url":absolute("/"),"jobTitle":person.role,"affiliation":{"@type":"CollegeOrUniversity","name":person.institution},"memberOf":{"@type":"Organization","name":person.group},"sameAs":person.profiles.map((p) => p.url),"knowsAbout":["Silicon-germanium RF front ends","Millimeter-wave antennas","Radiometry","High-frequency measurement"]})}</script>` : "";
  return `<!doctype html>
<html lang="en" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(documentTitle)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="${esc(site.themeColor)}">
  <meta property="og:title" content="${esc(documentTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  ${canonical ? `<link rel="canonical" href="${esc(canonical)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(absolute("/assets/images/social-preview.png"))}"><meta property="og:image:alt" content="${esc(person.name + ": integrated RF front ends and antennas")}">` : ""}
  <link rel="icon" href="${asset("icons/favicon.svg")}" type="image/svg+xml">
  <link rel="stylesheet" href="${asset("css/styles.css")}">
  <script src="${asset("js/navigation.js")}" defer></script>
  <script src="${asset("js/signal-field.js")}" defer></script>
  ${ld}
</head>
<body class="${esc(bodyClass)}">
  ${header(active)}
  <main id="main-content" tabindex="-1">${content}</main>
  ${footer()}
</body>
</html>`;
}

function eyebrow(text) { return `<p class="eyebrow">${esc(text)}</p>`; }
function pageIntro(kicker, title, copy, options = {}) { return `<header class="page-intro${options.research ? " page-intro-research" : ""}${options.engagement ? " page-intro-engagement" : ""}${options.publications ? " page-intro-publications" : ""} wide-container">${kicker ? eyebrow(kicker) : ""}<h1>${options.titleLines ? options.titleLines.map(esc).join("<br>") : esc(title)}</h1><p class="lede">${esc(copy)}</p></header>`; }
function themeLinks(ids) { return `<ul class="tag-list" aria-label="Research themes">${ids.map((id) => `<li><a href="${url(`/research/#${id}`)}">${esc(slugLabel[id])}</a></li>`).join("")}</ul>`; }
function authors(pub) { return pub.authors.map((author) => person.citationNames.includes(author) ? `<strong>${esc(author)}</strong>` : esc(author)).join(", "); }

function publicationCard(pub, featured = false) {
  const details = [pub.venue, pub.volume ? `vol. ${pub.volume}` : "", pub.issue ? `no. ${pub.issue}` : "", pub.pages ? `pp. ${pub.pages}` : ""].filter(Boolean).join(", ");
  return `<article class="publication${featured ? " publication-featured" : ""}" id="${esc(pub.id)}" data-publication data-type="${esc(pub.type)}" data-themes="${esc(pub.themes.join(" "))}">
    <div class="publication-topline"><span>${esc(typeLabel[pub.type])}</span></div>
    <h3><a href="https://doi.org/${esc(pub.doi)}">${esc(pub.title)}</a></h3>
    ${featured && pub.summary ? `<p>${esc(pub.summary)}</p>` : ""}
    <p class="authors">${authors(pub)}</p>
    <p class="citation-meta"><cite>${esc(details)}</cite></p>
    ${themeLinks(pub.themes)}
    <div class="record-actions"><a href="https://doi.org/${esc(pub.doi)}">DOI</a>${pub.openAccessUrl ? `<a href="${esc(pub.openAccessUrl)}">Open access</a>` : ""}</div>
  </article>`;
}

function projectCard(project) {
  return `<article class="project" id="${esc(project.id)}">
    <div class="project-meta"><time>${esc(project.displayDates)}</time></div>
    <h3>${project.shortTitle ? `<span class="project-short">${esc(project.shortTitle)}</span>` : ""}${esc(project.title)}</h3>
    <p class="partner">${esc(project.partner)}</p><p>${esc(project.summary)}</p>
    <div class="project-note">${project.confidentiality === "limited" ? `<p class="disclosure">Public details limited</p>` : ""}</div>
    ${themeLinks(project.themes)}
  </article>`;
}

const currentProjects = projects.filter((p) => p.projectStatus === "current");
const completedProjects = projects.filter((p) => p.projectStatus === "completed").sort((a,b) => b.endDate.localeCompare(a.endDate));
const frequencyMarkerList = site.frequencyMarkers.map((marker, index) => `<li class="frequency-marker frequency-marker-${esc(marker.side ?? (index % 2 === 0 ? "below" : "above"))}${marker.showLabel === false ? " frequency-marker-description-only" : ""}" style="--marker-position: ${Number(marker.position)}%"><span class="frequency-marker-dot" aria-hidden="true"></span><span class="frequency-marker-label">${marker.showLabel === false ? "" : esc(marker.label)}<small class="frequency-marker-sample">${esc(marker.sample)}</small></span></li>`).join("");
const frequencyBandList = site.frequencyBands.map((band) => `<div class="frequency-band" style="--band-start: ${Number(band.start)}%; --band-end: ${Number(band.end)}%; --caption-position: ${Number(band.captionPosition ?? ((band.start + band.end) / 2))}%"><span>${esc(band.label)}</span></div>`).join("");

function homePage() {
  const heroAside = person.portrait ? `<figure class="hero-media"><picture>${person.portrait.avif ? `<source srcset="${asset(`images/${person.portrait.avif}`)}" type="image/avif">` : ""}${person.portrait.webp ? `<source srcset="${asset(`images/${person.portrait.webp}`)}" type="image/webp">` : ""}<img src="${asset(`images/${person.portrait.src}`)}" width="${Number(person.portrait.width)}" height="${Number(person.portrait.height)}" alt="${esc(person.portrait.alt)}" fetchpriority="high"></picture>${person.portrait.credit ? `<figcaption>${esc(person.portrait.credit)}</figcaption>` : ""}</figure>` : "";
  const educationRecord = (entry) => `<li><time datetime="${esc(entry.startDate)}">${esc(entry.displayDates)}</time><div><h4>${esc(entry.degree)}</h4><p>${esc(entry.institution)}</p>${entry.details.map((detail) => `<p${entry.category === "phd" && detail.startsWith("Thesis:") ? ` class="thesis-line"` : ""}>${esc(detail)}</p>`).join("")}</div></li>`;
  const educationByCategory = (category) => education.find((entry) => entry.category === category);
  const phd = educationByCategory("phd");
  const masters = educationByCategory("masters");
  const bachelors = educationByCategory("bachelors");
  const mastersTrack = (track) => `<div><time datetime="${esc(masters.startDate)}">${esc(masters.displayDates)}</time><div><h4>${esc(track.degree)}</h4><p>${esc(masters.institution)}</p>${masters.details.map((detail) => `<p>${esc(detail)}</p>`).join("")}${track.details.map((detail) => `<p>${esc(detail)}</p>`).join("")}</div></div>`;
  const educationList = `<div class="education-categories education-list"><section aria-label="PhD"><ol class="career-list">${educationRecord(phd)}</ol></section><section aria-label="Master's"><div class="masters-grid">${masters.tracks.map(mastersTrack).join("")}</div></section><section aria-label="Bachelor's"><ol class="career-list">${educationRecord(bachelors)}</ol></section></div>`;
  const experienceList = `<ol class="career-list experience-list">${experience.map((entry) => `<li><time datetime="${esc(entry.startDate)}">${esc(entry.displayDates)}</time><div><h4>${esc(entry.role)}</h4><p>${esc(entry.institution)}</p>${entry.details.map((detail) => `<p>${esc(detail)}</p>`).join("")}</div></li>`).join("")}</ol>`;
  const awardList = awards.map((award) => `<li><time datetime="${esc(award.date)}">${award.year}</time><div><h3>${esc(award.title)}</h3><p>${esc(award.body)} · ${esc(award.distinction)}</p></div></li>`).join("");
  const content = `<section class="hero"><div class="hero-grid" aria-hidden="true"></div><div class="wide-container hero-inner"><div class="hero-copy-block">${eyebrow("PhD Candidate · UC3M · GREMA")}<p class="hero-index">RF / ANTENNAS / 2026</p><h1><span>Juan María</span><span>Herrera Martín</span></h1><p class="research-line">${esc(person.researchLine)}</p><p class="hero-copy">${esc(person.heroSummary)}</p><div class="button-row"><a class="button button-primary" href="${url("/research/")}">Explore research <span aria-hidden="true">↗</span></a><a class="button" href="${url("/publications/")}">Publications</a><a class="text-link" href="mailto:${esc(person.email)}">Contact</a></div></div>${heroAside}<div class="frequency-axis" role="group" aria-label="Frequency range from 300 MHz to 300 GHz"><strong>300 MHz</strong><div class="frequency-track">${frequencyBandList}<i aria-hidden="true"></i><ol class="frequency-markers">${frequencyMarkerList}</ol></div><strong>300 GHz</strong></div></div></section>
  <section class="section section-paper experience-section" aria-labelledby="experience"><div class="wide-container"><div class="section-heading"><div><h2 id="experience">Professional experience</h2></div></div>${experienceList}</div></section>
  <section class="section section-paper education-section" aria-labelledby="education"><div class="wide-container"><div class="section-heading"><div><h2 id="education">Education</h2></div></div>${educationList}</div></section>
  <section class="section honors-section" aria-labelledby="honors"><div class="wide-container"><div class="section-heading"><div><h2 id="honors">Honors</h2></div></div><ol class="award-list">${awardList}</ol></div></section>`;
  return layout({ title: person.name, description: site.description, active:"home", route:"/", bodyClass:"home", jsonLd:true, content });
}

function researchPage() {
  const themeImages = {
    "integrated-sige-front-ends": ["laboratory-measurement.jpg", "Close-up of an integrated SiGe circuit"],
    "space-communications": ["PIFA.png", "Technical rendering of a PIFA antenna design"],
    "antennas-radiometry-measurement": ["antenna-prototype-detail.jpg", "Close-up of a spiral antenna prototype"]
  };
  const themeSections = themes.map((theme) => {
    const [imageName, imageAlt] = themeImages[theme.id];
    return `<section class="theme-section" id="${theme.id}" tabindex="-1" aria-labelledby="${theme.id}-title"><div class="wide-container"><div class="theme-header"><span class="theme-number">0${theme.order}</span><div><h2 id="${theme.id}-title">${esc(theme.title)}</h2><p class="lede-small">${esc(theme.problem)}</p></div></div><div class="theme-body"><div><h3>Approach</h3><p>${esc(theme.approach)}</p><h3>Methods</h3><ul class="method-list">${theme.methods.map((method) => `<li>${esc(method)}</li>`).join("")}</ul><h3>Applications</h3><p>${esc(theme.applications.join(" · "))}</p></div></div><figure class="theme-visual"><img src="${asset(`images/${imageName}`)}" alt="${esc(imageAlt)}" loading="lazy"></figure></div></section>`;
  }).join("");
  const overview = "My research connects integrated silicon-germanium electronics, antennas, and high-frequency measurement across millimeter- and submillimeter-wave bands. I develop fabrication-aware on-chip structures and front ends, study radiometric and communication architectures, and validate designs through electromagnetic simulation and laboratory characterization. My work spans compact Earth-observation radiometers, nanosatellite telemetry and telecommand, automotive sensing, satellite communications, 6G integrated sensing and communications, and sub-terahertz interconnects. Across these applications, my objective is to move demanding RF functions closer to an integrated, measurable, and deployable system.";
  const content = `${pageIntro("", "From integrated devices to measurable systems", overview, {research: true, titleLines: ["From integrated devices", "to measurable systems"]})}${themeSections}
  <section class="section section-paper" id="current-projects" aria-labelledby="current-title"><div class="wide-container"><div class="section-heading"><div><h2 id="current-title">Current projects</h2></div></div><div class="project-grid">${currentProjects.map(projectCard).join("")}</div></div></section>
  <section class="section" id="completed-projects" aria-labelledby="completed-title"><div class="wide-container"><div class="section-heading"><div><h2 id="completed-title">Completed projects</h2></div></div><div class="project-grid">${completedProjects.map(projectCard).join("")}</div></div></section>
  <section class="section contact-strip"><div class="wide-container"><div><h2>Discuss a collaboration</h2><p>For research and applied R&D conversations, contact me at my institutional UC3M address.</p></div><a class="button button-primary" href="mailto:${esc(person.email)}">${esc(person.email)}</a></div></section>`;
  return layout({title:"Research", description:"My research themes, methods, honors, and selected projects in integrated SiGe systems, antennas, radiometry, sensing, and communications.", active:"research", route:"/research/", bodyClass:"research", content});
}

function publicationsPage() {
  const years = [...new Set(publications.map((p) => p.year))].sort((a,b) => b-a);
  const grouped = years.map((year) => `<section class="publication-year" aria-labelledby="year-${year}"><h2 id="year-${year}">${year}</h2><div class="publication-list">${publications.filter((p) => p.year === year).sort((a,b) => a.title.localeCompare(b.title)).map((p) => publicationCard(p)).join("")}</div></section>`).join("");
  const content = `${pageIntro("", "Publications", "My peer-reviewed journal and conference publications on high-frequency antennas, integrated SiGe systems, radiometry, space communications, and sensing.", {publications: true})}<section class="profile-band"><div class="wide-container"><p>Explore my eight publications below, each with a DOI link.</p>${profileLinks()}</div></section>
  <section class="section publication-browser" aria-labelledby="all-publications"><div class="wide-container"><div class="section-heading"><div><h2 id="all-publications">All publications</h2></div><p><span data-result-count>${publications.length}</span> records</p></div><form class="filter-bar" data-publication-filters><fieldset><legend>Publication type</legend><label><input type="radio" name="type" value="all" checked> All</label><label><input type="radio" name="type" value="journal-article"> Journal article</label><label><input type="radio" name="type" value="conference-paper"> Conference paper</label></fieldset><label class="select-label">Research theme<select name="theme"><option value="all">All themes</option>${themes.map((t) => `<option value="${t.id}">${esc(t.title)}</option>`).join("")}</select></label><button class="button button-small" type="reset">Clear filters</button></form><p class="visually-hidden" aria-live="polite" data-filter-status></p><div data-publication-results>${grouped}</div><div class="empty-state" hidden data-empty-state><p>No publications match these filters.</p><button class="text-button" type="button" data-clear-filters>Clear filters</button></div></div></section><script src="${asset("js/publications-filter.js")}" defer></script>`;
  return layout({title:"Publications", description:"My eight peer-reviewed publications, with DOI links and filters by output type and research theme.", active:"publications", route:"/publications/", content});
}

function engagementPage() {
  const orgs = organizations.map((org) => `<article class="organization"><figure class="organization-logo organization-logo-${esc(org.logoShape)}"><img src="${asset(`images/${org.logo}`)}" alt="${esc(org.name)} logo"></figure><div class="organization-meta"><time>${esc(org.displayDates)}</time></div><h3>${esc(org.name)}</h3>${org.fullName ? `<p class="full-name">${esc(org.fullName)}</p>` : ""}<p class="role">${esc(org.role)}</p><p>${esc(org.summary)}</p></article>`).join("");
  const content = `${pageIntro("", "Engagement", "Through technical leadership and hands-on student initiatives, I connect my research practice with wider engineering communities.", {engagement: true})}<section class="section section-paper" aria-label="Organizations"><div class="wide-container"><div class="organization-grid">${orgs}</div></div></section><section class="section membership-band"><div class="wide-container two-column"><div><h2 id="memberships">Professional memberships</h2><p>I am a member of the Institute of Electrical and Electronics Engineers (IEEE), the Official College of Telecommunications Engineers (COIT), and the International Union of Radio Science (URSI España).</p></div><div><h2>Contact</h2><p>For technical-community enquiries, contact me at my institutional email address.</p><a href="mailto:${esc(person.email)}">${esc(person.email)}</a></div></div></section>`;
  return layout({title:"Engagement", description:"My technical-community leadership, CubeSat and rocketry work, and professional engagement.", active:"engagement", route:"/engagement/", content});
}


function notFoundPage() {
  const content = `<section class="error-page"><div class="reading-container">${eyebrow("404")}<h1>Page not found</h1><p>The address may be incorrect or the page may have moved.</p><div class="button-row"><a class="button button-primary" href="${url("/")}">Home</a><a class="button" href="${url("/research/")}">Research</a><a class="button" href="${url("/publications/")}">Publications</a></div></div></section>`;
  return layout({title:"Page not found", description:"The requested page could not be found.", active:"", route:"/404.html", content});
}

await rm(outDir, {recursive:true, force:true});
await mkdir(outDir, {recursive:true});
await cp(path.join(root, "src", "assets"), path.join(outDir, "assets"), {recursive:true});

const pages = [
  ["index.html", homePage()], ["research/index.html", researchPage()], ["publications/index.html", publicationsPage()],
  ["engagement/index.html", engagementPage()], ["404.html", notFoundPage()]
];
for (const [filename, html] of pages) {
  const destination = path.join(outDir, filename);
  await mkdir(path.dirname(destination), {recursive:true});
  await writeFile(destination, html, "utf8");
}

const publicRoutes = ["/", "/research/", "/publications/", "/engagement/"];
const sitemap = siteUrl ? `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicRoutes.map((route) => `\n  <url><loc>${esc(absolute(route))}</loc><lastmod>2026-09-13</lastmod></url>`).join("")}\n</urlset>\n` : `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Set SITE_URL during production build to generate absolute locations. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n`;
const robots = `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${absolute("/sitemap.xml")}\n` : ""}`;
await writeFile(path.join(outDir, "sitemap.xml"), sitemap, "utf8");
await writeFile(path.join(outDir, "robots.txt"), robots, "utf8");
console.log(`Built ${pages.length} HTML files in ${outDir} with base path "${base || "/"}".`);
