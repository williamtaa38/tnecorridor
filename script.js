// TNE Corridor static site scripts
// Handles mobile menu, active menu state, and simple sign-in UI state.

// IMPORTANT:
// This is front-end demo logic only. Connect Register/Sign in to your real login system later.

document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.tne-header');
  const toggle = document.querySelector('.tne-menu-toggle');
  const navLinks = Array.from(document.querySelectorAll('.tne-nav a'));

  const authArea = document.getElementById('tneAuthArea');
  const signInBtn = document.getElementById('tneSignInBtn');
  const userMenu = document.getElementById('tneUserMenu');
  const userDropdown = document.getElementById('tneUserDropdown');
  const signOutBtn = document.getElementById('tneSignOutBtn');

  const setSignedIn = (signedIn) => {
    if (!authArea) return;
    authArea.classList.toggle('signed-in', signedIn);
    authArea.classList.remove('dropdown-open');
    localStorage.setItem('tneSignedIn', signedIn ? 'yes' : 'no');
  };

  if (authArea) {
    setSignedIn(localStorage.getItem('tneSignedIn') === 'yes');
  }

  if (signInBtn) {
    signInBtn.addEventListener('click', (event) => {
      // Remove these two lines when you connect to a real signin.html page.
      event.preventDefault();
      setSignedIn(true);
    });
  }

  if (userMenu && authArea) {
    userMenu.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = authArea.classList.toggle('dropdown-open');
      userMenu.setAttribute('aria-expanded', String(isOpen));
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      setSignedIn(false);
    });
  }

  document.addEventListener('click', (event) => {
    if (authArea && userDropdown && !authArea.contains(event.target)) {
      authArea.classList.remove('dropdown-open');
      if (userMenu) userMenu.setAttribute('aria-expanded', 'false');
    }
  });

  if (toggle && header) {
    toggle.addEventListener('click', () => {
      const isOpen = header.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        header.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const currentFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  navLinks.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const linkFile = href.split('#')[0].split('/').pop().toLowerCase() || 'index.html';
    link.classList.toggle('active', linkFile === currentFile);
  });

  const hashLinks = navLinks.filter((link) => (link.getAttribute('href') || '').startsWith('#'));
  const sections = hashLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if (!hashLinks.length || !sections.length) return;

  const setActive = (id) => {
    hashLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible?.target?.id) setActive(visible.target.id);
    },
    { rootMargin: '-20% 0px -65% 0px', threshold: [0.1, 0.25, 0.5] }
  );

  sections.forEach((section) => observer.observe(section));
});
