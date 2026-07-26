/* =========================================
   STUDENT REGISTRATION
   File: /js/register.js
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const supabase = window.tneSupabase;

  /* =========================================
     ELEMENTS
  ========================================= */

  const form = document.getElementById("studentRegisterForm");

  const registrationPanel =
    document.getElementById("registrationPanel");

  const successPanel =
    document.getElementById("registrationSuccessPanel");

  const nameInput =
    document.getElementById("studentName");

  const emailInput =
    document.getElementById("studentEmail");

  const passwordInput =
    document.getElementById("studentPassword");

  const confirmPasswordInput =
    document.getElementById("confirmPassword");

  const consentInput =
    document.getElementById("studentConsent");

  const nameError =
    document.getElementById("nameError");

  const emailError =
    document.getElementById("emailError");

  const passwordError =
    document.getElementById("passwordError");

  const confirmPasswordError =
    document.getElementById("confirmPasswordError");

  const consentError =
    document.getElementById("consentError");

  const statusBox =
    document.getElementById("registerStatus");

  const submitButton =
    document.getElementById("registerSubmitBtn");

  const successEmail =
    document.getElementById("successEmail");

  const successTitle =
    document.getElementById("successTitle");

  const successMessage =
    document.getElementById("successMessage");

  const continueToSignIn =
    document.getElementById("continueToSignIn");

  const registerAnotherButton =
    document.getElementById("registerAnotherBtn");

  /*
   * Stop if this is not the registration page.
   */
  if (!form) {
    return;
  }

  const errorElements = [
    nameError,
    emailError,
    passwordError,
    confirmPasswordError,
    consentError
  ];

  /* =========================================
     FORM HELPERS
  ========================================= */

  function clearErrors() {
    errorElements.forEach((element) => {
      if (element) {
        element.textContent = "";
      }
    });
  }

  function setStatus(message, type = "info") {
    if (!statusBox) {
      return;
    }

    statusBox.textContent = message;
    statusBox.className = "form-status";

    if (message) {
      statusBox.classList.add("visible", type);
    }
  }

  function setLoading(isLoading) {
    if (!submitButton) {
      return;
    }

    submitButton.disabled = isLoading;

    submitButton.innerHTML = isLoading
      ? `
          <span
            class="register-spinner"
            aria-hidden="true"
          ></span>
          Creating Account...
        `
      : `
          Create Account
          <span>→</span>
        `;
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
    const message = String(
      error?.message || ""
    ).toLowerCase();

    if (
      message.includes("already registered") ||
      message.includes("already exists") ||
      message.includes("user already registered")
    ) {
      return (
        "An account may already exist for this email. " +
        "Please try signing in instead."
      );
    }

    if (
      message.includes("invalid email") ||
      message.includes("email address is invalid")
    ) {
      return "Please enter a valid email address.";
    }

    if (
      message.includes("weak password") ||
      message.includes("password should") ||
      message.includes("password must")
    ) {
      return (
        "The password was rejected. Use at least 8 characters " +
        "with uppercase, lowercase and a number."
      );
    }

    if (
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("email rate limit")
    ) {
      return (
        "Too many registration attempts were made. " +
        "Please wait a few minutes and try again."
      );
    }

    if (
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("failed to fetch")
    ) {
      return (
        "Unable to connect to Supabase. Check your internet " +
        "connection and Supabase configuration."
      );
    }

    return (
      error?.message ||
      "Unable to create your account. Please try again."
    );
  }

  /* =========================================
     CONFIRMATION URL
  ========================================= */

  function getConfirmationRedirectUrl() {
    /*
     * This works on both:
     *
     * Localhost:
     * http://127.0.0.1:5500/pages/sign-in.html?confirmed=1
     *
     * Production:
     * https://tnecorridor.com/pages/sign-in.html?confirmed=1
     */

    return (
      `${window.location.origin}` +
      "/pages/sign-in.html?confirmed=1"
    );
  }

  /* =========================================
     SUCCESS PANEL
  ========================================= */

  function showVerificationSuccess(email) {
    if (registrationPanel) {
      registrationPanel.classList.add("hidden");
    }

    if (successPanel) {
      successPanel.classList.remove("hidden");
    }

    if (successEmail) {
      successEmail.textContent = email;
    }

    if (successTitle) {
      successTitle.textContent = "Check your email";
    }

    if (successMessage) {
      successMessage.textContent =
        "Your account was created. We sent a verification link " +
        "to your email address. Click the verification link before signing in.";
    }

    if (continueToSignIn) {
      continueToSignIn.href =
        "/pages/sign-in.html?registered=1&email=" +
        encodeURIComponent(email);
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function showImmediateAccountSuccess(email) {
    if (registrationPanel) {
      registrationPanel.classList.add("hidden");
    }

    if (successPanel) {
      successPanel.classList.remove("hidden");
    }

    if (successEmail) {
      successEmail.textContent = email;
    }

    if (successTitle) {
      successTitle.textContent =
        "Account created successfully";
    }

    if (successMessage) {
      successMessage.textContent =
        "Your account was created without email verification. " +
        "Enable Confirm Email in Supabase if students must verify their email before signing in.";
    }

    if (continueToSignIn) {
      continueToSignIn.href =
        "/pages/sign-in.html?registered=1&email=" +
        encodeURIComponent(email);
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /* =========================================
     PASSWORD SHOW/HIDE BUTTONS
  ========================================= */

  document
    .querySelectorAll("[data-toggle-password]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const inputId =
          button.dataset.togglePassword;

        const input =
          document.getElementById(inputId);

        if (!input) {
          return;
        }

        const willShow =
          input.type === "password";

        input.type =
          willShow ? "text" : "password";

        button.textContent =
          willShow ? "Hide" : "Show";

        button.setAttribute(
          "aria-label",
          willShow
            ? "Hide password"
            : "Show password"
        );
      });
    });

  /* =========================================
     CHECK SUPABASE CONNECTION
  ========================================= */

  if (!supabase) {
    setStatus(
      "Supabase is not connected. Check /js/supabase-config.js.",
      "error"
    );

    if (submitButton) {
      submitButton.disabled = true;
    }

    return;
  }

  /* =========================================
     FORM SUBMISSION
  ========================================= */

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearErrors();
    setStatus("", "");

    const fullName =
      nameInput?.value.trim() || "";

    const email =
      emailInput?.value.trim().toLowerCase() || "";

    const password =
      passwordInput?.value || "";

    const confirmPassword =
      confirmPasswordInput?.value || "";

    let hasError = false;

    /* Full-name validation */

    if (fullName.length < 2) {
      if (nameError) {
        nameError.textContent =
          "Please enter your full name.";
      }

      hasError = true;
    }

    if (fullName.length > 120) {
      if (nameError) {
        nameError.textContent =
          "Your full name must not exceed 120 characters.";
      }

      hasError = true;
    }

    /* Email validation */

    if (!isValidEmail(email)) {
      if (emailError) {
        emailError.textContent =
          "Please enter a valid email address.";
      }

      hasError = true;
    }

    /* Password validation */

    if (!isStrongPassword(password)) {
      if (passwordError) {
        passwordError.textContent =
          "Use at least 8 characters with uppercase, lowercase and a number.";
      }

      hasError = true;
    }

    /* Password confirmation validation */

    if (!confirmPassword) {
      if (confirmPasswordError) {
        confirmPasswordError.textContent =
          "Please enter your password again.";
      }

      hasError = true;
    } else if (confirmPassword !== password) {
      if (confirmPasswordError) {
        confirmPasswordError.textContent =
          "The passwords do not match.";
      }

      hasError = true;
    }

    /* Consent validation */

    if (!consentInput?.checked) {
      if (consentError) {
        consentError.textContent =
          "Please accept the account consent before continuing.";
      }

      hasError = true;
    }

    if (hasError) {
      return;
    }

    try {
      setLoading(true);

      const confirmationRedirectUrl =
        getConfirmationRedirectUrl();

      console.log(
        "Email confirmation redirect:",
        confirmationRedirectUrl
      );

      const {
        data,
        error
      } = await supabase.auth.signUp({
        email,
        password,

        options: {
          emailRedirectTo:
            confirmationRedirectUrl,

          data: {
            full_name: fullName,
            account_type: "student",
            onboarding_completed: false,
            consent_given: true,
            consent_at:
              new Date().toISOString()
          }
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.user) {
        throw new Error(
          "Supabase did not return a user account."
        );
      }

      /*
       * When Confirm Email is enabled:
       * data.user exists
       * data.session is null
       *
       * Supabase sends the confirmation email.
       */

      if (!data.session) {
        showVerificationSuccess(email);
        return;
      }

      /*
       * If data.session exists immediately,
       * Confirm Email is probably disabled.
       *
       * Sign out so the student still needs
       * to use the sign-in page.
       */

      const {
        error: signOutError
      } = await supabase.auth.signOut();

      if (signOutError) {
        console.warn(
          "Unable to sign out after registration:",
          signOutError
        );
      }

      showImmediateAccountSuccess(email);
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      setStatus(
        readableRegistrationError(error),
        "error"
      );
    } finally {
      setLoading(false);
    }
  });

  /* =========================================
     REGISTER ANOTHER ACCOUNT
  ========================================= */

  registerAnotherButton?.addEventListener(
    "click",
    () => {
      form.reset();

      clearErrors();
      setStatus("", "");

      if (successPanel) {
        successPanel.classList.add("hidden");
      }

      if (registrationPanel) {
        registrationPanel.classList.remove("hidden");
      }

      nameInput?.focus();

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  );
});