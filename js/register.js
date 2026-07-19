/* ===============================
   STUDENT SIGN IN
   File: /js/sign-in.js
================================ */

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.tneSupabase;

  const form = document.getElementById("studentSignInForm");
  const emailInput = document.getElementById("signinEmail");
  const passwordInput = document.getElementById("signinPassword");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const statusBox = document.getElementById("signinStatus");
  const submitButton = document.getElementById("signinSubmitBtn");
  const togglePassword = document.getElementById("toggleSigninPassword");

  const ONBOARDING_URL = "/pages/student-onboarding.html";
  const APPLICATION_URL = "/pages/student-application.html";

  if (!form) return;

  function clearErrors() {
    emailError.textContent = "";
    passwordError.textContent = "";
  }

  function setStatus(message, type = "info") {
    statusBox.textContent = message;
    statusBox.className = "signin-status";

    if (message) statusBox.classList.add("visible", type);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.innerHTML = isLoading
      ? '<span class="signin-spinner" aria-hidden="true"></span> Signing In...'
      : 'Sign In <span>→</span>';
  }

  function readableSignInError(error) {
    const message = String(error?.message || "").toLowerCase();

    if (message.includes("email not confirmed")) {
      return "Please confirm your email address before signing in.";
    }

    if (message.includes("invalid login credentials")) {
      return "The email or password is incorrect.";
    }

    if (message.includes("rate limit")) {
      return "Too many sign-in attempts. Please wait a few minutes and try again.";
    }

    if (message.includes("fetch") || message.includes("network")) {
      return "Unable to connect to the sign-in service. Please check your connection and try again.";
    }

    return error?.message || "Unable to sign in. Please try again.";
  }

  function getSavedLeads() {
    try {
      const leads = JSON.parse(localStorage.getItem("studentLeads") || "[]");
      return Array.isArray(leads) ? leads : [];
    } catch (error) {
      console.error("Unable to read saved onboarding profiles:", error);
      return [];
    }
  }

  function hasCompletedOnboarding(user) {
    if (user?.user_metadata?.onboarding_completed === true) return true;

    const email = String(user?.email || "").toLowerCase();
    if (!email) return false;

    return getSavedLeads().some((lead) =>
      String(lead?.email || "").toLowerCase() === email
    );
  }

  function saveSignedInReference(user) {
    const email = String(user?.email || "").toLowerCase();
    const fullName = String(user?.user_metadata?.full_name || "Student");

    localStorage.setItem("tneSignedIn", "yes");
    localStorage.setItem("tneCurrentStudentEmail", email);
    localStorage.setItem("tneStudentEmail", email);
    localStorage.setItem("tneStudentName", fullName);
    localStorage.removeItem("tnePendingEmail");

    localStorage.setItem("tneStudentAccount", JSON.stringify({
      id: user?.id || "",
      name: fullName,
      email,
      verified: Boolean(user?.email_confirmed_at),
      createdAt: user?.created_at || ""
    }));
  }

  function destinationForUser(user) {
    return hasCompletedOnboarding(user) ? APPLICATION_URL : ONBOARDING_URL;
  }

  function redirectSignedInUser(user) {
    saveSignedInReference(user);
    window.location.replace(destinationForUser(user));
  }

  function readPageMessage() {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");

    if (email) emailInput.value = email.trim().toLowerCase();

    if (params.get("confirmed") === "1") {
      setStatus("Email confirmed successfully. You may now sign in.", "success");
    } else if (params.get("registered") === "1") {
      setStatus("Account created. Confirm your email if requested, then sign in.", "success");
    }
  }

  readPageMessage();

  if (!supabase) {
    setStatus("Supabase is not connected. Please check /js/supabase-config.js.", "error");
    submitButton.disabled = true;
    return;
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (data?.session?.user) {
      redirectSignedInUser(data.session.user);
      return;
    }
  } catch (error) {
    console.error("Session check error:", error);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    let hasError = false;

    if (!isValidEmail(email)) {
      emailError.textContent = "Please enter a valid email address.";
      hasError = true;
    }

    if (!password) {
      passwordError.textContent = "Please enter your password.";
      hasError = true;
    }

    if (hasError) return;

    try {
      setLoading(true);
      setStatus("", "");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      if (!data?.user) throw new Error("No user account was returned.");

      setStatus("Sign-in successful. Opening your student portal...", "success");
      redirectSignedInUser(data.user);
    } catch (error) {
      console.error("Sign-in error:", error);
      setStatus(readableSignInError(error), "error");
    } finally {
      setLoading(false);
    }
  });

  togglePassword.addEventListener("click", () => {
    const willShow = passwordInput.type === "password";
    passwordInput.type = willShow ? "text" : "password";
    togglePassword.textContent = willShow ? "Hide" : "Show";
    togglePassword.setAttribute("aria-label", willShow ? "Hide password" : "Show password");
  });
});