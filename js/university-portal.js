document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const store = window.TNEAdmissions;
  if (!store) return;

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  const label = value => String(value || "").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const money = (value, currency = "MYR") => `${currency} ${number(value).toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const deepClone = value => JSON.parse(JSON.stringify(value));
  const makeId = prefix => store.uid ? store.uid(prefix) : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  let session = store.getStaffSession();
  if (!session || session.role !== "university_officer") {
    session = { role: "university_officer", name: "Admissions Officer", email: "preview", universityId: "UOSM", preview: true };
  }
  const universityId = session.universityId || "UOSM";

  let selectedApplicationId = "";
  let editingCourseId = "";
  let editingScholarshipId = "";
  let editingPackageId = "";
  let courseDraftYears = [];
  let scholarshipDraftTargetIds = [];
  let packageDraftStages = [];

  $("officerName").textContent = session.name || "University Officer";
  $("officerEmail").textContent = session.email || "";
  $("universityHeading").textContent = store.universityName(universityId);

  function toast(message) {
    const el = $("universityToast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.__uniToast);
    window.__uniToast = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function openModal(id) {
    if ($(id)) $(id).hidden = false;
  }

  function closeModal(btn) {
    const modal = btn.closest(".modal");
    if (modal) modal.hidden = true;
  }

  function levelRank(level) {
    const value = String(level || "").toLowerCase();
    if (/foundation|a-level|a level|diploma|pre-u|pre u/.test(value)) return 1;
    if (/undergraduate|bachelor/.test(value)) return 2;
    if (/postgraduate|master/.test(value)) return 3;
    if (/doctorate|phd/.test(value)) return 4;
    return 0;
  }

  function rankName(rank) {
    return ({ 1: "Pre-U / Foundation", 2: "Degree / Undergraduate", 3: "Master / Postgraduate", 4: "Doctorate / PhD" })[rank] || "Course";
  }

  function entryRank(qualification) {
    const q = String(qualification || "").toLowerCase();
    if (/bachelor|degree|undergraduate/.test(q)) return 2;
    if (/foundation|diploma|stpm|a-level|a level|uec|ib|international baccalaureate/.test(q)) return 1;
    return 0;
  }

  function targetRank(target) {
    if (target === "doctorate") return 4;
    if (target === "postgraduate") return 3;
    return 2;
  }

  function normaliseYears(course) {
    if (Array.isArray(course.years) && course.years.length) {
      return course.years.map((year, yi) => ({
        id: year.id || makeId("yr"),
        name: year.name || `Year ${yi + 1}`,
        fee: number(year.fee),
        semesters: (Array.isArray(year.semesters) ? year.semesters : []).map((semester, si) => ({
          id: semester.id || makeId("sem"),
          name: semester.name || `Semester ${si + 1}`,
          fee: number(semester.fee ?? semester.tuition),
          subjects: (Array.isArray(semester.subjects) ? semester.subjects : []).map(subject => ({
            id: subject.id || makeId("sub"),
            name: subject.name || "",
            code: subject.code || "",
            credits: number(subject.credits),
            fee: number(subject.fee)
          }))
        }))
      }));
    }
    if (Array.isArray(course.semesters) && course.semesters.length) {
      return [{
        id: makeId("yr"),
        name: "Year 1",
        fee: number(course.totalFee),
        semesters: course.semesters.map((semester, si) => ({
          id: semester.id || makeId("sem"),
          name: semester.name || `Semester ${si + 1}`,
          fee: number(semester.fee ?? semester.tuition),
          subjects: (semester.subjects || []).map(subject => ({ id: subject.id || makeId("sub"), name: subject.name || "", code: subject.code || "", credits: number(subject.credits), fee: number(subject.fee) }))
        }))
      }];
    }
    return [];
  }

  function courseSubtotal(course) {
    if (!course) return 0;
    const years = normaliseYears(course);
    const mode = course.feeMode || "total";
    if (mode === "yearly") {
      const sum = years.reduce((total, year) => total + number(year.fee), 0);
      return sum || number(course.totalFee);
    }
    if (mode === "semester") {
      const sum = years.reduce((total, year) => total + year.semesters.reduce((s, semester) => s + number(semester.fee), 0), 0);
      return sum || number(course.totalFee);
    }
    if (mode === "subject") {
      const sum = years.reduce((total, year) => total + year.semesters.reduce((s, semester) => s + semester.subjects.reduce((x, subject) => x + number(subject.fee), 0), 0), 0);
      return sum || number(course.totalFee);
    }
    return number(course.totalFee);
  }

  function courseTax(course, subtotal = courseSubtotal(course)) {
    return subtotal * Math.max(0, number(course?.gstPercent)) / 100;
  }

  function courseCounts(course) {
    const years = normaliseYears(course);
    const semesters = years.reduce((n, year) => n + year.semesters.length, 0);
    const subjects = years.reduce((n, year) => n + year.semesters.reduce((s, semester) => s + semester.subjects.length, 0), 0);
    return { years: years.length, semesters, subjects };
  }

  function feeModeLabel(mode) {
    return ({ total: "Whole Programme", yearly: "Yearly", semester: "Per Semester", subject: "Per Subject" })[mode] || "Whole Programme";
  }

  function flatLegacySemesters(years) {
    return years.flatMap(year => year.semesters.map(semester => ({
      name: `${year.name} — ${semester.name}`,
      tuition: number(semester.fee),
      subjects: semester.subjects.map(subject => ({ name: subject.name, fee: number(subject.fee) }))
    })));
  }

  function buildBreakdownText(years) {
    return years.map(year => {
      const semesterText = year.semesters.map(semester => {
        const subjects = semester.subjects.map(subject => `${subject.name || "Subject"}${subject.code ? ` (${subject.code})` : ""}${number(subject.fee) ? `: ${number(subject.fee)}` : ""}`).join("; ");
        return `${semester.name}${subjects ? ` | ${subjects}` : ""}`;
      }).join("\n");
      return `${year.name}${semesterText ? `\n${semesterText}` : ""}`;
    }).join("\n");
  }

  function migratePreviewData() {
    store.update(db => {
      db.courses = Array.isArray(db.courses) ? db.courses : [];
      db.scholarships = Array.isArray(db.scholarships) ? db.scholarships : [];
      db.packages = Array.isArray(db.packages) ? db.packages : [];

      db.courses.forEach(course => {
        course.feeMode = course.feeMode || "total";
        course.taxLabel = course.taxLabel || (number(course.gstPercent) ? "SST" : "SST");
        course.years = normaliseYears(course);
        course.totalFee = courseSubtotal(course);
        course.semesters = flatLegacySemesters(course.years);
      });

      db.scholarships.forEach(scholarship => {
        scholarship.discountType = scholarship.discountType || "percentage";
        scholarship.discountValue = number(scholarship.discountValue ?? scholarship.percentage);
        if (scholarship.scope === "whole_course") scholarship.scope = "total_fee";
        if (scholarship.scope === "per_semester") scholarship.scope = "semester";
        scholarship.scope = scholarship.scope || "total_fee";
        scholarship.courseIds = Array.isArray(scholarship.courseIds) ? scholarship.courseIds : [];
        scholarship.targetYearIds = Array.isArray(scholarship.targetYearIds) ? scholarship.targetYearIds : [];
        scholarship.targetSemesterIds = Array.isArray(scholarship.targetSemesterIds) ? scholarship.targetSemesterIds : [];
        scholarship.percentage = scholarship.discountType === "percentage" ? scholarship.discountValue : 0;
      });

      db.packages.forEach(pkg => {
        pkg.target = pkg.target || "undergraduate";
        pkg.stages = Array.isArray(pkg.stages) ? pkg.stages : [];
        if (!pkg.stages.length && pkg.coursesText) {
          const titles = String(pkg.coursesText).split(/→|->|\+|,/).map(v => v.trim()).filter(Boolean);
          pkg.stages = titles.map(title => {
            const match = db.courses.find(course => course.universityId === pkg.universityId && course.title.toLowerCase() === title.toLowerCase());
            return { id: makeId("stage"), courseId: match?.id || "", progressionRule: "" };
          });
        }
      });
    });
  }

  migratePreviewData();

  document.querySelectorAll("[data-open-modal]").forEach(btn => btn.addEventListener("click", () => openModal(btn.dataset.openModal)));
  document.querySelectorAll("[data-close-modal]").forEach(btn => btn.addEventListener("click", () => closeModal(btn)));
  document.querySelectorAll(".modal").forEach(modal => modal.addEventListener("click", event => { if (event.target === modal) modal.hidden = true; }));

  $("universityNav").addEventListener("click", event => {
    const btn = event.target.closest("button[data-panel]");
    if (!btn) return;
    document.querySelectorAll("#universityNav button").forEach(item => item.classList.toggle("active", item === btn));
    document.querySelectorAll(".adm-panel").forEach(panel => panel.classList.toggle("active", panel.id === `panel-${btn.dataset.panel}`));
    render();
  });

  function render() {
    const db = store.read();
    const apps = db.applications.filter(a => a.universityId === universityId);
    const offers = db.offers.filter(o => o.universityId === universityId);
    $("uStatNew").textContent = apps.filter(a => ["submitted", "under_review"].includes(a.status)).length;
    $("uStatAction").textContent = apps.filter(a => a.status === "action_required").length;
    $("uStatOffers").textContent = offers.filter(o => ["sent", "accepted"].includes(o.status)).length;
    $("uStatAccepted").textContent = offers.filter(o => o.status === "accepted").length;
    renderApplicationList();
    renderCourses();
    renderScholarships();
    renderPackages();
    renderOfferOptions();
    renderAccepted();
  }

  // ---------------------------------------------------------------------------
  // APPLICATION REVIEW
  // ---------------------------------------------------------------------------
  function renderApplicationList() {
    const db = store.read();
    const q = ($("uApplicationSearch").value || "").toLowerCase();
    const st = $("uApplicationStatus").value;
    const apps = db.applications.filter(a => a.universityId === universityId && (!st || a.status === st) && (!q || [a.studentName, a.studentEmail, a.courseTitle, a.qualification].join(" ").toLowerCase().includes(q)));
    $("uApplicationList").innerHTML = apps.length ? apps.map(a => `<article class="list-card clickable ${a.id === selectedApplicationId ? "selected" : ""}" data-app-id="${esc(a.id)}"><div style="display:flex;justify-content:space-between;gap:10px;"><div><h3>${esc(a.studentName)}</h3><p>${esc(a.courseTitle)}</p></div><span class="status ${esc(a.status)}">${esc(label(a.status))}</span></div><div class="meta-row"><span class="meta-pill">${esc(a.qualification)}</span><span class="meta-pill">${esc(a.financialBand || "Budget not stated")}</span></div></article>`).join("") : `<div class="empty">No applications match this view.</div>`;
    if (selectedApplicationId) renderReview(selectedApplicationId);
  }

  function renderReview(id) {
    const db = store.read();
    const a = db.applications.find(x => x.id === id && x.universityId === universityId);
    if (!a) { $("uApplicationReview").innerHTML = `<div class="empty">Select an application to begin review.</div>`; return; }
    const allowed = store.qualificationAllowedLevels(a.qualification);
    const course = db.courses.find(c => c.id === a.courseId);
    const smartEligible = course ? store.isCourseLevelAllowed(a.qualification, course.level) : true;
    const matchingPackages = db.packages.filter(pkg => pkg.universityId === universityId && pkg.active !== false && pkg.entryQualification === a.qualification && (pkg.stages || []).some(stage => stage.courseId === a.courseId));
    $("uApplicationReview").innerHTML = `
      <div class="card-head"><div><span class="adm-kicker">Application Review</span><h2>${esc(a.studentName)}</h2><p>${esc(a.studentEmail)}</p></div><span class="status ${esc(a.status)}">${esc(label(a.status))}</span></div>
      <div class="info-grid">
        <div class="info-box"><span>Qualification</span><strong>${esc(a.qualification)}</strong></div>
        <div class="info-box"><span>Applied Course</span><strong>${esc(a.courseTitle)}</strong></div>
        <div class="info-box"><span>Financial Band</span><strong>${esc(a.financialBand || "Not provided")}</strong></div>
        <div class="info-box"><span>Smart progression guide</span><strong>${esc(allowed.join(" / "))}</strong></div>
      </div>
      <div class="notice ${smartEligible ? "success" : "warning"}" style="margin:14px 0;">${smartEligible ? "The applied course level is consistent with the student's stated qualification." : matchingPackages.length ? `Direct entry may not fit. Suitable pathway package available: ${esc(matchingPackages[0].name)}.` : `Direct entry may not fit. Build a progression package beginning with ${esc(allowed.join(" or "))}.`}</div>
      <div class="field-grid">
        <label class="field"><span>Academic Eligibility</span><select id="reviewAcademic"><option value="pending" ${a.academicDecision === "pending" ? "selected" : ""}>Pending Review</option><option value="eligible" ${a.academicDecision === "eligible" ? "selected" : ""}>Eligible</option><option value="not_eligible" ${a.academicDecision === "not_eligible" ? "selected" : ""}>Not Eligible</option></select></label>
        <label class="field"><span>Financial Ability</span><select id="reviewFinancial"><option value="pending" ${a.financialDecision === "pending" ? "selected" : ""}>Pending Review</option><option value="sufficient" ${a.financialDecision === "sufficient" ? "selected" : ""}>Sufficient</option><option value="scholarship_needed" ${a.financialDecision === "scholarship_needed" ? "selected" : ""}>Scholarship Needed</option><option value="insufficient" ${a.financialDecision === "insufficient" ? "selected" : ""}>Insufficient</option></select></label>
        <label class="field full"><span>Request Missing Documents</span><input id="reviewMissing" value="${esc((a.missingDocuments || []).join(", "))}" placeholder="Passport, result slip, bank statement..." /></label>
        <label class="field full"><span>Message to Student</span><textarea id="reviewNote" placeholder="Explain eligibility, missing items or next steps.">${esc(a.officerNote || "")}</textarea></label>
      </div>
      <div style="margin-top:14px;"><strong>Documents:</strong> <span style="color:var(--adm-muted)">${esc((a.documents || []).join(", ") || "No documents uploaded yet")}</span></div>
      <div class="form-actions">
        <button class="btn-danger" type="button" data-review-action="failed">Mark Unsuccessful</button>
        <button class="btn-secondary" type="button" data-review-action="action_required">Request Resubmission</button>
        <button class="btn-secondary" type="button" data-review-action="under_review">Save Review</button>
        <button class="btn-primary" type="button" data-review-action="ready_offer">Ready for Offer</button>
      </div>`;
  }

  function saveReview(action) {
    if (!selectedApplicationId) return;
    const academicDecision = document.getElementById("reviewAcademic")?.value || "pending";
    const financialDecision = document.getElementById("reviewFinancial")?.value || "pending";
    const missing = (document.getElementById("reviewMissing")?.value || "").split(",").map(s => s.trim()).filter(Boolean);
    const note = document.getElementById("reviewNote")?.value.trim() || "";
    let status = action;
    if (action === "ready_offer") {
      if (academicDecision !== "eligible") { toast("Mark the student academically eligible before preparing an offer."); return; }
      if (!["sufficient", "scholarship_needed"].includes(financialDecision)) { toast("Complete the financial review before preparing an offer."); return; }
      status = "under_review";
    }
    store.patchApplication(selectedApplicationId, { academicDecision, financialDecision, missingDocuments: missing, officerNote: note, status });
    render();
    if (action === "ready_offer") {
      $("offerApplication").value = selectedApplicationId;
      syncOfferFromApplication();
      document.querySelector('#universityNav [data-panel="offers"]').click();
      toast("Application loaded into Offer Builder.");
    } else toast("Application review updated in preview data.");
  }

  // ---------------------------------------------------------------------------
  // COURSE / SUBJECT / FEE BUILDER
  // ---------------------------------------------------------------------------
  function activeCourses() {
    return store.read().courses.filter(course => course.universityId === universityId && course.active !== false);
  }

  function currentCourseFeeMode() {
    return document.querySelector('input[name="courseFeeMode"]:checked')?.value || "total";
  }

  function newSemester(index = 0) {
    return { id: makeId("sem"), name: `Semester ${index + 1}`, fee: 0, subjects: [] };
  }

  function newYear(index = 0) {
    return { id: makeId("yr"), name: `Year ${index + 1}`, fee: 0, semesters: [newSemester(0)] };
  }

  function renderCourses() {
    const db = store.read();
    const courses = db.courses.filter(c => c.universityId === universityId);
    $("courseTable").innerHTML = courses.length ? courses.map(course => {
      const subtotal = courseSubtotal(course);
      const tax = courseTax(course, subtotal);
      const counts = courseCounts(course);
      return `<tr>
        <td><strong>${esc(course.title)}</strong><br><small>${esc(course.id)}</small></td>
        <td>${esc(course.level)}</td>
        <td><strong>${counts.years}</strong> year${counts.years === 1 ? "" : "s"}<br><small>${counts.semesters} semesters · ${counts.subjects} subjects</small></td>
        <td><span class="meta-pill">${esc(feeModeLabel(course.feeMode))}</span></td>
        <td>${esc(money(subtotal, course.currency))}</td>
        <td>${number(course.gstPercent)}%<br><small>${esc(course.taxLabel || "Tax")}</small></td>
        <td><strong>${esc(money(subtotal + tax, course.currency))}</strong></td>
        <td><span class="status ${course.active ? "accepted" : "inactive"}">${course.active ? "Active" : "Inactive"}</span></td>
        <td><button class="btn-small" type="button" data-edit-course="${esc(course.id)}">Edit</button></td>
      </tr>`;
    }).join("") : `<tr><td colspan="9">No courses created yet.</td></tr>`;
    populateScholarshipCourseOptions();
  }

  function populateScholarshipCourseOptions() {
    const current = $("scholarshipCourse")?.value || "";
    const courses = activeCourses();
    if (!$("scholarshipCourse")) return;
    $("scholarshipCourse").innerHTML = `<option value="">All active courses</option>` + courses.map(course => `<option value="${esc(course.id)}">${esc(course.title)} — ${esc(course.level)}</option>`).join("");
    if (courses.some(course => course.id === current)) $("scholarshipCourse").value = current;
  }

  function resetCourseForm() {
    editingCourseId = "";
    $("courseForm").reset();
    $("courseEditId").value = "";
    $("courseCurrency").value = "MYR";
    $("courseTaxLabel").value = "SST";
    $("courseGst").value = "0";
    $("courseActive").value = "true";
    document.querySelector('input[name="courseFeeMode"][value="total"]').checked = true;
    $("courseTotalFee").value = "0";
    courseDraftYears = [newYear(0)];
    $("courseModalTitle").textContent = "Create Course";
    $("courseSubmitBtn").textContent = "Save Course";
    renderCourseBuilder();
  }

  function editCourse(courseId) {
    const course = store.read().courses.find(c => c.id === courseId && c.universityId === universityId);
    if (!course) { toast("Course not found."); return; }
    editingCourseId = course.id;
    $("courseEditId").value = course.id;
    $("courseName").value = course.title || "";
    $("courseLevel").value = course.level || "Foundation";
    $("courseDuration").value = course.duration || "";
    $("courseCurrency").value = course.currency || "MYR";
    $("courseTaxLabel").value = course.taxLabel || "SST";
    $("courseGst").value = number(course.gstPercent);
    $("courseActive").value = course.active === false ? "false" : "true";
    const mode = course.feeMode || "total";
    const modeInput = document.querySelector(`input[name="courseFeeMode"][value="${mode}"]`) || document.querySelector('input[name="courseFeeMode"][value="total"]');
    modeInput.checked = true;
    $("courseTotalFee").value = number(course.totalFee);
    courseDraftYears = normaliseYears(course);
    if (!courseDraftYears.length) courseDraftYears = [newYear(0)];
    $("courseModalTitle").textContent = "Edit Course";
    $("courseSubmitBtn").textContent = "Update Course";
    renderCourseBuilder();
    openModal("courseModal");
  }

  function renderCourseBuilder() {
    const mode = currentCourseFeeMode();
    $("courseTotalFeeField").hidden = mode !== "total";
    $("courseYearsEmpty").hidden = courseDraftYears.length > 0;
    const currency = $("courseCurrency").value || "MYR";

    $("courseYearsBuilder").innerHTML = courseDraftYears.map((year, yi) => `
      <section class="academic-year-card" data-year-index="${yi}">
        <div class="academic-card-head">
          <div class="academic-title-row"><span class="sequence-number">${yi + 1}</span><input class="inline-title-input" data-year-name value="${esc(year.name)}" aria-label="Academic year name" /></div>
          <div class="academic-actions">
            ${mode === "yearly" ? `<label class="inline-fee"><span>Year Fee (${esc(currency)})</span><input data-year-fee type="number" min="0" step="0.01" value="${number(year.fee)}" /></label>` : ""}
            <button class="btn-small" type="button" data-add-semester>Add Semester</button>
            <button class="btn-small danger-ghost" type="button" data-remove-year ${courseDraftYears.length === 1 ? "disabled" : ""}>Remove Year</button>
          </div>
        </div>
        <div class="semester-stack">
          ${year.semesters.map((semester, si) => `
            <article class="semester-card" data-semester-index="${si}">
              <div class="semester-head">
                <div class="academic-title-row small"><span class="sequence-number">${yi + 1}.${si + 1}</span><input class="inline-title-input" data-semester-name value="${esc(semester.name)}" aria-label="Semester name" /></div>
                <div class="academic-actions">
                  ${mode === "semester" ? `<label class="inline-fee"><span>Semester Fee (${esc(currency)})</span><input data-semester-fee type="number" min="0" step="0.01" value="${number(semester.fee)}" /></label>` : ""}
                  <button class="btn-small" type="button" data-add-subject>+ Subject</button>
                  <button class="btn-small danger-ghost" type="button" data-remove-semester ${year.semesters.length === 1 ? "disabled" : ""}>Remove</button>
                </div>
              </div>
              <div class="subject-table-wrap">
                <div class="subject-table-head"><span>Subject / Module</span><span>Code</span><span>Credits</span>${mode === "subject" ? `<span>Fee (${esc(currency)})</span>` : ""}<span></span></div>
                <div class="subject-list">
                  ${semester.subjects.length ? semester.subjects.map((subject, subi) => `
                    <div class="subject-row" data-subject-index="${subi}">
                      <input data-subject-name value="${esc(subject.name)}" placeholder="Subject name" />
                      <input data-subject-code value="${esc(subject.code || "")}" placeholder="Code" />
                      <input data-subject-credits type="number" min="0" step="0.5" value="${number(subject.credits)}" placeholder="Credits" />
                      ${mode === "subject" ? `<input data-subject-fee type="number" min="0" step="0.01" value="${number(subject.fee)}" placeholder="Fee" />` : ""}
                      <button class="icon-btn danger" type="button" data-remove-subject title="Remove subject">×</button>
                    </div>`).join("") : `<div class="subject-empty">No subjects yet. Add the modules taught in this semester.</div>`}
                </div>
              </div>
            </article>`).join("")}
        </div>
      </section>`).join("");
    updateCourseSummary();
  }

  function draftCourseSubtotal() {
    const mode = currentCourseFeeMode();
    if (mode === "total") return number($("courseTotalFee").value);
    if (mode === "yearly") return courseDraftYears.reduce((sum, year) => sum + number(year.fee), 0);
    if (mode === "semester") return courseDraftYears.reduce((sum, year) => sum + year.semesters.reduce((s, semester) => s + number(semester.fee), 0), 0);
    return courseDraftYears.reduce((sum, year) => sum + year.semesters.reduce((s, semester) => s + semester.subjects.reduce((x, subject) => x + number(subject.fee), 0), 0), 0);
  }

  function updateCourseSummary() {
    const currency = $("courseCurrency").value || "MYR";
    const subtotal = draftCourseSubtotal();
    const taxPct = $("courseTaxLabel").value === "None" ? 0 : Math.max(0, number($("courseGst").value));
    const tax = subtotal * taxPct / 100;
    const semesters = courseDraftYears.reduce((n, year) => n + year.semesters.length, 0);
    const subjects = courseDraftYears.reduce((n, year) => n + year.semesters.reduce((s, semester) => s + semester.subjects.length, 0), 0);
    $("courseSummarySubtotal").textContent = money(subtotal, currency);
    $("courseSummaryTaxLabel").textContent = $("courseTaxLabel").value === "None" ? "Tax" : $("courseTaxLabel").value;
    $("courseSummaryTax").textContent = money(tax, currency);
    $("courseSummaryTotal").textContent = money(subtotal + tax, currency);
    $("courseSummaryStructure").textContent = `${courseDraftYears.length} year${courseDraftYears.length === 1 ? "" : "s"} · ${semesters} semesters · ${subjects} subjects`;
  }

  function syncCourseDraftInput(target) {
    const yearCard = target.closest("[data-year-index]");
    if (!yearCard) return;
    const yi = Number(yearCard.dataset.yearIndex);
    const year = courseDraftYears[yi];
    if (!year) return;
    if (target.matches("[data-year-name]")) year.name = target.value;
    if (target.matches("[data-year-fee]")) year.fee = number(target.value);
    const semesterCard = target.closest("[data-semester-index]");
    if (!semesterCard) { updateCourseSummary(); return; }
    const si = Number(semesterCard.dataset.semesterIndex);
    const semester = year.semesters[si];
    if (!semester) return;
    if (target.matches("[data-semester-name]")) semester.name = target.value;
    if (target.matches("[data-semester-fee]")) semester.fee = number(target.value);
    const subjectRow = target.closest("[data-subject-index]");
    if (subjectRow) {
      const subi = Number(subjectRow.dataset.subjectIndex);
      const subject = semester.subjects[subi];
      if (subject) {
        if (target.matches("[data-subject-name]")) subject.name = target.value;
        if (target.matches("[data-subject-code]")) subject.code = target.value;
        if (target.matches("[data-subject-credits]")) subject.credits = number(target.value);
        if (target.matches("[data-subject-fee]")) subject.fee = number(target.value);
      }
    }
    updateCourseSummary();
  }

  function submitCourse() {
    const title = $("courseName").value.trim();
    if (!title) { toast("Enter a course name."); return; }
    const feeMode = currentCourseFeeMode();
    const subtotal = draftCourseSubtotal();
    const taxLabel = $("courseTaxLabel").value;
    const payload = {
      title,
      level: $("courseLevel").value,
      duration: $("courseDuration").value.trim() || `${courseDraftYears.length || 1} year${courseDraftYears.length === 1 ? "" : "s"}`,
      currency: $("courseCurrency").value,
      feeMode,
      totalFee: subtotal,
      taxLabel,
      gstPercent: taxLabel === "None" ? 0 : number($("courseGst").value),
      active: $("courseActive").value === "true",
      years: deepClone(courseDraftYears),
      semesters: flatLegacySemesters(courseDraftYears),
      breakdownText: buildBreakdownText(courseDraftYears)
    };

    if (editingCourseId) {
      store.update(db => {
        const course = db.courses.find(c => c.id === editingCourseId && c.universityId === universityId);
        if (course) Object.assign(course, payload, { updatedAt: store.nowIso ? store.nowIso() : new Date().toISOString() });
      });
      $("courseModal").hidden = true;
      render();
      toast("Course, subjects and fee structure updated.");
      resetCourseForm();
      return;
    }

    const slug = title.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    const id = `${universityId}_${slug}_${Date.now().toString().slice(-5)}`;
    store.update(db => db.courses.push({ id, universityId, ...payload, createdAt: store.nowIso ? store.nowIso() : new Date().toISOString() }));
    $("courseModal").hidden = true;
    render();
    toast("Course created with structured subjects and fees.");
    resetCourseForm();
  }

  // ---------------------------------------------------------------------------
  // SCHOLARSHIPS
  // ---------------------------------------------------------------------------
  function scholarshipScopeLabel(scope) {
    return ({ total_fee: "Total Course Fee", yearly: "Selected Year(s)", semester: "Selected Semester(s)" })[scope] || "Total Course Fee";
  }

  function scholarshipValueLabel(scholarship) {
    if (scholarship.discountType === "fixed") {
      const course = store.read().courses.find(c => c.id === scholarship.courseIds?.[0]);
      return `${money(scholarship.discountValue, course?.currency || "MYR")} fixed discount`;
    }
    return `${number(scholarship.discountValue ?? scholarship.percentage)}% discount`;
  }

  function renderScholarships() {
    const db = store.read();
    const items = db.scholarships.filter(s => s.universityId === universityId);
    $("scholarshipList").innerHTML = items.length ? items.map(s => {
      const courseNames = (s.courseIds || []).map(id => db.courses.find(c => c.id === id)?.title || id);
      const targetLabels = scholarshipTargetLabels(s, db);
      return `<article class="list-card scholarship-card">
        <div class="card-head compact-head">
          <div><h3>${esc(s.name)}</h3><p><strong>${esc(scholarshipValueLabel(s))}</strong> · ${esc(scholarshipScopeLabel(s.scope))}</p></div>
          <div class="card-actions-inline"><span class="status ${s.active ? "accepted" : "inactive"}">${s.active ? "Active" : "Inactive"}</span><button class="btn-small" type="button" data-edit-scholarship="${esc(s.id)}">Edit</button></div>
        </div>
        <div class="meta-row"><span class="meta-pill">${esc(courseNames.join(", ") || "All active courses")}</span>${targetLabels.map(x => `<span class="meta-pill">${esc(x)}</span>`).join("")}</div>
        <p><strong>Maintenance:</strong> ${esc(s.maintenanceTerms || "No maintenance terms entered")}</p>
      </article>`;
    }).join("") : `<div class="empty">No scholarships created yet.</div>`;
  }

  function scholarshipTargetLabels(scholarship, db = store.read()) {
    if (scholarship.scope === "total_fee") return ["Full eligible tuition"];
    const labels = [];
    (scholarship.courseIds || []).forEach(courseId => {
      const course = db.courses.find(c => c.id === courseId);
      if (!course) return;
      const years = normaliseYears(course);
      if (scholarship.scope === "yearly") years.filter(year => (scholarship.targetYearIds || []).includes(year.id)).forEach(year => labels.push(year.name));
      if (scholarship.scope === "semester") years.forEach(year => year.semesters.filter(semester => (scholarship.targetSemesterIds || []).includes(semester.id)).forEach(semester => labels.push(`${year.name} · ${semester.name}`)));
    });
    return labels.length ? labels : ["No period selected"];
  }

  function resetScholarshipForm() {
    editingScholarshipId = "";
    scholarshipDraftTargetIds = [];
    $("scholarshipForm").reset();
    $("scholarshipEditId").value = "";
    $("scholarshipDiscountType").value = "percentage";
    $("scholarshipScope").value = "total_fee";
    $("scholarshipCourse").value = "";
    $("scholarshipActive").value = "true";
    $("scholarshipModalTitle").textContent = "Create Scholarship";
    $("scholarshipSubmitBtn").textContent = "Save Scholarship";
    renderScholarshipTargets();
  }

  function editScholarship(scholarshipId) {
    const scholarship = store.read().scholarships.find(s => s.id === scholarshipId && s.universityId === universityId);
    if (!scholarship) { toast("Scholarship not found."); return; }
    editingScholarshipId = scholarship.id;
    $("scholarshipEditId").value = scholarship.id;
    $("scholarshipName").value = scholarship.name || "";
    $("scholarshipDiscountType").value = scholarship.discountType || "percentage";
    $("scholarshipValue").value = number(scholarship.discountValue ?? scholarship.percentage);
    $("scholarshipScope").value = scholarship.scope || "total_fee";
    $("scholarshipCourse").value = scholarship.courseIds?.[0] || "";
    $("scholarshipTerms").value = scholarship.maintenanceTerms || "";
    $("scholarshipActive").value = scholarship.active === false ? "false" : "true";
    scholarshipDraftTargetIds = scholarship.scope === "yearly" ? [...(scholarship.targetYearIds || [])] : [...(scholarship.targetSemesterIds || [])];
    $("scholarshipModalTitle").textContent = "Edit Scholarship";
    $("scholarshipSubmitBtn").textContent = "Update Scholarship";
    renderScholarshipTargets();
    openModal("scholarshipModal");
  }

  function renderScholarshipTargets() {
    const scope = $("scholarshipScope").value;
    const courseId = $("scholarshipCourse").value;
    if (scope === "total_fee") {
      $("scholarshipTargets").innerHTML = `<div class="notice success">The award will be calculated against the complete eligible tuition subtotal.</div>`;
      $("scholarshipScopeHint").textContent = "For a total-fee scholarship, no period selection is required.";
      return;
    }
    if (!courseId) {
      $("scholarshipTargets").innerHTML = `<div class="notice warning">Select one eligible course first. Year/semester scholarships need a defined academic structure.</div>`;
      $("scholarshipScopeHint").textContent = "A specific course is required for year or semester targeting.";
      return;
    }
    const course = store.read().courses.find(c => c.id === courseId && c.universityId === universityId);
    if (!course) return;
    const years = normaliseYears(course);
    if (!years.length) {
      $("scholarshipTargets").innerHTML = `<div class="notice warning">This course has no structured academic years yet. Edit the course and add its years/semesters first.</div>`;
      return;
    }
    if (scope === "yearly") {
      $("scholarshipTargets").innerHTML = `<div class="target-check-grid">${years.map(year => `<label class="target-check"><input type="checkbox" data-scholarship-target value="${esc(year.id)}" ${scholarshipDraftTargetIds.includes(year.id) ? "checked" : ""} /><span><b>${esc(year.name)}</b><small>${esc(money(yearFeeBase(course, year), course.currency))} eligible base</small></span></label>`).join("")}</div>`;
      $("scholarshipScopeHint").textContent = "Select one or more academic years. The discount is calculated only on those year fees.";
    } else {
      const rows = years.flatMap(year => year.semesters.map(semester => ({ year, semester })));
      $("scholarshipTargets").innerHTML = `<div class="target-check-grid">${rows.map(({ year, semester }) => `<label class="target-check"><input type="checkbox" data-scholarship-target value="${esc(semester.id)}" ${scholarshipDraftTargetIds.includes(semester.id) ? "checked" : ""} /><span><b>${esc(year.name)} · ${esc(semester.name)}</b><small>${esc(money(semesterFeeBase(course, year, semester), course.currency))} eligible base</small></span></label>`).join("")}</div>`;
      $("scholarshipScopeHint").textContent = "Select one or more semesters. The discount is calculated only on those semester fees.";
    }
  }

  function yearFeeBase(course, year) {
    const years = normaliseYears(course);
    if (course.feeMode === "yearly") return number(year.fee);
    if (course.feeMode === "semester") return year.semesters.reduce((sum, semester) => sum + number(semester.fee), 0);
    if (course.feeMode === "subject") return year.semesters.reduce((sum, semester) => sum + semester.subjects.reduce((s, subject) => s + number(subject.fee), 0), 0);
    return years.length ? courseSubtotal(course) / years.length : courseSubtotal(course);
  }

  function semesterFeeBase(course, year, semester) {
    if (course.feeMode === "semester") return number(semester.fee);
    if (course.feeMode === "subject") return semester.subjects.reduce((sum, subject) => sum + number(subject.fee), 0);
    if (course.feeMode === "yearly") return year.semesters.length ? number(year.fee) / year.semesters.length : number(year.fee);
    const allSemesters = normaliseYears(course).flatMap(item => item.semesters);
    return allSemesters.length ? courseSubtotal(course) / allSemesters.length : courseSubtotal(course);
  }

  function submitScholarship() {
    const scope = $("scholarshipScope").value;
    const courseId = $("scholarshipCourse").value;
    if ((scope === "yearly" || scope === "semester") && !courseId) { toast("Select a specific course for a yearly or semester scholarship."); return; }
    if ((scope === "yearly" || scope === "semester") && !scholarshipDraftTargetIds.length) { toast(`Select at least one ${scope === "yearly" ? "academic year" : "semester"}.`); return; }
    const discountType = $("scholarshipDiscountType").value;
    const discountValue = number($("scholarshipValue").value);
    if (discountType === "percentage" && discountValue > 100) { toast("Percentage scholarships cannot exceed 100%."); return; }
    const payload = {
      name: $("scholarshipName").value.trim(),
      discountType,
      discountValue,
      percentage: discountType === "percentage" ? discountValue : 0,
      scope,
      courseIds: courseId ? [courseId] : [],
      targetYearIds: scope === "yearly" ? [...scholarshipDraftTargetIds] : [],
      targetSemesterIds: scope === "semester" ? [...scholarshipDraftTargetIds] : [],
      semesterRules: [],
      maintenanceTerms: $("scholarshipTerms").value.trim(),
      active: $("scholarshipActive").value === "true"
    };
    if (!payload.name) { toast("Enter a scholarship name."); return; }

    if (editingScholarshipId) {
      store.update(db => {
        const scholarship = db.scholarships.find(s => s.id === editingScholarshipId && s.universityId === universityId);
        if (scholarship) Object.assign(scholarship, payload);
      });
      $("scholarshipModal").hidden = true;
      render();
      toast("Scholarship scope and rules updated.");
      resetScholarshipForm();
      return;
    }
    store.update(db => db.scholarships.push({ id: makeId("sch"), universityId, ...payload }));
    $("scholarshipModal").hidden = true;
    render();
    toast("Scholarship created.");
    resetScholarshipForm();
  }

  // ---------------------------------------------------------------------------
  // PATHWAY PACKAGES
  // ---------------------------------------------------------------------------
  function expectedPathRanks(entryQualification = $("packageQualification").value, target = $("packageTarget").value) {
    const start = entryRank(entryQualification);
    const end = targetRank(target);
    const ranks = [];
    for (let rank = start + 1; rank <= end; rank += 1) ranks.push(rank);
    return ranks;
  }

  function packageCourseOptions(expectedRank, selectedId) {
    const courses = activeCourses();
    const suitable = expectedRank ? courses.filter(course => levelRank(course.level) === expectedRank) : courses;
    const fallback = selectedId && !suitable.some(course => course.id === selectedId) ? courses.find(course => course.id === selectedId) : null;
    const items = fallback ? [fallback, ...suitable] : suitable;
    if (!items.length) return `<option value="">No ${esc(rankName(expectedRank))} course created yet</option>`;
    return `<option value="">Select ${esc(rankName(expectedRank))}</option>` + items.map(course => `<option value="${esc(course.id)}" ${course.id === selectedId ? "selected" : ""}>${esc(course.title)} — ${esc(course.level)}</option>`).join("");
  }

  function resetPackageForm() {
    editingPackageId = "";
    packageDraftStages = [];
    $("packageForm").reset();
    $("packageEditId").value = "";
    $("packageQualification").value = "SPM";
    $("packageTarget").value = "undergraduate";
    $("packageType").value = "progression";
    $("packageActive").value = "true";
    $("packageModalTitle").textContent = "Create Progression Package";
    $("packageSubmitBtn").textContent = "Save Package";
    renderPackageBuilder();
  }

  function editPackage(packageId) {
    const pkg = store.read().packages.find(p => p.id === packageId && p.universityId === universityId);
    if (!pkg) { toast("Pathway package not found."); return; }
    editingPackageId = pkg.id;
    $("packageEditId").value = pkg.id;
    $("packageName").value = pkg.name || "";
    $("packageQualification").value = pkg.entryQualification || "SPM";
    $("packageTarget").value = pkg.target || "undergraduate";
    $("packageType").value = pkg.type || "progression";
    $("packageNotes").value = pkg.notes || "";
    $("packageActive").value = pkg.active === false ? "false" : "true";
    packageDraftStages = deepClone(pkg.stages || []);
    $("packageModalTitle").textContent = "Edit Pathway Package";
    $("packageSubmitBtn").textContent = "Update Package";
    renderPackageBuilder();
    openModal("packageModal");
  }

  function autoBuildPackage() {
    const expected = expectedPathRanks();
    const courses = activeCourses();
    packageDraftStages = expected.map((rank, index) => {
      const existing = packageDraftStages.find(stage => levelRank(courses.find(course => course.id === stage.courseId)?.level) === rank);
      return { id: existing?.id || makeId("stage"), courseId: existing?.courseId || "", progressionRule: existing?.progressionRule || defaultStageRule(rank, index) };
    });
    renderPackageBuilder();
    toast(`Created the recommended ${expected.map(rankName).join(" → ")} structure. Choose the actual catalogue course for each stage.`);
  }

  function defaultStageRule(rank) {
    if (rank === 1) return "Complete this pre-university stage and meet the progression grades required for the degree.";
    if (rank === 2) return "Successfully complete the undergraduate award and satisfy postgraduate entry requirements.";
    if (rank === 3) return "Meet the programme completion and academic progression requirements.";
    return "Meet faculty research and progression requirements.";
  }

  function validatePackage() {
    const expected = expectedPathRanks();
    const db = store.read();
    const selected = packageDraftStages.map(stage => db.courses.find(course => course.id === stage.courseId)).filter(Boolean);
    if (!expected.length) return { valid: false, message: "The selected target is not above the entry qualification." };
    if (packageDraftStages.length !== expected.length) {
      return { valid: false, message: `This route normally needs ${expected.length} stage${expected.length === 1 ? "" : "s"}: ${expected.map(rankName).join(" → ")}.` };
    }
    for (let index = 0; index < expected.length; index += 1) {
      const stage = packageDraftStages[index];
      const course = db.courses.find(item => item.id === stage.courseId);
      if (!course) return { valid: false, message: `Stage ${index + 1} needs a ${rankName(expected[index])} course.` };
      if (levelRank(course.level) !== expected[index]) return { valid: false, message: `Stage ${index + 1} should be ${rankName(expected[index])}, not ${course.level}.` };
    }
    if (selected.length > 1 && selected.some(course => course.currency !== selected[0].currency)) {
      return { valid: false, message: "All stages in one package must use the same currency so the package subtotal and offer are not misleading." };
    }
    return { valid: true, message: `Valid progression: ${$("packageQualification").value} → ${selected.map(course => course.title).join(" → ")}.` };
  }

  function renderPackageBuilder() {
    const expected = expectedPathRanks();
    $("packageStages").innerHTML = packageDraftStages.length ? packageDraftStages.map((stage, index) => {
      const expectedRank = expected[index] || 0;
      return `<article class="pathway-stage" data-stage-index="${index}">
        <div class="pathway-stage-number"><span>${index + 1}</span><small>${esc(rankName(expectedRank))}</small></div>
        <div class="pathway-stage-content">
          <label class="field"><span>Course for this stage</span><select data-stage-course>${packageCourseOptions(expectedRank, stage.courseId)}</select></label>
          <label class="field"><span>Progression condition</span><input data-stage-rule value="${esc(stage.progressionRule || "")}" placeholder="Example: Pass Foundation with required grades" /></label>
        </div>
        <div class="stage-actions"><button class="icon-btn" type="button" data-stage-up title="Move up" ${index === 0 ? "disabled" : ""}>↑</button><button class="icon-btn" type="button" data-stage-down title="Move down" ${index === packageDraftStages.length - 1 ? "disabled" : ""}>↓</button><button class="icon-btn danger" type="button" data-stage-remove title="Remove">×</button></div>
      </article>`;
    }).join("") : `<div class="empty compact">No stages yet. “Build Recommended Path” creates the normal progression for the selected entry qualification and target award.</div>`;

    const validation = validatePackage();
    $("packageSmartCheck").className = `notice ${validation.valid ? "success" : "warning"}`;
    $("packageSmartCheck").textContent = validation.message;
    updatePackageSummary();
  }

  function updatePackageSummary() {
    const db = store.read();
    const courses = packageDraftStages.map(stage => db.courses.find(course => course.id === stage.courseId)).filter(Boolean);
    const subtotal = courses.reduce((sum, course) => sum + courseSubtotal(course), 0);
    const tax = courses.reduce((sum, course) => sum + courseTax(course), 0);
    const currency = courses[0]?.currency || "MYR";
    const mixedCurrency = courses.some(course => course.currency !== currency);
    $("packageStageCount").textContent = String(packageDraftStages.length);
    $("packageSubtotal").textContent = mixedCurrency ? "Mixed currencies" : money(subtotal, currency);
    $("packageTax").textContent = mixedCurrency ? "Calculated per course" : money(tax, currency);
    $("packageTotal").textContent = mixedCurrency ? "Calculated per course" : money(subtotal + tax, currency);
  }

  function renderPackages() {
    const db = store.read();
    const items = db.packages.filter(p => p.universityId === universityId);
    $("packageList").innerHTML = items.length ? items.map(pkg => {
      const stages = (pkg.stages || []).map(stage => db.courses.find(course => course.id === stage.courseId)).filter(Boolean);
      const subtotal = stages.reduce((sum, course) => sum + courseSubtotal(course), 0);
      const currency = stages[0]?.currency || "MYR";
      const mixedCurrency = stages.some(course => course.currency !== currency);
      const validation = validateStoredPackage(pkg, db);
      return `<article class="list-card package-card">
        <div class="card-head compact-head">
          <div><h3>${esc(pkg.name)}</h3><p>${esc(pkg.entryQualification)} → ${esc(label(pkg.target || "undergraduate"))}</p></div>
          <div class="card-actions-inline"><span class="status ${pkg.active === false ? "inactive" : "accepted"}">${pkg.active === false ? "Inactive" : "Active"}</span><span class="status ${validation.valid ? "eligible" : "action_required"}">${validation.valid ? "Valid Route" : "Needs Review"}</span><button class="btn-small" type="button" data-edit-package="${esc(pkg.id)}">Edit</button></div>
        </div>
        <div class="pathway-preview"><span class="pathway-entry">${esc(pkg.entryQualification)}</span>${stages.length ? stages.map(course => `<span class="pathway-arrow">→</span><span class="pathway-node"><small>${esc(course.level)}</small>${esc(course.title)}</span>`).join("") : `<span class="pathway-arrow">→</span><span class="pathway-node warning-node">No courses selected</span>`}</div>
        <div class="meta-row"><span class="meta-pill">${pkg.type === "credit_transfer" ? "Credit Transfer" : "Progression"}</span><span class="meta-pill">${stages.length} stages</span><span class="meta-pill">${mixedCurrency ? "Mixed currencies" : money(subtotal, currency)}</span></div>
        ${pkg.notes ? `<p>${esc(pkg.notes)}</p>` : ""}
      </article>`;
    }).join("") : `<div class="empty">No pathway package created yet. Create a route such as SPM → Foundation → Degree, or SPM → Foundation → Degree → Master.</div>`;
  }

  function validateStoredPackage(pkg, db = store.read()) {
    const expected = [];
    for (let rank = entryRank(pkg.entryQualification) + 1; rank <= targetRank(pkg.target || "undergraduate"); rank += 1) expected.push(rank);
    const stages = pkg.stages || [];
    if (stages.length !== expected.length) return { valid: false };
    const courses = stages.map(stage => db.courses.find(course => course.id === stage.courseId));
    if (courses.some(course => !course)) return { valid: false };
    const sequenceValid = courses.every((course, index) => levelRank(course.level) === expected[index]);
    const currencyValid = courses.length < 2 || courses.every(course => course.currency === courses[0].currency);
    return { valid: sequenceValid && currencyValid };
  }

  function submitPackage() {
    const validation = validatePackage();
    if (!validation.valid) { toast(`Pathway cannot be saved yet. ${validation.message}`); return; }
    const db = store.read();
    const stageCourses = packageDraftStages.map(stage => db.courses.find(course => course.id === stage.courseId)).filter(Boolean);
    const payload = {
      name: $("packageName").value.trim(),
      entryQualification: $("packageQualification").value,
      target: $("packageTarget").value,
      type: $("packageType").value,
      stages: deepClone(packageDraftStages),
      courseIds: packageDraftStages.map(stage => stage.courseId),
      coursesText: stageCourses.map(course => course.title).join(" → "),
      notes: $("packageNotes").value.trim(),
      active: $("packageActive").value === "true"
    };
    if (!payload.name) { toast("Enter a pathway package name."); return; }

    if (editingPackageId) {
      store.update(data => {
        const pkg = data.packages.find(p => p.id === editingPackageId && p.universityId === universityId);
        if (pkg) Object.assign(pkg, payload);
      });
      $("packageModal").hidden = true;
      render();
      toast("Pathway package updated and progression validated.");
      resetPackageForm();
      return;
    }
    store.update(data => data.packages.push({ id: makeId("pkg"), universityId, ...payload }));
    $("packageModal").hidden = true;
    render();
    toast("Progression package created.");
    resetPackageForm();
  }

  // ---------------------------------------------------------------------------
  // OFFER BUILDER
  // ---------------------------------------------------------------------------
  function offerRouteCourses() {
    const db = store.read();
    const pkg = db.packages.find(p => p.id === $("offerPackage").value);
    if (pkg) return (pkg.stages || []).map(stage => db.courses.find(course => course.id === stage.courseId)).filter(Boolean);
    const course = db.courses.find(c => c.id === $("offerCourse").value);
    return course ? [course] : [];
  }

  function routeCurrency(courses) {
    if (!courses.length) return "MYR";
    return courses.every(course => course.currency === courses[0].currency) ? courses[0].currency : courses[0].currency || "MYR";
  }

  function scholarshipMatchesRoute(scholarship, courses) {
    if (!(scholarship.courseIds || []).length) return true;
    return courses.some(course => scholarship.courseIds.includes(course.id));
  }

  function scholarshipEligibleBase(scholarship, courses) {
    if (!scholarship) return { base: 0, description: "No scholarship selected." };
    const eligible = (scholarship.courseIds || []).length ? courses.filter(course => scholarship.courseIds.includes(course.id)) : courses;
    if (!eligible.length) return { base: 0, description: "This scholarship does not apply to the selected course/pathway." };
    if (scholarship.scope === "yearly") {
      let base = 0;
      const names = [];
      eligible.forEach(course => normaliseYears(course).forEach(year => {
        if ((scholarship.targetYearIds || []).includes(year.id)) { base += yearFeeBase(course, year); names.push(`${course.title} · ${year.name}`); }
      }));
      return { base, description: names.length ? `Applies to: ${names.join(", ")}` : "No academic year is selected in this scholarship." };
    }
    if (scholarship.scope === "semester") {
      let base = 0;
      const names = [];
      eligible.forEach(course => normaliseYears(course).forEach(year => year.semesters.forEach(semester => {
        if ((scholarship.targetSemesterIds || []).includes(semester.id)) { base += semesterFeeBase(course, year, semester); names.push(`${course.title} · ${year.name} · ${semester.name}`); }
      })));
      return { base, description: names.length ? `Applies to: ${names.join(", ")}` : "No semester is selected in this scholarship." };
    }
    return { base: eligible.reduce((sum, course) => sum + courseSubtotal(course), 0), description: `Applies to the total tuition of ${eligible.map(course => course.title).join(", ")}.` };
  }

  function refreshOfferScholarships() {
    const db = store.read();
    const courses = offerRouteCourses();
    const previous = $("offerScholarship").value;
    const scholarships = db.scholarships.filter(s => s.universityId === universityId && s.active && scholarshipMatchesRoute(s, courses));
    $("offerScholarship").innerHTML = `<option value="">No scholarship</option>` + scholarships.map(s => `<option value="${esc(s.id)}">${esc(s.name)} — ${esc(scholarshipValueLabel(s))}</option>`).join("");
    if (scholarships.some(s => s.id === previous)) $("offerScholarship").value = previous;
  }

  function renderOfferOptions() {
    const db = store.read();
    const apps = db.applications.filter(a => a.universityId === universityId && !["failed", "accepted", "closed_other_offer_accepted"].includes(a.status));
    const currentApp = $("offerApplication").value;
    const currentCourse = $("offerCourse").value;
    const currentPackage = $("offerPackage").value;
    $("offerApplication").innerHTML = `<option value="">Select student application</option>` + apps.map(a => `<option value="${esc(a.id)}">${esc(a.studentName)} — ${esc(a.courseTitle)}</option>`).join("");
    if (apps.some(a => a.id === currentApp)) $("offerApplication").value = currentApp;
    const courses = db.courses.filter(c => c.universityId === universityId && c.active);
    $("offerCourse").innerHTML = `<option value="">Select direct course</option>` + courses.map(c => `<option value="${esc(c.id)}">${esc(c.title)} — ${esc(c.level)}</option>`).join("");
    if (courses.some(c => c.id === currentCourse)) $("offerCourse").value = currentCourse;
    const packages = db.packages.filter(p => p.universityId === universityId && p.active !== false && validateStoredPackage(p, db).valid);
    $("offerPackage").innerHTML = `<option value="">No package — direct course</option>` + packages.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");
    if (packages.some(p => p.id === currentPackage)) $("offerPackage").value = currentPackage;
    $("offerCourse").disabled = Boolean($("offerPackage").value);
    refreshOfferScholarships();
    recalcOffer();
  }

  function syncOfferFromApplication() {
    const db = store.read();
    const app = db.applications.find(a => a.id === $("offerApplication").value);
    if (!app) return;
    $("offerPackage").value = "";
    if (db.courses.some(c => c.id === app.courseId && c.universityId === universityId)) $("offerCourse").value = app.courseId;
    syncOfferRoute();
  }

  function syncOfferRoute() {
    const courses = offerRouteCourses();
    $("offerCourse").disabled = Boolean($("offerPackage").value);
    const subtotal = courses.reduce((sum, course) => sum + courseSubtotal(course), 0);
    const rawTax = courses.reduce((sum, course) => sum + courseTax(course), 0);
    const effectiveTax = subtotal ? rawTax / subtotal * 100 : 0;
    $("offerTuition").value = subtotal.toFixed(2);
    $("offerGst").value = effectiveTax.toFixed(2).replace(/\.00$/, "");
    refreshOfferScholarships();
    syncScholarship(false);
  }

  function syncScholarship(fillTerms = true) {
    const scholarship = store.read().scholarships.find(s => s.id === $("offerScholarship").value);
    $("offerScholarshipPercent").value = "";
    if (fillTerms && scholarship?.maintenanceTerms && !$("offerTerms").value.trim()) $("offerTerms").value = scholarship.maintenanceTerms;
    recalcOffer();
  }

  function recalcOffer() {
    const db = store.read();
    const courses = offerRouteCourses();
    const currency = routeCurrency(courses);
    const tuition = courses.reduce((sum, course) => sum + courseSubtotal(course), 0);
    const scholarship = db.scholarships.find(s => s.id === $("offerScholarship").value);
    const eligibility = scholarshipEligibleBase(scholarship, courses);
    const overrideRaw = $("offerScholarshipPercent").value;
    let discount = 0;
    let displayPct = 0;
    if (scholarship && eligibility.base > 0) {
      if (overrideRaw !== "") {
        displayPct = Math.min(100, Math.max(0, number(overrideRaw)));
        discount = eligibility.base * displayPct / 100;
      } else if (scholarship.discountType === "fixed") {
        discount = Math.min(eligibility.base, Math.max(0, number(scholarship.discountValue)));
        displayPct = eligibility.base ? discount / eligibility.base * 100 : 0;
      } else {
        displayPct = Math.min(100, Math.max(0, number(scholarship.discountValue ?? scholarship.percentage)));
        discount = eligibility.base * displayPct / 100;
      }
    }
    discount = Math.min(discount, tuition);
    const gstPct = Math.max(0, number($("offerGst").value));
    const taxable = Math.max(0, tuition - discount);
    const gst = taxable * gstPct / 100;
    const payable = taxable + gst;
    $("offerTuition").value = tuition.toFixed(2);
    $("calcTuition").textContent = money(tuition, currency);
    $("calcDiscount").textContent = money(discount, currency);
    $("calcGst").textContent = money(gst, currency);
    $("calcPayable").textContent = money(payable, currency);
    $("offerScopeSummary").textContent = scholarship ? `${eligibility.description} Eligible scholarship base: ${money(eligibility.base, currency)}.` : "No scholarship selected.";
    $("offerScopeSummary").className = `scope-summary ${scholarship && eligibility.base <= 0 ? "warning" : scholarship ? "success" : ""}`;
    return { tuition, discount, gstPct, gst, payable, currency, displayPct, eligibleBase: eligibility.base };
  }

  // ---------------------------------------------------------------------------
  // ACCEPTED STUDENTS
  // ---------------------------------------------------------------------------
  function renderAccepted() {
    const db = store.read();
    const offers = db.offers.filter(o => o.universityId === universityId && o.status === "accepted");
    $("acceptedList").innerHTML = offers.length ? offers.map(o => {
      const app = db.applications.find(a => a.id === o.applicationId);
      return `<article class="list-card"><div class="card-head"><div><h3>${esc(app?.studentName || "Student")}</h3><p>${esc(o.packageTitle || o.courseTitle)}</p></div><span class="status accepted">Accepted</span></div><div class="fee-grid"><div class="fee-box"><span>Payable</span><strong>${esc(money(o.payableTotal, o.currency))}</strong></div><div class="fee-box"><span>Scholarship</span><strong>${esc(o.scholarshipName || "None")}</strong></div><div class="fee-box"><span>Formal Letter</span><strong>${esc(o.offerLetterName || "Not uploaded")}</strong></div><div class="fee-box"><span>Signed Return</span><strong>${esc(o.signedLetterName || "Waiting")}</strong></div></div><label class="field"><span>Upload Formal Offer Letter</span><input type="file" data-offer-letter="${esc(o.id)}" accept=".pdf,.jpg,.jpeg,.png" /></label></article>`;
    }).join("") : `<div class="empty">No accepted students yet.</div>`;
  }

  // ---------------------------------------------------------------------------
  // EVENT BINDINGS
  // ---------------------------------------------------------------------------
  $("uApplicationSearch").addEventListener("input", renderApplicationList);
  $("uApplicationStatus").addEventListener("change", renderApplicationList);
  $("uApplicationList").addEventListener("click", event => {
    const card = event.target.closest("[data-app-id]");
    if (!card) return;
    selectedApplicationId = card.dataset.appId;
    renderApplicationList();
  });
  $("uApplicationReview").addEventListener("click", event => {
    const btn = event.target.closest("[data-review-action]");
    if (btn) saveReview(btn.dataset.reviewAction);
  });

  document.querySelector('[data-open-modal="courseModal"]')?.addEventListener("click", resetCourseForm);
  $("courseTable").addEventListener("click", event => {
    const btn = event.target.closest("[data-edit-course]");
    if (btn) editCourse(btn.dataset.editCourse);
  });
  $("addCourseYearBtn").addEventListener("click", () => { courseDraftYears.push(newYear(courseDraftYears.length)); renderCourseBuilder(); });
  $("courseYearsBuilder").addEventListener("input", event => syncCourseDraftInput(event.target));
  $("courseYearsBuilder").addEventListener("click", event => {
    const yearCard = event.target.closest("[data-year-index]");
    if (!yearCard) return;
    const yi = Number(yearCard.dataset.yearIndex);
    const semesterCard = event.target.closest("[data-semester-index]");
    const si = semesterCard ? Number(semesterCard.dataset.semesterIndex) : -1;
    const subjectRow = event.target.closest("[data-subject-index]");
    const subi = subjectRow ? Number(subjectRow.dataset.subjectIndex) : -1;
    if (event.target.closest("[data-add-semester]")) courseDraftYears[yi].semesters.push(newSemester(courseDraftYears[yi].semesters.length));
    else if (event.target.closest("[data-remove-year]") && courseDraftYears.length > 1) courseDraftYears.splice(yi, 1);
    else if (event.target.closest("[data-add-subject]") && si >= 0) courseDraftYears[yi].semesters[si].subjects.push({ id: makeId("sub"), name: "", code: "", credits: 0, fee: 0 });
    else if (event.target.closest("[data-remove-semester]") && si >= 0 && courseDraftYears[yi].semesters.length > 1) courseDraftYears[yi].semesters.splice(si, 1);
    else if (event.target.closest("[data-remove-subject]") && si >= 0 && subi >= 0) courseDraftYears[yi].semesters[si].subjects.splice(subi, 1);
    else return;
    renderCourseBuilder();
  });
  document.querySelectorAll('input[name="courseFeeMode"]').forEach(input => input.addEventListener("change", renderCourseBuilder));
  ["courseTotalFee", "courseGst", "courseCurrency", "courseTaxLabel"].forEach(id => $(id).addEventListener("input", updateCourseSummary));
  $("courseCurrency").addEventListener("change", renderCourseBuilder);
  $("courseTaxLabel").addEventListener("change", updateCourseSummary);
  $("courseForm").addEventListener("submit", event => { event.preventDefault(); submitCourse(); });

  document.querySelector('[data-open-modal="scholarshipModal"]')?.addEventListener("click", resetScholarshipForm);
  $("scholarshipList").addEventListener("click", event => {
    const btn = event.target.closest("[data-edit-scholarship]");
    if (btn) editScholarship(btn.dataset.editScholarship);
  });
  $("scholarshipScope").addEventListener("change", () => { scholarshipDraftTargetIds = []; renderScholarshipTargets(); });
  $("scholarshipCourse").addEventListener("change", () => { scholarshipDraftTargetIds = []; renderScholarshipTargets(); });
  $("scholarshipTargets").addEventListener("change", event => {
    const checkbox = event.target.closest("[data-scholarship-target]");
    if (!checkbox) return;
    scholarshipDraftTargetIds = [...document.querySelectorAll("#scholarshipTargets [data-scholarship-target]:checked")].map(input => input.value);
  });
  $("scholarshipForm").addEventListener("submit", event => { event.preventDefault(); submitScholarship(); });

  document.querySelector('[data-open-modal="packageModal"]')?.addEventListener("click", resetPackageForm);
  $("packageList").addEventListener("click", event => {
    const btn = event.target.closest("[data-edit-package]");
    if (btn) editPackage(btn.dataset.editPackage);
  });
  $("packageQualification").addEventListener("change", () => { packageDraftStages = []; renderPackageBuilder(); });
  $("packageTarget").addEventListener("change", () => { packageDraftStages = []; renderPackageBuilder(); });
  $("autoBuildPackageBtn").addEventListener("click", autoBuildPackage);
  $("addPackageStageBtn").addEventListener("click", () => {
    const expected = expectedPathRanks();
    const rank = expected[packageDraftStages.length] || 0;
    packageDraftStages.push({ id: makeId("stage"), courseId: "", progressionRule: defaultStageRule(rank) });
    renderPackageBuilder();
  });
  $("packageStages").addEventListener("change", event => {
    const stageEl = event.target.closest("[data-stage-index]");
    if (!stageEl) return;
    const index = Number(stageEl.dataset.stageIndex);
    if (event.target.matches("[data-stage-course]")) packageDraftStages[index].courseId = event.target.value;
    renderPackageBuilder();
  });
  $("packageStages").addEventListener("input", event => {
    const stageEl = event.target.closest("[data-stage-index]");
    if (!stageEl || !event.target.matches("[data-stage-rule]")) return;
    packageDraftStages[Number(stageEl.dataset.stageIndex)].progressionRule = event.target.value;
  });
  $("packageStages").addEventListener("click", event => {
    const stageEl = event.target.closest("[data-stage-index]");
    if (!stageEl) return;
    const index = Number(stageEl.dataset.stageIndex);
    if (event.target.closest("[data-stage-remove]")) packageDraftStages.splice(index, 1);
    else if (event.target.closest("[data-stage-up]") && index > 0) [packageDraftStages[index - 1], packageDraftStages[index]] = [packageDraftStages[index], packageDraftStages[index - 1]];
    else if (event.target.closest("[data-stage-down]") && index < packageDraftStages.length - 1) [packageDraftStages[index + 1], packageDraftStages[index]] = [packageDraftStages[index], packageDraftStages[index + 1]];
    else return;
    renderPackageBuilder();
  });
  $("packageForm").addEventListener("submit", event => { event.preventDefault(); submitPackage(); });

  $("offerApplication").addEventListener("change", syncOfferFromApplication);
  $("offerCourse").addEventListener("change", syncOfferRoute);
  $("offerPackage").addEventListener("change", syncOfferRoute);
  $("offerScholarship").addEventListener("change", () => syncScholarship(true));
  ["offerScholarshipPercent", "offerGst"].forEach(id => $(id).addEventListener("input", recalcOffer));

  $("offerForm").addEventListener("submit", event => {
    event.preventDefault();
    const db = store.read();
    const app = db.applications.find(a => a.id === $("offerApplication").value);
    const pkg = db.packages.find(p => p.id === $("offerPackage").value);
    const courses = offerRouteCourses();
    const finalCourse = courses[courses.length - 1];
    if (!app || !finalCourse) { toast("Select a student application and a valid course or pathway package."); return; }
    if (app.academicDecision !== "eligible") { toast("Academic eligibility must be marked Eligible before an offer is sent."); return; }
    if (!["sufficient", "scholarship_needed"].includes(app.financialDecision)) { toast("Complete the financial assessment before an offer is sent."); return; }
    const calc = recalcOffer();
    const scholarship = db.scholarships.find(s => s.id === $("offerScholarship").value);
    store.createOffer({
      applicationId: app.id,
      studentId: app.studentId,
      universityId,
      courseTitle: finalCourse.title,
      courseIds: courses.map(course => course.id),
      packageTitle: pkg?.name || "",
      packageId: pkg?.id || "",
      scholarshipName: scholarship?.name || "",
      scholarshipId: scholarship?.id || "",
      scholarshipPercentage: calc.displayPct,
      scholarshipScope: scholarship?.scope || "",
      scholarshipEligibleBase: calc.eligibleBase,
      tuitionBeforeDiscount: calc.tuition,
      discountAmount: calc.discount,
      gstPercent: calc.gstPct,
      gstAmount: calc.gst,
      payableTotal: calc.payable,
      currency: calc.currency,
      terms: $("offerTerms").value.trim()
    });
    render();
    toast("Conditional offer sent with the calculated route and scholarship scope.");
  });

  $("acceptedList").addEventListener("change", event => {
    const input = event.target.closest("[data-offer-letter]");
    if (!input || !input.files?.[0]) return;
    const file = input.files[0];
    store.update(db => { const offer = db.offers.find(o => o.id === input.dataset.offerLetter); if (offer) offer.offerLetterName = file.name; });
    renderAccepted();
    toast("Formal offer-letter filename saved in preview. Supabase Storage can be connected in the backend phase.");
  });

  $("officerLogoutBtn").addEventListener("click", () => { store.clearStaffSession(); window.location.href = "/pages/staff-login.html"; });

  render();
});
