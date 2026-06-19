/* ===============================
   STUDENT ONBOARDING / LEAD FORM
   File: /js/student-onboarding.js
================================ */

(function () {
  const CSV_PATHS = {
    universities: "/data/Universities.csv",
    courses: "/data/Courses.csv",
    entryRequirements: "/data/EntryRequirements.csv",
    scholarships: "/data/Scholarships.csv"
  };

  let currentStep = 1;
  const totalSteps = 6;

  let universities = [];
  let courses = [];
  let entryRequirements = [];
  let scholarships = [];

  let selectedCourses = [];
  let spmSubjects = [];

  const spmSubjectOptions = [
    "Bahasa Melayu",
    "English",
    "Mathematics",
    "Additional Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Science",
    "Sejarah",
    "Moral",
    "Islamic Studies",
    "Accounting",
    "Business",
    "Economics",
    "Computer Science",
    "Other"
  ];

  const gradeOptions = [
    "A+",
    "A",
    "A-",
    "B+",
    "B",
    "C+",
    "C",
    "D",
    "E",
    "G"
  ];

  document.addEventListener("DOMContentLoaded", async function () {
    bindEvents();
    await loadCsvData();
    populateFilters();
    addDefaultSpmRows();
    renderCourses();
    updateStepUI();
    updateCompletion();
  });

  function bindEvents() {
    document.getElementById("nextBtn").addEventListener("click", nextStep);
    document.getElementById("prevBtn").addEventListener("click", prevStep);
    document.getElementById("studentLeadForm").addEventListener("submit", submitLead);

    document.getElementById("addSpmSubject").addEventListener("click", function () {
      addSpmRow();
    });

    document.getElementById("addSciencePreset").addEventListener("click", addSciencePreset);
    document.getElementById("clearSpmSubjects").addEventListener("click", clearSpmSubjects);

    document.getElementById("universityFilter").addEventListener("change", renderCourses);
    document.getElementById("levelFilter").addEventListener("change", renderCourses);
    document.getElementById("courseSearch").addEventListener("input", renderCourses);

    document.getElementById("checkScholarshipBtn").addEventListener("click", renderScholarshipMatches);

    document.querySelectorAll("[data-step-pill]").forEach(function (pill) {
      pill.addEventListener("click", function () {
        const targetStep = Number(pill.getAttribute("data-step-pill"));
        goToStep(targetStep);
      });
    });
  }

  async function loadCsvData() {
    try {
      const [uniText, courseText, requirementText, scholarshipText] = await Promise.all([
        fetch(CSV_PATHS.universities).then(r => r.text()),
        fetch(CSV_PATHS.courses).then(r => r.text()),
        fetch(CSV_PATHS.entryRequirements).then(r => r.text()),
        fetch(CSV_PATHS.scholarships).then(r => r.text())
      ]);

      universities = parseCsv(uniText);
      courses = parseCsv(courseText);
      entryRequirements = parseCsv(requirementText);
      scholarships = parseCsv(scholarshipText);
    } catch (error) {
      console.error("CSV loading error:", error);
      universities = [];
      courses = [];
      entryRequirements = [];
      scholarships = [];
    }
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"' && insideQuotes && nextChar === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        row.push(value.trim());
        value = "";
      } else if ((char === "\n" || char === "\r") && !insideQuotes) {
        if (value || row.length) {
          row.push(value.trim());
          rows.push(row);
          row = [];
          value = "";
        }

        if (char === "\r" && nextChar === "\n") {
          i++;
        }
      } else {
        value += char;
      }
    }

    if (value || row.length) {
      row.push(value.trim());
      rows.push(row);
    }

    if (!rows.length) return [];

    const headers = rows[0].map(cleanCell);

    return rows.slice(1).map(function (cells) {
      const obj = {};
      headers.forEach(function (header, index) {
        obj[header] = cleanCell(cells[index] || "");
      });
      return obj;
    });
  }

  function cleanCell(value) {
    return String(value || "").replace(/^"|"$/g, "").trim();
  }

  function populateFilters() {
    const universityFilter = document.getElementById("universityFilter");
    const levelFilter = document.getElementById("levelFilter");

    const universityCodes = unique(courses.map(c => c.universityCode).filter(Boolean));
    const levels = unique(courses.map(c => c.level).filter(Boolean));

    universityCodes.forEach(function (code) {
      const uni = universities.find(u => u.universityCode === code);
      const option = document.createElement("option");
      option.value = code;
      option.textContent = uni ? `${uni.universityShortName || code} - ${uni.Title}` : code;
      universityFilter.appendChild(option);
    });

    levels.forEach(function (level) {
      const option = document.createElement("option");
      option.value = level;
      option.textContent = level;
      levelFilter.appendChild(option);
    });
  }

  function unique(array) {
    return [...new Set(array)];
  }

  function nextStep() {
    if (!validateCurrentStep()) return;

    if (currentStep < totalSteps) {
      currentStep++;
      if (currentStep === 6) renderReview();
      updateStepUI();
      updateCompletion();
      scrollToTop();
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
      updateStepUI();
      updateCompletion();
      scrollToTop();
    }
  }

  function goToStep(step) {
    if (step < 1 || step > totalSteps) return;
    currentStep = step;
    if (currentStep === 6) renderReview();
    updateStepUI();
    updateCompletion();
    scrollToTop();
  }

  function updateStepUI() {
    document.querySelectorAll(".form-step").forEach(function (section) {
      section.classList.toggle("active", Number(section.dataset.step) === currentStep);
    });

    document.querySelectorAll(".step-pill").forEach(function (pill) {
      const step = Number(pill.getAttribute("data-step-pill"));
      pill.classList.toggle("active", step === currentStep);
      pill.classList.toggle("done", step < currentStep);
    });

    document.getElementById("prevBtn").style.display = currentStep === 1 ? "none" : "inline-flex";
    document.getElementById("nextBtn").style.display = currentStep === totalSteps ? "none" : "inline-flex";
    document.getElementById("submitBtn").style.display = currentStep === totalSteps ? "inline-flex" : "none";
  }

  function updateCompletion() {
    const percent = Math.round((currentStep / totalSteps) * 100);
    document.getElementById("completionPercent").textContent = percent;
    document.getElementById("completionBar").style.width = percent + "%";
  }

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function validateCurrentStep() {
    if (currentStep === 1) {
      const required = ["fullName", "email", "phone"];
      return validateRequired(required);
    }

    if (currentStep === 2) {
      return validateRequired(["qualification"]);
    }

    if (currentStep === 4 && selectedCourses.length === 0) {
      alert("Please select at least one preferred course.");
      return false;
    }

    return true;
  }

  function validateRequired(ids) {
    for (const id of ids) {
      const input = document.getElementById(id);
      if (!input.value.trim()) {
        input.focus();
        alert("Please complete the required field.");
        return false;
      }
    }

    return true;
  }

  /* ===============================
     SPM RESULTS
  ================================ */

  function addDefaultSpmRows() {
    ["Bahasa Melayu", "English", "Mathematics", "Sejarah"].forEach(function (subject) {
      addSpmRow(subject, "");
    });
  }

  function addSciencePreset() {
    clearSpmSubjects();

    [
      "Bahasa Melayu",
      "English",
      "Mathematics",
      "Additional Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "Sejarah"
    ].forEach(function (subject) {
      addSpmRow(subject, "");
    });
  }

  function clearSpmSubjects() {
    spmSubjects = [];
    renderSpmRows();
  }

  function addSpmRow(subject = "", grade = "") {
    spmSubjects.push({
      id: Date.now() + Math.random(),
      subject,
      grade
    });

    renderSpmRows();
  }

  function renderSpmRows() {
    const tbody = document.getElementById("spmRows");
    tbody.innerHTML = "";

    spmSubjects.forEach(function (item) {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>
          <select data-spm-subject="${item.id}">
            <option value="">Select subject</option>
            ${spmSubjectOptions.map(subject => `
              <option value="${escapeHtml(subject)}" ${subject === item.subject ? "selected" : ""}>
                ${escapeHtml(subject)}
              </option>
            `).join("")}
          </select>
        </td>

        <td>
          <select data-spm-grade="${item.id}">
            <option value="">Select grade</option>
            ${gradeOptions.map(grade => `
              <option value="${grade}" ${grade === item.grade ? "selected" : ""}>
                ${grade}
              </option>
            `).join("")}
          </select>
        </td>

        <td>
          <button type="button" class="remove-row" data-remove-spm="${item.id}">×</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("[data-spm-subject]").forEach(function (select) {
      select.addEventListener("change", function () {
        const id = Number(select.dataset.spmSubject);
        const item = spmSubjects.find(s => s.id === id);
        if (item) item.subject = select.value;
        updateSpmSummary();
      });
    });

    tbody.querySelectorAll("[data-spm-grade]").forEach(function (select) {
      select.addEventListener("change", function () {
        const id = Number(select.dataset.spmGrade);
        const item = spmSubjects.find(s => s.id === id);
        if (item) item.grade = select.value;
        updateSpmSummary();
      });
    });

    tbody.querySelectorAll("[data-remove-spm]").forEach(function (button) {
      button.addEventListener("click", function () {
        const id = Number(button.dataset.removeSpm);
        spmSubjects = spmSubjects.filter(s => s.id !== id);
        renderSpmRows();
      });
    });

    updateSpmSummary();
  }

  function updateSpmSummary() {
    const completed = spmSubjects.filter(s => s.subject && s.grade);
    const creditGrades = ["A+", "A", "A-", "B+", "B", "C+", "C"];
    const aGrades = ["A+", "A", "A-"];

    document.getElementById("totalSubjects").textContent = completed.length;
    document.getElementById("totalCredits").textContent = completed.filter(s => creditGrades.includes(s.grade)).length;
    document.getElementById("totalA").textContent = completed.filter(s => aGrades.includes(s.grade)).length;
  }

  /* ===============================
     COURSES
  ================================ */

  function renderCourses() {
    const container = document.getElementById("courseResults");
    const universityCode = document.getElementById("universityFilter").value;
    const level = document.getElementById("levelFilter").value;
    const search = document.getElementById("courseSearch").value.toLowerCase();

    let filtered = courses.filter(function (course) {
      const uni = getUniversity(course.universityCode);
      const haystack = [
        course.Title,
        course.courseCode,
        course.universityCode,
        course.level,
        course.duration,
        uni ? uni.Title : ""
      ].join(" ").toLowerCase();

      const matchUniversity = !universityCode || course.universityCode === universityCode;
      const matchLevel = !level || course.level === level;
      const matchSearch = !search || haystack.includes(search);

      return matchUniversity && matchLevel && matchSearch;
    });

    filtered = filtered.slice(0, 24);

    if (!filtered.length) {
      container.innerHTML = `<div class="empty-state">No courses found. Try another filter.</div>`;
      return;
    }

    container.innerHTML = filtered.map(function (course) {
      const uni = getUniversity(course.universityCode);
      const isSelected = selectedCourses.some(c => c.courseCode === course.courseCode);
      const tuition = formatTuition(course);

      return `
        <div class="course-card ${isSelected ? "selected" : ""}">
          <h3>${escapeHtml(course.Title)}</h3>

          <div class="course-meta">
            <span>${escapeHtml(uni ? uni.universityShortName || course.universityCode : course.universityCode)}</span>
            <span>${escapeHtml(course.level || "Programme")}</span>
            <span>${escapeHtml(course.duration || "Duration TBC")}</span>
          </div>

          <p>
            <strong>${escapeHtml(uni ? uni.Title : course.universityCode)}</strong><br />
            Campus Track: ${escapeHtml(course.campusTrack || "Malaysia")}<br />
            Tuition: ${escapeHtml(tuition)}
          </p>

          <button type="button" class="course-action" data-course-code="${escapeHtml(course.courseCode)}">
            ${isSelected ? "Selected ✓" : "Select Course"}
          </button>
        </div>
      `;
    }).join("");

    container.querySelectorAll("[data-course-code]").forEach(function (button) {
      button.addEventListener("click", function () {
        toggleCourse(button.dataset.courseCode);
      });
    });
  }

  function toggleCourse(courseCode) {
    const existing = selectedCourses.find(c => c.courseCode === courseCode);

    if (existing) {
      selectedCourses = selectedCourses.filter(c => c.courseCode !== courseCode);
    } else {
      if (selectedCourses.length >= 3) {
        alert("You can select up to 3 preferred courses only.");
        return;
      }

      const course = courses.find(c => c.courseCode === courseCode);
      if (course) selectedCourses.push(course);
    }

    renderCourses();
    renderSelectedCourses();
  }

  function renderSelectedCourses() {
    const container = document.getElementById("selectedCourses");

    if (!selectedCourses.length) {
      container.innerHTML = `<div class="empty-state">No course selected yet.</div>`;
      return;
    }

    container.innerHTML = selectedCourses.map(function (course, index) {
      return `
        <div class="selected-course">
          <div>
            <strong>Choice ${index + 1}: ${escapeHtml(course.Title)}</strong><br />
            <small>${escapeHtml(course.universityCode)} · ${escapeHtml(course.level || "")}</small>
          </div>
          <button type="button" data-remove-course="${escapeHtml(course.courseCode)}">Remove</button>
        </div>
      `;
    }).join("");

    container.querySelectorAll("[data-remove-course]").forEach(function (button) {
      button.addEventListener("click", function () {
        selectedCourses = selectedCourses.filter(c => c.courseCode !== button.dataset.removeCourse);
        renderCourses();
        renderSelectedCourses();
      });
    });
  }

  function getUniversity(code) {
    return universities.find(u => u.universityCode === code);
  }

  function formatTuition(course) {
    const my = course.tuitionTotal_Malaysian;
    const international = course.tuitionTotal_International;
    const currency = course.tuitionCurrency || "MYR";

    if (!my && !international) return "To be confirmed";

    const parts = [];

    if (my) parts.push(`MY: ${currency} ${numberFormat(my)}`);
    if (international) parts.push(`INT: ${currency} ${numberFormat(international)}`);

    return parts.join(" / ");
  }

  function numberFormat(value) {
    const number = Number(String(value).replace(/[^\d.]/g, ""));
    if (!number) return value;
    return number.toLocaleString("en-MY");
  }

  /* ===============================
     SCHOLARSHIPS
  ================================ */

  function renderScholarshipMatches() {
    const container = document.getElementById("scholarshipResults");

    if (document.getElementById("wantsScholarship").value === "No") {
      container.innerHTML = `<div class="empty-state">Scholarship matching skipped.</div>`;
      return;
    }

    if (!selectedCourses.length) {
      container.innerHTML = `<div class="empty-state">Please select courses first before checking scholarships.</div>`;
      return;
    }

    const selectedCourseCodes = selectedCourses.map(c => c.courseCode);
    const selectedUniversityCodes = selectedCourses.map(c => c.universityCode);

    let matched = scholarships.filter(function (scholarship) {
      return (
        selectedCourseCodes.includes(scholarship.courseCode) ||
        selectedUniversityCodes.includes(scholarship.universityCode)
      );
    });

    matched = matched.slice(0, 8);

    if (!matched.length) {
      container.innerHTML = `
        <div class="empty-state">
          No direct scholarship record found for selected courses. Our advisor can still check manual eligibility.
        </div>
      `;
      return;
    }

    container.innerHTML = matched.map(function (item) {
      return `
        <div class="scholarship-card">
          <h3>${escapeHtml(item.Title || "Scholarship")}</h3>
          <strong>${escapeHtml(item.amountOrBenefit || "Benefit to be confirmed")}</strong>
          <p>
            Type: ${escapeHtml(item.scholarshipType || "Scholarship")}<br />
            Eligibility: ${escapeHtml(item.eligibilityCriteria || "Subject to university requirements")}
          </p>
        </div>
      `;
    }).join("");
  }

  /* ===============================
     REVIEW / SUBMIT
  ================================ */

  function renderReview() {
    const reviewBox = document.getElementById("reviewBox");

    const data = collectFormData();

    reviewBox.innerHTML = `
      <div class="review-section">
        <h3>Personal Information</h3>
        <p><strong>Name:</strong> ${escapeHtml(data.fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(data.phone)}</p>
        <p><strong>Nationality:</strong> ${escapeHtml(data.nationality)}</p>
        <p><strong>Location:</strong> ${escapeHtml(data.location || "-")}</p>
      </div>

      <div class="review-section">
        <h3>Academic Background</h3>
        <p><strong>Qualification:</strong> ${escapeHtml(data.qualification)}</p>
        <p><strong>Completion Year:</strong> ${escapeHtml(data.completionYear || "-")}</p>
        <p><strong>English:</strong> ${escapeHtml(data.englishLevel || "-")} ${escapeHtml(data.englishScore || "")}</p>
        <p><strong>Study Interest:</strong> ${escapeHtml(data.studyInterest || "-")}</p>
      </div>

      <div class="review-section">
        <h3>SPM Results</h3>
        ${
          data.spmSubjects.length
            ? data.spmSubjects.map(s => `<p>${escapeHtml(s.subject)}: <strong>${escapeHtml(s.grade)}</strong></p>`).join("")
            : "<p>No SPM subjects added.</p>"
        }
      </div>

      <div class="review-section">
        <h3>Preferred Courses</h3>
        ${
          data.selectedCourses.length
            ? data.selectedCourses.map((c, i) => `<p><strong>Choice ${i + 1}:</strong> ${escapeHtml(c.Title)} (${escapeHtml(c.universityCode)})</p>`).join("")
            : "<p>No course selected.</p>"
        }
      </div>

      <div class="review-section">
        <h3>Scholarship Interest</h3>
        <p><strong>Scholarship Matching:</strong> ${escapeHtml(data.wantsScholarship)}</p>
        <p><strong>Budget:</strong> ${escapeHtml(data.budgetRange || "-")}</p>
        <p><strong>Academic Strength:</strong> ${escapeHtml(data.academicStrength || "-")}</p>
        <p><strong>Accommodation:</strong> ${escapeHtml(data.needAccommodation || "-")}</p>
      </div>
    `;
  }

  function collectFormData() {
    return {
      fullName: getValue("fullName"),
      email: getValue("email"),
      phone: getValue("phone"),
      nationality: getValue("nationality"),
      location: getValue("location"),
      preferredIntake: getValue("preferredIntake"),

      qualification: getValue("qualification"),
      completionYear: getValue("completionYear"),
      englishLevel: getValue("englishLevel"),
      englishScore: getValue("englishScore"),
      studyInterest: getValue("studyInterest"),

      spmSubjects: spmSubjects.filter(s => s.subject && s.grade),
      selectedCourses,

      wantsScholarship: getValue("wantsScholarship"),
      budgetRange: getValue("budgetRange"),
      academicStrength: getValue("academicStrength"),
      needAccommodation: getValue("needAccommodation"),

      createdAt: new Date().toISOString()
    };
  }

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function submitLead(event) {
    event.preventDefault();

    if (!document.getElementById("consent").checked) {
      alert("Please tick the consent box before submitting.");
      return;
    }

    const data = collectFormData();

    const existingLeads = JSON.parse(localStorage.getItem("studentLeads") || "[]");
    existingLeads.push(data);
    localStorage.setItem("studentLeads", JSON.stringify(existingLeads));

    console.log("Student Lead Submitted:", data);

    const message = document.getElementById("submitMessage");
    message.style.display = "block";
    message.innerHTML = `
      ✅ Thank you, ${escapeHtml(data.fullName)}. Your profile has been submitted successfully.
      Our advisor can now follow up with your course and scholarship matching.
    `;

    document.getElementById("submitBtn").disabled = true;
    document.getElementById("submitBtn").textContent = "Submitted";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();