/* ===============================
   TNE CORRIDOR - REGISTER + EMAIL VERIFICATION
   Frontend demo mode.
   For production, connect sendVerificationCode() and verifyCode()
   to Supabase Auth, Supabase Edge Function, Vercel API, Resend, SendGrid, etc.
================================ */

(function () {
  const DEMO_EMAIL_MODE = true;
  const RESEND_SECONDS = 30;
  const CODE_LENGTH = 6;
  const CODE_EXPIRY_MINUTES = 10;
  const MAX_ATTEMPTS = 5;

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
  const verifyEmailText = document.getElementById("verifyEmailText");
  const verifyCodeBtn = document.getElementById("verifyCodeBtn");
  const resendCodeBtn = document.getElementById("resendCodeBtn");
  const resendTimer = document.getElementById("resendTimer");
  const changeEmailBtn = document.getElementById("changeEmailBtn");
  const demoCodeHint = document.getElementById("demoCodeHint");

  const codeBoxes = Array.from(document.querySelectorAll(".code-box"));

  let pendingStudent = null;
  let countdownInterval = null;
  let remainingSeconds = RESEND_SECONDS;

  function clearErrors() {
    nameError.textContent = "";
    emailError.textContent = "";
    consentError.textContent = "";
    codeError.textContent = "";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function maskEmail(email) {
    const [name, domain] = email.split("@");

    if (!name || !domain) return email;

    const visibleName = name.length <= 2
      ? name[0] + "*"
      : name[0] + "*".repeat(Math.min(name.length - 2, 5)) + name[name.length - 1];

    return `${visibleName}@${domain}`;
  }

  function generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function setButtonLoading(button, isLoading, loadingText, normalText) {
    if (!button) return;

    button.disabled = isLoading;
    button.innerHTML = isLoading ? loadingText : normalText;
  }

  function validateRegisterForm() {
    clearErrors();

    let valid = true;

    const name = studentName.value.trim();
    const email = studentEmail.value.trim().toLowerCase();

    if (!name) {
      nameError.textContent = "Please enter student's full name.";
      valid = false;
    }

    if (!email) {
      emailError.textContent = "Please enter an email address.";
      valid = false;
    } else if (!isValidEmail(email)) {
      emailError.textContent = "Please enter a valid email address.";
      valid = false;
    }

    if (!studentConsent.checked) {
      consentError.textContent = "Please tick the consent checkbox before continuing.";
      valid = false;
    }

    return valid;
  }

  function saveDemoCode(email, code) {
    const payload = {
      email,
      code,
      attempts: 0,
      expiresAt: Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000,
      createdAt: new Date().toISOString()
    };

    sessionStorage.setItem("tneEmailVerification", JSON.stringify(payload));
  }

  async function sendVerificationCode(student) {
    const code = generateCode();

    if (DEMO_EMAIL_MODE) {
      saveDemoCode(student.email, code);

      console.log("Demo verification code:", code);

      demoCodeHint.classList.remove("hidden");
      demoCodeHint.textContent = `Demo mode code: ${code}`;

      alert(`Demo verification code: ${code}`);

      return {
        success: true
      };
    }

    /*
      PRODUCTION EXAMPLE

      const response = await fetch("/api/send-verification-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: student.name,
          email: student.email
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to send verification code.");
      }

      return result;
    */

    throw new Error("Email backend is not connected yet.");
  }

  async function verifyCode(email, code) {
    if (DEMO_EMAIL_MODE) {
      const raw = sessionStorage.getItem("tneEmailVerification");

      if (!raw) {
        return {
          success: false,
          message: "Verification session expired. Please resend the code."
        };
      }

      const saved = JSON.parse(raw);

      if (saved.email !== email) {
        return {
          success: false,
          message: "This code does not match the current email address."
        };
      }

      if (Date.now() > saved.expiresAt) {
        return {
          success: false,
          message: "This code has expired. Please resend a new code."
        };
      }

      if (saved.attempts >= MAX_ATTEMPTS) {
        return {
          success: false,
          message: "Too many failed attempts. Please use another email or resend code."
        };
      }

      if (saved.code !== code) {
        saved.attempts += 1;
        sessionStorage.setItem("tneEmailVerification", JSON.stringify(saved));

        const remaining = Math.max(MAX_ATTEMPTS - saved.attempts, 0);

        return {
          success: false,
          message: `Incorrect code. You have ${remaining} attempt(s) remaining.`
        };
      }

      return {
        success: true
      };
    }

    /*
      PRODUCTION EXAMPLE

      const response = await fetch("/api/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          code
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          message: result.message || "Invalid verification code."
        };
      }

      return result;
    */

    return {
      success: false,
      message: "Verification backend is not connected yet."
    };
  }

  function showVerificationStep() {
    form.classList.add("hidden");
    verificationPanel.classList.remove("hidden");

    verifyEmailText.textContent = maskEmail(pendingStudent.email);

    codeBoxes.forEach((box) => {
      box.value = "";
    });

    codeBoxes[0].focus();
    startResendCountdown();
  }

  function showRegisterStep() {
    verificationPanel.classList.add("hidden");
    form.classList.remove("hidden");

    clearErrors();
    stopResendCountdown();

    codeBoxes.forEach((box) => {
      box.value = "";
    });

    demoCodeHint.classList.add("hidden");
    demoCodeHint.textContent = "";
  }

  function startResendCountdown() {
    stopResendCountdown();

    remainingSeconds = RESEND_SECONDS;
    resendCodeBtn.disabled = true;
    resendCodeBtn.innerHTML = `Resend code in <span id="resendTimer">${remainingSeconds}</span>s`;

    countdownInterval = setInterval(() => {
      remainingSeconds -= 1;

      const timerSpan = document.getElementById("resendTimer");

      if (timerSpan) {
        timerSpan.textContent = remainingSeconds;
      }

      if (remainingSeconds <= 0) {
        stopResendCountdown();
        resendCodeBtn.disabled = false;
        resendCodeBtn.textContent = "Resend verification code";
      }
    }, 1000);
  }

  function stopResendCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function getEnteredCode() {
    return codeBoxes.map((box) => box.value.trim()).join("");
  }

  function setupCodeInputs() {
    codeBoxes.forEach((box, index) => {
      box.addEventListener("input", (event) => {
        const value = event.target.value.replace(/\D/g, "");

        event.target.value = value.slice(0, 1);

        if (value && index < codeBoxes.length - 1) {
          codeBoxes[index + 1].focus();
        }

        codeError.textContent = "";
      });

      box.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !box.value && index > 0) {
          codeBoxes[index - 1].focus();
        }

        if (event.key === "Enter") {
          event.preventDefault();
          verifyCodeBtn.click();
        }
      });

      box.addEventListener("paste", (event) => {
        event.preventDefault();

        const pasted = event.clipboardData
          .getData("text")
          .replace(/\D/g, "")
          .slice(0, CODE_LENGTH);

        if (!pasted) return;

        codeBoxes.forEach((input, inputIndex) => {
          input.value = pasted[inputIndex] || "";
        });

        const nextIndex = Math.min(pasted.length, CODE_LENGTH - 1);
        codeBoxes[nextIndex].focus();
      });
    });
  }

  function saveVerifiedStudent() {
    const verifiedStudent = {
      name: pendingStudent.name,
      email: pendingStudent.email,
      interest: pendingStudent.interest,
      verified: true,
      registeredAt: new Date().toISOString()
    };

    localStorage.setItem("tneStudentAccount", JSON.stringify(verifiedStudent));

    /*
      This is used by your layout.js sign-in UI.
      If you do not want auto sign-in after verification, remove this line.
    */
    localStorage.setItem("tneSignedIn", "yes");

    sessionStorage.removeItem("tneEmailVerification");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validateRegisterForm()) return;

    pendingStudent = {
      name: studentName.value.trim(),
      email: studentEmail.value.trim().toLowerCase(),
      interest: studentInterest.value || "Not sure yet"
    };

    setButtonLoading(
      registerSubmitBtn,
      true,
      "Sending Code...",
      'Send Verification Code <span>→</span>'
    );

    try {
      await sendVerificationCode(pendingStudent);
      showVerificationStep();
    } catch (error) {
      emailError.textContent = error.message || "Unable to send verification code. Please try another email.";
    } finally {
      setButtonLoading(
        registerSubmitBtn,
        false,
        "Sending Code...",
        'Send Verification Code <span>→</span>'
      );
    }
  });

  verifyCodeBtn.addEventListener("click", async () => {
    codeError.textContent = "";

    if (!pendingStudent) {
      codeError.textContent = "Registration session expired. Please register again.";
      showRegisterStep();
      return;
    }

    const code = getEnteredCode();

    if (code.length !== CODE_LENGTH) {
      codeError.textContent = "Please enter the 6-digit verification code.";
      return;
    }

    setButtonLoading(
      verifyCodeBtn,
      true,
      "Verifying...",
      'Verify & Continue <span>→</span>'
    );

    try {
      const result = await verifyCode(pendingStudent.email, code);

      if (!result.success) {
        codeError.textContent = result.message || "Invalid verification code.";
        return;
      }

      saveVerifiedStudent();

      window.location.href = "/pages/student-onboarding.html";
    } catch (error) {
      codeError.textContent = error.message || "Verification failed. Please try again.";
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
    if (!pendingStudent) {
      showRegisterStep();
      return;
    }

    codeError.textContent = "";

    resendCodeBtn.disabled = true;
    resendCodeBtn.textContent = "Sending...";

    try {
      await sendVerificationCode(pendingStudent);
      startResendCountdown();
      codeBoxes.forEach((box) => {
        box.value = "";
      });
      codeBoxes[0].focus();
    } catch (error) {
      codeError.textContent = error.message || "Unable to resend code. Please try another email.";
      resendCodeBtn.disabled = false;
      resendCodeBtn.textContent = "Resend verification code";
    }
  });

  changeEmailBtn.addEventListener("click", () => {
    pendingStudent = null;
    sessionStorage.removeItem("tneEmailVerification");
    showRegisterStep();
    studentEmail.focus();
  });

  setupCodeInputs();
})();