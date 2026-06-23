/* ===============================
   REGISTER PAGE
   File: /js/register.js
================================ */

console.log("✅ register.js loaded version 6");

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.tneSupabase;

  const form = document.getElementById("studentRegisterForm");
  const verificationPanel = document.getElementById("verificationPanel");

  const studentName = document.getElementById("studentName");
  const studentEmail = document.getElementById("studentEmail");
  const studentInterest = document.getElementById("studentInterest");
  const studentConsent = document.getElementById("studentConsent");

  const nameError = document.getElementById("nameError");
  const emailError = document.getElementById("emailError");
  const consentError = document.getElementById("consentError");
  const codeError = document.getElementById("codeError");

  const registerSubmitBtn = document.getElementById("registerSubmitBtn");
  const verifyCodeBtn = document.getElementById("verifyCodeBtn");
  const resendCodeBtn = document.getElementById("resendCodeBtn");
  const resendTimer = document.getElementById("resendTimer");
  const changeEmailBtn = document.getElementById("changeEmailBtn");
  const verifyEmailText = document.getElementById("verifyEmailText");

  const codeBoxes = Array.from(document.querySelectorAll(".code-box"));

  let currentEmail = "";
  let currentName = "";
  let currentInterest = "";
  let timerInterval = null;
  let secondsLeft = 30;

  const ONBOARDING_URL = "/pages/student-onboarding.html";

  function clearErrors() {
    nameError.textContent = "";
    emailError.textContent = "";
    consentError.textContent = "";
    codeError.textContent = "";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setButtonLoading(button, isLoading, loadingText, normalText) {
    if (!button) return;

    button.disabled = isLoading;

    if (isLoading) {
      button.dataset.originalText = button.innerHTML;
      button.innerHTML = loadingText;
    } else {
      button.innerHTML = normalText || button.dataset.originalText || button.innerHTML;
    }
  }

  function startResendTimer() {
    clearInterval(timerInterval);

    secondsLeft = 30;
    resendTimer.textContent = secondsLeft;
    resendCodeBtn.disabled = true;
    resendCodeBtn.innerHTML = `Resend code in <span id="resendTimer">${secondsLeft}</span>s`;

    timerInterval = setInterval(() => {
      secondsLeft -= 1;

      const timerSpan = document.getElementById("resendTimer");
      if (timerSpan) timerSpan.textContent = secondsLeft;

      if (secondsLeft <= 0) {
        clearInterval(timerInterval);
        resendCodeBtn.disabled = false;
        resendCodeBtn.textContent = "Resend verification code";
      }
    }, 1000);
  }

  function showVerificationPanel(email) {
    form.classList.add("hidden");
    verificationPanel.classList.remove("hidden");

    verifyEmailText.textContent = email;

    codeBoxes.forEach((box) => {
      box.value = "";
    });

    codeBoxes[0].focus();
    startResendTimer();
  }

  function showRegisterForm() {
    verificationPanel.classList.add("hidden");
    form.classList.remove("hidden");
    clearErrors();

    codeBoxes.forEach((box) => {
      box.value = "";
    });

    studentEmail.focus();
  }

  async function sendOtpEmail() {
    if (!supabase) {
      throw new Error("Supabase client is not available. Check supabase-config.js.");
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: currentEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}${ONBOARDING_URL}`,
        data: {
          full_name: currentName,
          interested_field: currentInterest
        }
      }
    });

    if (error) {
      throw error;
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearErrors();

    currentName = studentName.value.trim();
    currentEmail = studentEmail.value.trim().toLowerCase();
    currentInterest = studentInterest.value.trim();

    let hasError = false;

    if (!currentName) {
      nameError.textContent = "Please enter your full name.";
      hasError = true;
    }

    if (!currentEmail) {
      emailError.textContent = "Please enter your email address.";
      hasError = true;
    } else if (!isValidEmail(currentEmail)) {
      emailError.textContent = "Please enter a valid email address.";
      hasError = true;
    }

    if (!studentConsent.checked) {
      consentError.textContent = "Please agree before continuing.";
      hasError = true;
    }

    if (hasError) return;

    try {
      setButtonLoading(
        registerSubmitBtn,
        true,
        "Sending verification code...",
        'Send Verification Code <span>→</span>'
      );

      await sendOtpEmail();

      localStorage.setItem("tneStudentName", currentName);
      localStorage.setItem("tneStudentEmail", currentEmail);
      localStorage.setItem("tneStudentInterest", currentInterest);

      showVerificationPanel(currentEmail);
    } catch (error) {
      console.error("❌ OTP send error:", error);

      emailError.textContent =
        error.message || "Unable to send verification code. Please try again.";
    } finally {
      setButtonLoading(
        registerSubmitBtn,
        false,
        "Sending verification code...",
        'Send Verification Code <span>→</span>'
      );
    }
  });

  verifyCodeBtn.addEventListener("click", async () => {
    clearErrors();

    const token = codeBoxes.map((box) => box.value.trim()).join("");

    if (token.length !== 6) {
      codeError.textContent = "Please enter the 6-digit verification code.";
      return;
    }

    if (!/^\d{6}$/.test(token)) {
      codeError.textContent = "Verification code must contain numbers only.";
      return;
    }

    try {
      setButtonLoading(
        verifyCodeBtn,
        true,
        "Verifying...",
        'Verify & Continue <span>→</span>'
      );

      const { data, error } = await supabase.auth.verifyOtp({
        email: currentEmail,
        token: token,
        type: "email"
      });

      if (error) {
        throw error;
      }

      console.log("✅ Email verified:", data);

      localStorage.setItem("tneSignedIn", "yes");
      localStorage.setItem("tneStudentName", currentName);
      localStorage.setItem("tneStudentEmail", currentEmail);
      localStorage.setItem("tneStudentInterest", currentInterest);

      window.location.href = ONBOARDING_URL;
    } catch (error) {
      console.error("❌ OTP verify error:", error);

      codeError.textContent =
        error.message || "Invalid verification code. Please try again.";
    } finally {
      setButtonLoading(
        verifyCodeBtn,
        false,
        "Verifying...",
        'Verify & Continue <span>→</span>'
      );
    }
  });

  resendCodeBtn.addEventListener("click", async () => {
    clearErrors();

    if (!currentEmail) {
      emailError.textContent = "Please enter your email address again.";
      showRegisterForm();
      return;
    }

    try {
      resendCodeBtn.disabled = true;
      resendCodeBtn.textContent = "Sending...";

      await sendOtpEmail();

      codeError.textContent = "";
      startResendTimer();
    } catch (error) {
      console.error("❌ Resend OTP error:", error);
      codeError.textContent =
        error.message || "Unable to resend code. Please try again.";

      resendCodeBtn.disabled = false;
      resendCodeBtn.textContent = "Resend verification code";
    }
  });

  changeEmailBtn.addEventListener("click", () => {
    showRegisterForm();
  });

  codeBoxes.forEach((box, index) => {
    box.addEventListener("input", (event) => {
      const value = event.target.value.replace(/\D/g, "");
      event.target.value = value;

      if (value && index < codeBoxes.length - 1) {
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

      if (!pasted) return;

      codeBoxes.forEach((input, i) => {
        input.value = pasted[i] || "";
      });

      const nextIndex = Math.min(pasted.length, codeBoxes.length - 1);
      codeBoxes[nextIndex].focus();
    });
  });
});