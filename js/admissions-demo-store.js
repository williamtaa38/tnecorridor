/* ============================================================
   TNE CORRIDOR ADMISSIONS UI CACHE
   File: /js/admissions-demo-store.js

   This file keeps a small local UI cache only. Supabase remains the source of truth for authentication and admissions records.
============================================================ */
(function () {
  "use strict";

  const DB_KEY = "tneAdmissionsFrontendV1";
  const STAFF_SESSION_KEY = "tneStaffSessionV1";

  const nowIso = () => new Date().toISOString();
  const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const seed = {
    universities: [],
    staffAccounts: [],
    studentAccounts: [],
    courses: [],
    scholarships: [],
    packages: [],
    applications: [],
    offers: [],
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
      console.warn("Unable to read admissions UI cache:", error);
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
      id: account.id || lead?.userId || "student_local_cache",
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
      result = { ok: true, message: "Offer accepted. Other active offers have been closed." };
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
