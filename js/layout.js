async function loadSharedPart(targetId, filePath) {
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const response = await fetch(filePath);
    const html = await response.text();
    target.innerHTML = html;

    setActiveMenu();
  } catch (error) {
    console.error("Failed to load shared part:", filePath, error);
  }
}

function setActiveMenu() {
  const path = window.location.pathname;
  const links = document.querySelectorAll(".site-nav a");

  links.forEach((link) => {
    link.classList.remove("active");

    const href = link.getAttribute("href");

    if (
      path === href ||
      (path === "/" && href === "/index.html") ||
      path.endsWith(href)
    ) {
      link.classList.add("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSharedPart("site-header", "/shared/header.html");
  loadSharedPart("site-footer", "/shared/footer.html");
});