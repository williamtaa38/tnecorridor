// programmes.js
// Programme page specific scripts only.
// Shared header, footer, active menu, mobile menu and sign-in are handled by layout.js.

document.addEventListener("DOMContentLoaded", () => {
  /* =========================================================
     ELEMENTS
  ========================================================= */

  const stateSelect = document.getElementById("stateSelect");
  const universitySelect = document.getElementById("universitySelect");
  const courseSelect = document.getElementById("courseSelect");
  const intakeSelect = document.getElementById("intakeSelect");
  const searchBtn = document.getElementById("searchBtn");
  const browseTopBtn = document.getElementById("browseTopBtn");

  const courseResults = document.getElementById("courseResults");
  const scholarshipResults = document.getElementById("scholarshipResults");

  let receivedExternalFilters = false;

  /* =========================================================
     COURSE DATA
  ========================================================= */

  const courseData = {
    foundation: [
      {
        university: "University of Southampton Malaysia",
        course: "Business Foundation Year",
        duration: "1 Year",
        intake: "April, July & September",
        state: "Johor",
        pathway: "Foundation route into Southampton business degrees",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Southampton Malaysia",
        course: "Computer Science Foundation Year",
        duration: "1 Year",
        intake: "April, July & September",
        state: "Johor",
        pathway: "Foundation route into BSc Computer Science",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Southampton Malaysia",
        course: "Engineering Foundation Year",
        duration: "1 Year",
        intake: "April, July & September",
        state: "Johor",
        pathway: "Foundation route into engineering degrees",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Reading Malaysia",
        course: "International Foundation Programme",
        duration: "12 Months",
        intake: "April and September",
        state: "Johor",
        pathway: "Foundation route to Reading Malaysia or Reading UK degrees",
        link: "/pages/programmes.html"
      },
      {
        university: "Newcastle University Medicine Malaysia",
        course: "Foundation in Science",
        duration: "1 Year",
        intake: "May and September",
        state: "Johor",
        pathway: "Foundation route for health science and medical-related study",
        link: "/pages/programmes.html"
      },
      {
        university: "MDIS Malaysia",
        course: "Foundation in Business",
        duration: "1 Year",
        intake: "Jan, Jun, Sep",
        state: "Johor",
        pathway: "Foundation pathway into business-related programmes",
        link: "/pages/programmes.html"
      }
    ],

    engineering: [
      {
        university: "University of Southampton Malaysia",
        course: "Engineering Foundation Year",
        duration: "1 Year",
        intake: "April, July & September",
        state: "Johor",
        pathway: "Foundation route into Southampton engineering degrees",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Southampton Malaysia",
        course: "MEng Mechanical Engineering",
        duration: "4 Years",
        intake: "September",
        state: "Johor",
        pathway: "Available as full Malaysia pathway or Malaysia + UK pathway option",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Southampton Malaysia",
        course: "MEng Electrical and Electronic Engineering",
        duration: "4 Years",
        intake: "September",
        state: "Johor",
        pathway: "Engineering degree with Malaysia and UK pathway options",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Southampton Malaysia",
        course: "MEng Aeronautics and Astronautics",
        duration: "2+2 Pathway",
        intake: "September",
        state: "Johor",
        pathway: "Study part of the engineering pathway in Malaysia and continue in the UK",
        link: "/pages/programmes.html"
      }
    ],

    medicine: [
      {
        university: "Newcastle University Medicine Malaysia",
        course: "MBBS Honours",
        duration: "5 Years",
        intake: "Please confirm latest NUMed intake",
        state: "Johor",
        pathway: "Medicine degree delivered at NUMed Malaysia",
        link: "/pages/programmes.html"
      },
      {
        university: "Newcastle University Medicine Malaysia",
        course: "BSc Honours Biomedical Sciences",
        duration: "3 Years",
        intake: "Please confirm latest NUMed intake",
        state: "Johor",
        pathway: "Biomedical and health science pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "Newcastle University Medicine Malaysia",
        course: "Foundation in Science",
        duration: "1 Year",
        intake: "May and September",
        state: "Johor",
        pathway: "Foundation route before health science or medical-related progression",
        link: "/pages/programmes.html"
      }
    ],

    computer: [
      {
        university: "University of Southampton Malaysia",
        course: "BSc Computer Science",
        duration: "3 Years",
        intake: "September",
        state: "Johor",
        pathway: "Computer science degree at Southampton Malaysia",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Southampton Malaysia",
        course: "Computer Science Foundation Year",
        duration: "1 Year",
        intake: "April, July & September",
        state: "Johor",
        pathway: "Foundation route into BSc Computer Science",
        link: "/pages/programmes.html"
      },
      {
        university: "MDIS Malaysia",
        course: "Diploma in Information Technology",
        duration: "Diploma Level",
        intake: "Jan, Jun, Sep",
        state: "Johor",
        pathway: "IT diploma pathway",
        link: "/pages/programmes.html"
      }
    ],

    business: [
      {
        university: "University of Southampton Malaysia",
        course: "BSc Accounting and Finance",
        duration: "3 Years",
        intake: "September",
        state: "Johor",
        pathway: "Accounting and finance degree pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Southampton Malaysia",
        course: "BSc Business Analytics",
        duration: "3 Years",
        intake: "September",
        state: "Johor",
        pathway: "Business and data-focused pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Southampton Malaysia",
        course: "BSc Business Management",
        duration: "3 Years",
        intake: "September",
        state: "Johor",
        pathway: "Business management degree pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Southampton Malaysia",
        course: "BSc Economics and Actuarial Science",
        duration: "3 Years",
        intake: "September",
        state: "Johor",
        pathway: "Economics, mathematics and actuarial-related pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Southampton Malaysia",
        course: "BSc Economics and Finance",
        duration: "3 Years",
        intake: "September",
        state: "Johor",
        pathway: "Economics and finance pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Southampton Malaysia",
        course: "BSc Finance and Financial Technology",
        duration: "3 Years",
        intake: "September",
        state: "Johor",
        pathway: "Finance and fintech pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Reading Malaysia",
        course: "Business and Management",
        duration: "Undergraduate Degree",
        intake: "Please confirm latest intake",
        state: "Johor",
        pathway: "Henley Business School-linked business pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Reading Malaysia",
        course: "Accounting and Finance",
        duration: "Undergraduate Degree",
        intake: "Please confirm latest intake",
        state: "Johor",
        pathway: "Accounting and finance pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Reading Malaysia",
        course: "Finance and Business Management",
        duration: "Undergraduate Degree",
        intake: "Please confirm latest intake",
        state: "Johor",
        pathway: "Finance and management pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "MDIS Malaysia",
        course: "Diploma in Business Management",
        duration: "Diploma Level",
        intake: "Jan, Jun, Sep",
        state: "Johor",
        pathway: "Business management diploma pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "MDIS Malaysia",
        course: "Diploma in Accounting",
        duration: "Diploma Level",
        intake: "Jan, Jun, Sep",
        state: "Johor",
        pathway: "Accounting diploma pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "MDIS Malaysia",
        course: "Diploma in Finance",
        duration: "Diploma Level",
        intake: "Jan, Jun, Sep",
        state: "Johor",
        pathway: "Finance diploma pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "MDIS Malaysia",
        course: "Diploma in International Business",
        duration: "Diploma Level",
        intake: "Jan, Jun, Sep",
        state: "Johor",
        pathway: "International business diploma pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "MDIS Malaysia",
        course: "Diploma in Marketing",
        duration: "Diploma Level",
        intake: "Jan, Jun, Sep",
        state: "Johor",
        pathway: "Marketing diploma pathway",
        link: "/pages/programmes.html"
      }
    ],

    law: [
      {
        university: "University of Reading Malaysia",
        course: "Bachelor of Laws LLB",
        duration: "3 Years",
        intake: "May and September",
        state: "Johor",
        pathway: "Law degree pathway",
        link: "/pages/programmes.html"
      }
    ],

    psychology: [
      {
        university: "University of Reading Malaysia",
        course: "Psychology",
        duration: "Undergraduate Degree",
        intake: "Please confirm latest intake",
        state: "Johor",
        pathway: "Psychology and human behaviour pathway",
        link: "/pages/programmes.html"
      }
    ],

    builtEnvironment: [
      {
        university: "University of Reading Malaysia",
        course: "Real Estate",
        duration: "Undergraduate Degree",
        intake: "Please confirm latest intake",
        state: "Johor",
        pathway: "Property, valuation and real estate pathway",
        link: "/pages/programmes.html"
      },
      {
        university: "University of Reading Malaysia",
        course: "Quantity Surveying",
        duration: "3 Years",
        intake: "Please confirm latest intake",
        state: "Johor",
        pathway: "Construction cost and project pathway",
        link: "/pages/programmes.html"
      }
    ],

    media: [
      {
        university: "MDIS Malaysia",
        course: "Bachelor of Arts Honours Media, Culture and Communication",
        duration: "Degree Level",
        intake: "Please confirm latest intake",
        state: "Johor",
        pathway: "Media, culture and communication pathway",
        link: "/pages/programmes.html"
      }
    ]
  };

  /* =========================================================
     PROGRAMME DETAILS
  ========================================================= */

  const programmeDetails = {
    "Business Foundation Year": {
      title: "Business Foundation Year",
      university: "University of Southampton Malaysia",
      duration: "1 Year",
      intake: "April, July & September",
      delivery: "Full time in Malaysia",
      intro: "A foundation pathway preparing students for Southampton business degrees.",
      fees: {
        local: "RM27,500",
        international: "RM33,000"
      },
      entry: [
        "SPM / IGCSE: BCCCC with Mathematics at B or higher.",
        "English requirement may apply depending on qualification.",
        "Other equivalent qualifications may be considered."
      ],
      structure: [
        "Critical Thinking and Research Skills",
        "Introduction to Accounting",
        "Mathematics and Statistics",
        "English for Academic Study",
        "Introduction to Business",
        "Introduction to Economics"
      ],
      pathway: [
        "BSc Accounting and Finance",
        "BSc Business Analytics",
        "BSc Business Management",
        "BSc Economics and Actuarial Science",
        "BSc Finance and Financial Technology"
      ]
    },

    "Computer Science Foundation Year": {
      title: "Computer Science Foundation Year",
      university: "University of Southampton Malaysia",
      duration: "1 Year",
      intake: "April, July & September",
      delivery: "Full time in Malaysia",
      intro: "A foundation route into BSc Computer Science with computing, mathematics and programming preparation.",
      fees: {
        local: "RM32,500",
        international: "RM39,200"
      },
      entry: [
        "SPM / IGCSE or equivalent qualification.",
        "Strong Mathematics background recommended.",
        "English requirement may apply."
      ],
      structure: [
        "Programming and Coursework",
        "Theoretical Aspects of Computing",
        "Mathematics",
        "Computer Systems and Applications",
        "Web Development",
        "Fundamentals of Computing"
      ],
      pathway: ["BSc Computer Science"]
    },

    "Engineering Foundation Year": {
      title: "Engineering Foundation Year",
      university: "University of Southampton Malaysia",
      duration: "1 Year",
      intake: "April, July & September",
      delivery: "Full time in Malaysia",
      intro: "A foundation pathway covering mathematics, mechanics, programming, electricity and engineering principles.",
      fees: {
        local: "RM32,500 per annum",
        international: "RM39,200 per annum"
      },
      entry: [
        "SPM / IGCSE or equivalent qualification.",
        "Mathematics and Physics are normally important for engineering progression.",
        "English requirement may apply."
      ],
      structure: [
        "Computer Applications",
        "Engineering Principles",
        "Mechanical Science",
        "Electricity and Electronics",
        "Fundamentals of Science and Engineering",
        "Mathematics for Science and Engineering"
      ],
      pathway: [
        "MEng Aeronautics and Astronautics",
        "MEng Electrical and Electronic Engineering",
        "MEng Mechanical Engineering"
      ]
    },

    "International Foundation Programme": {
      title: "International Foundation Programme",
      university: "University of Reading Malaysia",
      duration: "12 Months",
      intake: "April and September",
      delivery: "Full time in Malaysia",
      intro: "A foundation programme preparing students for Reading Malaysia or Reading UK undergraduate pathways.",
      fees: {
        local: "RM26,000 per annum",
        international: "RM31,000 per annum"
      },
      entry: [
        "SPM: minimum 5 credits.",
        "IGCSE / O-Level / GCSE: minimum 5 credits.",
        "Mathematics or Science credits may be required for selected pathways."
      ],
      structure: [
        "Academic Skills",
        "Enhanced Interpersonal Skills",
        "Core Mathematics",
        "Quantitative Methods",
        "Business Studies",
        "Economics",
        "Psychology or Law pathway modules"
      ],
      pathway: [
        "Business, Accounting and Finance",
        "Psychology",
        "Law",
        "Real Estate",
        "Quantity Surveying"
      ]
    },

    "Foundation in Science": {
      title: "Foundation in Science",
      university: "Newcastle University Medicine Malaysia",
      duration: "12 Months",
      intake: "May and September",
      delivery: "Full time in Malaysia",
      intro: "A pre-university course for medicine, biomedical sciences and health science-related progression.",
      fees: {
        local: "RM27,580",
        international: "RM37,371.36 including 6% SST"
      },
      entry: [
        "Minimum five strong credits in science-related subjects.",
        "Biology, Chemistry, Physics, Mathematics or Additional Mathematics normally required.",
        "English requirement applies."
      ],
      structure: [
        "English for Academic Purposes",
        "Foundation Biology",
        "Foundation Chemistry",
        "Foundation Mathematics and Statistics",
        "Foundation Physics",
        "Study Skills and ICT"
      ],
      pathway: [
        "Progression to MBBS subject to interview and required grades.",
        "Progression to BSc Biomedical Sciences subject to requirements."
      ]
    },

    "Foundation in Business": {
      title: "Foundation in Business",
      university: "MDIS Malaysia",
      duration: "1 Year",
      intake: "Jan, Jun, Sep",
      delivery: "Full time in Malaysia",
      intro: "A foundation programme building English, communication, business and management knowledge before degree-level study.",
      fees: {
        local: "RM18,000",
        international: "RM29,850"
      },
      entry: [
        "SPM or equivalent: minimum 5 credits.",
        "UEC: minimum Grade B in 3 subjects.",
        "Other equivalent qualifications may be considered."
      ],
      structure: [
        "Effective English",
        "Advanced English",
        "Business Statistics",
        "Computer Applications",
        "Fundamentals of Business Studies",
        "Basic Accounting",
        "Basic Marketing",
        "Introduction to Finance"
      ],
      pathway: [
        "Business Management",
        "International Business",
        "Accounting",
        "Finance",
        "Marketing",
        "Tourism Management",
        "Mass Communications",
        "Information Technology"
      ]
    }
  };

  /* =========================================================
     SCHOLARSHIP DATA
  ========================================================= */

  const scholarshipData = {
    uosm: {
      title: "University of Southampton Malaysia Scholarships",
      note: "Scholarship values and eligibility may change by intake. Students should confirm the latest requirements with the university before applying.",
      scholarships: [
        {
          tag: "Foundation",
          name: "Foundation Scholarships",
          value: "For Foundation Year applicants",
          details: "Available for eligible Malaysian and non-Malaysian Foundation applicants."
        },
        {
          tag: "Undergraduate",
          name: "Undergraduate Scholarships",
          value: "Academic excellence awards",
          details: "Available to undergraduate applicants based on academic achievement."
        },
        {
          tag: "Progression",
          name: "Academic Excellence Progression Scholarship",
          value: "Up to 100% tuition fee waiver",
          details: "For top-performing UoSM Foundation students progressing to undergraduate study."
        },
        {
          tag: "Family",
          name: "Sibling Bursary",
          value: "10% reduction",
          details: "For siblings of current students or alumni, subject to terms."
        }
      ]
    },

    numed: {
      title: "Newcastle University Medicine Malaysia Scholarships",
      note: "NUMed scholarship and funding options can be programme-specific. Students should confirm directly with NUMed before applying.",
      scholarships: [
        {
          tag: "Foundation",
          name: "Foundation Academic Excellence Award",
          value: "Up to 100% Foundation fee discount",
          details: "For high-achieving students who meet NUMed academic criteria."
        },
        {
          tag: "Progression",
          name: "NUMed Foundation Progression Discount",
          value: "Offset against first-year tuition",
          details: "For eligible students progressing from NUMed Foundation in Science."
        },
        {
          tag: "External",
          name: "Yayasan Tunku Abdul Rahman Scholarship",
          value: "Full tuition and allowances may be available",
          details: "External scholarship for high-potential Malaysian youth."
        }
      ]
    },

    reading: {
      title: "University of Reading Malaysia Scholarships",
      note: "University of Reading Malaysia scholarship terms may change by intake. Students should check deadlines and criteria before applying.",
      scholarships: [
        {
          tag: "SPM Trial",
          name: "SPM Trial Results Scholarship",
          value: "40%, 30% or 25%",
          details: "For eligible SPM trial result holders."
        },
        {
          tag: "Merit",
          name: "High Achiever's Scholarship",
          value: "Up to 30% of total programme tuition fees",
          details: "Awarded to students with strong academic performance."
        },
        {
          tag: "Foundation",
          name: "International Foundation Programme Scholarship",
          value: "30%, 25% or 20%",
          details: "Scholarship level depends on academic qualification and result level."
        },
        {
          tag: "Provost",
          name: "Provost Award - Holistic Excellence Award",
          value: "100%",
          details: "For exceptional students with academic strength, leadership and achievements."
        }
      ]
    },

    mdis: {
      title: "MDIS Malaysia Scholarships",
      note: "MDIS scholarship information can change by intake and campaign. Students should confirm the latest terms directly with MDIS Malaysia.",
      scholarships: [
        {
          tag: "Scholarship",
          name: "Scholarship Scheme 2026",
          value: "Award value depends on qualification and result",
          details: "For eligible prospective students, subject to MDIS terms."
        },
        {
          tag: "Trial Result",
          name: "Trial Result Scholarship Scheme 2026",
          value: "Based on trial examination results",
          details: "For eligible students applying with trial results."
        },
        {
          tag: "Financial Aid",
          name: "PTPTN Study Loan",
          value: "Study loan option",
          details: "MDIS Malaysia references PTPTN study loan availability."
        }
      ]
    }
  };

  /* =========================================================
     BASIC HELPERS
  ========================================================= */

  function getAllCourses() {
    return Object.values(courseData).flat();
  }

  function getUniqueOptions(items, key) {
    return [...new Set(items.map((item) => item[key]).filter(Boolean))]
      .sort()
      .map((value) => ({
        value,
        label: value
      }));
  }

  function getCourseCategoryOptions() {
    return Object.keys(courseData).map((key) => ({
      value: key,
      label: formatCategoryName(key)
    }));
  }

  function formatCategoryName(key) {
    const names = {
      foundation: "Foundation",
      engineering: "Engineering",
      medicine: "Medicine",
      computer: "Computer Science / IT",
      business: "Business / Accounting / Finance",
      law: "Law",
      psychology: "Psychology",
      builtEnvironment: "Built Environment",
      media: "Media / Communication"
    };

    return names[key] || key;
  }

  function fillSelect(selectEl, placeholder, items) {
    if (!selectEl) return;

    const currentValue = selectEl.value;
    selectEl.innerHTML = "";

    const firstOption = document.createElement("option");
    firstOption.value = "";
    firstOption.textContent = placeholder;
    selectEl.appendChild(firstOption);

    (items || []).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value || "";
      option.textContent = item.label || item.value || "";
      selectEl.appendChild(option);
    });

    const canRestore = Array.from(selectEl.options).some(
      (option) => option.value === currentValue
    );

    if (canRestore) {
      selectEl.value = currentValue;
    }
  }

  function postToWix(payload) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, "*");
    }
  }

  function getSelectedFilters() {
    return {
      state: stateSelect ? stateSelect.value : "",
      university: universitySelect ? universitySelect.value : "",
      course: courseSelect ? courseSelect.value : "",
      intake: intakeSelect ? intakeSelect.value : ""
    };
  }

  function matchesIntake(course, selectedIntake) {
    if (!selectedIntake) return true;

    const courseIntake = String(course.intake || "").toLowerCase();
    const selected = String(selectedIntake).toLowerCase();

    return courseIntake.includes(selected);
  }

  function getDetailForCourse(course) {
    const existingDetail = programmeDetails[course.course];

    if (existingDetail) return existingDetail;

    return {
      title: course.course,
      university: course.university,
      duration: course.duration,
      intake: course.intake || "Please confirm latest intake",
      delivery: "Full time in Malaysia",
      intro: course.pathway,
      fees: {
        local: "Please confirm latest fee",
        international: "Please confirm latest fee"
      },
      entry: [
        "Entry requirements depend on qualification and programme.",
        "English requirement may apply.",
        "Final admission is subject to university approval."
      ],
      structure: [
        "Programme structure will be confirmed by the university.",
        "Students should check the latest module list before applying."
      ],
      pathway: [
        course.pathway,
        "Further study or career progression depends on student performance and pathway."
      ]
    };
  }

  function renderList(items) {
    return (items || []).map((item) => `<li>${item}</li>`).join("");
  }

  function safeText(value) {
    return String(value || "");
  }

  /* =========================================================
     STATIC FILTERS FOR VERCEL
  ========================================================= */

  function initializeStaticFilters() {
    const allCourses = getAllCourses();

    fillSelect(stateSelect, "State", getUniqueOptions(allCourses, "state"));
    fillSelect(universitySelect, "University", getUniqueOptions(allCourses, "university"));
    fillSelect(courseSelect, "Course", getCourseCategoryOptions());

    fillSelect(intakeSelect, "Intake", [
      { value: "January", label: "January" },
      { value: "April", label: "April" },
      { value: "May", label: "May" },
      { value: "June", label: "June" },
      { value: "July", label: "July" },
      { value: "September", label: "September" }
    ]);
  }

  /* =========================================================
     WIX MESSAGE SUPPORT
  ========================================================= */

  window.addEventListener("message", (event) => {
    const msg = event.data || {};

    if (msg.type === "INIT_FILTERS") {
      receivedExternalFilters = true;
      fillSelect(stateSelect, "State", msg.states || []);
      fillSelect(universitySelect, "University", msg.universities || []);
      fillSelect(courseSelect, "Course", msg.courses || []);
      fillSelect(intakeSelect, "Intake", msg.intakes || []);
    }

    if (msg.type === "UPDATE_UNIVERSITIES") {
      receivedExternalFilters = true;
      fillSelect(universitySelect, "University", msg.universities || []);
    }

    if (msg.type === "UPDATE_COURSES") {
      receivedExternalFilters = true;
      fillSelect(courseSelect, "Course", msg.courses || []);
    }

    if (msg.type === "UPDATE_INTAKES") {
      receivedExternalFilters = true;
      fillSelect(intakeSelect, "Intake", msg.intakes || []);
    }

    if (msg.type === "RESET_CHILD_FILTERS") {
      receivedExternalFilters = true;

      if (msg.resetUniversity) {
        fillSelect(universitySelect, "University", msg.universities || []);
      }

      if (msg.resetCourse) {
        fillSelect(courseSelect, "Course", msg.courses || []);
      }

      if (msg.resetIntake) {
        fillSelect(intakeSelect, "Intake", msg.intakes || []);
      }
    }
  });

  /* =========================================================
     SEARCH
  ========================================================= */

  function renderCourseResults(title, courses) {
    if (!courseResults) return;

    let html = `
      <div class="course-group">
        <h3>${title}</h3>
        <div class="course-list">
    `;

    if (!courses.length) {
      html += `
        <div class="course-item">
          <h4>No programme found</h4>
          <p>Please adjust the filters or check again later.</p>
        </div>
      `;
    }

    courses.forEach((course) => {
      html += `
        <div class="course-item">
          <h4>${safeText(course.course)}</h4>
          <p>
            🏫 ${safeText(course.university)}<br>
            ⏱ ${safeText(course.duration)}<br>
            📅 ${safeText(course.intake)}<br>
            🌍 ${safeText(course.pathway)}
          </p>
          <a class="course-link" href="${safeText(course.link)}" data-programme="${safeText(course.course)}">
            View programme
          </a>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    courseResults.innerHTML = html;

    courseResults.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function runLocalSearch(filters = getSelectedFilters()) {
    let results = [];

    if (filters.course && courseData[filters.course]) {
      results = [...courseData[filters.course]];
    } else {
      results = getAllCourses();
    }

    results = results.filter((course) => {
      const stateMatches = !filters.state || course.state === filters.state;
      const universityMatches = !filters.university || course.university === filters.university;
      const intakeMatches = matchesIntake(course, filters.intake);

      return stateMatches && universityMatches && intakeMatches;
    });

    const title = filters.course
      ? formatCategoryName(filters.course)
      : "Matching Programmes";

    renderCourseResults(title, results);
  }

  function requestSearch() {
    const filters = getSelectedFilters();

    postToWix({
      type: "RUN_SEARCH",
      ...filters
    });

    runLocalSearch(filters);
  }

  if (stateSelect) {
    stateSelect.addEventListener("change", () => {
      postToWix({
        type: "STATE_CHANGED",
        state: stateSelect.value
      });
    });
  }

  if (universitySelect) {
    universitySelect.addEventListener("change", () => {
      postToWix({
        type: "UNIVERSITY_CHANGED",
        state: stateSelect ? stateSelect.value : "",
        university: universitySelect.value
      });
    });
  }

  if (courseSelect) {
    courseSelect.addEventListener("change", () => {
      postToWix({
        type: "COURSE_CHANGED",
        state: stateSelect ? stateSelect.value : "",
        university: universitySelect ? universitySelect.value : "",
        course: courseSelect.value
      });
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", requestSearch);
  }

  if (browseTopBtn) {
    browseTopBtn.addEventListener("click", () => {
      if (stateSelect) stateSelect.value = "";
      if (universitySelect) universitySelect.value = "";
      if (courseSelect) courseSelect.value = "";
      if (intakeSelect) intakeSelect.value = "";

      requestSearch();
    });
  }

  /* =========================================================
     DEPARTMENT CARDS
  ========================================================= */

  const deptButtons = document.querySelectorAll(".dept-card");

  if (deptButtons.length && courseResults) {
    deptButtons.forEach((button) => {
      button.addEventListener("click", () => {
        deptButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");

        const dept = button.dataset.dept;
        const courses = courseData[dept] || [];
        const buttonText = button.querySelector(".dept-text")
          ? button.querySelector(".dept-text").textContent
          : button.innerText;

        renderCourseResults(buttonText, courses);
      });
    });
  }

  /* =========================================================
     PROGRAMME MODAL
  ========================================================= */

  function openProgrammeModal(programmeName) {
    const course = getAllCourses().find((item) => item.course === programmeName);
    if (!course) return false;

    const data = getDetailForCourse(course);

    const overlay = document.getElementById("programmeModalOverlay");
    const title = document.getElementById("programmeModalTitle");
    const subtitle = document.getElementById("programmeModalSubtitle");
    const pills = document.getElementById("programmeModalPills");
    const entry = document.getElementById("programmeModalEntry");
    const structure = document.getElementById("programmeModalStructure");
    const fees = document.getElementById("programmeModalFees");
    const pathway = document.getElementById("programmeModalPathway");

    if (!overlay || !title || !subtitle || !pills || !entry || !structure || !fees || !pathway) {
      return false;
    }

    title.textContent = data.title;
    subtitle.textContent = `${data.university} — ${data.intro}`;

    pills.innerHTML = `
      <span class="programme-pill">🏫 ${data.university}</span>
      <span class="programme-pill">⏱ ${data.duration}</span>
      <span class="programme-pill">📅 ${data.intake}</span>
      <span class="programme-pill">🌍 ${data.delivery}</span>
    `;

    entry.innerHTML = renderList(data.entry);
    structure.innerHTML = renderList(data.structure);
    pathway.innerHTML = renderList(data.pathway);

    fees.innerHTML = `
      <div class="programme-fee-card">
        <span>Malaysian Student</span>
        <strong>${data.fees.local}</strong>
      </div>
      <div class="programme-fee-card">
        <span>International Student</span>
        <strong>${data.fees.international}</strong>
      </div>
    `;

    overlay.classList.add("active");
    document.body.style.overflow = "hidden";

    return true;
  }

  function closeProgrammeModal() {
    const overlay = document.getElementById("programmeModalOverlay");

    if (overlay) {
      overlay.classList.remove("active");
    }

    document.body.style.overflow = "";
  }

  document.addEventListener("click", (event) => {
    const detailLink = event.target.closest(".course-link[data-programme]");

    if (detailLink) {
      const programmeName = detailLink.dataset.programme;
      const opened = openProgrammeModal(programmeName);

      if (opened) {
        event.preventDefault();
      }
    }

    if (
      event.target.id === "programmeModalOverlay" ||
      event.target.id === "programmeModalClose"
    ) {
      closeProgrammeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProgrammeModal();
    }
  });

  /* =========================================================
     SCHOLARSHIPS
  ========================================================= */

  const scholarshipButtons = document.querySelectorAll(".scholarship-uni-card");

  if (scholarshipButtons.length && scholarshipResults) {
    scholarshipButtons.forEach((button) => {
      button.addEventListener("click", () => {
        scholarshipButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");

        const uniKey = button.dataset.scholarshipUni;
        const data = scholarshipData[uniKey];

        if (!data) {
          scholarshipResults.innerHTML = `
            <div class="scholarship-item">
              <h4>No scholarship data found</h4>
              <p>Please check again later.</p>
            </div>
          `;
          return;
        }

        let html = `
          <div class="scholarship-result-title">${data.title}</div>
          <div class="scholarship-list">
        `;

        data.scholarships.forEach((item) => {
          html += `
            <div class="scholarship-item">
              <span class="scholarship-tag">${item.tag}</span>
              <h4>${item.name}</h4>
              <p>
                💰 ${item.value}<br>
                📌 ${item.details}
              </p>
            </div>
          `;
        });

        html += `
          </div>
          <div class="scholarship-note">
            ${data.note}
          </div>
        `;

        scholarshipResults.innerHTML = html;

        scholarshipResults.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    });
  }

  /* =========================================================
     RANKING / UNIVERSITY TABS
  ========================================================= */

  const rankingTabs = document.querySelectorAll(".uni-tab");
  const rankingContents = document.querySelectorAll(".tab-content");

  if (rankingTabs.length && rankingContents.length) {
    rankingTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        rankingTabs.forEach((item) => item.classList.remove("active"));
        rankingContents.forEach((content) => content.classList.remove("active"));

        tab.classList.add("active");

        const targetContent = document.getElementById(tab.dataset.tab);

        if (targetContent) {
          targetContent.classList.add("active");
        }
      });
    });
  }

  /* =========================================================
     SMOOTH SCROLL
  ========================================================= */

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");

      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();

      const header = document.querySelector(".site-header");
      const headerHeight = header ? header.offsetHeight : 0;

      const targetTop =
        target.getBoundingClientRect().top +
        window.pageYOffset -
        headerHeight -
        14;

      window.scrollTo({
        top: targetTop,
        behavior: "smooth"
      });
    });
  });

  /* =========================================================
     INITIAL SETUP
  ========================================================= */

  setTimeout(() => {
    if (!receivedExternalFilters) {
      initializeStaticFilters();
    }
  }, 100);
});