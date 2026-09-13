import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "src", "data");
const outDir = path.join(root, "_site");

const load = async (name) => JSON.parse(await readFile(path.join(dataDir, name), "utf8"));
const [site, person, themes, publications, projects, teaching, talks, organizations, awards] = await Promise.all([
  load("site.json"), load("person.json"), load("themes.json"), load("publications.json"), load("projects.json"),
  load("teaching.json"), load("talks.json"), load("organizations.json"), load("awards.json")
]);

const cleanBase = (process.env.SITE_BASE_PATH ?? site.basePath ?? "").replace(/^\/$/, "").replace(/\/$/, "");
const base = cleanBase && !cleanBase.startsWith("/") ? `/${cleanBase}` : cleanBase;
const siteUrl = (process.env.SITE_URL ?? site.url ?? "").replace(/\/$/, "");
const url = (route = "/") => `${base}${route === "/" ? "/" : route}`;
const asset = (file) => `${base}/assets/${file}`;
const absolute = (route) => siteUrl ? `${siteUrl}${route}` : "";
const esc = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
const slugLabel = {"integrated-sige-front-ends":"Integrated SiGe", "antennas-radiometry-measurement":"Antennas & measurement", "space-sensing-future-communications":"Space, sensing & 6G"};
const typeLabel = {"journal-article":"Journal article", "conference-paper":"Conference paper"};

function profileLinks(className = "profile-links") {
  return `<ul class="${className}">${person.profiles.map((profile) => `<li><a href="${esc(profile.url)}">${esc(profile.label)}</a></li>`).join("")}</ul>`;
}

