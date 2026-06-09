// C-25 Priority Access Programme page interactions
// Shared header/footer active menu is handled by layout.js.

(function () {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');

      if (!href || href === '#') return;

      const target = document.querySelector(href);

      if (!target) return;

      event.preventDefault();

      const header = document.querySelector('.site-header');
      const headerOffset = header ? header.offsetHeight + 14 : 14;
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    });
  });
})();
