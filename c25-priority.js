// C-25 Priority Access Programme page interactions
(function () {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.nav a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    link.classList.remove('active');

    if (href === currentPage) {
      link.classList.add('active');
    }
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  });
})();
