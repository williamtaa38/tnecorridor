/* ===============================
   STUDENT REGISTRATION
   File: /js/register.js
================================ */

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.tneSupabase;

  const ACCOUNT_USER_ID_COLUMN = "user_id";
  // If your student_accounts table uses "id" as the auth user ID column,
  // change this to:
  // const ACCOUNT_USER_ID_COLUMN = "id";

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
  const resendTimer = document.getElementById("resendTimer");
  const changeEmailBtn = document.getElementById("changeEmailBtn");

  let resendCountdown = 30;
  let resendInterval = null;

  function readableError(error) {
    if (!error) return "Unknown error.";
    if (typeof error === "string") return error;

    return (
      error.message ||
      error.error_description ||
      error.error ||
      error.details ||
      error.hint ||
      JSON.stringify(error, Object.getOwnPropertyNames(error)) ||
      "Unknown Supabase error."
    );
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

  function getName() {
    return nameInput.value.trim();
  }

  function getEmail() {
    return emailInput.value.trim().toLowerCase();
  }

  function getInterest() {
    return interestInput.value.trim();
  }

  function getOtpCode() {
    return codeBoxes.map((box) => box.value.trim()).join("");
  }

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

    if (!consentInput.checked) {
      setError(consentError, "Please tick the consent checkbox before continuing.");
      isValid = false;
    }

    return isValid;
  }

  function showVerificationPanel() {
    form.classList.add("hidden");
    verificationPanel.classList.remove("hidden");
    verifyEmailText.textContent = getEmail();

    codeBoxes.forEach((box) => {
      box.value = "";
    });

    codeBoxes[0]?.focus();
    startResendTimer();
  }

  function showRegisterForm() {
    verificationPanel.classList.add("hidden");
    form.classList.remove("hidden");
    clearErrors();
  }

  function startResendTimer() {
    resendCountdown = 30;

    if (resendTimer) {
      resendTimer.textContent = resendCountdown;
    }

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
      registerSubmitBtn.disabled = true;
      registerSubmitBtn.innerHTML = "Sending...";

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

      console.log("OTP send response:", data);

      if (error) throw error;

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
      registerSubmitBtn.disabled = false;
      registerSubmitBtn.innerHTML = `Send Verification Code <span>→</span>`;
    }
  }

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
      verifyCodeBtn.disabled = true;
      verifyCodeBtn.innerHTML = "Verifying...";

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email"
      });

      console.log("OTP verify response:", data);

      if (error) throw error;

      const user = data?.user;

      if (!user?.id) {
        throw new Error("OTP verified, but Supabase did not return a user.");
      }

      const accountPayload = {
        [ACCOUNT_USER_ID_COLUMN]: user.id,
        full_name: fullName,
        email: user.email || email,
        interested_field: interest,
        role: "student",
        updated_at: new Date().toISOString()
      };

      const { data: existingAccount, error: checkError } = await supabase
        .from("student_accounts")
        .select("*")
        .eq(ACCOUNT_USER_ID_COLUMN, user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      let accountResult;

      if (existingAccount) {
        accountResult = await supabase
          .from("student_accounts")
          .update(accountPayload)
          .eq(ACCOUNT_USER_ID_COLUMN, user.id)
          .select()
          .single();
      } else {
        accountPayload.created_at = new Date().toISOString();

        accountResult = await supabase
          .from("student_accounts")
          .insert(accountPayload)
          .select()
          .single();
      }

      console.log("student_accounts result:", accountResult);

      if (accountResult.error) throw accountResult.error;

      sessionStorage.removeItem("tne_pending_register");
      localStorage.setItem("tneSignedIn", "yes");

      window.location.href = "/pages/student-onboarding.html";
    } catch (error) {
      console.error("Verify/register error full object:", error);
      setError(codeError, readableError(error));
    } finally {
      verifyCodeBtn.disabled = false;
      verifyCodeBtn.innerHTML = `Verify & Continue <span>→</span>`;
    }
  }

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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendVerificationCode();
  });

  verifyCodeBtn.addEventListener("click", () => {
    verifyCodeAndCreateAccount();
  });

  resendCodeBtn.addEventListener("click", () => {
    sendVerificationCode();
  });

  changeEmailBtn.addEventListener("click", () => {
    showRegisterForm();
  });
});