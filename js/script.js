// layout.js
// Shared header/footer loader + active menu state
// Used by all static Vercel pages.

async function loadSharedPart(targetId, filePath) {
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(`Failed to load ${filePath}`);
    }

    const html = await response.text();
    target.innerHTML = html;

    setActiveMenu();
    setupUserButton();
  } catch (error) {
    console.error("Shared layout loading error:", error);
  }
}

function setActiveMenu() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll(".site-nav a");

  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";

    link.classList.remove("active");

    if (
      currentPath === href ||
      (currentPath === "/" && href === "/index.html") ||
      currentPath.endsWith(href) ||
      (currentPath.includes("c25") && href === "/pages/c25.html")
    ) {
      link.classList.add("active");
    }
  });
}

function setupUserButton() {
  const userButton = document.querySelector(".site-user-btn");

  if (!userButton) return;

  userButton.addEventListener("click", (event) => {
    event.preventDefault();

    // Demo only. Later you can change this to:
    // window.location.href = "/pages/sign-in.html";
    alert("User login system can be connected later.");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSharedPart("site-header", "/shared/header.html");
  loadSharedPart("site-footer", "/shared/footer.html");
});