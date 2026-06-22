/* ===============================
   TNE CORRIDOR - REAL REGISTER + EMAIL OTP
   File: /js/register.js

   Requirements:
   1. register.html must load Supabase CDN first
   2. register.html must load /js/supabase-config.js before this file
   3. Supabase table public.student_accounts must already exist
================================ */

(function () {
  const RESEND_SECONDS = 30;
  const CODE_LENGTH = 6;

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
  const verifyEmailText = document.getElementById("verifyEmailText");
  const verifyCodeBtn = document.getElementById("verifyCodeBtn");
  const resendCodeBtn = document.getElementById("resendCodeBtn");
  const changeEmailBtn = document.getElementById("changeEmailBtn");
  const demoCodeHint = document.getElementById("demoCodeHint");

  const codeBoxes = Array.from(document.querySelectorAll(".code-box"));

  let pendingStudent = null;
  let countdownInterval = null;
  let remainingSeconds = RESEND_SECONDS;

  if (demoCodeHint) {
    demoCodeHint.classList.add("hidden");
    demoCodeHint.textContent = "";
  }

  if (!supabase) {
    console.error("Supabase is not connected. Check /js/supabase-config.js and script order in register.html.");
  }

  function clearErrors() {
    if (nameError) nameError.textContent = "";
    if (emailError) emailError.textContent = "";
    if (consentError) consentError.textContent = "";
    if (codeError) codeError.textContent = "";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function maskEmail(email) {
    const [name, domain] = String(email || "").split("@");

    if (!name || !domain) return email;

    const visibleName =
      name.length <= 2
        ? name[0] + "*"
        : name[0] + "*".repeat(Math.min(name.length - 2, 5)) + name[name.length - 1];

    return `${visibleName}@${domain}`;
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

  async function sendVerificationCode(student) {
    if (!supabase) {
      throw new Error("Supabase is not connected. Please check supabase-config.js.");
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: student.email,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: student.name,
          interest: student.interest
        }
      }
    });

    if (error) {
      throw error;
    }

    return { success: true };
  }

  async function verifyCode(email, code) {
    if (!supabase) {
      throw new Error("Supabase is not connected. Please check supabase-config.js.");
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email"
    });

    if (error) {
      throw error;
    }

    if (!data || !data.user) {
      throw new Error("Unable to verify your email. Please try again.");
    }

    return data;
  }

  async function saveStudentAccount(user, student) {
    const { error } = await supabase
      .from("student_accounts")
      .upsert(
        {
          user_id: user.id,
          full_name: student.name,
          email: student.email,
          interest: student.interest,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: "user_id"
        }
      );

    if (error) {
      throw error;
    }
  }

  function showVerificationStep() {
    form.classList.add("hidden");
    verificationPanel.classList.remove("hidden");

    verifyEmailText.textContent = maskEmail(pendingStudent.email);

    clearCodeBoxes();

    if (codeBoxes[0]) {
      codeBoxes[0].focus();
    }

    startResendCountdown();
  }

  function showRegisterStep() {
    verificationPanel.classList.add("hidden");
    form.classList.remove("hidden");

    clearErrors();
    stopResendCountdown();
    clearCodeBoxes();

    if (demoCodeHint) {
      demoCodeHint.classList.add("hidden");
      demoCodeHint.textContent = "";
    }
  }

  function startResendCountdown() {
    stopResendCountdown();

    remainingSeconds = RESEND_SECONDS;

    resendCodeBtn.disabled = true;
    resendCodeBtn.innerHTML = `Resend code in <span id="resendTimer">${remainingSeconds}</span>s`;

    countdownInterval = setInterval(function () {
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

  function clearCodeBoxes() {
    codeBoxes.forEach(function (box) {
      box.value = "";
    });
  }

  function getEnteredCode() {
    return codeBoxes
      .map(function (box) {
        return box.value.trim();
      })
      .join("");
  }

  function setupCodeInputs() {
    codeBoxes.forEach(function (box, index) {
      box.addEventListener("input", function (event) {
        const value = event.target.value.replace(/\D/g, "");

        event.target.value = value.slice(0, 1);

        if (value && index < codeBoxes.length - 1) {
          codeBoxes[index + 1].focus();
        }

        codeError.textContent = "";
      });

      box.addEventListener("keydown", function (event) {
        if (event.key === "Backspace" && !box.value && index > 0) {
          codeBoxes[index - 1].focus();
        }

        if (event.key === "Enter") {
          event.preventDefault();
          verifyCodeBtn.click();
        }
      });

      box.addEventListener("paste", function (event) {
        event.preventDefault();

        const pasted = event.clipboardData
          .getData("text")
          .replace(/\D/g, "")
          .slice(0, CODE_LENGTH);

        if (!pasted) return;

        codeBoxes.forEach(function (input, inputIndex) {
          input.value = pasted[inputIndex] || "";
        });

        const nextIndex = Math.min(pasted.length, CODE_LENGTH - 1);
        codeBoxes[nextIndex].focus();
      });
    });
  }

  form.addEventListener("submit", async function (event) {
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
      console.error("Send OTP error:", error);
      emailError.textContent =
        error.message || "Unable to send verification code. Please try another email.";
    } finally {
      setButtonLoading(
        registerSubmitBtn,
        false,
        "Sending Code...",
        'Send Verification Code <span>→</span>'
      );
    }
  });

  verifyCodeBtn.addEventListener("click", async function () {
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
      const data = await verifyCode(pendingStudent.email, code);
      const user = data.user;

      await saveStudentAccount(user, pendingStudent);

      localStorage.setItem(
        "tneStudentAccount",
        JSON.stringify({
          userId: user.id,
          name: pendingStudent.name,
          email: pendingStudent.email,
          interest: pendingStudent.interest,
          verified: true,
          registeredAt: new Date().toISOString()
        })
      );

      localStorage.setItem("tneSignedIn", "yes");
      localStorage.setItem("tneCurrentStudentEmail", pendingStudent.email);

      window.location.href = "/pages/student-onboarding.html";
    } catch (error) {
      console.error("Verify OTP error:", error);
      codeError.textContent =
        error.message || "Verification failed. Please check the code and try again.";
    } finally {
      setButtonLoading(
        verifyCodeBtn,
        false,
        "Verifying...",
        'Verify & Continue <span>→</span>'
      );
    }
  });

  resendCodeBtn.addEventListener("click", async function () {
    if (!pendingStudent) {
      showRegisterStep();
      return;
    }

    codeError.textContent = "";

    resendCodeBtn.disabled = true;
    resendCodeBtn.textContent = "Sending...";

    try {
      await sendVerificationCode(pendingStudent);
      clearCodeBoxes();

      if (codeBoxes[0]) {
        codeBoxes[0].focus();
      }

      startResendCountdown();
    } catch (error) {
      console.error("Resend OTP error:", error);
      codeError.textContent =
        error.message || "Unable to resend code. Please try another email.";

      resendCodeBtn.disabled = false;
      resendCodeBtn.textContent = "Resend verification code";
    }
  });

  changeEmailBtn.addEventListener("click", function () {
    pendingStudent = null;
    showRegisterStep();
    studentEmail.focus();
  });

  setupCodeInputs();
})();