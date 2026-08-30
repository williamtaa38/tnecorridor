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
  const currentPath = window.location.pathname || "/";
  const currentHash = window.location.hash || "";
  const links = Array.from(document.querySelectorAll(".site-nav a"));

  links.forEach((link) => link.classList.remove("active"));

  const normalizedCurrentPath = currentPath === "/" ? "/index.html" : currentPath;

  const parsedLinks = links.map((link) => {
    const url = new URL(link.getAttribute("href"), window.location.origin);
    return { link, path: url.pathname, hash: url.hash };
  });

  // If the URL contains a hash, prefer the menu item that targets that exact section.
  let matched = false;
  if (currentHash) {
    parsedLinks.forEach(({ link, path, hash }) => {
      if (path === normalizedCurrentPath && hash === currentHash) {
        link.classList.add("active");
        matched = true;
      }
    });
  }

  // Otherwise activate the page-level menu item.
  if (!matched) {
    parsedLinks.forEach(({ link, path, hash }) => {
      if (path === normalizedCurrentPath && !hash) {
        link.classList.add("active");
      }
    });
  }

  // If a Marketplace submenu item is active, keep Marketplace expanded on smaller screens.
  document.querySelectorAll(".site-nav-dropdown").forEach((dropdown) => {
    if (dropdown.querySelector(".site-submenu a.active") && window.innerWidth <= 1200) {
      dropdown.open = true;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSharedPart("site-header", "/shared/header.html");
  loadSharedPart("site-footer", "/shared/footer.html");
});