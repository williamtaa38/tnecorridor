/* =========================================
   STUDENT SIGN IN
   File: /js/sign-in.js
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const supabase = window.tneSupabase;
  const ONBOARDING_URL = "/pages/student-onboarding.html";
  const APPLICATION_URL = "/pages/student-application.html";

  const form = document.getElementById("studentSignInForm");
  const emailInput = document.getElementById("signinEmail");
  const passwordInput = document.getElementById("signinPassword");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const statusBox = document.getElementById("signinStatus");
  const submitButton = document.getElementById("signinSubmitBtn");
  const togglePassword = document.getElementById("toggleSigninPassword");

  if (!form) return;

  function clearErrors() {
    if (emailError) emailError.textContent = "";
    if (passwordError) passwordError.textContent = "";
  }

  function setStatus(message, type = "info") {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.className = "signin-status";
    if (message) statusBox.classList.add("visible", type);
  }

  function setLoading(isLoading) {
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    submitButton.innerHTML = isLoading
      ? `<span class="signin-spinner" aria-hidden="true"></span> Signing In...`
      : `Sign In <span>→</span>`;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function readableSignInError(error) {
    const message = String(error?.message || "").toLowerCase();

    if (message.includes("email not confirmed")) {
      return "Your email has not been verified. Please open the verification email and click the verification link.";
    }

    if (
      message.includes("invalid login credentials") ||
      message.includes("invalid credentials")
    ) {
      return "The email address or password is incorrect.";
    }

    if (message.includes("rate limit") || message.includes("too many requests")) {
      return "Too many sign-in attempts. Please wait a few minutes and try again.";
    }

    if (
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("failed to fetch")
    ) {
      return "Unable to connect to Supabase. Please check your internet connection.";
    }

    return error?.message || "Unable to sign in. Please try again.";
  }

  function readPageMessage() {
    const params = new URLSearchParams(window.location.search);
    const registeredEmail = params.get("email");

    if (registeredEmail && emailInput) {
      emailInput.value = registeredEmail.trim().toLowerCase();
    }

    if (params.get("confirmed") === "1") {
      setStatus("Your email has been verified. You can now sign in.", "success");
      return;
    }

    if (params.get("registered") === "1") {
      setStatus("Account created. Verify your email, then sign in.", "success");
    }
  }

  readPageMessage();

  togglePassword?.addEventListener("click", () => {
    if (!passwordInput) return;
    const showPassword = passwordInput.type === "password";
    passwordInput.type = showPassword ? "text" : "password";
    togglePassword.textContent = showPassword ? "Hide" : "Show";
    togglePassword.setAttribute(
      "aria-label",
      showPassword ? "Hide password" : "Show password"
    );
  });

  if (!supabase) {
    setStatus("Supabase is not connected. Check /js/supabase-config.js.", "error");
    if (submitButton) submitButton.disabled = true;
    return;
  }

  document
    .getElementById("forgotStudentPassword")
    ?.addEventListener("click", async () => {
      const address = String(emailInput?.value || "").trim().toLowerCase();

      if (!address) {
        setStatus("Enter your email address first.", "error");
        return;
      }

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(address, {
          redirectTo: `${window.location.origin}/pages/reset-password.html`
        });

        if (error) throw error;
        setStatus("Password reset email sent. Check your inbox.", "success");
      } catch (error) {
        setStatus(readableSignInError(error), "error");
      }
    });

  async function ensureStudentProfile(user) {
    const { data: existing, error: readError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) throw readError;
    if (existing) return existing;

    const { data: created, error: createError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || "",
          account_type: "student",
          account_status: "active",
          onboarding_completed: false
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();

    if (createError) throw createError;
    return created;
  }

  function saveSignedInReference(user, profile) {
    const email = String(user?.email || profile?.email || "").toLowerCase();
    const fullName = String(
      profile?.full_name || user?.user_metadata?.full_name || "Student"
    );

    localStorage.setItem("tneSignedIn", "yes");
    localStorage.setItem("tneCurrentStudentEmail", email);
    localStorage.setItem("tneStudentEmail", email);
    localStorage.setItem("tneStudentName", fullName);
    localStorage.setItem(
      "tneStudentAccount",
      JSON.stringify({
        id: user?.id || "",
        name: fullName,
        email,
        verified: Boolean(user?.email_confirmed_at),
        createdAt: user?.created_at || "",
        onboardingCompleted: Boolean(profile?.onboarding_completed),
        interest: profile?.study_interest || ""
      })
    );

    if (profile) {
      let leads = [];
      try {
        const parsed = JSON.parse(localStorage.getItem("studentLeads") || "[]");
        leads = Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        leads = [];
      }

      const snapshot = {
        userId: user.id,
        fullName,
        email,
        phone: profile.phone || "",
        nationality: profile.nationality || "",
        location: profile.location || "",
        preferredIntake: profile.preferred_intake || "",
        qualification: profile.qualification || "",
        completionYear: profile.completion_year || "",
        englishLevel: profile.english_level || "",
        englishScore: profile.english_score || "",
        studyInterest: profile.study_interest || "",
        certificateResults: profile.certificate_results || {},
        selectedCourses: Array.isArray(profile.selected_courses)
          ? profile.selected_courses
          : [],
        wantsScholarship: profile.wants_scholarship || "",
        budgetRange: profile.budget_range || "",
        academicStrength: profile.academic_strength || "",
        needAccommodation: profile.need_accommodation || "",
        onboardingCompleted: Boolean(profile.onboarding_completed)
      };

      const filtered = leads.filter(
        (item) =>
          item?.userId !== user.id &&
          String(item?.email || "").toLowerCase() !== email
      );
      filtered.push(snapshot);
      localStorage.setItem("studentLeads", JSON.stringify(filtered.slice(-10)));
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();
    setStatus("", "");

    const email = emailInput?.value.trim().toLowerCase() || "";
    const password = passwordInput?.value || "";
    let hasError = false;

    if (!isValidEmail(email)) {
      if (emailError) emailError.textContent = "Please enter a valid email address.";
      hasError = true;
    }

    if (!password) {
      if (passwordError) passwordError.textContent = "Please enter your password.";
      hasError = true;
    }

    if (hasError) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      if (!data?.user || !data?.session) {
        throw new Error("Supabase did not create a valid login session.");
      }

      const profile = await ensureStudentProfile(data.user);

      if (profile.account_status === "inactive") {
        await supabase.auth.signOut();
        throw new Error("This student account has been deactivated. Please contact the administrator.");
      }

      if (profile.account_type !== "student") {
        await supabase.auth.signOut();
        throw new Error("This is a staff account. Please use the Staff Sign In page.");
      }

      saveSignedInReference(data.user, profile);

      const destination = profile.onboarding_completed
        ? APPLICATION_URL
        : ONBOARDING_URL;

      setStatus("Sign-in successful. Opening your student portal...", "success");
      window.location.replace(destination);
    } catch (error) {
      console.error("Student sign-in error:", error);
      setStatus(readableSignInError(error), "error");
    } finally {
      setLoading(false);
    }
  });
});
