// About page interactions for Vercel/static hosting
// Shared header/footer active menu, mobile menu and sign-in are handled by layout.js.

document.addEventListener("DOMContentLoaded", () => {
  // Smooth-scroll only for same-page anchor links.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");

      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();

      const header = document.querySelector(".site-header");
      const headerHeight = header ? header.offsetHeight : 0;

      const targetTop =
        target.getBoundingClientRect().top +
        window.pageYOffset -
        headerHeight -
        12;

      window.scrollTo({
        top: targetTop,
        behavior: "smooth"
      });
    });
  });
});