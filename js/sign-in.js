/* =========================================
   STUDENT SIGN IN
   File: /js/sign-in.js
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const supabase = window.tneSupabase;

  /* =========================================
     PAGE ROUTES
  ========================================= */

  const ONBOARDING_URL =
    "/pages/student-onboarding.html";

  const APPLICATION_URL =
    "/pages/student-application.html";

  /* =========================================
     ELEMENTS
  ========================================= */

  const form =
    document.getElementById("studentSignInForm");

  const emailInput =
    document.getElementById("signinEmail");

  const passwordInput =
    document.getElementById("signinPassword");

  const emailError =
    document.getElementById("emailError");

  const passwordError =
    document.getElementById("passwordError");

  const statusBox =
    document.getElementById("signinStatus");

  const submitButton =
    document.getElementById("signinSubmitBtn");

  const togglePassword =
    document.getElementById("toggleSigninPassword");

  /*
   * Stop when this JavaScript is loaded
   * on a page without the sign-in form.
   */
  if (!form) {
    return;
  }

  /* =========================================
     HELPERS
  ========================================= */

  function clearErrors() {
    if (emailError) {
      emailError.textContent = "";
    }

    if (passwordError) {
      passwordError.textContent = "";
    }
  }

  function setStatus(message, type = "info") {
    if (!statusBox) {
      return;
    }

    statusBox.textContent = message;
    statusBox.className = "signin-status";

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
            class="signin-spinner"
            aria-hidden="true"
          ></span>
          Signing In...
        `
      : `
          Sign In
          <span>→</span>
        `;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function readableSignInError(error) {
    const message = String(
      error?.message || ""
    ).toLowerCase();

    if (message.includes("email not confirmed")) {
      return (
        "Your email has not been verified. " +
        "Please open the verification email and click the verification link."
      );
    }

    if (
      message.includes("invalid login credentials") ||
      message.includes("invalid credentials")
    ) {
      return "The email address or password is incorrect.";
    }

    if (
      message.includes("rate limit") ||
      message.includes("too many requests")
    ) {
      return (
        "Too many sign-in attempts. " +
        "Please wait a few minutes and try again."
      );
    }

    if (
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("failed to fetch")
    ) {
      return (
        "Unable to connect to Supabase. " +
        "Please check your internet connection."
      );
    }

    return (
      error?.message ||
      "Unable to sign in. Please try again."
    );
  }

  /* =========================================
     READ PAGE MESSAGE
  ========================================= */

  function readPageMessage() {
    const params =
      new URLSearchParams(window.location.search);

    const registeredEmail =
      params.get("email");

    if (registeredEmail && emailInput) {
      emailInput.value =
        registeredEmail.trim().toLowerCase();
    }

    if (params.get("confirmed") === "1") {
      setStatus(
        "Your email has been verified. You can now sign in.",
        "success"
      );
      return;
    }

    if (params.get("registered") === "1") {
      setStatus(
        "Account created. Verify your email, then sign in.",
        "success"
      );
    }
  }

  readPageMessage();

  /* =========================================
     PASSWORD SHOW/HIDE
  ========================================= */

  togglePassword?.addEventListener("click", () => {
    if (!passwordInput) {
      return;
    }

    const showPassword =
      passwordInput.type === "password";

    passwordInput.type =
      showPassword ? "text" : "password";

    togglePassword.textContent =
      showPassword ? "Hide" : "Show";

    togglePassword.setAttribute(
      "aria-label",
      showPassword
        ? "Hide password"
        : "Show password"
    );
  });

  /* =========================================
     CHECK SUPABASE
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
     SAVE BASIC LOCAL REFERENCE

     Supabase remains the real authentication
     system. These values are only used by
     your existing layout and page interface.
  ========================================= */

  function saveSignedInReference(user) {
    const email =
      String(user?.email || "").toLowerCase();

    const fullName =
      String(
        user?.user_metadata?.full_name ||
        "Student"
      );

    localStorage.setItem(
      "tneSignedIn",
      "yes"
    );

    localStorage.setItem(
      "tneCurrentStudentEmail",
      email
    );

    localStorage.setItem(
      "tneStudentEmail",
      email
    );

    localStorage.setItem(
      "tneStudentName",
      fullName
    );

    localStorage.setItem(
      "tneStudentAccount",
      JSON.stringify({
        id: user?.id || "",
        name: fullName,
        email,
        verified:
          Boolean(user?.email_confirmed_at),
        createdAt:
          user?.created_at || ""
      })
    );
  }

  /* =========================================
     DETERMINE DESTINATION
  ========================================= */

  async function getDestination(user) {
    /*
     * Default to onboarding.
     *
     * Even if reading the profile fails,
     * a newly registered student will still
     * be sent to student-onboarding.html.
     */

    let destination = ONBOARDING_URL;

    try {
      const {
        data: profile,
        error: profileError
      } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.warn(
          "Unable to read student profile:",
          profileError
        );

        return destination;
      }

      if (profile?.onboarding_completed === true) {
        destination = APPLICATION_URL;
      }
    } catch (error) {
      console.warn(
        "Profile destination check failed:",
        error
      );
    }

    return destination;
  }

  /* =========================================
     SIGN-IN SUBMISSION
  ========================================= */

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      clearErrors();
      setStatus("", "");

      const email =
        emailInput?.value
          .trim()
          .toLowerCase() || "";

      const password =
        passwordInput?.value || "";

      let hasError = false;

      if (!isValidEmail(email)) {
        if (emailError) {
          emailError.textContent =
            "Please enter a valid email address.";
        }

        hasError = true;
      }

      if (!password) {
        if (passwordError) {
          passwordError.textContent =
            "Please enter your password.";
        }

        hasError = true;
      }

      if (hasError) {
        return;
      }

      try {
        setLoading(true);

        const {
          data,
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          throw error;
        }

        if (!data?.user) {
          throw new Error(
            "Supabase did not return a user account."
          );
        }

        if (!data?.session) {
          throw new Error(
            "Supabase did not create a login session."
          );
        }

        console.log(
          "Supabase sign-in successful:",
          data.user.email
        );

        saveSignedInReference(data.user);

        const destination =
          await getDestination(data.user);

        console.log(
          "Redirecting student to:",
          destination
        );

        setStatus(
          "Sign-in successful. Opening your student portal...",
          "success"
        );

        /*
         * Redirect after the successful
         * Supabase session has been stored.
         */

        window.location.replace(destination);
      } catch (error) {
        console.error(
          "Student sign-in error:",
          error
        );

        setStatus(
          readableSignInError(error),
          "error"
        );
      } finally {
        setLoading(false);
      }
    }
  );
});