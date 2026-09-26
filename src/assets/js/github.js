const account = "herramar";
const api = `https://api.github.com/users/${account}/repos?sort=pushed&direction=desc&per_page=100`;
const reposNode = document.querySelector("[data-github-repos]");
const commitsNode = document.querySelector("[data-github-commits]");
const reposStatus = document.querySelector("[data-github-repos-status]");
const commitsStatus = document.querySelector("[data-github-commits-status]");

const githubUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" ? url.href : null;
  } catch { return null; }
};

const dateLabel = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en", {year: "numeric", month: "short", day: "numeric"}).format(date);
};

async function getJson(url) {
  const response = await fetch(url, {headers: {Accept: "application/vnd.github+json"}});
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  return response.json();
}

function readmeSummary(markdown) {
  const line = markdown.split(/\r?\n/).map((value) => value.trim()).find((value) =>
    value && !/^(#|>|\[!|!\[|<|[-*+] |\d+\. |---|===)/.test(value)
  );
  return line?.replace(/!?\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 180) || "";
}

async function repoDescription(repo) {
  if (repo.description?.trim()) return repo.description.trim();
  try {
    const readme = await getJson(`https://api.github.com/repos/${repo.full_name}/readme`);
    if (readme.encoding !== "base64" || !readme.content) return "";
    const bytes = Uint8Array.from(atob(readme.content.replace(/\s/g, "")), (char) => char.charCodeAt(0));
    return readmeSummary(new TextDecoder().decode(bytes));
  } catch {
    return "";
  }
}

function addRepo(repo) {
  const href = githubUrl(repo.html_url);
  if (!href) return;
  const card = document.createElement("article");
  card.className = "github-repo";
  const top = document.createElement("p");
  top.className = "github-repo-top";
  top.textContent = repo.fork ? "PUBLIC FORK" : "PUBLIC REPOSITORY";
  const title = document.createElement("h3");
  const link = document.createElement("a");
  link.href = href;
  link.textContent = repo.name;
  title.append(link);
  const description = document.createElement("p");
  description.className = "github-repo-description";
  description.textContent = repo.description?.trim() || "Loading project summary…";
  if (!repo.description?.trim()) {
    repoDescription(repo).then((summary) => {
      description.textContent = summary || `Source code and documentation for ${repo.name}.`;
    });
  }
  const meta = document.createElement("p");
  meta.className = "github-repo-meta";
  const bits = [repo.language, `${Number(repo.stargazers_count) || 0} stars`, repo.pushed_at ? `Updated ${dateLabel(repo.pushed_at)}` : ""].filter(Boolean);
  meta.textContent = bits.join(" · ");
  card.append(top, title, description, meta);
  reposNode.append(card);
}

function addCommit(commit, repoName) {
  const href = githubUrl(commit.html_url);
  if (!href) return;
  const item = document.createElement("li");
  const detail = document.createElement("div");
  const link = document.createElement("a");
  link.href = href;
  link.textContent = commit.commit?.message?.split("\n")[0] || "View commit";
  const repo = document.createElement("span");
  repo.className = "github-commit-repo";
  repo.textContent = repoName;
  detail.append(link, repo);
  const date = document.createElement("time");
  const value = commit.commit?.author?.date;
  if (value) date.dateTime = value;
  date.textContent = dateLabel(value);
  item.append(detail, date);
  commitsNode.append(item);
}

async function loadGithub() {
  let repos;
  try {
    repos = await getJson(api);
    if (!Array.isArray(repos)) throw new Error("Unexpected GitHub response");
    repos.filter((repo) => !repo.private).slice(0, 12).forEach(addRepo);
    reposStatus.textContent = reposNode.children.length ? `${reposNode.children.length} repositories shown` : "No public repositories are available yet.";
  } catch {
    reposStatus.textContent = "Repositories could not be loaded right now. View them on GitHub.";
    commitsStatus.textContent = "Commits could not be loaded right now. View public activity on GitHub.";
    return;
  }

  const candidates = repos.filter((repo) => !repo.private && repo.full_name).slice(0, 5);
  const results = await Promise.allSettled(candidates.map(async (repo) => {
    const commits = await getJson(`https://api.github.com/repos/${repo.full_name}/commits?author=${encodeURIComponent(account)}&per_page=30`);
    if (!Array.isArray(commits)) throw new Error("Unexpected GitHub response");
    return commits.map((commit) => ({commit, repoName: repo.name}));
  }));
  const commits = results.flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .sort((a, b) => new Date(b.commit.commit?.committer?.date || b.commit.commit?.author?.date || 0) - new Date(a.commit.commit?.committer?.date || a.commit.commit?.author?.date || 0))
    .slice(0, 8);
  commits.forEach(({commit, repoName}) => addCommit(commit, repoName));
  commitsStatus.textContent = commitsNode.children.length
    ? `${commitsNode.children.length} recent public commits shown`
    : !candidates.length ? "No public repositories are available yet."
    : results.every((result) => result.status === "rejected") ? "Commits could not be loaded right now. View public activity on GitHub."
    : "No commits attributed to this account were found in the recently updated repositories.";
}

if (reposNode && commitsNode && reposStatus && commitsStatus) loadGithub();
