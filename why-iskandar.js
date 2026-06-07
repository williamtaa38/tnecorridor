// Why Iskandar page interactions for Vercel/static hosting
(function () {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.menu-links a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    link.classList.remove('active');

    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Smooth-scroll only for same-page anchor links.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
