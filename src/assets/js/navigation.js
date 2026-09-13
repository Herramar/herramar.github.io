document.documentElement.classList.remove("no-js");
document.documentElement.classList.add("js");

const header = document.querySelector("[data-site-header]");
const button = document.querySelector("[data-menu-button]");
const navigation = document.querySelector("[data-navigation]");

if (header && button && navigation) {
  const closeMenu = (restoreFocus = false) => {
    button.setAttribute("aria-expanded", "false");
    navigation.removeAttribute("data-open");
    document.body.classList.remove("menu-open");
    if (restoreFocus) button.focus();
  };

  const openMenu = () => {
    button.setAttribute("aria-expanded", "true");
    navigation.setAttribute("data-open", "");
    document.body.classList.add("menu-open");
    navigation.querySelector("a")?.focus();
  };

  button.addEventListener("click", () => {
    if (button.getAttribute("aria-expanded") === "true") closeMenu(true);
    else openMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") closeMenu(true);
  });

  document.addEventListener("click", (event) => {
    if (button.getAttribute("aria-expanded") === "true" && !header.contains(event.target)) closeMenu();
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  const desktop = window.matchMedia("(min-width: 64rem)");
  desktop.addEventListener("change", (event) => {
    if (event.matches) closeMenu();
  });
}
