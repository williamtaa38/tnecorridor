/* =========================================
   STUDENT REGISTRATION
   File: /js/register.js
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.tneSupabase;

  const form = document.getElementById("studentRegisterForm");
  const registrationPanel = document.getElementById("registrationPanel");
  const successPanel = document.getElementById("registrationSuccessPanel");

  const nameInput = document.getElementById("studentName");
  const emailInput = document.getElementById("studentEmail");
  const passwordInput = document.getElementById("studentPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const consentInput = document.getElementById("studentConsent");

  const nameError = document.getElementById("nameError");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const confirmPasswordError = document.getElementById("confirmPasswordError");
  const consentError = document.getElementById("consentError");

  const statusBox = document.getElementById("registerStatus");
  const submitButton = document.getElementById("registerSubmitBtn");
  const successEmail = document.getElementById("successEmail");
  const successTitle = document.getElementById("successTitle");
  const successMessage = document.getElementById("successMessage");
  const continueToSignIn = document.getElementById("continueToSignIn");
  const registerAnotherButton = document.getElementById("registerAnotherBtn");

  if (!form) return;

  const errorElements = [
    nameError,
    emailError,
    passwordError,
    confirmPasswordError,
    consentError
  ];

  function clearErrors() {
    errorElements.forEach((element) => {
      if (element) element.textContent = "";
    });
  }

  function setStatus(message, type = "info") {
    if (!statusBox) return;

    statusBox.textContent = message;
    statusBox.className = "form-status";

    if (message) statusBox.classList.add("visible", type);
  }

  function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.innerHTML = isLoading
      ? "Creating Account..."
      : 'Create Account <span>→</span>';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isStrongPassword(password) {
    return (
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password)
    );
  }

  function readableRegistrationError(error) {
    const message = String(error?.message || "").toLowerCase();

    if (message.includes("already registered") || message.includes("already exists")) {
      return "An account may already exist for this email. Please try signing in.";
    }

    if (message.includes("password")) {
      return "The password was rejected. Please use at least 8 characters with uppercase, lowercase and a number.";
    }

    if (message.includes("rate limit")) {
      return "Too many registration attempts. Please wait a few minutes and try again.";
    }

    if (message.includes("fetch") || message.includes("network")) {
      return "Unable to connect to Supabase. Please check your internet connection and configuration.";
    }

    return error?.message || "Unable to create the account. Please try again.";
  }

  function getConfirmationRedirectUrl() {
    return `${window.location.origin}/pages/sign-in.html?confirmed=1`;
  }

  function showSuccess(email, sessionCreated) {
    registrationPanel.classList.add("hidden");
    successPanel.classList.remove("hidden");
    successEmail.textContent = email;

    continueToSignIn.href = `/pages/sign-in.html?registered=1&email=${encodeURIComponent(email)}`;

    if (sessionCreated) {
      successTitle.textContent = "Account created successfully";
      successMessage.textContent =
        "Your account is active. Continue to sign in and complete your student profile.";
    } else {
      successTitle.textContent = "Check your email";
      successMessage.textContent =
        "Your account was created. Open the confirmation email from Supabase before signing in.";
    }
  }

  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const inputId = button.dataset.togglePassword;
      const input = document.getElementById(inputId);
      if (!input) return;

      const willShow = input.type === "password";
      input.type = willShow ? "text" : "password";
      button.textContent = willShow ? "Hide" : "Show";
      button.setAttribute("aria-label", willShow ? "Hide password" : "Show password");
    });
  });

  if (!supabase) {
    setStatus("Supabase is not connected. Check /js/supabase-config.js.", "error");
    submitButton.disabled = true;
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();
    setStatus("", "");

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    let hasError = false;

    if (fullName.length < 2) {
      nameError.textContent = "Please enter your full name.";
      hasError = true;
    }

    if (!isValidEmail(email)) {
      emailError.textContent = "Please enter a valid email address.";
      hasError = true;
    }

    if (!isStrongPassword(password)) {
      passwordError.textContent =
        "Use at least 8 characters with uppercase, lowercase and a number.";
      hasError = true;
    }

    if (confirmPassword !== password) {
      confirmPasswordError.textContent = "The passwords do not match.";
      hasError = true;
    }

    if (!consentInput.checked) {
      consentError.textContent = "Please accept the account consent before continuing.";
      hasError = true;
    }

    if (hasError) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getConfirmationRedirectUrl(),
          data: {
            full_name: fullName,
            account_type: "student",
            onboarding_completed: false,
            consent_given: true
          }
        }
      });

      if (error) throw error;
      if (!data?.user) throw new Error("Supabase did not return a user account.");

      showSuccess(email, Boolean(data.session));
    } catch (error) {
      console.error("Registration error:", error);
      setStatus(readableRegistrationError(error), "error");
    } finally {
      setLoading(false);
    }
  });

  registerAnotherButton?.addEventListener("click", () => {
    form.reset();
    clearErrors();
    setStatus("", "");
    successPanel.classList.add("hidden");
    registrationPanel.classList.remove("hidden");
    nameInput.focus();
  });
});
