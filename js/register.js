// register.js
// Student registration page demo logic.
// This is front-end only. Connect to real backend/database later.

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".register-tab");
  const emailField = document.querySelector(".email-field");
  const phoneField = document.querySelector(".phone-field");

  const form = document.getElementById("studentRegisterForm");
  const successBox = document.getElementById("registerSuccess");
  const registerAnotherBtn = document.getElementById("registerAnotherBtn");

  const nameInput = document.getElementById("studentName");
  const emailInput = document.getElementById("studentEmail");
  const phoneInput = document.getElementById("studentPhone");
  const interestInput = document.getElementById("studentInterest");
  const consentInput = document.getElementById("studentConsent");

  const nameError = document.getElementById("nameError");
  const emailError = document.getElementById("emailError");
  const phoneError = document.getElementById("phoneError");
  const consentError = document.getElementById("consentError");

  let registerMethod = "email";

  function clearErrors() {
    if (nameError) nameError.textContent = "";
    if (emailError) emailError.textContent = "";
    if (phoneError) phoneError.textContent = "";
    if (consentError) consentError.textContent = "";
  }

  function setRegisterMethod(method) {
    registerMethod = method;

    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.registerMethod === method);
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

  function isValidPhone(phone) {
    const cleaned = phone.replace(/\s+/g, "");
    return /^(\+?60|0)?1[0-9]{8,9}$/.test(cleaned);
  }

  function getStoredStudents() {
    try {
      return JSON.parse(localStorage.getItem("tneStudentRegistrations")) || [];
    } catch (error) {
      return [];
    }
  }

  function saveStudent(student) {
    const students = getStoredStudents();
    students.push(student);
    localStorage.setItem("tneStudentRegistrations", JSON.stringify(students));
  }

  function validateForm() {
    clearErrors();

    let isValid = true;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();

    if (name.length < 2) {
      nameError.textContent = "Please enter your full name.";
      isValid = false;
    }

    if (registerMethod === "email") {
      if (!email) {
        emailError.textContent = "Please enter your email address.";
        isValid = false;
      } else if (!isValidEmail(email)) {
        emailError.textContent = "Please enter a valid email address.";
        isValid = false;
      }
    }

    if (registerMethod === "phone") {
      if (!phone) {
        phoneError.textContent = "Please enter your phone number.";
        isValid = false;
      } else if (!isValidPhone(phone)) {
        phoneError.textContent = "Please enter a valid Malaysia phone number.";
        isValid = false;
      }
    }

    if (!consentInput.checked) {
      consentError.textContent = "Please tick the consent box before registering.";
      isValid = false;
    }

    return isValid;
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setRegisterMethod(tab.dataset.registerMethod);
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    const student = {
      id: `TNE-${Date.now()}`,
      name: nameInput.value.trim(),
      method: registerMethod,
      email: registerMethod === "email" ? emailInput.value.trim() : "",
      phone: registerMethod === "phone" ? phoneInput.value.trim() : "",
      interest: interestInput.value,
      consent: consentInput.checked,
      createdAt: new Date().toISOString()
    };

    saveStudent(student);

    form.classList.add("hidden");
    successBox.classList.remove("hidden");
  });

  registerAnotherBtn.addEventListener("click", () => {
    form.reset();
    clearErrors();
    setRegisterMethod("email");

    successBox.classList.add("hidden");
    form.classList.remove("hidden");
  });

  setRegisterMethod("email");
});