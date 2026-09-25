const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const revealTargets = document.querySelectorAll(
  ".section-heading, .theme-link, .publication, .project, .course, .organization, .timeline > li, .award-list > li"
);
document.documentElement.classList.add("reveal-ready");

if (reducedMotion.matches || !("IntersectionObserver" in window)) {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
  revealTargets.forEach((target) => observer.observe(target));
}

const hero = document.querySelector(".hero");
if (hero && !reducedMotion.matches) {
  let frame = 0;
  const updateField = () => {
    frame = 0;
    const progress = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / hero.offsetHeight));
    hero.style.setProperty("--field-progress", progress.toFixed(3));
  };
  updateField();
  window.addEventListener("scroll", () => {
    if (!frame) frame = requestAnimationFrame(updateField);
  }, { passive: true });
}
