/* ===============================
   STUDENT SIGN IN PAGE
   File: /js/sign-in.js

   Static demo version:
   - Reads verified registration from localStorage: tneStudentAccount
   - Reads submitted onboarding forms from localStorage: studentLeads
   - Shows latest application for the signed-in email
================================ */

(function () {
  const form = document.getElementById("studentSignInForm");
  const signinEmail = document.getElementById("signinEmail");
  const emailError = document.getElementById("emailError");

  const loginPanel = document.getElementById("loginPanel");
  const dashboardPanel = document.getElementById("dashboardPanel");

  const signOutBtn = document.getElementById("signOutBtn");

  const studentNameText = document.getElementById("studentNameText");
  const studentEmailText = document.getElementById("studentEmailText");

  const applicationStatusText = document.getElementById("applicationStatusText");
  const statusBadge = document.getElementById("statusBadge");
  const statusDescription = document.getElementById("statusDescription");

  const dashFullName = document.getElementById("dashFullName");
  const dashEmail = document.getElementById("dashEmail");
  const dashPhone = document.getElementById("dashPhone");
  const dashNationality = document.getElementById("dashNationality");
  const dashQualification = document.getElementById("dashQualification");
  const dashYear = document.getElementById("dashYear");
  const dashInterest = document.getElementById("dashInterest");
  const dashScholarship = document.getElementById("dashScholarship");
  const dashCourses = document.getElementById("dashCourses");
  const nextStepText = document.getElementById("nextStepText");

  const STATUS_DETAILS = {
    submitted: {
      label: "Submitted",
      description: "Your application profile has been submitted. Our team will review your information.",
      nextStep: "Please wait while your profile is being reviewed."
    },
    processing: {
      label: "Processing",
      description: "Your application is currently being reviewed by our officer.",
      nextStep: "Please prepare your academic documents, IC/passport and result slips."
    },
    action_required: {
      label: "Action Required",
      description: "Your application needs additional information or correction.",
      nextStep: "Please update your profile or contact TNE Corridor for assistance."
    },
    successful: {
      label: "Successful",
      description: "Your application has been successful. Offer letter or related documents may be available soon.",
      nextStep: "Please check your email and prepare for the next admission steps."
    },
    failed: {
      label: "Failed",
      description: "Your application was not successful or requires a new submission.",
      nextStep: "Please update your profile or choose another suitable programme."
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    const signedInEmail = localStorage.getItem("tneCurrentStudentEmail");

    if (signedInEmail) {
      const studentData = getStudentDataByEmail(signedInEmail);

      if (studentData) {
        showDashboard(studentData);
        return;
      }
    }

    showLogin();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    emailError.textContent = "";

    const email = signinEmail.value.trim().toLowerCase();

    if (!isValidEmail(email)) {
      emailError.textContent = "Please enter a valid email address.";
      return;
    }

    const registeredStudent = getRegisteredStudent();

    if (!registeredStudent || !registeredStudent.verified) {
      emailError.textContent = "No verified student account found. Please register first.";
      return;
    }

    if (registeredStudent.email.toLowerCase() !== email) {
      emailError.textContent = "This email does not match the verified student account.";
      return;
    }

    const studentData = getStudentDataByEmail(email);

    if (!studentData) {
      emailError.textContent = "No submitted profile found. Please complete your student profile first.";
      return;
    }

    localStorage.setItem("tneSignedIn", "yes");
    localStorage.setItem("tneCurrentStudentEmail", email);

    showDashboard(studentData);
  });

  signOutBtn.addEventListener("click", function () {
    localStorage.removeItem("tneSignedIn");
    localStorage.removeItem("tneCurrentStudentEmail");

    signinEmail.value = "";
    emailError.textContent = "";

    showLogin();
  });

  function showLogin() {
    loginPanel.classList.remove("hidden");
    dashboardPanel.classList.add("hidden");
  }

  function showDashboard(studentData) {
    loginPanel.classList.add("hidden");
    dashboardPanel.classList.remove("hidden");

    const account = studentData.account;
    const lead = studentData.lead;

    const fullName = lead.fullName || account.name || "Student";
    const email = lead.email || account.email || "-";
    const status = normalizeStatus(lead.applicationStatus || "submitted");
    const statusInfo = STATUS_DETAILS[status] || STATUS_DETAILS.submitted;

    studentNameText.textContent = fullName;
    studentEmailText.textContent = email;

    applicationStatusText.textContent = statusInfo.label;
    statusBadge.textContent = statusInfo.label;
    statusBadge.className = `status-badge ${status}`;

    statusDescription.textContent = statusInfo.description;
    nextStepText.textContent = statusInfo.nextStep;

    dashFullName.textContent = fullName;
    dashEmail.textContent = email;
    dashPhone.textContent = lead.phone || "-";
    dashNationality.textContent = lead.nationality || "-";

    dashQualification.textContent = lead.qualification || "-";
    dashYear.textContent = lead.completionYear || "-";
    dashInterest.textContent = lead.studyInterest || account.interest || "-";
    dashScholarship.textContent = lead.wantsScholarship || "-";

    renderCourseChoices(lead.selectedCourses || []);
    renderProgress(status);
  }

  function renderCourseChoices(courses) {
    if (!courses.length) {
      dashCourses.innerHTML = `<div class="empty-box">No course submitted yet.</div>`;
      return;
    }

    dashCourses.innerHTML = courses.map(function (course, index) {
      return `
        <div class="course-item">
          <strong>Choice ${index + 1}: ${escapeHtml(course.Title || "Course")}</strong><br />
          <span>${escapeHtml(course.universityCode || "-")} · ${escapeHtml(course.level || "Programme")}</span>
        </div>
      `;
    }).join("");
  }

  function renderProgress(status) {
    const order = ["submitted", "processing", "action_required", "successful"];
    let activeIndex = order.indexOf(status);

    if (status === "failed") {
      activeIndex = 2;
    }

    if (activeIndex < 0) {
      activeIndex = 0;
    }

    document.querySelectorAll("[data-status-step]").forEach(function (step, index) {
      step.classList.remove("active", "done");

      if (index < activeIndex) {
        step.classList.add("done");
      }

      if (index === activeIndex) {
        step.classList.add("active");
      }
    });
  }

  function getRegisteredStudent() {
    try {
      return JSON.parse(localStorage.getItem("tneStudentAccount") || "{}");
    } catch (error) {
      console.error("Student account read error:", error);
      return {};
    }
  }

  function getStudentDataByEmail(email) {
    const account = getRegisteredStudent();
    const leads = getStudentLeads();

    const matchedLeads = leads.filter(function (lead) {
      return String(lead.email || "").toLowerCase() === String(email || "").toLowerCase();
    });

    const latestLead = matchedLeads.length
      ? matchedLeads[matchedLeads.length - 1]
      : null;

    if (!account || !account.email) {
      return null;
    }

    if (String(account.email).toLowerCase() !== String(email).toLowerCase()) {
      return null;
    }

    if (!latestLead) {
      return null;
    }

    return {
      account,
      lead: latestLead
    };
  }

  function getStudentLeads() {
    try {
      return JSON.parse(localStorage.getItem("studentLeads") || "[]");
    } catch (error) {
      console.error("Student leads read error:", error);
      return [];
    }
  }

  function normalizeStatus(status) {
    const cleanStatus = String(status || "submitted").toLowerCase();

    if (cleanStatus === "action required") return "action_required";
    if (cleanStatus === "approved") return "successful";
    if (cleanStatus === "success") return "successful";

    if (
      cleanStatus === "submitted" ||
      cleanStatus === "processing" ||
      cleanStatus === "action_required" ||
      cleanStatus === "successful" ||
      cleanStatus === "failed"
    ) {
      return cleanStatus;
    }

    return "submitted";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();