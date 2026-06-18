// sign-in.js
// Student sign-in demo logic.
// This reads from the demo registrations saved by register.js.
// Connect to real backend/authentication later.

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".signin-tab");
  const emailField = document.querySelector(".email-field");
  const phoneField = document.querySelector(".phone-field");

  const form = document.getElementById("studentSignInForm");
  const successBox = document.getElementById("signinSuccess");
  const successText = document.getElementById("signinSuccessText");
  const signOutDemoBtn = document.getElementById("signOutDemoBtn");

  const emailInput = document.getElementById("signinEmail");
  const phoneInput = document.getElementById("signinPhone");

  const emailError = document.getElementById("emailError");
  const phoneError = document.getElementById("phoneError");
  const signinError = document.getElementById("signinError");

  let signinMethod = "email";

  function clearErrors() {
    if (emailError) emailError.textContent = "";
    if (phoneError) phoneError.textContent = "";
    if (signinError) signinError.textContent = "";
  }

  function setSigninMethod(method) {
    signinMethod = method;

    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.signinMethod === method);
    });

    if (method === "email") {
      emailField.classList.remove("hidden");
      phoneField.classList.add("hidden");

      emailInput.setAttribute("required", "required");
      phoneInput.removeAttribute("required");
      phoneInput.value = "";
    }

    if (method === "phone") {
      phoneField.classList.remove("hidden");
      emailField.classList.add("hidden");

      phoneInput.setAttribute("required", "required");
      emailInput.removeAttribute("required");
      emailInput.value = "";
    }

    clearErrors();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function normalisePhone(phone) {
    return String(phone || "").replace(/\s+/g, "").replace(/-/g, "");
  }

  function isValidPhone(phone) {
    const cleaned = normalisePhone(phone);
    return /^(\+?60|0)?1[0-9]{8,9}$/.test(cleaned);
  }

  function getStoredStudents() {
    try {
      return JSON.parse(localStorage.getItem("tneStudentRegistrations")) || [];
    } catch (error) {
      return [];
    }
  }

  function findStudent() {
    const students = getStoredStudents();

    if (signinMethod === "email") {
      const email = emailInput.value.trim().toLowerCase();

      return students.find((student) => {
        return String(student.email || "").trim().toLowerCase() === email;
      });
    }

    if (signinMethod === "phone") {
      const phone = normalisePhone(phoneInput.value);

      return students.find((student) => {
        return normalisePhone(student.phone) === phone;
      });
    }

    return null;
  }

  function validateForm() {
    clearErrors();

    let isValid = true;

    if (signinMethod === "email") {
      const email = emailInput.value.trim();

      if (!email) {
        emailError.textContent = "Please enter your email address.";
        isValid = false;
      } else if (!isValidEmail(email)) {
        emailError.textContent = "Please enter a valid email address.";
        isValid = false;
      }
    }

    if (signinMethod === "phone") {
      const phone = phoneInput.value.trim();

      if (!phone) {
        phoneError.textContent = "Please enter your phone number.";
        isValid = false;
      } else if (!isValidPhone(phone)) {
        phoneError.textContent = "Please enter a valid Malaysia phone number.";
        isValid = false;
      }
    }

    return isValid;
  }

  function setSignedInStudent(student) {
    localStorage.setItem("tneSignedIn", "yes");
    localStorage.setItem("tneSignedInStudent", JSON.stringify(student));
  }

  function signOutDemo() {
    localStorage.setItem("tneSignedIn", "no");
    localStorage.removeItem("tneSignedInStudent");

    form.classList.remove("hidden");
    successBox.classList.add("hidden");
    form.reset();
    setSigninMethod("email");
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setSigninMethod(tab.dataset.signinMethod);
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    const student = findStudent();

    if (!student) {
      signinError.textContent =
        "No registered student found. Please register first or check your details.";
      return;
    }

    setSignedInStudent(student);

    if (successText) {
      successText.textContent = `Welcome back, ${student.name || "student"}. You have signed in successfully.`;
    }

    form.classList.add("hidden");
    successBox.classList.remove("hidden");
  });

  if (signOutDemoBtn) {
    signOutDemoBtn.addEventListener("click", signOutDemo);
  }

  setSigninMethod("email");
});