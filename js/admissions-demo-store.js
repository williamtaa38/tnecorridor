/* ============================================================
   TNE CORRIDOR ADMISSIONS FRONT-END STORE
   File: /js/admissions-demo-store.js

   FRONT-END PREVIEW ONLY.
   This file intentionally uses localStorage so the new screens can be
   designed/tested before the Supabase database + RLS policies are added.
   Replace this data layer with Supabase queries in the backend phase.
============================================================ */
(function () {
  "use strict";

  const DB_KEY = "tneAdmissionsFrontendV1";
  const STAFF_SESSION_KEY = "tneStaffPreviewSession";

  const nowIso = () => new Date().toISOString();
  const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const seed = {
    universities: [
      { id: "UOSM", name: "University of Southampton Malaysia", shortName: "UoSM", location: "Iskandar Puteri, Johor", status: "active" },
      { id: "UORM", name: "University of Reading Malaysia", shortName: "UoRM", location: "Iskandar Puteri, Johor", status: "active" },
      { id: "MDIS", name: "MDIS Malaysia International College", shortName: "MDIS", location: "Iskandar Puteri, Johor", status: "active" }
    ],
    staffAccounts: [
      { id: "staff_admin_preview", name: "TNE Administrator", email: "admin.preview@tnecorridor.local", role: "administrator", universityId: "", status: "active", createdAt: nowIso() },
      { id: "staff_uosm_preview", name: "Admissions Officer", email: "officer.preview@uosm.local", role: "university_officer", universityId: "UOSM", status: "active", createdAt: nowIso() }
    ],
    studentAccounts: [],
    courses: [
      {
        id: "UOSM_ENGINEERING_FOUNDATION_YEAR", universityId: "UOSM", title: "Engineering Foundation Year", level: "Foundation",
        duration: "1 year", currency: "MYR", totalFee: 29100, gstPercent: 0, active: true,
        semesters: [
          { name: "Semester 1", tuition: 14550, subjects: [{ name: "Mathematics for Engineering", fee: 4850 }, { name: "Physics for Engineering", fee: 4850 }, { name: "Academic English", fee: 4850 }] },
          { name: "Semester 2", tuition: 14550, subjects: [{ name: "Advanced Mathematics", fee: 4850 }, { name: "Engineering Science", fee: 4850 }, { name: "Design Project", fee: 4850 }] }
        ]
      },
      {
        id: "UOSM_BSC_BUSINESS_ANALYTICS", universityId: "UOSM", title: "BSc Business Analytics", level: "Undergraduate",
        duration: "3 years", currency: "MYR", totalFee: 118965, gstPercent: 0, active: true,
        semesters: []
      },
      {
        id: "MDIS_DIPLOMA_IN_BUSINESS_MANAGEMENT", universityId: "MDIS", title: "Diploma in Business Management", level: "Diploma",
        duration: "2.5 years", currency: "MYR", totalFee: 0, gstPercent: 0, active: true,
        semesters: []
      }
    ],
    scholarships: [
      {
        id: "sch_preview_1", universityId: "UOSM", name: "Merit Scholarship", percentage: 20,
        scope: "whole_course", courseIds: ["UOSM_BSC_BUSINESS_ANALYTICS"], semesterRules: [],
        maintenanceTerms: "Maintain satisfactory academic progress and remain a full-time student.", active: true
      }
    ],
    packages: [],
    applications: [
      {
        id: "app_preview_001", studentId: "student_preview_001", studentName: "Preview Student", studentEmail: "student.preview@example.com",
        universityId: "UOSM", courseId: "UOSM_ENGINEERING_FOUNDATION_YEAR", courseTitle: "Engineering Foundation Year",
        qualification: "SPM", financialBand: "RM 60,000 - RM 100,000", status: "under_review", academicDecision: "pending",
        financialDecision: "pending", officerNote: "", missingDocuments: [], documents: ["SPM Results.pdf", "Identification.pdf"],
        createdAt: nowIso(), updatedAt: nowIso()
      },
      {
        id: "app_preview_002", studentId: "student_preview_002", studentName: "Alicia Tan", studentEmail: "alicia@example.com",
        universityId: "UOSM", courseId: "UOSM_BSC_BUSINESS_ANALYTICS", courseTitle: "BSc Business Analytics",
        qualification: "Foundation", financialBand: "Need Scholarship / Financial Aid", status: "action_required", academicDecision: "eligible",
        financialDecision: "review", officerNote: "Please upload the latest sponsor/bank supporting document.", missingDocuments: ["Financial supporting document"], documents: ["Foundation Transcript.pdf"],
        createdAt: nowIso(), updatedAt: nowIso()
      }
    ],
    offers: [
      {
        id: "offer_preview_001", applicationId: "app_preview_002", studentId: "student_preview_002", universityId: "UOSM",
        courseTitle: "BSc Business Analytics", packageTitle: "", scholarshipName: "Merit Scholarship", scholarshipPercentage: 20,
        tuitionBeforeDiscount: 118965, discountAmount: 23793, gstPercent: 0, gstAmount: 0, payableTotal: 95172,
        currency: "MYR", terms: "Conditional upon verification of final academic documents and payment of the required deposit.",
        status: "sent", offerLetterName: "", signedLetterName: "", createdAt: nowIso()
      }
    ],
    notifications: []
  };

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readDb() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DB_KEY) || "null");
      if (parsed && typeof parsed === "object") return parsed;
    } catch (error) {
      console.warn("Unable to read admissions preview store:", error);
    }
    const initial = deepClone(seed);
    localStorage.setItem(DB_KEY, JSON.stringify(initial));
    return initial;
  }

  function writeDb(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    window.dispatchEvent(new CustomEvent("tne-admissions-changed"));
    return db;
  }

  function update(mutator) {
    const db = readDb();
    mutator(db);
    return writeDb(db);
  }

  function getCurrentStudent() {
    const email = String(localStorage.getItem("tneCurrentStudentEmail") || localStorage.getItem("tneStudentEmail") || "").toLowerCase();
    let account = {};
    try { account = JSON.parse(localStorage.getItem("tneStudentAccount") || "{}"); } catch (_) {}

    let leads = [];
    try { leads = JSON.parse(localStorage.getItem("studentLeads") || "[]"); } catch (_) {}
    const lead = [...(Array.isArray(leads) ? leads : [])].reverse().find(item => {
      const candidate = String(item?.email || item?.studentAccount?.registeredEmail || "").toLowerCase();
      return !email || candidate === email;
    }) || (Array.isArray(leads) && leads.length ? leads[leads.length - 1] : null);

    return {
      id: account.id || lead?.userId || "student_frontend_preview",
      name: account.name || lead?.fullName || "Student",
      email: email || account.email || lead?.email || "student@example.com",
      qualification: lead?.qualification || lead?.certificateResults?.qualification || "SPM",
      budgetRange: lead?.budgetRange || "",
      selectedCourses: Array.isArray(lead?.selectedCourses) ? lead.selectedCourses : [],
      lead: lead || null
    };
  }

  function syncCurrentStudent() {
    const student = getCurrentStudent();
    update(db => {
      const index = db.studentAccounts.findIndex(s => s.id === student.id || String(s.email).toLowerCase() === String(student.email).toLowerCase());
      const record = {
        id: student.id,
        name: student.name,
        email: student.email,
        qualification: student.qualification,
        status: "active",
        updatedAt: nowIso()
      };
      if (index >= 0) db.studentAccounts[index] = { ...db.studentAccounts[index], ...record };
      else db.studentAccounts.push({ ...record, createdAt: nowIso() });
    });
    return student;
  }

  function universityName(id) {
    return readDb().universities.find(u => u.id === id)?.name || id || "University";
  }

  function courseTitle(id) {
    return readDb().courses.find(c => c.id === id)?.title || id || "Course";
  }

  function qualificationAllowedLevels(qualification) {
    const q = String(qualification || "").toLowerCase();
    if (/spm|igcse|o-level|o level/.test(q)) return ["Foundation", "A-Level"];
    if (/foundation|a-level|a level|stpm|uec|ib|international baccalaureate|diploma/.test(q)) return ["Undergraduate", "Undergraduate (Integrated Masters)"];
    if (/degree|bachelor|undergraduate/.test(q)) return ["Postgraduate", "Masters"];
    return ["Foundation", "A-Level", "Diploma", "Undergraduate", "Undergraduate (Integrated Masters)"];
  }

  function isCourseLevelAllowed(qualification, level) {
    const allowed = qualificationAllowedLevels(qualification).map(v => v.toLowerCase());
    return allowed.includes(String(level || "").toLowerCase());
  }

  function createApplication(input) {
    const student = syncCurrentStudent();
    const app = {
      id: uid("app"), studentId: student.id, studentName: student.name, studentEmail: student.email,
      universityId: input.universityId, courseId: input.courseId || "", courseTitle: input.courseTitle || courseTitle(input.courseId),
      qualification: input.qualification || student.qualification, financialBand: input.financialBand || student.budgetRange || "",
      status: input.status || "draft", academicDecision: "pending", financialDecision: "pending", officerNote: "",
      missingDocuments: [], documents: input.documents || [], pathwayRequest: input.pathwayRequest || "",
      createdAt: nowIso(), updatedAt: nowIso()
    };
    update(db => db.applications.unshift(app));
    return app;
  }

  function patchApplication(id, patch) {
    let updated = null;
    update(db => {
      const app = db.applications.find(a => a.id === id);
      if (!app) return;
      Object.assign(app, patch, { updatedAt: nowIso() });
      updated = deepClone(app);
    });
    return updated;
  }

  function createOffer(input) {
    const offer = {
      id: uid("offer"), applicationId: input.applicationId, studentId: input.studentId, universityId: input.universityId,
      courseTitle: input.courseTitle || "", packageTitle: input.packageTitle || "", scholarshipName: input.scholarshipName || "",
      scholarshipPercentage: Number(input.scholarshipPercentage || 0), tuitionBeforeDiscount: Number(input.tuitionBeforeDiscount || 0),
      discountAmount: Number(input.discountAmount || 0), gstPercent: Number(input.gstPercent || 0), gstAmount: Number(input.gstAmount || 0),
      payableTotal: Number(input.payableTotal || 0), currency: input.currency || "MYR", terms: input.terms || "",
      status: "sent", offerLetterName: "", signedLetterName: "", createdAt: nowIso()
    };
    update(db => {
      db.offers.unshift(offer);
      const app = db.applications.find(a => a.id === offer.applicationId);
      if (app) { app.status = "conditional_offer"; app.updatedAt = nowIso(); }
    });
    return offer;
  }

  function acceptOffer(offerId) {
    const student = getCurrentStudent();
    let result = { ok: false, message: "Offer not found." };
    update(db => {
      const offer = db.offers.find(o => o.id === offerId);
      if (!offer) return;
      const alreadyAccepted = db.offers.find(o => o.studentId === student.id && o.status === "accepted" && o.id !== offerId);
      if (alreadyAccepted) {
        result = { ok: false, message: `You have already accepted an offer from ${universityName(alreadyAccepted.universityId)}. Only one university can be accepted.` };
        return;
      }
      offer.status = "accepted";
      db.offers.forEach(o => {
        if (o.studentId === student.id && o.id !== offerId && o.status === "sent") o.status = "declined_after_other_acceptance";
      });
      db.applications.forEach(a => {
        if (a.studentId === student.id) {
          if (a.id === offer.applicationId) a.status = "accepted";
          else if (["draft", "submitted", "under_review", "action_required", "conditional_offer"].includes(a.status)) a.status = "closed_other_offer_accepted";
        }
      });
      result = { ok: true, message: "Offer accepted. Other active offers have been closed in this front-end preview." };
    });
    return result;
  }

  function rejectOffer(offerId) {
    update(db => {
      const offer = db.offers.find(o => o.id === offerId);
      if (offer) offer.status = "rejected";
      if (offer) {
        const app = db.applications.find(a => a.id === offer.applicationId);
        if (app) app.status = "offer_rejected";
      }
    });
  }

  window.TNEAdmissions = {
    DB_KEY,
    STAFF_SESSION_KEY,
    read: readDb,
    write: writeDb,
    update,
    resetPreview: () => writeDb(deepClone(seed)),
    uid,
    nowIso,
    getCurrentStudent,
    syncCurrentStudent,
    universityName,
    courseTitle,
    qualificationAllowedLevels,
    isCourseLevelAllowed,
    createApplication,
    patchApplication,
    createOffer,
    acceptOffer,
    rejectOffer,
    setStaffSession(session) { sessionStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session)); },
    getStaffSession() { try { return JSON.parse(sessionStorage.getItem(STAFF_SESSION_KEY) || "null"); } catch (_) { return null; } },
    clearStaffSession() { sessionStorage.removeItem(STAFF_SESSION_KEY); }
  };
})();
