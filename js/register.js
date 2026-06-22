/* ===============================
   STUDENT REGISTRATION
   File: /js/register.js
================================ */

console.log("✅ register.js loaded version 3");

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.tneSupabase;

  /*
    IMPORTANT:
    If your student_accounts table uses "id" as auth user id,
    change "user_id" below to "id".
  */
  const ACCOUNT_USER_ID_COLUMN = "user_id";

  const form = document.getElementById("studentRegisterForm");
  const nameInput = document.getElementById("studentName");
  const emailInput = document.getElementById("studentEmail");
  const interestInput = document.getElementById("studentInterest");
  const consentInput = document.getElementById("studentConsent");

  const registerSubmitBtn = document.getElementById("registerSubmitBtn");

  const nameError = document.getElementById("nameError");
  const emailError = document.getElementById("emailError");
  const consentError = document.getElementById("consentError");

  const verificationPanel = document.getElementById("verificationPanel");
  const verifyEmailText = document.getElementById("verifyEmailText");
  const codeBoxes = Array.from(document.querySelectorAll(".code-box"));
  const codeError = document.getElementById("codeError");

  const verifyCodeBtn = document.getElementById("verifyCodeBtn");
  const resendCodeBtn = document.getElementById("resendCodeBtn");
  const changeEmailBtn = document.getElementById("changeEmailBtn");

  let resendCountdown = 30;
  let resendInterval = null;

  /* ===============================
     ERROR HELPERS
  ================================ */

  function readableError(error) {
    console.group("TNE Supabase Error Debug");
    console.log("Raw error:", error);
    console.log("Type:", typeof error);
    console.log("Message:", error?.message);
    console.log("Name:", error?.name);
    console.log("Status:", error?.status);
    console.log("Code:", error?.code);
    console.log("Details:", error?.details);
    console.log("Hint:", error?.hint);
    console.log("Own properties:", Object.getOwnPropertyNames(error || {}));
    console.groupEnd();

    if (!error) return "Unknown Supabase error.";
    if (typeof error === "string") return error;

    const possibleMessages = [
      error.message,
      error.error_description,
      error.error,
      error.details,
      error.hint,
      error.code,
      error.statusText,
      error.name
    ];

    for (const msg of possibleMessages) {
      if (typeof msg === "string" && msg.trim() && msg.trim() !== "{}") {
        return msg;
      }
    }

    try {
      const json = JSON.stringify(error, Object.getOwnPropertyNames(error));

      if (json && json !== "{}") {
        return json;
      }
    } catch (e) {
      console.warn("Could not stringify error:", e);
    }

    return "Supabase request failed, but no readable message was returned. Open DevTools → Network → auth/v1/otp → Response to see the real error.";
  }

  function setError(element, message) {
    if (!element) return;

    element.textContent = message || "";
    element.style.display = message ? "block" : "none";
  }

  function clearErrors() {
    setError(nameError, "");
    setError(emailError, "");
    setError(consentError, "");
    setError(codeError, "");
  }

  /* ===============================
     VALUE HELPERS
  ================================ */

  function getName() {
    return nameInput?.value.trim() || "";
  }

  function getEmail() {
    return emailInput?.value.trim().toLowerCase() || "";
  }

  function getInterest() {
    return interestInput?.value.trim() || "";
  }

  function getOtpCode() {
    return codeBoxes.map((box) => box.value.trim()).join("");
  }

  /* ===============================
     FORM VALIDATION
  ================================ */

  function validateRegisterForm() {
    clearErrors();

    let isValid = true;

    if (!getName()) {
      setError(nameError, "Please enter your full name.");
      isValid = false;
    }

    if (!getEmail()) {
      setError(emailError, "Please enter your email address.");
      isValid = false;
    } else if (!getEmail().includes("@")) {
      setError(emailError, "Please enter a valid email address.");
      isValid = false;
    }

    if (!consentInput?.checked) {
      setError(consentError, "Please tick the consent checkbox before continuing.");
      isValid = false;
    }

    return isValid;
  }

  /* ===============================
     UI HELPERS
  ================================ */

  function showVerificationPanel() {
    if (form) form.classList.add("hidden");
    if (verificationPanel) verificationPanel.classList.remove("hidden");

    if (verifyEmailText) {
      verifyEmailText.textContent = getEmail();
    }

    codeBoxes.forEach((box) => {
      box.value = "";
    });

    codeBoxes[0]?.focus();
    startResendTimer();
  }

  function showRegisterForm() {
    if (verificationPanel) verificationPanel.classList.add("hidden");
    if (form) form.classList.remove("hidden");

    clearErrors();
  }

  function startResendTimer() {
    resendCountdown = 30;

    if (resendCodeBtn) {
      resendCodeBtn.disabled = true;
      resendCodeBtn.innerHTML = `Resend code in <span id="resendTimer">${resendCountdown}</span>s`;
    }

    clearInterval(resendInterval);

    resendInterval = setInterval(() => {
      resendCountdown -= 1;

      const timerSpan = document.getElementById("resendTimer");

      if (timerSpan) {
        timerSpan.textContent = resendCountdown;
      }

      if (resendCountdown <= 0) {
        clearInterval(resendInterval);

        if (resendCodeBtn) {
          resendCodeBtn.disabled = false;
          resendCodeBtn.textContent = "Resend code";
        }
      }
    }, 1000);
  }

  function setRegisterButtonLoading(isLoading) {
    if (!registerSubmitBtn) return;

    registerSubmitBtn.disabled = isLoading;

    if (isLoading) {
      registerSubmitBtn.innerHTML = "Sending...";
    } else {
      registerSubmitBtn.innerHTML = `Send Verification Code <span>→</span>`;
    }
  }

  function setVerifyButtonLoading(isLoading) {
    if (!verifyCodeBtn) return;

    verifyCodeBtn.disabled = isLoading;

    if (isLoading) {
      verifyCodeBtn.innerHTML = "Verifying...";
    } else {
      verifyCodeBtn.innerHTML = `Verify & Continue <span>→</span>`;
    }
  }

  /* ===============================
     SEND OTP
  ================================ */

  async function sendVerificationCode() {
    clearErrors();

    if (!supabase) {
      setError(emailError, "Supabase is not connected. Check /js/supabase-config.js.");
      return;
    }

    if (!validateRegisterForm()) return;

    const fullName = getName();
    const email = getEmail();
    const interest = getInterest();

    try {
      setRegisterButtonLoading(true);

      console.log("Sending OTP to:", email);

      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: fullName,
            interested_field: interest
          }
        }
      });

      console.log("OTP send data:", data);
      console.log("OTP send error:", error);

      if (error) {
        throw error;
      }

      sessionStorage.setItem(
        "tne_pending_register",
        JSON.stringify({
          fullName,
          email,
          interest
        })
      );

      showVerificationPanel();
    } catch (error) {
      console.error("Send OTP error full object:", error);
      setError(emailError, readableError(error));
    } finally {
      setRegisterButtonLoading(false);
    }
  }

  /* ===============================
     VERIFY OTP + CREATE ACCOUNT
  ================================ */

  async function verifyCodeAndCreateAccount() {
    clearErrors();

    if (!supabase) {
      setError(codeError, "Supabase is not connected. Check /js/supabase-config.js.");
      return;
    }

    const code = getOtpCode();

    if (!code || code.length !== 6) {
      setError(codeError, "Please enter the 6-digit verification code.");
      return;
    }

    const pendingRaw = sessionStorage.getItem("tne_pending_register");
    const pending = pendingRaw ? JSON.parse(pendingRaw) : {};

    const email = pending.email || getEmail();
    const fullName = pending.fullName || getName();
    const interest = pending.interest || getInterest();

    try {
      setVerifyButtonLoading(true);

      console.log("Verifying OTP for:", email);

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email"
      });

      console.log("OTP verify data:", data);
      console.log("OTP verify error:", error);

      if (error) {
        throw error;
      }

      const user = data?.user;

      if (!user?.id) {
        throw new Error("OTP verified, but Supabase did not return a user.");
      }

      const now = new Date().toISOString();

      const accountPayload = {
        [ACCOUNT_USER_ID_COLUMN]: user.id,
        full_name: fullName,
        email: user.email || email,
        interested_field: interest,
        role: "student",
        updated_at: now
      };

      console.log("Checking existing student account:", user.id);

      const { data: existingAccount, error: checkError } = await supabase
        .from("student_accounts")
        .select("*")
        .eq(ACCOUNT_USER_ID_COLUMN, user.id)
        .maybeSingle();

      console.log("Existing account:", existingAccount);
      console.log("Existing account check error:", checkError);

      if (checkError) {
        throw checkError;
      }

      let accountResult;

      if (existingAccount) {
        console.log("Updating student_accounts record...");

        accountResult = await supabase
          .from("student_accounts")
          .update(accountPayload)
          .eq(ACCOUNT_USER_ID_COLUMN, user.id)
          .select()
          .single();
      } else {
        console.log("Creating student_accounts record...");

        accountPayload.created_at = now;

        accountResult = await supabase
          .from("student_accounts")
          .insert(accountPayload)
          .select()
          .single();
      }

      console.log("student_accounts result:", accountResult);

      if (accountResult.error) {
        throw accountResult.error;
      }

      sessionStorage.removeItem("tne_pending_register");
      localStorage.setItem("tneSignedIn", "yes");

      window.location.href = "/pages/student-onboarding.html";
    } catch (error) {
      console.error("Verify/register error full object:", error);
      setError(codeError, readableError(error));
    } finally {
      setVerifyButtonLoading(false);
    }
  }

  /* ===============================
     OTP INPUT BEHAVIOUR
  ================================ */

  codeBoxes.forEach((box, index) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/\D/g, "");

      if (box.value && index < codeBoxes.length - 1) {
        codeBoxes[index + 1].focus();
      }
    });

    box.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !box.value && index > 0) {
        codeBoxes[index - 1].focus();
      }
    });

    box.addEventListener("paste", (event) => {
      event.preventDefault();

      const pasted = event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);

      pasted.split("").forEach((digit, digitIndex) => {
        if (codeBoxes[digitIndex]) {
          codeBoxes[digitIndex].value = digit;
        }
      });

      const nextIndex = Math.min(pasted.length, codeBoxes.length - 1);
      codeBoxes[nextIndex]?.focus();
    });
  });

  /* ===============================
     EVENT LISTENERS
  ================================ */

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sendVerificationCode();
    });
  }

  if (verifyCodeBtn) {
    verifyCodeBtn.addEventListener("click", () => {
      verifyCodeAndCreateAccount();
    });
  }

  if (resendCodeBtn) {
    resendCodeBtn.addEventListener("click", () => {
      sendVerificationCode();
    });
  }

  if (changeEmailBtn) {
    changeEmailBtn.addEventListener("click", () => {
      showRegisterForm();
    });
  }
});