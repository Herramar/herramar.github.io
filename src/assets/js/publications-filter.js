const form = document.querySelector("[data-publication-filters]");
const publications = [...document.querySelectorAll("[data-publication]")];
const count = document.querySelector("[data-result-count]");
const status = document.querySelector("[data-filter-status]");
const empty = document.querySelector("[data-empty-state]");
const clear = document.querySelector("[data-clear-filters]");

if (form && publications.length) {
  const setFilters = (type = "all", theme = "all") => {
    const typeControl = form.querySelector(`[name="type"][value="${CSS.escape(type)}"]`) || form.querySelector('[name="type"][value="all"]');
    const themeControl = form.elements.theme;
    typeControl.checked = true;
    themeControl.value = [...themeControl.options].some((option) => option.value === theme) ? theme : "all";
  };

  const applyFilters = () => {
    const data = new FormData(form);
    const type = data.get("type") || "all";
    const theme = data.get("theme") || "all";
    let visible = 0;
    publications.forEach((publication) => {
      const typeMatch = type === "all" || publication.dataset.type === type;
      const themeMatch = theme === "all" || publication.dataset.themes.split(" ").includes(theme);
      publication.hidden = !(typeMatch && themeMatch);
      if (!publication.hidden) visible += 1;
    });
    document.querySelectorAll(".publication-year").forEach((group) => {
      group.hidden = !group.querySelector("[data-publication]:not([hidden])");
    });
    count.textContent = String(visible);
    status.textContent = `${visible} publication${visible === 1 ? "" : "s"} shown.`;
    empty.hidden = visible !== 0;
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (theme !== "all") params.set("theme", theme);
    history.replaceState(null, "", `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`);
  };

  const params = new URLSearchParams(location.search);
  setFilters(params.get("type") || "all", params.get("theme") || "all");
  applyFilters();
  form.addEventListener("change", applyFilters);
  form.addEventListener("reset", () => requestAnimationFrame(applyFilters));
  clear?.addEventListener("click", () => {
    form.reset();
    requestAnimationFrame(() => {
      applyFilters();
      form.querySelector("input")?.focus();
    });
  });
}