function header(active) {
  const nav = [["home", "/", "Home"], ["research", "/research/", "Research"], ["publications", "/publications/", "Publications"], ["teaching", "/teaching/", "Teaching"], ["engagement", "/engagement/", "Engagement"], ["about", "/about/", "About"]];
  return `<a class="skip-link" href="#main-content">Skip to main content</a>
  <header class="site-header" data-site-header>
    <div class="wide-container header-inner">
      <a class="wordmark" href="${url("/")}" aria-label="${esc(person.name)}, home"><span>Juan M.</span><strong>Herrera Martín</strong></a>
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
      <nav aria-label="Footer"><ul><li><a href="${url("/research/")}">Research</a></li><li><a href="${url("/publications/")}">Publications</a></li><li><a href="${url("/about/")}">About</a></li><li><a href="mailto:${esc(person.email)}">Contact</a></li></ul></nav>
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
function pageIntro(kicker, title, copy) { return `<header class="page-intro wide-container">${eyebrow(kicker)}<h1>${esc(title)}</h1><p class="lede">${esc(copy)}</p></header>`; }
function themeLinks(ids) { return `<ul class="tag-list" aria-label="Research themes">${ids.map((id) => `<li><a href="${url(`/research/#${id}`)}">${esc(slugLabel[id])}</a></li>`).join("")}</ul>`; }
function authors(pub) { return pub.authors.map((author) => person.citationNames.includes(author) ? `<strong>${esc(author)}</strong>` : esc(author)).join(", "); }

function publicationCard(pub, featured = false) {
  const details = [pub.venue, pub.volume ? `vol. ${pub.volume}` : "", pub.issue ? `no. ${pub.issue}` : "", pub.pages ? `pp. ${pub.pages}` : ""].filter(Boolean).join(", ");
  return `<article class="publication${featured ? " publication-featured" : ""}" id="${esc(pub.id)}" data-publication data-type="${esc(pub.type)}" data-themes="${esc(pub.themes.join(" "))}">
    <div class="publication-topline"><span>${esc(typeLabel[pub.type])}</span><time datetime="${pub.year}">${pub.year}</time></div>
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
    <div class="project-meta"><span class="status status-${esc(project.projectStatus)}">${project.projectStatus === "current" ? "Current" : "Completed"}</span><time>${esc(project.displayDates)}</time></div>
    <h3>${project.shortTitle ? `<span class="project-short">${esc(project.shortTitle)}</span>` : ""}${esc(project.title)}</h3>
    <p class="partner">${esc(project.partner)}</p><p>${esc(project.summary)}</p>
    ${project.juanRole ? `<p class="role"><strong>Role:</strong> ${esc(project.juanRole)}</p>` : ""}
    ${project.confidentiality === "limited" ? `<p class="disclosure">Public details limited</p>` : ""}
    ${themeLinks(project.themes)}
  </article>`;
}

const featuredPublications = publications.filter((p) => p.featured).sort((a,b) => a.featuredOrder - b.featuredOrder);
const currentProjects = projects.filter((p) => p.projectStatus === "current");
const completedProjects = projects.filter((p) => p.projectStatus === "completed").sort((a,b) => b.endDate.localeCompare(a.endDate));

function homePage() {
  const themeCards = themes.map((theme) => `<li><a class="theme-link" href="${url(`/research/#${theme.id}`)}"><span class="theme-number">0${theme.order}</span><h3>${esc(theme.title)}</h3><p>${esc(theme.problem)}</p><span class="theme-methods">${esc(theme.methods.slice(0,2).join(" · "))}</span></a></li>`).join("");
  const telcoSummary = "Two limited-disclosure projects covering antenna prototypes, active and broadband arrays, and control electronics for beamforming and angle-of-arrival applications.";
  const homeProjects = [currentProjects.find((p) => p.id === "project-disco6g-cm"), {id:"project-telefonica-group", title:"Telefónica Antenna Systems", shortTitle:null, displayDates:"2026-2027", projectStatus:"current", partner:"Telefónica Solutions", summary:telcoSummary, confidentiality:"limited", themes:["antennas-radiometry-measurement","space-sensing-future-communications"]}, currentProjects.find((p) => p.id === "project-leapwave-interconnects")];
  const heroAside = person.portrait ? `<figure class="hero-media"><picture>${person.portrait.avif ? `<source srcset="${asset(`images/${person.portrait.avif}`)}" type="image/avif">` : ""}${person.portrait.webp ? `<source srcset="${asset(`images/${person.portrait.webp}`)}" type="image/webp">` : ""}<img src="${asset(`images/${person.portrait.src}`)}" width="${Number(person.portrait.width)}" height="${Number(person.portrait.height)}" alt="${esc(person.portrait.alt)}" fetchpriority="high"></picture>${person.portrait.credit ? `<figcaption>${esc(person.portrait.credit)}</figcaption>` : ""}</figure>` : `<aside class="frequency-note" aria-label="Research range"><span>Research range</span><strong>79 GHz → 200+ GHz</strong><p>Integrated devices, antennas, measurement, and systems.</p></aside>`;
  const content = `<section class="hero"><div class="wide-container hero-inner"><div>${eyebrow("PhD Candidate · UC3M · GREMA")}<h1>${esc(person.name)}</h1><p class="research-line">${esc(person.researchLine)}</p><p class="hero-copy">${esc(person.heroSummary)}</p><div class="button-row"><a class="button button-primary" href="${url("/research/")}">Explore research</a><a class="button" href="${url("/publications/")}">View publications</a><a class="text-link" href="mailto:${esc(person.email)}">Contact</a></div></div>${heroAside}</div></section>
  <section class="section research-glance" aria-labelledby="home-research"><div class="wide-container"><div class="section-heading"><div>${eyebrow("Research program")}<h2 id="home-research">Three connected scales</h2></div><p>From on-chip structures to complete sensing and communication applications.</p></div><ol class="theme-grid">${themeCards}</ol></div></section>
  <section class="section section-paper" aria-labelledby="featured-work"><div class="wide-container"><div class="section-heading"><div>${eyebrow("Selected evidence")}<h2 id="featured-work">Featured work</h2></div><a href="${url("/publications/")}">All eight publications</a></div><div class="featured-grid">${featuredPublications.map((pub) => publicationCard(pub, true)).join("")}</div></div></section>
  <section class="section" aria-labelledby="current-work"><div class="wide-container"><div class="section-heading"><div>${eyebrow("September 2026 snapshot")}<h2 id="current-work">Current projects</h2></div><a href="${url("/research/#current-projects")}">Research projects</a></div><div class="project-grid">${homeProjects.map(projectCard).join("")}</div></div></section>
  <section class="section split-band" aria-labelledby="teaching-leadership"><div class="wide-container"><h2 id="teaching-leadership" class="visually-hidden">Teaching and technical communities</h2><div><span class="section-index">Teaching</span><h3>RF engineering in the laboratory</h3><p>Laboratory instruction in high-frequency technology, radiofrequency subsystems, and linear network analysis at UC3M.</p><a href="${url("/teaching/")}">Teaching & mentoring</a></div><div><span class="section-index">Technical communities</span><h3>Building systems and teams</h3><p>Founding leadership in PUNTO and UC3-Base, plus payload and radio-frequency work with ST3LLARSAT1/BOIRA.</p><a href="${url("/engagement/")}">Engagement</a></div></div></section>
  <section class="section bio-contact" aria-labelledby="about-juan"><div class="wide-container two-column"><div>${eyebrow(person.location)}<h2 id="about-juan">About Juan</h2><p>${esc(person.shortBio)}</p><a href="${url("/about/")}">Read the full biography</a></div><aside class="contact-panel"><h3>Research and collaboration</h3><p>For research, technical collaboration, or student-project questions, contact Juan through his UC3M address.</p><a class="button button-primary" href="mailto:${esc(person.email)}">Email Juan</a>${profileLinks()}</aside></div></section>`;
  return layout({ title: person.name, description: site.description, active:"home", route:"/", bodyClass:"home", jsonLd:true, content });
}

function researchPage() {
  const related = (theme) => publications.filter((p) => p.themes.includes(theme.id)).slice(0,3);
  const themeSections = themes.map((theme) => `<section class="theme-section" id="${theme.id}" tabindex="-1" aria-labelledby="${theme.id}-title"><div class="wide-container"><div class="theme-header"><span class="theme-number">0${theme.order}</span><div><h2 id="${theme.id}-title">${esc(theme.title)}</h2><p class="lede-small">${esc(theme.problem)}</p></div></div><div class="theme-body"><div><h3>Approach</h3><p>${esc(theme.approach)}</p><h3>Methods</h3><ul class="method-list">${theme.methods.map((method) => `<li>${esc(method)}</li>`).join("")}</ul><h3>Applications</h3><p>${esc(theme.applications.join(" · "))}</p></div><div class="related-work"><h3>Related work</h3>${related(theme).map((pub) => `<article><span>${pub.year} · ${esc(typeLabel[pub.type])}</span><h4><a href="${url(`/publications/#${pub.id}`)}">${esc(pub.title)}</a></h4><a href="https://doi.org/${esc(pub.doi)}">DOI</a></article>`).join("")}</div></div></div></section>`).join("");
  const overview = "Juan's research connects integrated silicon-germanium electronics, antennas, and high-frequency measurement across millimeter- and submillimeter-wave bands. He develops fabrication-aware on-chip structures and front ends, studies radiometric and communication architectures, and validates designs through electromagnetic simulation and laboratory characterization. The work spans compact Earth-observation radiometers, nanosatellite telemetry and telecommand, automotive sensing, satellite communications, 6G integrated sensing and communications, and sub-terahertz interconnects. Across these applications, the common objective is to move demanding RF functions closer to an integrated, measurable, and deployable system.";
  const content = `${pageIntro("Research", "From integrated devices to measurable systems", overview)}${themeSections}
  <section class="section capabilities" aria-labelledby="capabilities"><div class="wide-container"><div class="section-heading"><div>${eyebrow("How the work is done")}<h2 id="capabilities">Capabilities & methods</h2></div></div><ul class="capability-grid"><li><strong>Design & simulation</strong><span>Electromagnetic simulation, antenna and phased-array design, RFIC and SiGe layout.</span></li><li><strong>Measurement</strong><span>Network analysis, frequency extenders, probe-station characterization, and antenna-chamber measurement.</span></li><li><strong>Hardware practice</strong><span>Fabrication-aware integration, prototype fabrication, control electronics, and validation.</span></li></ul></div></section>
  <section class="section section-paper" id="current-projects" aria-labelledby="current-title"><div class="wide-container"><div class="section-heading"><div>${eyebrow("Reviewed 13 September 2026")}<h2 id="current-title">Current projects</h2></div></div><div class="project-grid">${currentProjects.map(projectCard).join("")}</div></div></section>
  <section class="section" aria-labelledby="completed-title"><div class="wide-container"><div class="section-heading"><div>${eyebrow("Selected record")}<h2 id="completed-title">Completed projects</h2></div></div><div class="project-grid">${completedProjects.map(projectCard).join("")}</div></div></section>
  <section class="section contact-strip"><div class="wide-container"><div><h2>Discuss a collaboration</h2><p>For research and applied R&D conversations, use Juan's institutional UC3M address.</p></div><a class="button button-primary" href="mailto:${esc(person.email)}">${esc(person.email)}</a></div></section>`;
  return layout({title:"Research", description:"Research themes, methods, and selected projects in integrated SiGe systems, antennas, radiometry, sensing, and communications.", active:"research", route:"/research/", content});
}

function publicationsPage() {
  const years = [...new Set(publications.map((p) => p.year))].sort((a,b) => b-a);
  const grouped = years.map((year) => `<section class="publication-year" aria-labelledby="year-${year}"><h2 id="year-${year}">${year}</h2><div class="publication-list">${publications.filter((p) => p.year === year).sort((a,b) => a.title.localeCompare(b.title)).map((p) => publicationCard(p)).join("")}</div></section>`).join("");
  const content = `${pageIntro("Scholarly record", "Publications", "Peer-reviewed journal and conference publications on high-frequency antennas, integrated SiGe systems, radiometry, space communications, and sensing.")}<section class="profile-band"><div class="wide-container"><p>Eight DOI-backed launch records. Citation metrics are intentionally omitted.</p>${profileLinks()}</div></section>
  <section class="section publication-browser" aria-labelledby="all-publications"><div class="wide-container"><div class="section-heading"><div>${eyebrow("Filter the complete list")}<h2 id="all-publications">All publications</h2></div><p><span data-result-count>${publications.length}</span> records</p></div><form class="filter-bar" data-publication-filters><fieldset><legend>Publication type</legend><label><input type="radio" name="type" value="all" checked> All</label><label><input type="radio" name="type" value="journal-article"> Journal article</label><label><input type="radio" name="type" value="conference-paper"> Conference paper</label></fieldset><label class="select-label">Research theme<select name="theme"><option value="all">All themes</option>${themes.map((t) => `<option value="${t.id}">${esc(t.title)}</option>`).join("")}</select></label><button class="button button-small" type="reset">Clear filters</button></form><p class="visually-hidden" aria-live="polite" data-filter-status></p><div data-publication-results>${grouped}</div><div class="empty-state" hidden data-empty-state><p>No publications match these filters.</p><button class="text-button" type="button" data-clear-filters>Clear filters</button></div></div></section><section class="section citation-note"><div class="reading-container"><h2>Citation note</h2><p>Titles, author order, venues, pages, and DOI links follow the reconciled publisher records reviewed on 13 September 2026. Google Scholar and ORCID provide external profile views; citation counts are not reproduced here.</p></div></section><script src="${asset("js/publications-filter.js")}" defer></script>`;
  return layout({title:"Publications", description:"Eight peer-reviewed publications by Juan María Herrera Martín, with DOI links and filters by output type and research theme.", active:"publications", route:"/publications/", content});
}

function teachingPage() {
  const courses = teaching.courses.map((course) => `<article class="course"><div><span>${esc(course.level)}</span><h3>${esc(course.title)}</h3></div><dl><div><dt>Role</dt><dd>${esc(course.role)}</dd></div><div><dt>Academic years</dt><dd>${esc(course.academicYears.join(", "))}</dd></div></dl>${themeLinks(course.themes)}</article>`).join("");
  const sup = teaching.supervision[0];
  const content = `${pageIntro("Teaching & mentoring", "Engineering through practice", teaching.statement)}<section class="section section-paper" aria-labelledby="courses"><div class="wide-container"><div class="section-heading"><div>${eyebrow("UC3M")}<h2 id="courses">Courses</h2></div></div><div class="course-list">${courses}</div></div></section><section class="section" aria-labelledby="student-projects"><div class="wide-container two-column"><div><h2 id="student-projects">Student projects</h2><p>Mentoring connects antenna, circuit, and measurement questions to a defined engineering problem.</p></div><article class="supervision"><span>${esc(sup.year)} · ${esc(sup.level)}</span><h3>${esc(sup.title)}</h3><p>${esc(sup.role)}</p><a href="${url("/research/#integrated-sige-front-ends")}">Explore related research</a></article></div></section><section class="section contact-strip"><div class="wide-container"><div><h2>Ask about a student project</h2><p>${esc(teaching.inquiry)}</p></div><a class="button button-primary" href="mailto:${esc(person.email)}">Email Juan</a></div></section>`;
  return layout({title:"Teaching & Mentoring", description:"Laboratory teaching and student mentoring in high-frequency technology, radiofrequency subsystems, and network analysis at UC3M.", active:"teaching", route:"/teaching/", content});
}

function engagementPage() {
  const orgs = organizations.map((org) => `<article class="organization"><div class="organization-meta"><span>${org.current ? "Current" : "Former"}</span><time>${esc(org.displayDates)}</time></div><h3>${esc(org.name)}</h3>${org.fullName ? `<p class="full-name">${esc(org.fullName)}</p>` : ""}<p class="role">${esc(org.role)}</p><p>${esc(org.summary)}</p></article>`).join("");
  const talkList = talks.map((talk) => `<li><article><div class="talk-date"><time datetime="${esc(talk.startDate)}">${esc(talk.displayDate)}</time><span>${esc(talk.type)}</span></div><div><h3>${esc(talk.title)}</h3><p>${esc(talk.event)}</p>${talk.publication ? `<a href="${url(`/publications/#${talk.publication}`)}">Related publication</a>` : ""}</div></article></li>`).join("");
  const content = `${pageIntro("Technical communities", "Engagement", "Technical leadership, conference communication, and hands-on student initiatives connect research practice with wider engineering communities.")}<section class="section section-paper" aria-labelledby="communities"><div class="wide-container"><div class="section-heading"><div>${eyebrow("Leadership and service")}<h2 id="communities">Technical communities</h2></div></div><div class="organization-grid">${orgs}</div></div></section><section class="section" aria-labelledby="presentations"><div class="wide-container"><div class="section-heading"><div>${eyebrow("Selected record")}<h2 id="presentations">Talks & presentations</h2></div></div><ol class="timeline">${talkList}</ol></div></section><section class="section membership-band"><div class="wide-container two-column"><div><h2>Professional memberships</h2><p>Institute of Electrical and Electronics Engineers (IEEE) and the Official College of Telecommunications Engineers (COIT).</p></div><div><h2>Contact</h2><p>For technical-community and presentation enquiries, use the general institutional contact route.</p><a href="mailto:${esc(person.email)}">${esc(person.email)}</a></div></div></section>`;
  return layout({title:"Engagement", description:"Technical-community leadership, selected talks, CubeSat and rocketry work, and professional engagement by Juan María Herrera Martín.", active:"engagement", route:"/engagement/", content});
}

function aboutPage() {
  const awardList = awards.map((award) => `<li><time datetime="${esc(award.date)}">${award.year}</time><div><h3>${esc(award.title)}</h3><p>${esc(award.body)} · ${esc(award.distinction)}</p></div></li>`).join("");
  const content = `${pageIntro("Biography", "About", person.longBio[0])}<section class="section bio-section"><div class="reading-container">${person.longBio.slice(1).map((p) => `<p>${esc(p)}</p>`).join("")}</div></section><section class="section section-paper" aria-labelledby="experience"><div class="wide-container"><div class="section-heading"><div>${eyebrow("Trajectory")}<h2 id="experience">Experience & education</h2></div></div><ol class="career-list"><li><time>2022-present</time><div><h3>PhD in Signal Processing and Communications Engineering</h3><p>UC3M · ${esc(person.thesisTitle)}</p></div></li><li><time>2021-present</time><div><h3>Research personnel, GREMA</h3><p>Signal Theory and Communications, Universidad Carlos III de Madrid</p></div></li><li><time>2024</time><div><h3>Doctoral research stay</h3><p>Aalto University, Espoo, Finland · Millimeter-wave, terahertz, and optical systems for biomedical and space applications</p></div></li><li><time>2020-2022</time><div><h3>Double master's degree</h3><p>Telecommunications Engineering and Space Engineering, UC3M</p></div></li><li><time>2016-2020</time><div><h3>Bachelor's degree</h3><p>Sound and Image Engineering, UC3M</p></div></li></ol></div></section><section class="section" aria-labelledby="honors"><div class="wide-container"><div class="section-heading"><div>${eyebrow("Selected record")}<h2 id="honors">Honors</h2></div></div><ol class="award-list">${awardList}</ol></div></section><section class="section section-paper" aria-labelledby="technical-capabilities"><div class="wide-container"><div class="section-heading"><div>${eyebrow("Technical practice")}<h2 id="technical-capabilities">Capabilities</h2></div></div><div class="capability-grid"><div><h3>Design & simulation</h3><p>Electromagnetic simulation, antenna and phased-array design, RFIC and SiGe layout, and fabrication-aware integration.</p></div><div><h3>Measurement</h3><p>Network analysis, frequency extenders, probe-station characterization, antenna measurement, and chamber workflows.</p></div><div><h3>Programming & tooling</h3><p>Scientific programming, measurement automation, data processing, and hardware-oriented engineering workflows.</p></div></div></div></section><section class="section bio-contact" aria-labelledby="about-contact"><div class="wide-container two-column"><div><h2 id="about-contact">Contact</h2><p>${esc(person.location)} · ${esc(person.role)}, ${esc(person.institutionShort)}</p><a class="button button-primary" href="mailto:${esc(person.email)}">${esc(person.email)}</a></div><div><h3>Verify the record</h3>${profileLinks()}</div></div></section>`;
  return layout({title:"About", description:"Biography, education, selected honors, technical capabilities, profiles, and contact information for Juan María Herrera Martín.", active:"about", route:"/about/", jsonLd:true, content});
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
  ["teaching/index.html", teachingPage()], ["engagement/index.html", engagementPage()], ["about/index.html", aboutPage()], ["404.html", notFoundPage()]
];
for (const [filename, html] of pages) {
  const destination = path.join(outDir, filename);
  await mkdir(path.dirname(destination), {recursive:true});
  await writeFile(destination, html, "utf8");
}

const publicRoutes = ["/", "/research/", "/publications/", "/teaching/", "/engagement/", "/about/"];
const sitemap = siteUrl ? `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicRoutes.map((route) => `\n  <url><loc>${esc(absolute(route))}</loc><lastmod>2026-09-13</lastmod></url>`).join("")}\n</urlset>\n` : `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Set SITE_URL during production build to generate absolute locations. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n`;
const robots = `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${absolute("/sitemap.xml")}\n` : ""}`;
await writeFile(path.join(outDir, "sitemap.xml"), sitemap, "utf8");
await writeFile(path.join(outDir, "robots.txt"), robots, "utf8");
console.log(`Built ${pages.length} HTML files in ${outDir} with base path "${base || "/"}".`);
