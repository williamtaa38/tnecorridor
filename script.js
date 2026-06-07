// TNE Corridor static site scripts
// Keeps navbar active state synced with the current section.

document.addEventListener('DOMContentLoaded', () => {
  const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if (!links.length || !sections.length) return;

  const setActive = (id) => {
    links.forEach((link) => {
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
