// About page interactions
// Shared header/footer active menu, mobile menu and sign-in are handled by layout.js.

document.addEventListener("DOMContentLoaded", () => {
  const aiButton = document.querySelector('[data-action="ask-ai"]');

  if (aiButton) {
    aiButton.addEventListener("click", () => {
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
    });
  }

  // Scroll reveal animation
  const revealItems = document.querySelectorAll(".about-photo-card, .about-final-buttons");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.16
      }
    );

    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add("show"));
  }
});