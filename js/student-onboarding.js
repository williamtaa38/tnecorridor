/* ===============================
   STUDENT ONBOARDING / LEAD FORM
   File: /js/student-onboarding.js

   Updated version:
   - Step 3 is no longer SPM-only.
   - It changes automatically based on qualification selected in Step 2.
   - Supports SPM, IGCSE/O-Level, UEC, STPM, A-Level, IB, Foundation, Diploma and Other.
   - Requires verified email registration before accessing onboarding.
   - Auto-fills verified name, email and interested field from registration.
================================ */

(function () {
  const APPLICATION_URL = "/pages/student-application.html";
  const SIGN_IN_URL = "/pages/sign-in.html";

  let redirectTimeoutId = null;
  let redirectCountdownId = null;

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
  let resultRows = [];
  let activeQualification = "";

  const commonSubjects = [
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

  const qualificationConfigs = {
    SPM: {
      title: "SPM Results",
      description: "Add your SPM subjects one by one. You can add or remove subjects anytime.",
      icon: "📘",
      addButtonText: "+ Add Subject",
      presetButtonText: "Add Science Preset",
      showPreset: true,
      itemLabel: "Subject",
      gradeLabel: "Grade",
      itemMode: "select",
      itemOptions: commonSubjects,
      gradeOptions: ["A+", "A", "A-", "B+", "B", "C+", "C", "D", "E", "G"],
      defaultRows: ["Bahasa Melayu", "English", "Mathematics", "Sejarah"],
      presetRows: ["Bahasa Melayu", "English", "Mathematics", "Additional Mathematics", "Physics", "Chemistry", "Biology", "Sejarah"],
      passGrades: ["A+", "A", "A-", "B+", "B", "C+", "C"],
      topGrades: ["A+", "A", "A-"],
      summaryLabels: ["Subjects Added", "Credits", "A Grades"],
      help: "For SPM, credit normally means grade C and above. This is for lead matching only; final admission is subject to university checking."
    },

    IGCSE: {
      title: "IGCSE / O-Level Results",
      description: "Add your IGCSE or O-Level subjects and grades.",
      icon: "📗",
      addButtonText: "+ Add Subject",
      presetButtonText: "Add Science Preset",
      showPreset: true,
      itemLabel: "Subject",
      gradeLabel: "Grade",
      itemMode: "select",
      itemOptions: [
        "English First Language",
        "English Second Language",
        "Mathematics",
        "Additional Mathematics",
        "Physics",
        "Chemistry",
        "Biology",
        "Business Studies",
        "Economics",
        "Accounting",
        "Computer Science",
        "Other"
      ],
      gradeOptions: ["A*", "A", "B", "C", "D", "E", "F", "G", "U"],
      defaultRows: ["English Second Language", "Mathematics"],
      presetRows: ["English Second Language", "Mathematics", "Additional Mathematics", "Physics", "Chemistry", "Biology"],
      passGrades: ["A*", "A", "B", "C"],
      topGrades: ["A*", "A"],
      summaryLabels: ["Subjects Added", "Credits", "A*/A Grades"],
      help: "For IGCSE/O-Level, this form treats A* to C as credit for quick matching."
    },

    UEC: {
      title: "UEC Results",
      description: "Add your UEC subjects and grades.",
      icon: "📙",
      addButtonText: "+ Add Subject",
      presetButtonText: "Add Science Preset",
      showPreset: true,
      itemLabel: "Subject",
      gradeLabel: "Grade",
      itemMode: "select",
      itemOptions: [
        "Chinese Language",
        "Malay Language",
        "English Language",
        "Mathematics",
        "Advanced Mathematics I",
        "Advanced Mathematics II",
        "Physics",
        "Chemistry",
        "Biology",
        "Business Studies",
        "Accounting",
        "Economics",
        "Other"
      ],
      gradeOptions: ["A1", "A2", "B3", "B4", "B5", "B6", "C7", "C8", "F9"],
      defaultRows: ["Chinese Language", "English Language", "Mathematics"],
      presetRows: ["Chinese Language", "English Language", "Mathematics", "Advanced Mathematics I", "Physics", "Chemistry", "Biology"],
      passGrades: ["A1", "A2", "B3", "B4", "B5", "B6"],
      topGrades: ["A1", "A2"],
      summaryLabels: ["Subjects Added", "B6 & Above", "A Grades"],
      help: "For UEC, this form treats A1 to B6 as strong passes for quick matching."
    },

    STPM: {
      title: "STPM Results",
      description: "Add your STPM subjects and grades.",
      icon: "📕",
      addButtonText: "+ Add STPM Subject",
      presetButtonText: "Add Science Preset",
      showPreset: true,
      itemLabel: "Subject",
      gradeLabel: "Grade",
      itemMode: "select",
      itemOptions: [
        "Pengajian Am",
        "Mathematics T",
        "Mathematics M",
        "Physics",
        "Chemistry",
        "Biology",
        "Economics",
        "Accounting",
        "Business Studies",
        "Sejarah",
        "Geography",
        "Other"
      ],
      gradeOptions: ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"],
      defaultRows: ["Pengajian Am"],
      presetRows: ["Pengajian Am", "Mathematics T", "Physics", "Chemistry", "Biology"],
      passGrades: ["A", "A-", "B+", "B", "B-", "C+", "C"],
      topGrades: ["A", "A-"],
      summaryLabels: ["Subjects Added", "Principal Passes", "A / A- Grades"],
      help: "For STPM, this form treats C and above as principal pass for quick matching."
    },

    "A-Level": {
      title: "A-Level Results",
      description: "Add your A-Level subjects and grades.",
      icon: "📒",
      addButtonText: "+ Add A-Level Subject",
      presetButtonText: "Add Science Preset",
      showPreset: true,
      itemLabel: "Subject",
      gradeLabel: "Grade",
      itemMode: "select",
      itemOptions: [
        "Mathematics",
        "Further Mathematics",
        "Physics",
        "Chemistry",
        "Biology",
        "Business",
        "Economics",
        "Accounting",
        "Law",
        "Psychology",
        "Computer Science",
        "Other"
      ],
      gradeOptions: ["A*", "A", "B", "C", "D", "E", "U"],
      defaultRows: ["Mathematics"],
      presetRows: ["Mathematics", "Physics", "Chemistry", "Biology"],
      passGrades: ["A*", "A", "B", "C", "D", "E"],
      topGrades: ["A*", "A"],
      summaryLabels: ["Subjects Added", "Passes", "A*/A Grades"],
      help: "For A-Level, enter each subject separately. You can add predicted grades if final results are not out yet."
    },

    "International Baccalaureate": {
      title: "International Baccalaureate Results",
      description: "Add IB subjects, levels and grades. You can also enter total IB points below.",
      icon: "🌍",
      addButtonText: "+ Add IB Subject",
      presetButtonText: "Add IB Preset",
      showPreset: true,
      itemLabel: "Subject / Level",
      gradeLabel: "Grade",
      itemMode: "select",
      itemOptions: [
        "English HL",
        "English SL",
        "Mathematics AA HL",
        "Mathematics AA SL",
        "Mathematics AI HL",
        "Mathematics AI SL",
        "Physics HL",
        "Physics SL",
        "Chemistry HL",
        "Chemistry SL",
        "Biology HL",
        "Biology SL",
        "Business Management HL",
        "Business Management SL",
        "Economics HL",
        "Economics SL",
        "Other"
      ],
      gradeOptions: ["7", "6", "5", "4", "3", "2", "1"],
      defaultRows: ["English SL", "Mathematics AA SL"],
      presetRows: ["English SL", "Mathematics AA SL", "Physics HL", "Chemistry HL", "Biology HL"],
      passGrades: ["7", "6", "5", "4"],
      topGrades: ["7", "6"],
      summaryLabels: ["Subjects Added", "Grade 4+", "Grade 6/7"],
      help: "For IB, add each subject and grade. Enter total points if available.",
      extras: [
        { id: "ibTotalPoints", label: "IB Total Points", type: "number", placeholder: "Example: 32" },
        { id: "ibAwardStatus", label: "Award Status", type: "select", options: ["", "Awarded", "Predicted", "Pending"] }
      ]
    },

    Foundation: {
      title: "Foundation Results",
      description: "Enter your Foundation programme information, CGPA and important subjects/modules.",
      icon: "🏫",
      addButtonText: "+ Add Module",
      presetButtonText: "Add Common Modules",
      showPreset: true,
      itemLabel: "Module / Subject",
      gradeLabel: "Grade / Result",
      itemMode: "text",
      itemOptions: [],
      gradeOptions: ["4.00 / A", "3.67 / A-", "3.33 / B+", "3.00 / B", "2.67 / B-", "2.33 / C+", "2.00 / C", "Pass", "Fail"],
      defaultRows: ["English", "Mathematics"],
      presetRows: ["English", "Mathematics", "Physics / Science", "Business / Computing Core"],
      passGrades: ["4.00 / A", "3.67 / A-", "3.33 / B+", "3.00 / B", "2.67 / B-", "2.33 / C+", "2.00 / C", "Pass"],
      topGrades: ["4.00 / A", "3.67 / A-"],
      summaryLabels: ["Modules Added", "Passed", "A Range"],
      help: "For Foundation, CGPA is usually more important. Add key modules only if you want advisor to check subject requirements.",
      extras: [
        { id: "institutionName", label: "Institution Name", type: "text", placeholder: "Example: Foundation in Science at ABC College" },
        { id: "programmeName", label: "Programme Name", type: "text", placeholder: "Example: Foundation in Science" },
        { id: "overallCGPA", label: "Overall CGPA / Percentage", type: "text", placeholder: "Example: CGPA 3.45 / 78%" },
        { id: "transcriptStatus", label: "Transcript Status", type: "select", options: ["", "Final Result", "Predicted / Current Result", "Pending"] }
      ]
    },

    Diploma: {
      title: "Diploma Results",
      description: "Enter your Diploma programme information, CGPA and relevant modules.",
      icon: "🎖️",
      addButtonText: "+ Add Module",
      presetButtonText: "Add Common Modules",
      showPreset: true,
      itemLabel: "Module / Subject",
      gradeLabel: "Grade / Result",
      itemMode: "text",
      itemOptions: [],
      gradeOptions: ["4.00 / A", "3.67 / A-", "3.33 / B+", "3.00 / B", "2.67 / B-", "2.33 / C+", "2.00 / C", "Pass", "Fail"],
      defaultRows: ["English", "Core Module"],
      presetRows: ["English", "Core Module 1", "Core Module 2", "Final Year Project / Internship"],
      passGrades: ["4.00 / A", "3.67 / A-", "3.33 / B+", "3.00 / B", "2.67 / B-", "2.33 / C+", "2.00 / C", "Pass"],
      topGrades: ["4.00 / A", "3.67 / A-"],
      summaryLabels: ["Modules Added", "Passed", "A Range"],
      help: "For Diploma progression, overall CGPA and programme relevance are usually important. Add key modules if the university requires subject checking.",
      extras: [
        { id: "institutionName", label: "Institution Name", type: "text", placeholder: "Example: ABC College" },
        { id: "programmeName", label: "Diploma Programme", type: "text", placeholder: "Example: Diploma in IT" },
        { id: "overallCGPA", label: "Overall CGPA / Percentage", type: "text", placeholder: "Example: CGPA 3.20 / 75%" },
        { id: "transcriptStatus", label: "Transcript Status", type: "select", options: ["", "Final Result", "Current Semester Result", "Pending"] }
      ]
    },

    Other: {
      title: "Other Certificate Results",
      description: "Enter your certificate name, overall result and subjects/modules if applicable.",
      icon: "🧾",
      addButtonText: "+ Add Subject / Module",
      presetButtonText: "Add Empty Rows",
      showPreset: true,
      itemLabel: "Subject / Module",
      gradeLabel: "Grade / Result",
      itemMode: "text",
      itemOptions: [],
      gradeOptions: ["Excellent", "Very Good", "Good", "Credit", "Pass", "Fail", "A", "B", "C", "D", "E", "Other"],
      defaultRows: ["Subject / Module 1"],
      presetRows: ["Subject / Module 1", "Subject / Module 2", "Subject / Module 3"],
      passGrades: ["Excellent", "Very Good", "Good", "Credit", "Pass", "A", "B", "C", "D", "E", "Other"],
      topGrades: ["Excellent", "Very Good", "A"],
      summaryLabels: ["Items Added", "Passed", "Strong Results"],
      help: "Use this for certificates not listed above. Advisor will manually check the correct admission route.",
      extras: [
        { id: "customQualificationName", label: "Certificate / Qualification Name", type: "text", placeholder: "Example: Australian Year 12 / Matriculation / SKM" },
        { id: "institutionName", label: "Institution Name", type: "text", placeholder: "Example: ABC College" },
        { id: "overallResult", label: "Overall Result / CGPA / Percentage", type: "text", placeholder: "Example: 80% / CGPA 3.50 / Pass" },
        { id: "resultStatus", label: "Result Status", type: "select", options: ["", "Final Result", "Predicted / Current Result", "Pending"] }
      ]
    }
  };

  document.addEventListener("DOMContentLoaded", async function () {
    const verifiedStudent = getVerifiedStudentAccount();

    if (!verifiedStudent) {
      window.location.href = "/pages/register.html";
      return;
    }

    bindEvents();
    prefillVerifiedStudent(verifiedStudent);

    await loadCsvData();

    populateFilters();
    applyQualificationTemplate(false);
    renderCourses();
    renderSelectedCourses();
    updateStepUI();
    updateCompletion();
  });

  function $(id) {
    return document.getElementById(id);
  }

  function getVerifiedStudentAccount() {
    try {
      const savedStudent = JSON.parse(localStorage.getItem("tneStudentAccount") || "{}");

      if (!savedStudent || !savedStudent.verified || !savedStudent.email) {
        return null;
      }

      return savedStudent;
    } catch (error) {
      console.error("Student account read error:", error);
      return null;
    }
  }

  function prefillVerifiedStudent(student) {
    const fullNameInput = $("fullName");
    const emailInput = $("email");
    const studyInterestInput = $("studyInterest");

    if (fullNameInput && student.name) {
      fullNameInput.value = student.name;
    }

    if (emailInput && student.email) {
      emailInput.value = student.email;
      emailInput.readOnly = true;
      emailInput.classList.add("readonly-input");
    }

    if (studyInterestInput && student.interest) {
      studyInterestInput.value = student.interest;
    }
  }

  function bindEvents() {
    $("nextBtn").addEventListener("click", nextStep);
    $("prevBtn").addEventListener("click", prevStep);
    $("studentLeadForm").addEventListener("submit", submitLead);

    $("qualification").addEventListener("change", function () {
      applyQualificationTemplate(true);
    });

    $("addResultRowBtn").addEventListener("click", function () {
      addResultRow();
    });

    $("addPresetBtn").addEventListener("click", addPresetRows);
    $("clearResultsBtn").addEventListener("click", clearResultRows);

    $("universityFilter").addEventListener("change", renderCourses);
    $("levelFilter").addEventListener("change", renderCourses);
    $("courseSearch").addEventListener("input", renderCourses);

    $("checkScholarshipBtn").addEventListener("click", renderScholarshipMatches);

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
        fetchCsvText(CSV_PATHS.universities),
        fetchCsvText(CSV_PATHS.courses),
        fetchCsvText(CSV_PATHS.entryRequirements),
        fetchCsvText(CSV_PATHS.scholarships)
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

  async function fetchCsvText(path) {
    const response = await fetch(path);

    if (!response.ok) {
      console.warn("CSV file not found or not accessible:", path);
      return "";
    }

    return response.text();
  }

  function parseCsv(text) {
    if (!text || !text.trim()) return [];

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
    const universityFilter = $("universityFilter");
    const levelFilter = $("levelFilter");

    universityFilter.innerHTML = `<option value="">All Universities</option>`;
    levelFilter.innerHTML = `<option value="">All Levels</option>`;

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

      if (currentStep === 3) {
        ensureQualificationFormReady();
      }

      if (currentStep === 6) {
        renderReview();
      }

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

    if (step > currentStep && !validateCurrentStep()) return;

    currentStep = step;

    if (currentStep === 3) {
      ensureQualificationFormReady();
    }

    if (currentStep === 6) {
      renderReview();
    }

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

    $("prevBtn").style.display = currentStep === 1 ? "none" : "inline-flex";
    $("nextBtn").style.display = currentStep === totalSteps ? "none" : "inline-flex";
    $("submitBtn").style.display = currentStep === totalSteps ? "inline-flex" : "none";
  }

  function updateCompletion() {
    const percent = Math.round((currentStep / totalSteps) * 100);

    $("completionPercent").textContent = percent;
    $("completionBar").style.width = percent + "%";
  }

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function validateCurrentStep() {
    if (currentStep === 1) {
      return validateRequired(["fullName", "email", "phone"]);
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
      const input = $(id);

      if (!input || !input.value.trim()) {
        if (input) input.focus();

        alert("Please complete the required field.");
        return false;
      }
    }

    return true;
  }

  /* ===============================
     DYNAMIC CERTIFICATE RESULTS
  ================================ */

  function normalizeQualification(value) {
    const text = String(value || "").trim();

    if (!text) return "";
    if (text === "IGCSE / O-Level") return "IGCSE";
    if (text === "International Baccalaureate") return "International Baccalaureate";
    if (text === "Other Certificate") return "Other";

    return qualificationConfigs[text] ? text : "Other";
  }

  function getResultConfig() {
    const qualification = normalizeQualification(getValue("qualification"));

    return qualificationConfigs[qualification] || null;
  }

  function ensureQualificationFormReady() {
    applyQualificationTemplate(false);

    const config = getResultConfig();

    if (!config) return;

    if (!resultRows.length) {
      addDefaultRowsForConfig(config);
    }
  }

  function applyQualificationTemplate(resetRows) {
    const qualification = normalizeQualification(getValue("qualification"));
    const config = qualificationConfigs[qualification];

    if (!config) {
      activeQualification = "";
      resultRows = [];

      $("qualificationNotice").style.display = "block";
      $("resultStepTitle").textContent = "Academic Results";
      $("resultStepDescription").textContent = "Select your qualification in Step 2 and this section will show the correct result form.";
      $("resultStepIcon").textContent = "📘";
      $("resultExtraFields").innerHTML = "";
      $("resultsTableHead").innerHTML = "";
      $("resultsRows").innerHTML = `<tr><td colspan="3" class="result-table-empty">Please select a qualification first.</td></tr>`;
      $("addResultRowBtn").textContent = "+ Add Subject";
      $("addPresetBtn").style.display = "none";

      updateResultSummary(null);
      return;
    }

    const qualificationChanged = activeQualification !== qualification;
    activeQualification = qualification;

    if (resetRows || qualificationChanged) {
      resultRows = [];
    }

    $("qualificationNotice").style.display = "none";
    $("resultStepTitle").textContent = config.title;
    $("resultStepDescription").textContent = config.description;
    $("resultStepIcon").textContent = config.icon;
    $("addResultRowBtn").textContent = config.addButtonText;
    $("addPresetBtn").textContent = config.presetButtonText || "Add Preset";
    $("addPresetBtn").style.display = config.showPreset ? "inline-flex" : "none";

    renderResultExtraFields(config);
    renderResultsTableHead(config);

    if (!resultRows.length) {
      addDefaultRowsForConfig(config);
    } else {
      renderResultRows();
    }
  }

  function renderResultExtraFields(config) {
    const container = $("resultExtraFields");
    const extras = config.extras || [];

    let html = "";

    if (config.help) {
      html += `
        <div class="field full">
          <div class="result-help">${escapeHtml(config.help)}</div>
        </div>
      `;
    }

    html += extras.map(function (field) {
      if (field.type === "select") {
        return `
          <div class="field">
            <label for="resultExtra_${escapeHtml(field.id)}">${escapeHtml(field.label)}</label>
            <select id="resultExtra_${escapeHtml(field.id)}" data-result-extra="${escapeHtml(field.id)}">
              ${(field.options || []).map(option => `
                <option value="${escapeHtml(option)}">${option ? escapeHtml(option) : "Select"}</option>
              `).join("")}
            </select>
          </div>
        `;
      }

      return `
        <div class="field">
          <label for="resultExtra_${escapeHtml(field.id)}">${escapeHtml(field.label)}</label>
          <input
            type="${escapeHtml(field.type || "text")}"
            id="resultExtra_${escapeHtml(field.id)}"
            data-result-extra="${escapeHtml(field.id)}"
            placeholder="${escapeHtml(field.placeholder || "")}"
          />
        </div>
      `;
    }).join("");

    container.innerHTML = html;
  }

  function renderResultsTableHead(config) {
    $("resultsTableHead").innerHTML = `
      <tr>
        <th>${escapeHtml(config.itemLabel)}</th>
        <th>${escapeHtml(config.gradeLabel)}</th>
        <th></th>
      </tr>
    `;
  }

  function addDefaultRowsForConfig(config) {
    resultRows = [];

    const defaults = config.defaultRows && config.defaultRows.length ? config.defaultRows : [""];

    defaults.forEach(function (item) {
      resultRows.push(createResultRow(item, ""));
    });

    renderResultRows();
  }

  function addPresetRows() {
    const config = getResultConfig();

    if (!config) {
      alert("Please select your qualification first.");
      return;
    }

    resultRows = [];

    const presetRows = config.presetRows && config.presetRows.length ? config.presetRows : config.defaultRows;

    presetRows.forEach(function (item) {
      resultRows.push(createResultRow(item, ""));
    });

    renderResultRows();
  }

  function clearResultRows() {
    resultRows = [];

    renderResultRows();
  }

  function addResultRow(item = "", grade = "") {
    const config = getResultConfig();

    if (!config) {
      alert("Please select your qualification first.");
      return;
    }

    resultRows.push(createResultRow(item, grade));
    renderResultRows();
  }

  function createResultRow(item, grade) {
    return {
      id: `row_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      item: item || "",
      grade: grade || ""
    };
  }

  function renderResultRows() {
    const config = getResultConfig();
    const tbody = $("resultsRows");

    if (!config) {
      tbody.innerHTML = `<tr><td colspan="3" class="result-table-empty">Please select a qualification first.</td></tr>`;
      updateResultSummary(null);
      return;
    }

    if (!resultRows.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="result-table-empty">No result added yet. Click ${escapeHtml(config.addButtonText)}.</td></tr>`;
      updateResultSummary(config);
      return;
    }

    tbody.innerHTML = resultRows.map(function (row) {
      const itemField = config.itemMode === "text"
        ? `
          <input
            type="text"
            value="${escapeHtml(row.item)}"
            placeholder="${escapeHtml(config.itemLabel)}"
            data-result-item="${escapeHtml(row.id)}"
          />
        `
        : `
          <select data-result-item="${escapeHtml(row.id)}">
            <option value="">Select ${escapeHtml(config.itemLabel.toLowerCase())}</option>
            ${config.itemOptions.map(item => `
              <option value="${escapeHtml(item)}" ${item === row.item ? "selected" : ""}>${escapeHtml(item)}</option>
            `).join("")}
          </select>
        `;

      return `
        <tr>
          <td>${itemField}</td>
          <td>
            <select data-result-grade="${escapeHtml(row.id)}">
              <option value="">Select ${escapeHtml(config.gradeLabel.toLowerCase())}</option>
              ${config.gradeOptions.map(grade => `
                <option value="${escapeHtml(grade)}" ${grade === row.grade ? "selected" : ""}>${escapeHtml(grade)}</option>
              `).join("")}
            </select>
          </td>
          <td>
            <button type="button" class="remove-row" data-remove-result="${escapeHtml(row.id)}">×</button>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll("[data-result-item]").forEach(function (input) {
      input.addEventListener("change", function () {
        const row = resultRows.find(r => r.id === input.dataset.resultItem);

        if (row) row.item = input.value;

        updateResultSummary(config);
      });

      input.addEventListener("input", function () {
        const row = resultRows.find(r => r.id === input.dataset.resultItem);

        if (row) row.item = input.value;

        updateResultSummary(config);
      });
    });

    tbody.querySelectorAll("[data-result-grade]").forEach(function (select) {
      select.addEventListener("change", function () {
        const row = resultRows.find(r => r.id === select.dataset.resultGrade);

        if (row) row.grade = select.value;

        updateResultSummary(config);
      });
    });

    tbody.querySelectorAll("[data-remove-result]").forEach(function (button) {
      button.addEventListener("click", function () {
        resultRows = resultRows.filter(r => r.id !== button.dataset.removeResult);

        renderResultRows();
      });
    });

    updateResultSummary(config);
  }

  function updateResultSummary(config) {
    const labels = config ? config.summaryLabels : ["Items Added", "Passed", "Strong Results"];
    const completed = config ? resultRows.filter(r => r.item && r.grade) : [];
    const passCount = config ? completed.filter(r => config.passGrades.includes(r.grade)).length : 0;
    const topCount = config ? completed.filter(r => config.topGrades.includes(r.grade)).length : 0;

    $("summaryOne").textContent = completed.length;
    $("summaryTwo").textContent = passCount;
    $("summaryThree").textContent = topCount;
    $("summaryOneLabel").textContent = labels[0];
    $("summaryTwoLabel").textContent = labels[1];
    $("summaryThreeLabel").textContent = labels[2];
  }

  function getResultExtraData() {
    const extras = {};

    document.querySelectorAll("[data-result-extra]").forEach(function (input) {
      extras[input.dataset.resultExtra] = input.value.trim();
    });

    return extras;
  }

  /* ===============================
     COURSES
  ================================ */

  function renderCourses() {
    const container = $("courseResults");
    const universityCode = $("universityFilter").value;
    const level = $("levelFilter").value;
    const search = $("courseSearch").value.toLowerCase();

    if (!courses.length) {
      container.innerHTML = `
        <div class="empty-state">
          No course CSV data loaded yet. Make sure your CSV files are inside the /public/data/ folder.
        </div>
      `;
      return;
    }

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
    const container = $("selectedCourses");

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
    const container = $("scholarshipResults");

    if ($("wantsScholarship").value === "No") {
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
    const reviewBox = $("reviewBox");
    const data = collectFormData();

    const resultTitle = data.qualification === "Other" && data.certificateResults.extra.customQualificationName
      ? data.certificateResults.extra.customQualificationName
      : data.qualification;

    reviewBox.innerHTML = `
      <div class="review-section">
        <h3>Verified Student Account</h3>
        <p><strong>Email Verified:</strong> ${data.studentAccount.emailVerified ? "Yes" : "No"}</p>
        <p><strong>Registered Email:</strong> ${escapeHtml(data.studentAccount.registeredEmail || "-")}</p>
      </div>

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
        <p><strong>Qualification:</strong> ${escapeHtml(resultTitle)}</p>
        <p><strong>Completion Year:</strong> ${escapeHtml(data.completionYear || "-")}</p>
        <p><strong>English:</strong> ${escapeHtml(data.englishLevel || "-")} ${escapeHtml(data.englishScore || "")}</p>
        <p><strong>Study Interest:</strong> ${escapeHtml(data.studyInterest || "-")}</p>
      </div>

      <div class="review-section">
        <h3>Certificate Results</h3>
        ${renderExtraReview(data.certificateResults.extra)}
        ${
          data.certificateResults.rows.length
            ? data.certificateResults.rows.map(s => `<p>${escapeHtml(s.item)}: <strong>${escapeHtml(s.grade)}</strong></p>`).join("")
            : "<p>No result rows added.</p>"
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

  function renderExtraReview(extra) {
    const entries = Object.entries(extra || {}).filter(([, value]) => value);

    if (!entries.length) return "";

    return entries.map(function ([key, value]) {
      return `<p><strong>${escapeHtml(formatLabel(key))}:</strong> ${escapeHtml(value)}</p>`;
    }).join("");
  }

  function formatLabel(key) {
    return String(key)
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, char => char.toUpperCase());
  }

  function collectFormData() {
    const verifiedStudent = getVerifiedStudentAccount();
    const qualification = normalizeQualification(getValue("qualification"));

    const certificateResults = {
      qualification,
      extra: getResultExtraData(),
      rows: resultRows
        .filter(s => s.item && s.grade)
        .map(s => ({
          item: s.item,
          grade: s.grade
        }))
    };

    return {
      studentAccount: verifiedStudent
        ? {
            emailVerified: true,
            registeredEmail: verifiedStudent.email,
            registeredAt: verifiedStudent.registeredAt || ""
          }
        : {
            emailVerified: false,
            registeredEmail: "",
            registeredAt: ""
          },

      fullName: getValue("fullName"),
      email: getValue("email"),
      phone: getValue("phone"),
      nationality: getValue("nationality"),
      location: getValue("location"),
      preferredIntake: getValue("preferredIntake"),

      qualification,
      completionYear: getValue("completionYear"),
      englishLevel: getValue("englishLevel"),
      englishScore: getValue("englishScore"),
      studyInterest: getValue("studyInterest"),

      certificateResults,

      spmSubjects: qualification === "SPM"
        ? certificateResults.rows.map(row => ({
            subject: row.item,
            grade: row.grade
          }))
        : [],

      selectedCourses,

      wantsScholarship: getValue("wantsScholarship"),
      budgetRange: getValue("budgetRange"),
      academicStrength: getValue("academicStrength"),
      needAccommodation: getValue("needAccommodation"),

      applicationStatus: "submitted",
      createdAt: new Date().toISOString()
    };
  }

  function getValue(id) {
    const el = $(id);

    return el ? el.value.trim() : "";
  }

  async function submitLead(event) {
    event.preventDefault();

    const consent = $("consent");
    const submitButton = $("submitBtn");
    const message = $("submitMessage");

    if (!consent?.checked) {
      alert("Please tick the consent box before submitting.");
      return;
    }

    if (!window.tneSupabase) {
      message.style.display = "block";
      message.textContent =
        "Unable to connect to Supabase. Please refresh the page and try again.";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
      const supabase = window.tneSupabase;

      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.user) {
        localStorage.removeItem("tneSignedIn");
        localStorage.removeItem("tneCurrentStudentEmail");

        message.style.display = "block";
        message.textContent =
          "Your login session has expired. Redirecting you to sign in...";

        window.setTimeout(function () {
          window.location.replace(SIGN_IN_URL);
        }, 1500);

        return;
      }

      const data = collectFormData();
      const now = new Date().toISOString();

      /*
       * Mark the authenticated student's onboarding as complete.
       * sign-in.js reads this value to decide whether the student
       * should open onboarding or the application portal.
       */
      const {
        data: updatedProfile,
        error: profileError
      } = await supabase
        .from("profiles")
        .update({
          full_name: data.fullName,
          onboarding_completed: true,
          updated_at: now
        })
        .eq("id", session.user.id)
        .select("id, onboarding_completed")
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!updatedProfile) {
        throw new Error(
          "Your Supabase profile record could not be found. Please contact support."
        );
      }

      /*
       * Keep the existing localStorage record because the current
       * student application page still reads this onboarding data.
       */
      let existingLeads = [];

      try {
        const savedLeads = JSON.parse(
          localStorage.getItem("studentLeads") || "[]"
        );

        existingLeads = Array.isArray(savedLeads) ? savedLeads : [];
      } catch (storageError) {
        console.warn("Unable to read existing student leads:", storageError);
      }

      existingLeads.push({
        ...data,
        userId: session.user.id,
        onboardingCompleted: true,
        submittedAt: now
      });

      localStorage.setItem(
        "studentLeads",
        JSON.stringify(existingLeads)
      );

      /*
       * Update the local account reference used by the existing site UI.
       * Supabase remains the real authentication source.
       */
      try {
        const savedAccount = JSON.parse(
          localStorage.getItem("tneStudentAccount") || "{}"
        );

        localStorage.setItem(
          "tneStudentAccount",
          JSON.stringify({
            ...savedAccount,
            id: session.user.id,
            name: data.fullName,
            email: session.user.email || data.email,
            verified: Boolean(session.user.email_confirmed_at),
            onboardingCompleted: true,
            onboarding_completed: true,
            interest: data.studyInterest || savedAccount.interest || ""
          })
        );
      } catch (accountError) {
        console.warn(
          "Unable to update the local student account reference:",
          accountError
        );
      }

      localStorage.setItem("tneSignedIn", "yes");
      localStorage.setItem(
        "tneCurrentStudentEmail",
        String(session.user.email || data.email || "").toLowerCase()
      );

      console.log("Student onboarding submitted:", data);

      submitButton.textContent = "Submitted";

      let remainingSeconds = 5;

      message.style.display = "block";
      message.innerHTML = `
        ✅ Thank you, ${escapeHtml(data.fullName)}. Your profile has been
        submitted successfully. You will be redirected to your student
        application portal in
        <strong id="redirectCountdown">${remainingSeconds}</strong>
        seconds.
      `;

      const countdownElement = $("redirectCountdown");

      if (redirectCountdownId) {
        window.clearInterval(redirectCountdownId);
      }

      if (redirectTimeoutId) {
        window.clearTimeout(redirectTimeoutId);
      }

      redirectCountdownId = window.setInterval(function () {
        remainingSeconds -= 1;

        if (countdownElement && remainingSeconds > 0) {
          countdownElement.textContent = String(remainingSeconds);
        }

        if (remainingSeconds <= 0) {
          window.clearInterval(redirectCountdownId);
          redirectCountdownId = null;
        }
      }, 1000);

      redirectTimeoutId = window.setTimeout(function () {
        if (redirectCountdownId) {
          window.clearInterval(redirectCountdownId);
          redirectCountdownId = null;
        }

        window.location.replace(APPLICATION_URL);
      }, 5000);
    } catch (error) {
      console.error("Student onboarding submission error:", error);

      message.style.display = "block";
      message.textContent =
        error?.message ||
        "Unable to submit your profile. Please try again.";

      submitButton.disabled = false;
      submitButton.textContent = "Submit Lead";
    }
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