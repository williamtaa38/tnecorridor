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

  // Bottom CTA image button actions.
  document.querySelectorAll("[data-cta-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const action = button.getAttribute("data-cta-action");

      if (action === "ask-ai") {
        event.preventDefault();

        // Try to open your EduSeek AI/chatbot button if it exists on the page.
        const possibleChatButtons = [
          "#eduseek-ai-button",
          "#chatbot-button",
          ".eduseek-ai-button",
          ".chatbot-button",
          "[data-open-chatbot]"
        ];

        for (const selector of possibleChatButtons) {
          const chatButton = document.querySelector(selector);

          if (chatButton) {
            chatButton.click();
            return;
          }
        }

        alert("EduSeek AI button clicked. Please connect this button to your chatbot.");
      }
    });
  });
});
