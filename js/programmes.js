// programmes.js
// Programme page specific scripts only. Shared header/footer is handled by layout.js.

const stateSelect = document.getElementById('stateSelect');
    const universitySelect = document.getElementById('universitySelect');
    const courseSelect = document.getElementById('courseSelect');
    const intakeSelect = document.getElementById('intakeSelect');
    const searchBtn = document.getElementById('searchBtn');
    const browseTopBtn = document.getElementById('browseTopBtn');

    function fillSelect(selectEl, placeholder, items) {
      if (!selectEl) return;

      const currentValue = selectEl.value;
      selectEl.innerHTML = '';

      const first = document.createElement('option');
      first.value = '';
      first.textContent = placeholder;
      selectEl.appendChild(first);

      (items || []).forEach(item => {
        const option = document.createElement('option');
        option.value = item.value || '';
        option.textContent = item.label || item.value || '';
        selectEl.appendChild(option);
      });

      const canRestore = Array.from(selectEl.options).some(opt => opt.value === currentValue);

      if (canRestore) {
        selectEl.value = currentValue;
      }
    }

    function postToWix(payload) {
      window.parent.postMessage(payload, '*');
    }

    window.addEventListener('message', (event) => {
      const msg = event.data || {};

      if (msg.type === 'INIT_FILTERS') {
        fillSelect(stateSelect, 'State', msg.states || []);
        fillSelect(universitySelect, 'University', msg.universities || []);
        fillSelect(courseSelect, 'Course', msg.courses || []);
        fillSelect(intakeSelect, 'Intake', msg.intakes || []);
      }

      if (msg.type === 'UPDATE_UNIVERSITIES') {
        fillSelect(universitySelect, 'University', msg.universities || []);
      }

      if (msg.type === 'UPDATE_COURSES') {
        fillSelect(courseSelect, 'Course', msg.courses || []);
      }

      if (msg.type === 'UPDATE_INTAKES') {
        fillSelect(intakeSelect, 'Intake', msg.intakes || []);
      }

      if (msg.type === 'RESET_CHILD_FILTERS') {
        if (msg.resetUniversity) {
          fillSelect(universitySelect, 'University', msg.universities || []);
        }

        if (msg.resetCourse) {
          fillSelect(courseSelect, 'Course', msg.courses || []);
        }

        if (msg.resetIntake) {
          fillSelect(intakeSelect, 'Intake', msg.intakes || []);
        }
      }
    });

    if (stateSelect) {
      stateSelect.addEventListener('change', () => {
        postToWix({
          type: 'STATE_CHANGED',
          state: stateSelect.value
        });
      });
    }

    if (universitySelect) {
      universitySelect.addEventListener('change', () => {
        postToWix({
          type: 'UNIVERSITY_CHANGED',
          state: stateSelect ? stateSelect.value : '',
          university: universitySelect.value
        });
      });
    }

    if (courseSelect) {
      courseSelect.addEventListener('change', () => {
        postToWix({
          type: 'COURSE_CHANGED',
          state: stateSelect ? stateSelect.value : '',
          university: universitySelect ? universitySelect.value : '',
          course: courseSelect.value
        });
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        postToWix({
          type: 'RUN_SEARCH',
          state: stateSelect ? stateSelect.value : '',
          university: universitySelect ? universitySelect.value : '',
          course: courseSelect ? courseSelect.value : '',
          intake: intakeSelect ? intakeSelect.value : ''
        });
      });
    }

    if (browseTopBtn) {
      browseTopBtn.addEventListener('click', () => {
        postToWix({
          type: 'RUN_SEARCH',
          state: '',
          university: '',
          course: '',
          intake: ''
        });
      });
    }

    const courseData = {
      foundation: [
        {
          university: "University of Southampton Malaysia",
          course: "Business Foundation Year",
          duration: "1 Year",
          pathway: "Foundation route into Southampton business degrees",
          link: "/southampton-malaysia"
        },
        {
          university: "University of Southampton Malaysia",
          course: "Computer Science Foundation Year",
          duration: "1 Year",
          pathway: "Foundation route into BSc Computer Science",
          link: "/southampton-malaysia"
        },
        {
          university: "University of Southampton Malaysia",
          course: "Engineering Foundation Year",
          duration: "1 Year",
          pathway: "Foundation route into engineering degrees",
          link: "/southampton-malaysia"
        },
        {
          university: "University of Reading Malaysia",
          course: "International Foundation Programme",
          duration: "12 Months",
          pathway: "Foundation route to Reading Malaysia or Reading UK degrees",
          link: "/reading-malaysia"
        },
        {
          university: "Newcastle University Medicine Malaysia",
          course: "Foundation in Science",
          duration: "1 Year",
          pathway: "Foundation route for health science and medical-related study",
          link: "/numed"
        },
        {
          university: "MDIS Malaysia",
          course: "Foundation in Business",
          duration: "Foundation Level",
          pathway: "Foundation pathway into business-related programmes",
          link: "/mdis"
        }
      ],

      engineering: [
        {
          university: "University of Southampton Malaysia",
          course: "Engineering Foundation Year",
          duration: "1 Year",
          pathway: "Foundation route into Southampton engineering degrees",
          link: "/southampton-malaysia"
        },
        {
          university: "University of Southampton Malaysia",
          course: "MEng Mechanical Engineering",
          duration: "4 Years",
          pathway: "Available as full Malaysia pathway or Malaysia + UK pathway option",
          link: "/southampton-malaysia"
        },
        {
          university: "University of Southampton Malaysia",
          course: "MEng Electrical and Electronic Engineering",
          duration: "4 Years",
          pathway: "Engineering degree with Malaysia and UK pathway options",
          link: "/southampton-malaysia"
        },
        {
          university: "University of Southampton Malaysia",
          course: "MEng Aeronautics and Astronautics",
          duration: "2+2 Pathway",
          pathway: "Study part of the engineering pathway in Malaysia and continue in the UK",
          link: "/southampton-malaysia"
        }
      ],

      medicine: [
        {
          university: "Newcastle University Medicine Malaysia",
          course: "MBBS Honours",
          duration: "5 Years",
          pathway: "Medicine degree delivered at NUMed Malaysia",
          link: "/numed"
        },
        {
          university: "Newcastle University Medicine Malaysia",
          course: "BSc Honours Biomedical Sciences",
          duration: "3 Years",
          pathway: "Biomedical and health science pathway",
          link: "/numed"
        },
        {
          university: "Newcastle University Medicine Malaysia",
          course: "Foundation in Science",
          duration: "1 Year",
          pathway: "Foundation route before health science or medical-related progression",
          link: "/numed"
        }
      ],

      computer: [
        {
          university: "University of Southampton Malaysia",
          course: "BSc Computer Science",
          duration: "3 Years",
          pathway: "Computer science degree at Southampton Malaysia",
          link: "/southampton-malaysia"
        },
        {
          university: "University of Southampton Malaysia",
          course: "Computer Science Foundation Year",
          duration: "1 Year",
          pathway: "Foundation route into BSc Computer Science",
          link: "/southampton-malaysia"
        },
        {
          university: "MDIS Malaysia",
          course: "Diploma in Information Technology",
          duration: "Diploma Level",
          pathway: "IT diploma pathway",
          link: "/mdis"
        }
      ],

      business: [
        {
          university: "University of Southampton Malaysia",
          course: "BSc Accounting and Finance",
          duration: "3 Years",
          pathway: "Accounting and finance degree pathway",
          link: "/southampton-malaysia"
        },
        {
          university: "University of Southampton Malaysia",
          course: "BSc Business Analytics",
          duration: "3 Years",
          pathway: "Business and data-focused pathway",
          link: "/southampton-malaysia"
        },
        {
          university: "University of Southampton Malaysia",
          course: "BSc Business Management",
          duration: "3 Years",
          pathway: "Business management degree pathway",
          link: "/southampton-malaysia"
        },
        {
          university: "University of Southampton Malaysia",
          course: "BSc Economics and Actuarial Science",
          duration: "3 Years",
          pathway: "Economics, mathematics and actuarial-related pathway",
          link: "/southampton-malaysia"
        },
        {
          university: "University of Southampton Malaysia",
          course: "BSc Economics and Finance",
          duration: "3 Years",
          pathway: "Economics and finance pathway",
          link: "/southampton-malaysia"
        },
        {
          university: "University of Southampton Malaysia",
          course: "BSc Finance and Financial Technology",
          duration: "3 Years",
          pathway: "Finance and fintech pathway",
          link: "/southampton-malaysia"
        },
        {
          university: "University of Reading Malaysia",
          course: "Business and Management",
          duration: "Undergraduate Degree",
          pathway: "Henley Business School-linked business pathway",
          link: "/reading-malaysia"
        },
        {
          university: "University of Reading Malaysia",
          course: "Accounting and Finance",
          duration: "Undergraduate Degree",
          pathway: "Accounting and finance pathway",
          link: "/reading-malaysia"
        },
        {
          university: "University of Reading Malaysia",
          course: "Finance and Business Management",
          duration: "Undergraduate Degree",
          pathway: "Finance and management pathway",
          link: "/reading-malaysia"
        },
        {
          university: "MDIS Malaysia",
          course: "Diploma in Business Management",
          duration: "Diploma Level",
          pathway: "Business management diploma pathway",
          link: "/mdis"
        },
        {
          university: "MDIS Malaysia",
          course: "Diploma in Accounting",
          duration: "Diploma Level",
          pathway: "Accounting diploma pathway",
          link: "/mdis"
        },
        {
          university: "MDIS Malaysia",
          course: "Diploma in Finance",
          duration: "Diploma Level",
          pathway: "Finance diploma pathway",
          link: "/mdis"
        },
        {
          university: "MDIS Malaysia",
          course: "Diploma in International Business",
          duration: "Diploma Level",
          pathway: "International business diploma pathway",
          link: "/mdis"
        },
        {
          university: "MDIS Malaysia",
          course: "Diploma in Marketing",
          duration: "Diploma Level",
          pathway: "Marketing diploma pathway",
          link: "/mdis"
        }
      ],

      law: [
        {
          university: "University of Reading Malaysia",
          course: "Bachelor of Laws LLB",
          duration: "Undergraduate Degree",
          pathway: "Law degree pathway",
          link: "/reading-malaysia"
        }
      ],

      psychology: [
        {
          university: "University of Reading Malaysia",
          course: "Psychology",
          duration: "Undergraduate Degree",
          pathway: "Psychology and human behaviour pathway",
          link: "/reading-malaysia"
        }
      ],

      builtEnvironment: [
        {
          university: "University of Reading Malaysia",
          course: "Real Estate",
          duration: "Undergraduate Degree",
          pathway: "Property, valuation and real estate pathway",
          link: "/reading-malaysia"
        },
        {
          university: "University of Reading Malaysia",
          course: "Quantity Surveying",
          duration: "Undergraduate Degree",
          pathway: "Construction cost and project pathway",
          link: "/reading-malaysia"
        }
      ],

      media: [
        {
          university: "MDIS Malaysia",
          course: "Bachelor of Arts Honours Media, Culture and Communication",
          duration: "Degree Level",
          pathway: "Media, culture and communication pathway",
          link: "/mdis"
        }
      ]
    };


    const programmeDetails = {
      "Business Foundation Year": {
            "title": "Business Foundation Year",
            "university": "University of Southampton Malaysia",
            "duration": "1 Year",
            "intake": "April, July & September",
            "delivery": "Full time in Malaysia",
            "intro": "A foundation pathway preparing students for Southampton business degrees.",
            "fees": {
                  "local": "RM27,500",
                  "international": "RM33,000"
            },
            "entry": [
                  "SPM / IGCSE: BCCCC with Mathematics at B or higher; other four subjects at C or higher.",
                  "Moral Studies and Religious Studies are not included in the academic subject count.",
                  "English: IELTS 5.5 overall with minimum 5.5 in each component, or recognised equivalent such as SPM 1119 English / UEC English.",
                  "Other equivalent qualifications may be considered by UoSM."
            ],
            "structure": [
                  "Critical Thinking and Research Skills",
                  "Introduction to Accounting",
                  "Mathematics and Statistics",
                  "English for Academic Study",
                  "Introduction to Business",
                  "Global Society",
                  "Introduction to Economics",
                  "Academic and Personal Development",
                  "Communicating in English"
            ],
            "pathway": [
                  "BSc Accounting and Finance",
                  "BSc Business Analytics",
                  "BSc Business Management",
                  "BSc Economics and Actuarial Science",
                  "BSc Finance and Financial Technology"
            ]
      },
      "Computer Science Foundation Year": {
            "title": "Computer Science Foundation Year",
            "university": "University of Southampton Malaysia",
            "duration": "1 Year",
            "intake": "April, July & September",
            "delivery": "Full time in Malaysia",
            "intro": "A foundation route into BSc Computer Science with computing, mathematics and programming preparation.",
            "fees": {
                  "local": "RM32,500",
                  "international": "RM39,200"
            },
            "entry": [
                  "SPM / IGCSE: strong Science Stream results are normally required, including Mathematics and a Science subject.",
                  "Additional Mathematics / Advanced Mathematics is normally important for progression.",
                  "English Language Pathway or Non-Language Pathway requirements apply depending on English level.",
                  "Other equivalent qualifications may be considered by UoSM."
            ],
            "structure": [
                  "Academic and Personal Development",
                  "Programming and Coursework",
                  "Theoretical Aspects of Computing",
                  "Mathematics",
                  "Computer Systems & Applications",
                  "Communicating in English",
                  "Web Development",
                  "Fundamentals of Computing",
                  "Mathematics for Science and Engineering",
                  "Routes to Success"
            ],
            "pathway": [
                  "BSc Computer Science"
            ]
      },
      "Engineering Foundation Year": {
            "title": "Engineering Foundation Year",
            "university": "University of Southampton Malaysia",
            "duration": "1 Year",
            "intake": "April, July & September",
            "delivery": "Full time in Malaysia",
            "intro": "A 3-semester engineering foundation pathway covering mathematics, mechanics, programming, electricity and engineering principles.",
            "fees": {
                  "local": "RM32,500 per annum",
                  "international": "RM39,200 per annum"
            },
            "entry": [
                  "SPM / IGCSE: strong Science Stream results are normally required, including Mathematics and Physics.",
                  "Additional Mathematics / Advanced Mathematics is normally important for engineering progression.",
                  "English Language Pathway or Non-Language Pathway requirements apply depending on English level.",
                  "Other equivalent qualifications may be considered by UoSM."
            ],
            "structure": [
                  "Computer Applications",
                  "Engineering Principles",
                  "Mechanical Science",
                  "Electricity and Electronics",
                  "Fundamentals of Science and Engineering",
                  "Mathematics for Science and Engineering"
            ],
            "pathway": [
                  "MEng Aeronautics and Astronautics 2+2",
                  "MEng Electrical and Electronic Engineering 2+2",
                  "MEng Mechanical Engineering 2+2",
                  "MEng Mechanical Engineering 4+0"
            ]
      },
      "International Foundation Programme": {
            "title": "International Foundation Programme",
            "university": "University of Reading Malaysia",
            "duration": "12 Months",
            "intake": "April and September",
            "delivery": "Full time in Malaysia",
            "intro": "A 12-month foundation programme preparing students for Reading Malaysia or Reading UK undergraduate pathways.",
            "fees": {
                  "local": "RM26,000 per annum",
                  "international": "RM31,000 per annum"
            },
            "entry": [
                  "SPM: minimum 5 credits.",
                  "IGCSE / O-Level / GCSE: minimum 5 credits.",
                  "Mathematics credit may be required for Henley Business School pathways.",
                  "Mathematics and Science credits may be required for Psychology pathway.",
                  "Academic English may be required depending on English level."
            ],
            "structure": [
                  "Academic Skills 1 and 2",
                  "Enhanced Interpersonal Skills",
                  "Academic English, if required",
                  "Core Mathematics",
                  "Quantitative Methods",
                  "Principles of Business Studies",
                  "Principles of Marketing and Human Resource Management",
                  "Foundation Economics",
                  "Psychology and Research Methods",
                  "Introduction to English Legal System / Law of Obligations, depending on pathway"
            ],
            "pathway": [
                  "Business, Accounting and Finance pathways",
                  "Psychology pathway",
                  "Law pathway",
                  "Real Estate / Quantity Surveying pathway",
                  "Progression to Reading Malaysia or Reading UK, subject to requirements"
            ]
      },
      "Foundation in Science": {
            "title": "Foundation in Science",
            "university": "Newcastle University Medicine Malaysia",
            "duration": "12 Months",
            "intake": "May and September",
            "delivery": "Full time in Malaysia",
            "intro": "A pre-university course for medicine, biomedical sciences, biological sciences and selected health science-related progression.",
            "fees": {
                  "local": "RM27,580",
                  "international": "RM37,371.36 including 6% SST"
            },
            "entry": [
                  "Minimum five Grade B in O-Level/SPM or equivalent, or Grade 6 in IGCSE/GCSE.",
                  "Required subjects include Biology, Chemistry, Physics, Mathematics or Additional Mathematics, and one other subject.",
                  "English requirement examples include IELTS 5.5, MUET Band 3, TOEFL 79 or recognised equivalent.",
                  "Students must be at least 16 years old at or shortly after enrolment."
            ],
            "structure": [
                  "English for Academic Purposes",
                  "Foundation Biology 1",
                  "Foundation Biology 2",
                  "Foundation Chemistry",
                  "Foundation Mathematics and Statistics",
                  "Study Skills and ICT for Science and Medicine",
                  "Foundation of Medical Studies",
                  "Foundation Physics"
            ],
            "pathway": [
                  "Progression to MBBS at NUMed is subject to interview and required Foundation grades.",
                  "Progression to BSc Biomedical Sciences is subject to required Foundation grades.",
                  "Students may also apply to selected Newcastle UK programmes, subject to requirements."
            ]
      },
      "Foundation in Business": {
            "title": "Foundation in Business",
            "university": "MDIS Malaysia",
            "duration": "1 Year",
            "intake": "Jan, Jun, Sep",
            "delivery": "Full time in Malaysia",
            "intro": "A foundation programme building English, communication, business and management knowledge before degree-level study.",
            "fees": {
                  "local": "RM18,000",
                  "international": "RM29,850"
            },
            "entry": [
                  "SPM or equivalent: minimum 5 credits in any subject.",
                  "UEC: minimum Grade B in 3 subjects.",
                  "Other equivalent qualifications recognised by the Government of Malaysia may be considered.",
                  "Successful students may progress to MDIS 3+0 UK degree programmes."
            ],
            "structure": [
                  "Effective English",
                  "Advanced English",
                  "Study Skills",
                  "Skills for Creative Thinking",
                  "Basic Mathematics",
                  "Business Statistics",
                  "Computer Applications",
                  "Fundamentals of Business Studies",
                  "Basic Business Management",
                  "Introduction to Economics",
                  "Basic Accounting",
                  "Basic Marketing",
                  "Introduction to Finance"
            ],
            "pathway": [
                  "Business Management",
                  "International Business",
                  "Accounting",
                  "Finance",
                  "Marketing",
                  "Tourism Management",
                  "Mass Communications",
                  "Information Technology",
                  "Digital Media",
                  "English Language"
            ]
      },
      "MEng Mechanical Engineering": {
            "title": "MEng Mechanical Engineering",
            "university": "University of Southampton Malaysia",
            "duration": "4 Years / 2+2 or 4+0 pathway",
            "intake": "September",
            "delivery": "Malaysia full pathway or Malaysia + UK pathway",
            "intro": "Engineering degree focused on mechanical systems, design, thermodynamics, materials, manufacturing and engineering practice.",
            "fees": {
                  "local": "RM54,300 per annum for 4+0 Malaysia / Malaysia years; UK years may use UK fee equivalent",
                  "international": "RM62,900 per annum for Malaysia years; UK years may use UK fee equivalent"
            },
            "entry": [
                  "A-Level: typical offer includes strong Mathematics and Physics grades.",
                  "IB Diploma / STPM / UEC: Mathematics and Physics are normally required at strong grades.",
                  "English: IELTS 6.5 overall with minimum 6.0 in all components, or equivalent recognised English qualification.",
                  "Other equivalent qualifications may be considered by the university."
            ],
            "structure": [
                  "Engineering Design",
                  "Mathematics and Engineering Science",
                  "Mechanics, Materials and Thermodynamics",
                  "Manufacturing and Systems Design",
                  "Individual and Group Engineering Projects",
                  "Optional advanced engineering modules in later years"
            ],
            "pathway": [
                  "Mechanical engineer",
                  "Design engineer",
                  "Manufacturing engineer",
                  "Automotive / aerospace / energy pathway",
                  "Possible UK transfer subject to requirements and capacity"
            ]
      },
      "MEng Electrical and Electronic Engineering": {
            "title": "MEng Electrical and Electronic Engineering",
            "university": "University of Southampton Malaysia",
            "duration": "2+2 Pathway",
            "intake": "September",
            "delivery": "Years 1–2 in Malaysia, Years 3–4 in the UK",
            "intro": "Engineering degree covering circuits, electronics, communications, control systems, embedded systems and advanced EEE topics.",
            "fees": {
                  "local": "Years 1–2 Malaysia: RM54,300 per annum; Years 3–4 UK: RM141,112 (£24,800) per annum shown by UoSM",
                  "international": "Years 1–2 Malaysia: RM62,900 per annum; Years 3–4 UK: RM141,112 (£24,800) per annum shown by UoSM"
            },
            "entry": [
                  "A-Level: typical offer includes strong Mathematics and Physics grades.",
                  "IB Diploma / STPM / UEC: Mathematics and Physics are normally required at strong grades.",
                  "English: IELTS 6.5 overall with minimum 6.0 in all components, or equivalent recognised English qualification.",
                  "Other equivalent qualifications may be considered by the university."
            ],
            "structure": [
                  "Mathematics",
                  "Circuits",
                  "Programming",
                  "Digital Systems",
                  "Engineering Mathematics",
                  "Fields, Forces and Materials",
                  "Electronic Systems and Materials",
                  "Signals, Control and Communications",
                  "Group Design Project",
                  "Advanced optional EEE modules"
            ],
            "pathway": [
                  "Electrical engineer",
                  "Electronic engineer",
                  "Embedded systems engineer",
                  "Control engineer",
                  "Communications engineer",
                  "UK campus completion for later years"
            ]
      },
      "MEng Aeronautics and Astronautics": {
            "title": "MEng Aeronautics and Astronautics",
            "university": "University of Southampton Malaysia",
            "duration": "2+2 Pathway",
            "intake": "September",
            "delivery": "Years 1–2 in Malaysia, Years 3–4 in the UK",
            "intro": "Aerospace engineering pathway covering aircraft, spacecraft, aerodynamics, structures, design and engineering systems.",
            "fees": {
                  "local": "Malaysia years: please confirm latest UoSM fee; UK years may use UK fee equivalent",
                  "international": "Malaysia years: please confirm latest UoSM fee; UK years may use UK fee equivalent"
            },
            "entry": [
                  "A-Level: typical offer includes strong Mathematics and Physics grades.",
                  "IB Diploma / STPM / UEC: Mathematics and Physics are normally required at strong grades.",
                  "English: IELTS 6.5 overall with minimum 6.0 in all components, or equivalent recognised English qualification.",
                  "Other equivalent qualifications may be considered by the university."
            ],
            "structure": [
                  "Engineering Mathematics",
                  "Aerodynamics and Flight Mechanics",
                  "Structures and Materials",
                  "Design and Computing",
                  "Aircraft and Spacecraft Systems",
                  "Group Design / Aerospace project",
                  "Advanced aerospace optional modules"
            ],
            "pathway": [
                  "Aerospace engineer",
                  "Aircraft design pathway",
                  "Space systems pathway",
                  "Mechanical / systems engineering careers",
                  "UK campus completion for later years"
            ]
      },
      "BSc Computer Science": {
            "title": "BSc Computer Science",
            "university": "University of Southampton Malaysia",
            "duration": "3 Years",
            "intake": "September",
            "delivery": "Full time in Malaysia",
            "intro": "A computer science degree covering programming, algorithms, systems, data management, software design, AI and cyber security.",
            "fees": {
                  "local": "RM44,100 per annum",
                  "international": "RM51,450 per annum"
            },
            "entry": [
                  "A-Level: AAC/ABB/A*BC + mitigating factor, including grade A in Mathematics.",
                  "IB Diploma: 32 points overall with higher-level Mathematics requirement.",
                  "STPM: A-BB including Mathematics.",
                  "UEC: AAABBB with A in Advanced Mathematics I & II.",
                  "English: IELTS 6.5 overall with minimum 6.0 in all components or equivalent."
            ],
            "structure": [
                  "Algorithmics",
                  "Computer Systems",
                  "Data Management",
                  "Mathematics I and II",
                  "Networks and Security",
                  "Programming I, II and III",
                  "Artificial Intelligence",
                  "Software Design and Development Project",
                  "Theory of Computing",
                  "Final Year Individual Project",
                  "Optional modules such as cloud, computer vision, security and NLP"
            ],
            "pathway": [
                  "Software engineer",
                  "App developer",
                  "System analyst",
                  "AI / cyber security / cloud pathway",
                  "Technology and digital product roles"
            ]
      },
      "BSc Accounting and Finance": {
            "title": "BSc Accounting and Finance",
            "university": "University of Southampton Malaysia",
            "duration": "3 Years",
            "intake": "September",
            "delivery": "Full time in Malaysia",
            "intro": "Accounting and finance degree with financial accounting, management accounting, audit, taxation and finance topics.",
            "fees": {
                  "local": "RM42,900 per annum",
                  "international": "RM49,400 per annum"
            },
            "entry": [
                  "A-Level / STPM: typical offer around BBB, normally with Mathematics at SPM/GCSE level where required.",
                  "UEC: generally around BBBBB / Grade B4 and above, with Mathematics where required.",
                  "Foundation / other qualifications: considered case by case by UoSM.",
                  "English: IELTS 6.5 overall with minimum 6.0 in all components, or equivalent recognised English qualification."
            ],
            "structure": [
                  "Introduction to Accounting and Finance",
                  "Financial Accounting I, II and III",
                  "Management Accounting I, II and III",
                  "Commercial Law / Company Law",
                  "Financial Management",
                  "Audit and Taxation",
                  "Portfolio Theory and Financial Markets",
                  "Dissertation or analytical accounting case studies",
                  "Optional modules in tax, governance, banking, risk and strategy"
            ],
            "pathway": [
                  "Auditor",
                  "Tax specialist",
                  "Management accountant",
                  "Finance analyst",
                  "Professional accounting exemptions may apply"
            ]
      },
      "BSc Business Analytics": {
            "title": "BSc Business Analytics",
            "university": "University of Southampton Malaysia",
            "duration": "3 Years",
            "intake": "September",
            "delivery": "Full time in Malaysia",
            "intro": "Business and data-focused degree for students who want to use analytics to support business decisions.",
            "fees": {
                  "local": "RM42,900 per annum",
                  "international": "RM49,400 per annum"
            },
            "entry": [
                  "A-Level / STPM: typical offer around BBB, normally with Mathematics at SPM/GCSE level where required.",
                  "UEC: generally around BBBBB / Grade B4 and above, with Mathematics where required.",
                  "Foundation / other qualifications: considered case by case by UoSM.",
                  "English: IELTS 6.5 overall with minimum 6.0 in all components, or equivalent recognised English qualification."
            ],
            "structure": [
                  "Introduction to Accounting, Management and Marketing",
                  "Analytics Implementation",
                  "Business Analytics Programming",
                  "Predictive Analytics",
                  "Prescriptive Analytics",
                  "Consulting",
                  "Visualising Data",
                  "Business Forecasting",
                  "Final Project",
                  "Optional modules in digital business, operations, finance and strategy"
            ],
            "pathway": [
                  "Business analyst",
                  "Data analyst",
                  "Operations analyst",
                  "Consulting pathway",
                  "Digital transformation roles"
            ]
      },
      "BSc Business Management": {
            "title": "BSc Business Management",
            "university": "University of Southampton Malaysia",
            "duration": "3 Years",
            "intake": "September",
            "delivery": "Full time in Malaysia",
            "intro": "Business management degree covering management, marketing, organisational theory, operations and strategy.",
            "fees": {
                  "local": "RM42,900 per annum",
                  "international": "RM49,400 per annum"
            },
            "entry": [
                  "A-Level / STPM: typical offer around BBB, normally with Mathematics at SPM/GCSE level where required.",
                  "UEC: generally around BBBBB / Grade B4 and above, with Mathematics where required.",
                  "Foundation / other qualifications: considered case by case by UoSM.",
                  "English: IELTS 6.5 overall with minimum 6.0 in all components, or equivalent recognised English qualification."
            ],
            "structure": [
                  "Introduction to Accounting and Finance",
                  "Introduction to Management",
                  "Introduction to Marketing",
                  "Business in Society",
                  "Digital Technologies in Business",
                  "Critical Perspectives on Organisation and Management",
                  "Operations Management",
                  "Business Project or Dissertation",
                  "Strategic Management",
                  "Corporate Social Responsibility and Sustainable Business"
            ],
            "pathway": [
                  "Business executive",
                  "Management trainee",
                  "Entrepreneurship pathway",
                  "Operations / HR / marketing roles",
                  "Further study in management or business"
            ]
      },
      "BSc Economics and Actuarial Science": {
            "title": "BSc Economics and Actuarial Science",
            "university": "University of Southampton Malaysia",
            "duration": "3 Years",
            "intake": "September",
            "delivery": "Full time in Malaysia",
            "intro": "A quantitative economics and actuarial science pathway using mathematical and statistical methods to assess risk and uncertainty.",
            "fees": {
                  "local": "RM45,500 per annum",
                  "international": "RM52,800 per annum"
            },
            "entry": [
                  "A-Level / STPM: typical offer around BBB, normally with Mathematics at SPM/GCSE level where required.",
                  "UEC: generally around BBBBB / Grade B4 and above, with Mathematics where required.",
                  "Foundation / other qualifications: considered case by case by UoSM.",
                  "English: IELTS 6.5 overall with minimum 6.0 in all components, or equivalent recognised English qualification."
            ],
            "structure": [
                  "Economics with Experiments",
                  "Linear Algebra",
                  "Mathematics for Economics",
                  "Microeconomics and Macroeconomics",
                  "Economics with Data",
                  "Econometric Theory",
                  "Financial Mathematics",
                  "Applied Statistics",
                  "Actuarial Mathematics",
                  "Survival Models / Statistical Methods in Insurance",
                  "Dissertation or project"
            ],
            "pathway": [
                  "Actuarial analyst",
                  "Risk analyst",
                  "Economics / finance analyst",
                  "Insurance and financial services pathway",
                  "Postgraduate actuarial or economics study"
            ]
      },
      "BSc Economics and Finance": {
            "title": "BSc Economics and Finance",
            "university": "University of Southampton Malaysia",
            "duration": "3 Years",
            "intake": "September",
            "delivery": "Full time in Malaysia",
            "intro": "Economics and finance degree combining economic analysis, data, financial markets and decision-making.",
            "fees": {
                  "local": "Please confirm latest UoSM annual fee",
                  "international": "Please confirm latest UoSM annual fee"
            },
            "entry": [
                  "A-Level / STPM: typical offer around BBB, normally with Mathematics at SPM/GCSE level where required.",
                  "UEC: generally around BBBBB / Grade B4 and above, with Mathematics where required.",
                  "Foundation / other qualifications: considered case by case by UoSM.",
                  "English: IELTS 6.5 overall with minimum 6.0 in all components, or equivalent recognised English qualification."
            ],
            "structure": [
                  "Microeconomics and Macroeconomics",
                  "Economics with Data",
                  "Mathematics for Economics",
                  "Statistics for Economics",
                  "Financial Markets",
                  "Financial Management",
                  "Econometrics",
                  "Principles of Finance",
                  "Dissertation or final project",
                  "Optional modules in banking, risk, public economics or international finance"
            ],
            "pathway": [
                  "Economist pathway",
                  "Financial analyst",
                  "Banking and investment roles",
                  "Risk / policy analyst",
                  "Further study in economics or finance"
            ]
      },
      "BSc Finance and Financial Technology": {
            "title": "BSc Finance and Financial Technology",
            "university": "University of Southampton Malaysia",
            "duration": "3 Years",
            "intake": "September",
            "delivery": "Full time in Malaysia",
            "intro": "A finance and fintech programme covering finance fundamentals, data, digital finance and emerging financial technologies.",
            "fees": {
                  "local": "Please confirm latest UoSM annual fee",
                  "international": "Please confirm latest UoSM annual fee"
            },
            "entry": [
                  "A-Level / STPM: typical offer around BBB, normally with Mathematics at SPM/GCSE level where required.",
                  "UEC: generally around BBBBB / Grade B4 and above, with Mathematics where required.",
                  "Foundation / other qualifications: considered case by case by UoSM.",
                  "English: IELTS 6.5 overall with minimum 6.0 in all components, or equivalent recognised English qualification."
            ],
            "structure": [
                  "Introduction to Management and Marketing",
                  "Foundations of Business Analytics",
                  "Introduction to Accounting and Finance",
                  "Statistical Methods for Finance",
                  "Foundations of Finance",
                  "Personal Finance",
                  "Financial Econometrics",
                  "Financial Management",
                  "Introduction to Fintech",
                  "Portfolio Theory and Financial Markets",
                  "Alternative Investments / Behavioural Finance / Dissertation"
            ],
            "pathway": [
                  "Fintech analyst",
                  "Finance executive",
                  "Investment / banking pathway",
                  "Digital finance roles",
                  "Risk and data finance roles"
            ]
      },
      "MBBS Honours": {
            "title": "MBBS Honours",
            "university": "Newcastle University Medicine Malaysia",
            "duration": "5 Years",
            "intake": "Please confirm latest NUMed intake",
            "delivery": "Full time in Malaysia",
            "intro": "Medicine degree delivered at NUMed Malaysia with clinical and medical training leading to MBBS Honours.",
            "fees": {
                  "local": "Please confirm latest NUMed MBBS fee",
                  "international": "Please confirm latest NUMed MBBS fee"
            },
            "entry": [
                  "Medicine entry is highly competitive and normally requires strong pre-university results in Biology, Chemistry and relevant science/mathematics subjects.",
                  "Interview / selection process is normally required.",
                  "English language requirement applies.",
                  "Students should verify latest professional, academic and health requirements directly with NUMed."
            ],
            "structure": [
                  "Foundations of medical science",
                  "Clinical skills and communication",
                  "Integrated body systems and disease learning",
                  "Clinical placements and hospital-based learning",
                  "Professionalism, ethics and patient-centred care",
                  "Final clinical preparation and assessments"
            ],
            "pathway": [
                  "Medical doctor pathway",
                  "Housemanship / internship pathway subject to country rules",
                  "Healthcare and clinical careers",
                  "Postgraduate medical specialisation after required clinical training"
            ]
      },
      "BSc Honours Biomedical Sciences": {
            "title": "BSc Honours Biomedical Sciences",
            "university": "Newcastle University Medicine Malaysia",
            "duration": "3 Years",
            "intake": "Please confirm latest NUMed intake",
            "delivery": "Full time in Malaysia",
            "intro": "Biomedical sciences degree for students interested in human biology, disease, laboratory science and health research.",
            "fees": {
                  "local": "Please confirm latest NUMed Biomedical Sciences fee",
                  "international": "Please confirm latest NUMed Biomedical Sciences fee"
            },
            "entry": [
                  "Pre-university science qualifications are normally required, especially Biology and Chemistry-related preparation.",
                  "Students from NUMed Foundation in Science may progress if they meet the required grades.",
                  "English language requirement applies.",
                  "Other equivalent qualifications may be considered by NUMed."
            ],
            "structure": [
                  "Human biology and biomedical science foundations",
                  "Molecular and cellular biology",
                  "Physiology and disease mechanisms",
                  "Laboratory and research skills",
                  "Biomedical research project",
                  "Optional health science or biomedical topics"
            ],
            "pathway": [
                  "Biomedical scientist pathway",
                  "Laboratory / research assistant roles",
                  "Healthcare research",
                  "Postgraduate medicine or biomedical study subject to requirements"
            ]
      },
      "Business and Management": {
            "title": "Business and Management",
            "university": "University of Reading Malaysia",
            "duration": "Undergraduate Degree",
            "intake": "Please confirm latest intake",
            "delivery": "Full time in Malaysia",
            "intro": "Henley Business School-linked business pathway covering management, organisations, marketing and business decision-making.",
            "fees": {
                  "local": "RM40,800 per annum",
                  "international": "RM48,000 per annum"
            },
            "entry": [
                  "A-Level / STPM / UEC / Foundation and other equivalent qualifications are considered according to University of Reading Malaysia requirements.",
                  "English requirement applies; IELTS or equivalent English qualification may be required depending on prior study.",
                  "Programme-specific subject requirements may apply, especially for Law, Psychology and Built Environment courses.",
                  "Students should confirm final eligibility with the admissions team before application."
            ],
            "structure": [
                  "Management and organisations",
                  "Business and society",
                  "Marketing and strategy",
                  "Accounting / finance fundamentals",
                  "Business research and analytics",
                  "Final year project or dissertation",
                  "Optional business modules"
            ],
            "pathway": [
                  "Business executive",
                  "Management trainee",
                  "Marketing / HR / operations roles",
                  "Entrepreneurship pathway",
                  "Postgraduate business study"
            ]
      },
      "Accounting and Finance": {
            "title": "Accounting and Finance",
            "university": "University of Reading Malaysia",
            "duration": "Undergraduate Degree",
            "intake": "Please confirm latest intake",
            "delivery": "Full time in Malaysia",
            "intro": "Accounting and finance pathway covering financial reporting, management accounting, finance and business decision-making.",
            "fees": {
                  "local": "RM40,800 per annum",
                  "international": "RM48,000 per annum"
            },
            "entry": [
                  "A-Level / STPM / UEC / Foundation and other equivalent qualifications are considered according to University of Reading Malaysia requirements.",
                  "English requirement applies; IELTS or equivalent English qualification may be required depending on prior study.",
                  "Programme-specific subject requirements may apply, especially for Law, Psychology and Built Environment courses.",
                  "Students should confirm final eligibility with the admissions team before application."
            ],
            "structure": [
                  "Financial accounting",
                  "Management accounting",
                  "Business finance",
                  "Economics and quantitative methods",
                  "Corporate finance",
                  "Audit / taxation-related topics",
                  "Final year project or advanced finance modules"
            ],
            "pathway": [
                  "Accountant pathway",
                  "Finance executive",
                  "Audit / tax / banking roles",
                  "Professional accounting progression subject to exemptions"
            ]
      },
      "Finance and Business Management": {
            "title": "Finance and Business Management",
            "university": "University of Reading Malaysia",
            "duration": "Undergraduate Degree",
            "intake": "Please confirm latest intake",
            "delivery": "Full time in Malaysia",
            "intro": "A combined finance and management pathway for students interested in financial decision-making and business leadership.",
            "fees": {
                  "local": "RM40,800 per annum",
                  "international": "RM48,000 per annum"
            },
            "entry": [
                  "A-Level / STPM / UEC / Foundation and other equivalent qualifications are considered according to University of Reading Malaysia requirements.",
                  "English requirement applies; IELTS or equivalent English qualification may be required depending on prior study.",
                  "Programme-specific subject requirements may apply, especially for Law, Psychology and Built Environment courses.",
                  "Students should confirm final eligibility with the admissions team before application."
            ],
            "structure": [
                  "Finance fundamentals",
                  "Business management",
                  "Marketing and operations",
                  "Corporate finance",
                  "Business strategy",
                  "Research project",
                  "Optional modules in finance and management"
            ],
            "pathway": [
                  "Finance executive",
                  "Business analyst",
                  "Management trainee",
                  "Banking / corporate roles",
                  "Postgraduate finance or management study"
            ]
      },
      "Bachelor of Laws LLB": {
            "title": "Bachelor of Laws LLB",
            "university": "University of Reading Malaysia",
            "duration": "3 Years",
            "intake": "May and September",
            "delivery": "Full time in Malaysia",
            "intro": "Law degree pathway covering core legal principles and optional final-year areas such as company, medical or intellectual property law.",
            "fees": {
                  "local": "RM40,800 per annum",
                  "international": "RM48,000 per annum"
            },
            "entry": [
                  "A-Level / STPM / UEC / Foundation and other equivalent qualifications are considered according to University of Reading Malaysia requirements.",
                  "English requirement applies; IELTS or equivalent English qualification may be required depending on prior study.",
                  "Programme-specific subject requirements may apply, especially for Law, Psychology and Built Environment courses.",
                  "Students should confirm final eligibility with the admissions team before application."
            ],
            "structure": [
                  "Legal Skills",
                  "Contract Law",
                  "Public Law",
                  "Criminal Law",
                  "Tort Law",
                  "Land Law",
                  "Equity and Trusts",
                  "EU / comparative or optional law modules",
                  "Final year elective law modules such as company law, medical law or IP law"
            ],
            "pathway": [
                  "Legal practice pathway subject to professional requirements",
                  "Compliance / corporate governance roles",
                  "Policy and public sector roles",
                  "Postgraduate law or professional legal training"
            ]
      },
      "Psychology": {
            "title": "Psychology",
            "university": "University of Reading Malaysia",
            "duration": "Undergraduate Degree",
            "intake": "Please confirm latest intake",
            "delivery": "Full time in Malaysia",
            "intro": "Psychology degree pathway focused on human behaviour, research methods, cognition, development and mental processes.",
            "fees": {
                  "local": "RM40,800 per annum",
                  "international": "RM48,000 per annum"
            },
            "entry": [
                  "A-Level / STPM / UEC / Foundation and other equivalent qualifications are considered according to University of Reading Malaysia requirements.",
                  "English requirement applies; IELTS or equivalent English qualification may be required depending on prior study.",
                  "Programme-specific subject requirements may apply, especially for Law, Psychology and Built Environment courses.",
                  "Students should confirm final eligibility with the admissions team before application."
            ],
            "structure": [
                  "Introduction to Psychology",
                  "Research Methods and Statistics",
                  "Biological Psychology",
                  "Cognitive Psychology",
                  "Developmental Psychology",
                  "Social Psychology",
                  "Individual differences",
                  "Final year research project",
                  "Optional psychology topics"
            ],
            "pathway": [
                  "Psychology assistant pathway",
                  "Human resources / people analytics roles",
                  "Education, research or social services pathway",
                  "Postgraduate psychology training subject to professional requirements"
            ]
      },
      "Real Estate": {
            "title": "Real Estate",
            "university": "University of Reading Malaysia",
            "duration": "Undergraduate Degree",
            "intake": "Please confirm latest intake",
            "delivery": "Full time in Malaysia",
            "intro": "Real estate pathway covering valuation, property management, town planning, property law and finance.",
            "fees": {
                  "local": "RM40,800 per annum",
                  "international": "RM48,000 per annum"
            },
            "entry": [
                  "A-Level / STPM / UEC / Foundation and other equivalent qualifications are considered according to University of Reading Malaysia requirements.",
                  "English requirement applies; IELTS or equivalent English qualification may be required depending on prior study.",
                  "Programme-specific subject requirements may apply, especially for Law, Psychology and Built Environment courses.",
                  "Students should confirm final eligibility with the admissions team before application."
            ],
            "structure": [
                  "Property and real estate principles",
                  "Valuation",
                  "Town planning",
                  "Property law",
                  "Real estate finance",
                  "Investment and development",
                  "Professional practice / project work"
            ],
            "pathway": [
                  "Valuer pathway",
                  "Property executive",
                  "Real estate analyst",
                  "Development / investment roles",
                  "Built environment careers"
            ]
      },
      "Quantity Surveying": {
            "title": "Quantity Surveying",
            "university": "University of Reading Malaysia",
            "duration": "3 Years",
            "intake": "Please confirm latest intake",
            "delivery": "Full time in Malaysia",
            "intro": "Quantity surveying pathway focused on construction cost, procurement, project control and built environment management.",
            "fees": {
                  "local": "RM40,800 per annum",
                  "international": "RM48,000 per annum"
            },
            "entry": [
                  "A-Level / STPM / UEC / Foundation and other equivalent qualifications are considered according to University of Reading Malaysia requirements.",
                  "English requirement applies; IELTS or equivalent English qualification may be required depending on prior study.",
                  "Programme-specific subject requirements may apply, especially for Law, Psychology and Built Environment courses.",
                  "Students should confirm final eligibility with the admissions team before application."
            ],
            "structure": [
                  "Construction technology",
                  "Measurement and estimating",
                  "Cost planning",
                  "Procurement and contract administration",
                  "Construction law",
                  "Project management",
                  "Professional practice and final project"
            ],
            "pathway": [
                  "Quantity surveyor pathway",
                  "Cost consultant",
                  "Project control roles",
                  "Construction management pathway",
                  "Built environment professional careers"
            ]
      },
      "Diploma in Information Technology": {
            "title": "Diploma in Information Technology",
            "university": "MDIS Malaysia",
            "duration": "Diploma Level",
            "intake": "Jan, Jun, Sep",
            "delivery": "Full time in Malaysia",
            "intro": "IT diploma pathway focused on computing, programming, databases, networking and practical technology skills.",
            "fees": {
                  "local": "RM41,800 total, except special diploma categories",
                  "international": "RM64,800 total, except hotel management category"
            },
            "entry": [
                  "SPM or equivalent: generally minimum 3 credits; Mathematics may be required or preferred for selected programmes such as Information Technology.",
                  "UEC: minimum Grade B in 3 subjects, or equivalent recognised qualifications.",
                  "International diploma students normally require IELTS or equivalent English qualification, depending on programme.",
                  "Other qualifications recognised by the Government of Malaysia may be considered."
            ],
            "structure": [
                  "Programming fundamentals",
                  "Database systems",
                  "Computer networks",
                  "Web development",
                  "Systems analysis",
                  "New media and emerging technologies",
                  "Free elective",
                  "Industrial training"
            ],
            "pathway": [
                  "IT support",
                  "Junior developer",
                  "Web assistant",
                  "Network / systems support",
                  "Progression to IT or digital media degree pathways"
            ]
      },
      "Diploma in Business Management": {
            "title": "Diploma in Business Management",
            "university": "MDIS Malaysia",
            "duration": "Diploma Level",
            "intake": "Jan, Jun, Sep",
            "delivery": "Full time in Malaysia",
            "intro": "Business management diploma covering management, accounting, HR, operations, entrepreneurship and research skills.",
            "fees": {
                  "local": "RM41,800 total for most diplomas",
                  "international": "RM64,800 total for most diplomas"
            },
            "entry": [
                  "SPM or equivalent: generally minimum 3 credits; Mathematics may be required or preferred for selected programmes such as Information Technology.",
                  "UEC: minimum Grade B in 3 subjects, or equivalent recognised qualifications.",
                  "International diploma students normally require IELTS or equivalent English qualification, depending on programme.",
                  "Other qualifications recognised by the Government of Malaysia may be considered."
            ],
            "structure": [
                  "Basic Financial Accounting",
                  "Introduction to Business",
                  "Human Resource Management",
                  "Business Ethics",
                  "Principles of Management",
                  "Operations Management",
                  "Strategic Management",
                  "Entrepreneurship",
                  "Research Methodology",
                  "Industrial Training"
            ],
            "pathway": [
                  "Operations officer",
                  "Human resource officer",
                  "Sales administrator",
                  "Marketing officer",
                  "Customer service officer"
            ]
      },
      "Diploma in Accounting": {
            "title": "Diploma in Accounting",
            "university": "MDIS Malaysia",
            "duration": "Diploma Level",
            "intake": "Jan, Jun, Sep",
            "delivery": "Full time in Malaysia",
            "intro": "Accounting diploma focused on accounting fundamentals, finance, taxation and business support skills.",
            "fees": {
                  "local": "RM41,800 total for most diplomas",
                  "international": "RM64,800 total for most diplomas"
            },
            "entry": [
                  "SPM or equivalent: generally minimum 3 credits; Mathematics may be required or preferred for selected programmes such as Information Technology.",
                  "UEC: minimum Grade B in 3 subjects, or equivalent recognised qualifications.",
                  "International diploma students normally require IELTS or equivalent English qualification, depending on programme.",
                  "Other qualifications recognised by the Government of Malaysia may be considered."
            ],
            "structure": [
                  "Financial accounting",
                  "Cost and management accounting",
                  "Business mathematics",
                  "Business law",
                  "Taxation basics",
                  "Finance fundamentals",
                  "Accounting software / applications",
                  "Industrial training"
            ],
            "pathway": [
                  "Accounts assistant",
                  "Audit assistant",
                  "Tax assistant",
                  "Finance clerk",
                  "Progression to accounting / finance degree"
            ]
      },
      "Diploma in Finance": {
            "title": "Diploma in Finance",
            "university": "MDIS Malaysia",
            "duration": "Diploma Level",
            "intake": "Jan, Jun, Sep",
            "delivery": "Full time in Malaysia",
            "intro": "Finance diploma focused on financial services, banking, insurance, takaful and business finance.",
            "fees": {
                  "local": "RM41,500 total",
                  "international": "RM64,800 total, please confirm latest MDIS international fee"
            },
            "entry": [
                  "SPM or equivalent: generally minimum 3 credits; Mathematics may be required or preferred for selected programmes such as Information Technology.",
                  "UEC: minimum Grade B in 3 subjects, or equivalent recognised qualifications.",
                  "International diploma students normally require IELTS or equivalent English qualification, depending on programme.",
                  "Other qualifications recognised by the Government of Malaysia may be considered."
            ],
            "structure": [
                  "Finance fundamentals",
                  "Financial accounting",
                  "Business mathematics",
                  "Banking and financial services",
                  "Insurance and Takaful",
                  "Investment basics",
                  "Business communication",
                  "Industrial training"
            ],
            "pathway": [
                  "Finance assistant",
                  "Banking officer",
                  "Insurance / takaful assistant",
                  "Credit support",
                  "Progression to finance degree"
            ]
      },
      "Diploma in International Business": {
            "title": "Diploma in International Business",
            "university": "MDIS Malaysia",
            "duration": "Diploma Level",
            "intake": "Jan, Jun, Sep",
            "delivery": "Full time in Malaysia",
            "intro": "International business diploma focused on global trade, business communication, management and international market issues.",
            "fees": {
                  "local": "RM41,800 total for most diplomas",
                  "international": "RM64,800 total for most diplomas"
            },
            "entry": [
                  "SPM or equivalent: generally minimum 3 credits; Mathematics may be required or preferred for selected programmes such as Information Technology.",
                  "UEC: minimum Grade B in 3 subjects, or equivalent recognised qualifications.",
                  "International diploma students normally require IELTS or equivalent English qualification, depending on programme.",
                  "Other qualifications recognised by the Government of Malaysia may be considered."
            ],
            "structure": [
                  "Introduction to international business",
                  "Business communication",
                  "Marketing",
                  "Management",
                  "Economics",
                  "International trade basics",
                  "Contemporary issues in international business",
                  "Industrial training"
            ],
            "pathway": [
                  "International business assistant",
                  "Sales / export support",
                  "Marketing assistant",
                  "Operations support",
                  "Progression to business degree"
            ]
      },
      "Diploma in Marketing": {
            "title": "Diploma in Marketing",
            "university": "MDIS Malaysia",
            "duration": "Diploma Level",
            "intake": "Jan, Jun, Sep",
            "delivery": "Full time in Malaysia",
            "intro": "Marketing diploma covering marketing principles, consumer behaviour, digital marketing and sales communication.",
            "fees": {
                  "local": "RM41,800 total for most diplomas",
                  "international": "RM64,800 total for most diplomas"
            },
            "entry": [
                  "SPM or equivalent: generally minimum 3 credits; Mathematics may be required or preferred for selected programmes such as Information Technology.",
                  "UEC: minimum Grade B in 3 subjects, or equivalent recognised qualifications.",
                  "International diploma students normally require IELTS or equivalent English qualification, depending on programme.",
                  "Other qualifications recognised by the Government of Malaysia may be considered."
            ],
            "structure": [
                  "Principles of marketing",
                  "Consumer behaviour",
                  "Digital marketing basics",
                  "Sales management",
                  "Marketing communication",
                  "Business management",
                  "Market research",
                  "Industrial training"
            ],
            "pathway": [
                  "Marketing officer",
                  "Sales officer",
                  "Digital marketer",
                  "Social media administrator",
                  "Customer service officer"
            ]
      },
      "Bachelor of Arts Honours Media, Culture and Communication": {
            "title": "Bachelor of Arts Honours Media, Culture and Communication",
            "university": "MDIS Malaysia",
            "duration": "Degree Level",
            "intake": "Please confirm latest intake",
            "delivery": "Full time in Malaysia",
            "intro": "A University of Sunderland-linked media, culture and communication degree pathway delivered through MDIS Malaysia.",
            "fees": {
                  "local": "RM72,820 total",
                  "international": "RM118,712 total"
            },
            "entry": [
                  "Relevant diploma, foundation, STPM, UEC, A-Level or equivalent qualifications may be considered.",
                  "English requirement applies for degree-level study.",
                  "Applicants should verify final entry route with MDIS Malaysia.",
                  "Other equivalent qualifications recognised by the Government of Malaysia may be considered."
            ],
            "structure": [
                  "Media, culture and society",
                  "Communication theory",
                  "Digital media and content",
                  "Research methods",
                  "Public relations / journalism / media practice options",
                  "Final year project or dissertation",
                  "Industry-related media and communication modules"
            ],
            "pathway": [
                  "Media executive",
                  "Communication officer",
                  "Public relations assistant",
                  "Digital content creator",
                  "Marketing communications pathway"
            ]
      }
};


    function renderProgrammeList(items) {
      return (items || []).map(item => `<li>${item}</li>`).join('');
    }

    function openProgrammeModal(programmeName) {
      const data = programmeDetails[programmeName];

      if (!data) {
        return false;
      }

      const overlay = document.getElementById('programmeModalOverlay');
      const title = document.getElementById('programmeModalTitle');
      const subtitle = document.getElementById('programmeModalSubtitle');
      const pills = document.getElementById('programmeModalPills');
      const entry = document.getElementById('programmeModalEntry');
      const structure = document.getElementById('programmeModalStructure');
      const fees = document.getElementById('programmeModalFees');
      const pathway = document.getElementById('programmeModalPathway');

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

      entry.innerHTML = renderProgrammeList(data.entry);
      structure.innerHTML = renderProgrammeList(data.structure);
      pathway.innerHTML = renderProgrammeList(data.pathway);

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

      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';

      return true;
    }

    function closeProgrammeModal() {
      const overlay = document.getElementById('programmeModalOverlay');

      if (overlay) {
        overlay.classList.remove('active');
      }

      document.body.style.overflow = '';
    }

    document.addEventListener('click', (event) => {
      const detailLink = event.target.closest('.course-link[data-programme]');

      if (detailLink) {
        const programmeName = detailLink.dataset.programme;
        const opened = openProgrammeModal(programmeName);

        if (opened) {
          event.preventDefault();
        }
      }

      if (event.target.id === 'programmeModalOverlay' || event.target.id === 'programmeModalClose') {
        closeProgrammeModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeProgrammeModal();
      }
    });

    const scholarshipData = {
      uosm: {
        title: "University of Southampton Malaysia Scholarships",
        note: "Scholarship values and eligibility may change by intake. Students should confirm the latest requirements with the university before applying.",
        scholarships: [
          {
            tag: "Foundation",
            name: "Foundation Scholarships",
            value: "For Foundation Year applicants",
            details: "Available for eligible Malaysian and non-Malaysian Foundation applicants. Awards are bond-free and normally do not include living expenses."
          },
          {
            tag: "Undergraduate",
            name: "Undergraduate Scholarships",
            value: "Academic excellence awards",
            details: "Available to undergraduate applicants based on academic achievement. Award levels vary by qualification and programme."
          },
          {
            tag: "Progression",
            name: "Academic Excellence Progression Scholarship",
            value: "Up to 100% tuition fee waiver",
            details: "For top-performing UoSM Foundation students progressing to undergraduate study, subject to minimum performance and terms."
          },
          {
            tag: "Special Award",
            name: "Provost's Beyond Academic Excellence Scholarships",
            value: "Merit and achievement based",
            details: "For students who show strong achievement beyond academics. Final selection depends on the university's scholarship criteria."
          },
          {
            tag: "Family",
            name: "Sibling Bursary",
            value: "10% reduction",
            details: "For siblings of current students or alumni from the Malaysia or UK campus, subject to terms."
          },
          {
            tag: "Family",
            name: "Children of Alumni Bursary",
            value: "10% reduction",
            details: "For dependents of alumni from the Malaysia or UK campus, subject to terms."
          },
          {
            tag: "Trial Result",
            name: "Forecast and Trial Scholarship",
            value: "Based on forecast or trial results",
            details: "For eligible students applying with forecast or trial examination results, subject to intake and university approval."
          },
          {
            tag: "Financial Aid",
            name: "Grants and Financial Aid",
            value: "Varies by scheme",
            details: "Additional support may be available through grants or external financial aid arrangements."
          }
        ]
      },

      numed: {
        title: "Newcastle University Medicine Malaysia Scholarships",
        note: "NUMed scholarship and funding options can be programme-specific. Medical programmes often have strict eligibility, so students should confirm with NUMed before applying.",
        scholarships: [
          {
            tag: "Foundation",
            name: "Foundation Academic Excellence Award",
            value: "Up to 100% Foundation fee discount",
            details: "For high-achieving students who meet NUMed's academic criteria. A 100% or 50% discount may apply depending on results and conditions."
          },
          {
            tag: "Progression",
            name: "NUMed Foundation Progression Discount",
            value: "Offset against first-year tuition",
            details: "For students who complete the NUMed Foundation in Science and progress to MBBS or Biomedical Sciences, subject to meeting conditions."
          },
          {
            tag: "Discount",
            name: "Graduate Discount",
            value: "20% graduate discount",
            details: "May apply for eligible Newcastle graduates for full years of study, subject to university terms."
          },
          {
            tag: "Government",
            name: "JPA Programme Khas Perubatan, Pergigian dan Farmasi",
            value: "External scholarship route",
            details: "NUMed is listed under the JPA programme for eligible SPM school leavers. Students should check JPA for the latest application details."
          },
          {
            tag: "External",
            name: "Yayasan Tunku Abdul Rahman Scholarship",
            value: "Full tuition and allowances may be available",
            details: "External scholarship for high-potential Malaysian youth, with leadership development elements."
          },
          {
            tag: "State Aid",
            name: "Biasiswa Kerajaan Negeri Sabah",
            value: "External state scholarship",
            details: "External state funding option for eligible Sabah applicants. Students should check the official state scholarship portal."
          },
          {
            tag: "Family",
            name: "Alumni and Family Discount",
            value: "Subject to eligibility",
            details: "NUMed references alumni and family-related bursary schemes. Students should check eligibility directly with NUMed."
          }
        ]
      },

      reading: {
        title: "University of Reading Malaysia Scholarships",
        note: "University of Reading Malaysia normally awards some scholarships automatically during admission, but students should check deadlines, intake rules and scholarship terms.",
        scholarships: [
          {
            tag: "SPM Trial",
            name: "SPM Trial Results Scholarship",
            value: "40%, 30% or 25%",
            details: "For eligible SPM trial result holders. Published example: 9As, 7As or 5As may receive different scholarship levels for the relevant intake."
          },
          {
            tag: "Merit",
            name: "High Achiever's Scholarship",
            value: "Up to 30% of total programme tuition fees",
            details: "Awarded to students with strong academic performance. Students may be automatically considered when applying for admission."
          },
          {
            tag: "Foundation",
            name: "International Foundation Programme Scholarship",
            value: "30%, 25% or 20%",
            details: "For eligible foundation applicants. Scholarship level depends on academic qualification and result level."
          },
          {
            tag: "Provost",
            name: "Provost Award - Holistic Excellence Award",
            value: "100%",
            details: "For exceptional students with academic strength, leadership, community involvement and personal achievements. Usually by invitation and interview."
          },
          {
            tag: "Partner",
            name: "UoRM Partnership Incentive",
            value: "Financial rebate / incentive",
            details: "For students from selected partner institutions and academic networks, subject to eligibility."
          },
          {
            tag: "Postgraduate",
            name: "PhD Scholarship Scheme",
            value: "Full tuition-fee waiver plus research support allowance",
            details: "For eligible doctoral candidates in selected research areas, subject to application cycle and criteria."
          },
          {
            tag: "Loan",
            name: "PTPTN",
            value: "Study loan option",
            details: "Financial support option for eligible Malaysian students."
          },
          {
            tag: "Loan",
            name: "Study Loan",
            value: "External financing option",
            details: "Additional study financing route listed under University of Reading Malaysia scholarships and aid."
          }
        ]
      },

      mdis: {
        title: "MDIS Malaysia Scholarships",
        note: "MDIS scholarship information can change by intake and campaign. Students should confirm the latest Scholarship Scheme 2026 terms directly with MDIS Malaysia.",
        scholarships: [
          {
            tag: "Scholarship",
            name: "Scholarship Scheme 2026",
            value: "Award value depends on qualification and result",
            details: "MDIS Malaysia lists a Scholarship Scheme 2026 for prospective students. Final value and eligibility depend on MDIS terms."
          },
          {
            tag: "Trial Result",
            name: "Trial Result Scholarship Scheme 2026",
            value: "Based on trial examination results",
            details: "For eligible students applying with trial results, subject to MDIS Malaysia's latest scholarship rules."
          },
          {
            tag: "Financial Aid",
            name: "PTPTN Study Loan",
            value: "Study loan option",
            details: "MDIS Malaysia financial assistance information references PTPTN study loan availability for prospective students."
          },
          {
            tag: "Financial Aid",
            name: "Financial Assistance",
            value: "Varies by eligibility",
            details: "Students may check with MDIS Malaysia for available financial assistance options."
          },
          {
            tag: "Campaign",
            name: "Open Day / Intake Waivers",
            value: "Varies by promotion",
            details: "MDIS may run intake or open day waivers and promotions. These should be confirmed directly with MDIS before advising students."
          }
        ]
      }
    };

    const deptButtons = document.querySelectorAll('.dept-card');
    const courseResults = document.getElementById('courseResults');

    if (deptButtons.length && courseResults) {
      deptButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          deptButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const dept = btn.dataset.dept;
          const courses = courseData[dept] || [];
          const buttonText = btn.querySelector('.dept-text') ? btn.querySelector('.dept-text').textContent : btn.innerText;

          let html = `
            <div class="course-group">
              <h3>${buttonText}</h3>
              <div class="course-list">
          `;

          if (!courses.length) {
            html += `
              <div class="course-item">
                <h4>No programme found</h4>
                <p>Please check again later.</p>
              </div>
            `;
          }

          courses.forEach(c => {
            html += `
              <div class="course-item">
                <h4>${c.course}</h4>
                <p>
                  🏫 ${c.university}<br>
                  ⏱ ${c.duration}<br>
                  🌍 ${c.pathway}
                </p>
                <a class="course-link" href="${c.link}" data-programme="${c.course}">View programme</a>
              </div>
            `;
          });

          html += `
              </div>
            </div>
          `;

          courseResults.innerHTML = html;

          courseResults.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        });
      });
    }

    const scholarshipButtons = document.querySelectorAll('.scholarship-uni-card');
    const scholarshipResults = document.getElementById('scholarshipResults');

    if (scholarshipButtons.length && scholarshipResults) {
      scholarshipButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          scholarshipButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const uniKey = btn.dataset.scholarshipUni;
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

          data.scholarships.forEach(item => {
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
            behavior: 'smooth',
            block: 'start'
          });
        });
      });
    }

    const rankingTabs = document.querySelectorAll('.uni-tab');
    const rankingContents = document.querySelectorAll('.tab-content');

    if (rankingTabs.length && rankingContents.length) {
      rankingTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          rankingTabs.forEach(t => t.classList.remove('active'));
          rankingContents.forEach(c => c.classList.remove('active'));

          tab.classList.add('active');

          const targetContent = document.getElementById(tab.dataset.tab);

          if (targetContent) {
            targetContent.classList.add('active');
          }
        });
      });
    }
