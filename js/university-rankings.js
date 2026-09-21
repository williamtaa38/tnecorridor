(() => {
  const universityProfiles = {
    southampton: {
      name: "University of Southampton Malaysia",
      image: "/resources/24.png",
    },
    nottingham: {
      name: "University of Nottingham Malaysia",
      image: "/resources/25.png",
    },
    newcastle: {
      name: "Newcastle University Malaysia",
      image: "/resources/26.png",
    },
    reading: {
      name: "University of Reading Malaysia",
      image: "/resources/27.png",
    },
    heriot: {
      name: "Heriot-Watt University Malaysia",
      image: "/resources/28.png",
    },
  };

  const ready = (callback) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  };

  ready(() => {
    const heroShell = document.getElementById("rankingHeroShell");
    const heroTrigger = document.getElementById("rankingHeroTrigger");
    const exploreButton = document.getElementById("rankingExploreButton");
    const results = document.getElementById("rankingResults");
    const universitiesStage = document.getElementById("universitiesStage");
    const footprintStage = document.getElementById("footprintStage");

    const modal = document.getElementById("universityModal");
    const modalTitle = document.getElementById("universityModalTitle");
    const modalImage = document.getElementById("universityModalImage");
    const modalScroll = document.getElementById("universityModalScroll");
    const hotspots = Array.from(document.querySelectorAll(".university-hotspot"));
    const closeControls = Array.from(document.querySelectorAll("[data-modal-close]"));

    let exploreRevealTimer = null;
    let footprintObserver = null;
    let lastFocusedElement = null;

    const revealExploreButton = () => {
      heroShell?.classList.add("is-activated");
      heroTrigger?.setAttribute("aria-expanded", "true");

      window.clearTimeout(exploreRevealTimer);
      exploreRevealTimer = window.setTimeout(() => {
        exploreButton?.classList.add("is-visible");
        exploreButton?.removeAttribute("tabindex");
      }, 520);
    };

    const revealResults = () => {
      if (!results || !universitiesStage || !footprintStage) return;

      results.classList.add("is-visible");
      results.setAttribute("aria-hidden", "false");
      exploreButton?.setAttribute("aria-expanded", "true");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          universitiesStage.classList.add("is-revealed");
        });
      });

      // Keep the second artwork hidden until it approaches the viewport so
      // its entrance animation is actually visible to the user while scrolling.
      if (!("IntersectionObserver" in window)) {
        window.setTimeout(() => {
          footprintStage.classList.add("is-revealed");
        }, 800);
      }

      window.setTimeout(() => {
        universitiesStage.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 140);
    };

    const openUniversity = (key, trigger) => {
      const profile = universityProfiles[key];
      if (!profile || !modal || !modalTitle || !modalImage) return;

      lastFocusedElement = trigger || document.activeElement;
      modalTitle.textContent = profile.name;
      modalImage.src = profile.image;
      modalImage.alt = `${profile.name} university profile and ranking information`;
      modalScroll?.scrollTo({ top: 0, behavior: "auto" });

      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");

      const closeButton = modal.querySelector(".university-modal-close");
      window.setTimeout(() => closeButton?.focus(), 80);
    };

    const closeUniversity = () => {
      if (!modal?.classList.contains("is-open")) return;

      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      modalImage?.removeAttribute("src");

      if (lastFocusedElement instanceof HTMLElement) {
        lastFocusedElement.focus({ preventScroll: true });
      }
    };

    heroTrigger?.addEventListener("click", revealExploreButton);

    exploreButton?.addEventListener("click", revealResults);

    hotspots.forEach((hotspot) => {
      hotspot.addEventListener("click", () => {
        openUniversity(hotspot.dataset.university, hotspot);
      });
    });

    closeControls.forEach((control) => {
      control.addEventListener("click", closeUniversity);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeUniversity();
        return;
      }

      if (event.key !== "Tab" || !modal?.classList.contains("is-open")) return;

      const focusable = Array.from(
        modal.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
      ).filter((element) => element instanceof HTMLElement && element.offsetParent !== null);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    // Animate image 23 only as it approaches view, after image 22 has been revealed.
    if ("IntersectionObserver" in window && footprintStage) {
      footprintObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && results?.classList.contains("is-visible")) {
              entry.target.classList.add("is-revealed");
              footprintObserver?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
      );
      footprintObserver.observe(footprintStage);
    }
  });
})();
