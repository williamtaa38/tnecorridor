document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const store = window.TNEAdmissions;
  if (!store) return;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const money = (value, currency="MYR") => `${currency} ${Number(value || 0).toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const label = value => String(value || "").replaceAll("_", " ");

  let session = store.getStaffSession();
  if (!session || session.role !== "university_officer") {
    session = { role:"university_officer", name:"Admissions Officer", email:"preview", universityId:"UOSM", preview:true };
  }
  const universityId = session.universityId || "UOSM";
  let selectedApplicationId = "";
  let editingCourseId = "";

  $("officerName").textContent = session.name || "University Officer";
  $("officerEmail").textContent = session.email || "";
  $("universityHeading").textContent = store.universityName(universityId);

  function toast(message) {
    const el = $("universityToast"); el.textContent = message; el.classList.add("show");
    clearTimeout(window.__uniToast); window.__uniToast = setTimeout(() => el.classList.remove("show"), 2800);
  }
  function openModal(id) { if ($(id)) $(id).hidden = false; }
  function closeModal(btn) { const modal = btn.closest(".modal"); if (modal) modal.hidden = true; }

  document.querySelectorAll("[data-open-modal]").forEach(btn => btn.addEventListener("click", () => openModal(btn.dataset.openModal)));
  document.querySelectorAll("[data-close-modal]").forEach(btn => btn.addEventListener("click", () => closeModal(btn)));
  document.querySelectorAll(".modal").forEach(modal => modal.addEventListener("click", e => { if (e.target === modal) modal.hidden = true; }));

  $("universityNav").addEventListener("click", e => {
    const btn = e.target.closest("button[data-panel]"); if (!btn) return;
    document.querySelectorAll("#universityNav button").forEach(b => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".adm-panel").forEach(p => p.classList.toggle("active", p.id === `panel-${btn.dataset.panel}`));
    render();
  });

  function render() {
    const db = store.read();
    const apps = db.applications.filter(a => a.universityId === universityId);
    const offers = db.offers.filter(o => o.universityId === universityId);
    $("uStatNew").textContent = apps.filter(a => ["submitted","under_review"].includes(a.status)).length;
    $("uStatAction").textContent = apps.filter(a => a.status === "action_required").length;
    $("uStatOffers").textContent = offers.filter(o => ["sent","accepted"].includes(o.status)).length;
    $("uStatAccepted").textContent = offers.filter(o => o.status === "accepted").length;
    renderApplicationList(); renderCourses(); renderScholarships(); renderPackages(); renderOfferOptions(); renderAccepted();
  }

  function renderApplicationList() {
    const db = store.read();
    const q = ($("uApplicationSearch").value || "").toLowerCase(); const st = $("uApplicationStatus").value;
    const apps = db.applications.filter(a => a.universityId === universityId && (!st || a.status === st) && (!q || [a.studentName,a.studentEmail,a.courseTitle,a.qualification].join(" ").toLowerCase().includes(q)));
    $("uApplicationList").innerHTML = apps.length ? apps.map(a => `<article class="list-card clickable ${a.id===selectedApplicationId?"selected":""}" data-app-id="${esc(a.id)}"><div style="display:flex;justify-content:space-between;gap:10px;"><div><h3>${esc(a.studentName)}</h3><p>${esc(a.courseTitle)}</p></div><span class="status ${esc(a.status)}">${esc(label(a.status))}</span></div><div class="meta-row"><span class="meta-pill">${esc(a.qualification)}</span><span class="meta-pill">${esc(a.financialBand || "Budget not stated")}</span></div></article>`).join("") : `<div class="empty">No applications match this view.</div>`;
    if (selectedApplicationId) renderReview(selectedApplicationId);
  }

  function renderReview(id) {
    const db = store.read(); const a = db.applications.find(x => x.id === id && x.universityId === universityId);
    if (!a) { $("uApplicationReview").innerHTML = `<div class="empty">Select an application to begin review.</div>`; return; }
    const allowed = store.qualificationAllowedLevels(a.qualification);
    const course = db.courses.find(c => c.id === a.courseId);
    const smartEligible = course ? store.isCourseLevelAllowed(a.qualification, course.level) : true;
    $("uApplicationReview").innerHTML = `
      <div class="card-head"><div><span class="adm-kicker">Application Review</span><h2>${esc(a.studentName)}</h2><p>${esc(a.studentEmail)}</p></div><span class="status ${esc(a.status)}">${esc(label(a.status))}</span></div>
      <div class="info-grid">
        <div class="info-box"><span>Qualification</span><strong>${esc(a.qualification)}</strong></div>
        <div class="info-box"><span>Applied Course</span><strong>${esc(a.courseTitle)}</strong></div>
        <div class="info-box"><span>Financial Band</span><strong>${esc(a.financialBand || "Not provided")}</strong></div>
        <div class="info-box"><span>Smart progression guide</span><strong>${esc(allowed.join(" / "))}</strong></div>
      </div>
      <div class="notice ${smartEligible?"success":"warning"}" style="margin:14px 0;">${smartEligible ? "The course level is consistent with the student's stated qualification pathway." : `This course level may not match the progression rule. Consider a package such as ${esc(allowed.join(" or "))} first.`}</div>
      <div class="field-grid">
        <label class="field"><span>Academic Eligibility</span><select id="reviewAcademic"><option value="pending" ${a.academicDecision==="pending"?"selected":""}>Pending Review</option><option value="eligible" ${a.academicDecision==="eligible"?"selected":""}>Eligible</option><option value="not_eligible" ${a.academicDecision==="not_eligible"?"selected":""}>Not Eligible</option></select></label>
        <label class="field"><span>Financial Ability</span><select id="reviewFinancial"><option value="pending" ${a.financialDecision==="pending"?"selected":""}>Pending Review</option><option value="sufficient" ${a.financialDecision==="sufficient"?"selected":""}>Sufficient</option><option value="scholarship_needed" ${a.financialDecision==="scholarship_needed"?"selected":""}>Scholarship Needed</option><option value="insufficient" ${a.financialDecision==="insufficient"?"selected":""}>Insufficient</option></select></label>
        <label class="field full"><span>Request Missing Documents</span><input id="reviewMissing" value="${esc((a.missingDocuments||[]).join(", "))}" placeholder="Passport, result slip, bank statement..." /></label>
        <label class="field full"><span>Message to Student</span><textarea id="reviewNote" placeholder="Explain eligibility, missing items or next steps.">${esc(a.officerNote || "")}</textarea></label>
      </div>
      <div style="margin-top:14px;"><strong>Documents:</strong> <span style="color:var(--adm-muted)">${esc((a.documents||[]).join(", ") || "No documents uploaded yet")}</span></div>
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
      if (!["sufficient","scholarship_needed"].includes(financialDecision)) { toast("Complete the financial review before preparing an offer."); return; }
      status = "under_review";
    }
    store.patchApplication(selectedApplicationId, { academicDecision, financialDecision, missingDocuments: missing, officerNote: note, status });
    render();
    if (action === "ready_offer") {
      $("offerApplication").value = selectedApplicationId; syncOfferFromApplication();
      document.querySelector('#universityNav [data-panel="offers"]').click();
      toast("Application loaded into Offer Builder.");
    } else toast("Application review updated in preview data.");
  }

  function renderCourses() {
    const db = store.read(); const courses = db.courses.filter(c => c.universityId === universityId);
    $("courseTable").innerHTML = courses.length ? courses.map(c => `<tr>
      <td><strong>${esc(c.title)}</strong><br><small>${esc(c.id)}</small></td>
      <td>${esc(c.level)}</td>
      <td>${esc(c.duration || "—")}</td>
      <td>${esc(money(c.totalFee,c.currency))}</td>
      <td>${Number(c.gstPercent||0)}%</td>
      <td><span class="status ${c.active?"accepted":"inactive"}">${c.active?"Active":"Inactive"}</span></td>
      <td><button class="btn-small" type="button" data-edit-course="${esc(c.id)}">Edit</button></td>
    </tr>`).join("") : `<tr><td colspan="7">No courses created yet.</td></tr>`;
    const options = courses.filter(c => c.active).map(c => `<option value="${esc(c.id)}">${esc(c.title)} — ${esc(c.level)}</option>`).join("");
    $("scholarshipCourse").innerHTML = options;
  }

  function resetCourseForm() {
    editingCourseId = "";
    $("courseForm").reset();
    $("courseEditId").value = "";
    $("courseCurrency").value = "MYR";
    $("courseGst").value = "0";
    $("courseActive").value = "true";
    $("courseModalTitle").textContent = "Create Course";
    $("courseSubmitBtn").textContent = "Save Course";
  }

  function editCourse(courseId) {
    const db = store.read();
    const course = db.courses.find(c => c.id === courseId && c.universityId === universityId);
    if (!course) { toast("Course not found."); return; }
    editingCourseId = course.id;
    $("courseEditId").value = course.id;
    $("courseName").value = course.title || "";
    $("courseLevel").value = course.level || "Foundation";
    $("courseDuration").value = course.duration || "";
    $("courseCurrency").value = course.currency || "MYR";
    $("courseTotalFee").value = Number(course.totalFee || 0);
    $("courseGst").value = Number(course.gstPercent || 0);
    $("courseActive").value = course.active === false ? "false" : "true";
    $("courseBreakdown").value = course.breakdownText || "";
    $("courseModalTitle").textContent = "Edit Course";
    $("courseSubmitBtn").textContent = "Update Course";
    openModal("courseModal");
  }

  function renderScholarships() {
    const db = store.read(); const items = db.scholarships.filter(s => s.universityId === universityId);
    $("scholarshipList").innerHTML = items.length ? items.map(s => `<article class="list-card"><div style="display:flex;justify-content:space-between;gap:12px;"><div><h3>${esc(s.name)}</h3><p><strong>${Number(s.percentage||0)}% discount</strong> · ${s.scope === "per_semester" ? "Semester-specific" : "Whole course"}</p></div><span class="status ${s.active?"accepted":"inactive"}">${s.active?"Active":"Inactive"}</span></div><p>Course: ${esc((s.courseIds||[]).map(store.courseTitle).join(", ") || "All eligible courses")}</p><p>${esc(s.semesterRules?.join?.(", ") || "")}</p><p><strong>Maintenance:</strong> ${esc(s.maintenanceTerms || "No maintenance terms entered")}</p></article>`).join("") : `<div class="empty">No scholarships created yet.</div>`;
  }

  function renderPackages() {
    const db = store.read(); const items = db.packages.filter(p => p.universityId === universityId);
    $("packageList").innerHTML = items.length ? items.map(p => `<article class="list-card"><div style="display:flex;justify-content:space-between;gap:12px;"><div><h3>${esc(p.name)}</h3><p>${esc(p.coursesText)}</p></div><span class="status under_review">${p.type === "credit_transfer" ? "Credit Transfer" : "Progression"}</span></div><div class="meta-row"><span class="meta-pill">Entry: ${esc(p.entryQualification)}</span></div><p>${esc(p.notes || "")}</p></article>`).join("") : `<div class="empty">No pathway package created yet. You can create Foundation + Degree or credit-transfer combinations here.</div>`;
  }

  function renderOfferOptions() {
    const db = store.read();
    const apps = db.applications.filter(a => a.universityId === universityId && !["failed","accepted","closed_other_offer_accepted"].includes(a.status));
    const currentAppValue = $("offerApplication").value;
    $("offerApplication").innerHTML = `<option value="">Select student application</option>` + apps.map(a => `<option value="${esc(a.id)}">${esc(a.studentName)} — ${esc(a.courseTitle)}</option>`).join("");
    if (apps.some(a => a.id === currentAppValue)) $("offerApplication").value = currentAppValue;
    const courses = db.courses.filter(c => c.universityId === universityId && c.active);
    $("offerCourse").innerHTML = courses.map(c => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join("");
    $("offerPackage").innerHTML = `<option value="">No package</option>` + db.packages.filter(p => p.universityId === universityId).map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");
    $("offerScholarship").innerHTML = `<option value="">No scholarship</option>` + db.scholarships.filter(s => s.universityId === universityId && s.active).map(s => `<option value="${esc(s.id)}">${esc(s.name)} — ${Number(s.percentage||0)}%</option>`).join("");
    recalcOffer();
  }

  function syncOfferFromApplication() {
    const db = store.read(); const app = db.applications.find(a => a.id === $("offerApplication").value); if (!app) return;
    if (db.courses.some(c => c.id === app.courseId)) $("offerCourse").value = app.courseId;
    syncOfferFromCourse();
  }
  function syncOfferFromCourse() {
    const db = store.read(); const course = db.courses.find(c => c.id === $("offerCourse").value); if (!course) return;
    $("offerTuition").value = Number(course.totalFee || 0); $("offerGst").value = Number(course.gstPercent || 0); recalcOffer();
  }
  function syncScholarship() {
    const db = store.read(); const s = db.scholarships.find(x => x.id === $("offerScholarship").value);
    $("offerScholarshipPercent").value = s ? Number(s.percentage || 0) : 0;
    if (s?.maintenanceTerms && !$("offerTerms").value.trim()) $("offerTerms").value = s.maintenanceTerms;
    recalcOffer();
  }
  function recalcOffer() {
    const tuition = Number($("offerTuition").value || 0); const pct = Math.min(100,Math.max(0,Number($("offerScholarshipPercent").value || 0))); const gstPct = Math.max(0,Number($("offerGst").value || 0));
    const discount = tuition * pct / 100; const net = tuition - discount; const gst = net * gstPct / 100; const payable = net + gst;
    $("calcTuition").textContent = money(tuition); $("calcDiscount").textContent = money(discount); $("calcGst").textContent = money(gst); $("calcPayable").textContent = money(payable);
    return { tuition, pct, gstPct, discount, gst, payable };
  }

  function renderAccepted() {
    const db = store.read(); const offers = db.offers.filter(o => o.universityId === universityId && o.status === "accepted");
    $("acceptedList").innerHTML = offers.length ? offers.map(o => {
      const app = db.applications.find(a => a.id === o.applicationId);
      return `<article class="list-card"><div class="card-head"><div><h3>${esc(app?.studentName || "Student")}</h3><p>${esc(o.courseTitle)}</p></div><span class="status accepted">Accepted</span></div><div class="fee-grid"><div class="fee-box"><span>Payable</span><strong>${esc(money(o.payableTotal,o.currency))}</strong></div><div class="fee-box"><span>Scholarship</span><strong>${Number(o.scholarshipPercentage||0)}%</strong></div><div class="fee-box"><span>Formal Letter</span><strong>${esc(o.offerLetterName || "Not uploaded")}</strong></div><div class="fee-box"><span>Signed Return</span><strong>${esc(o.signedLetterName || "Waiting")}</strong></div></div><label class="field"><span>Upload Formal Offer Letter</span><input type="file" data-offer-letter="${esc(o.id)}" accept=".pdf,.jpg,.jpeg,.png" /></label></article>`;
    }).join("") : `<div class="empty">No accepted students yet.</div>`;
  }

  $("uApplicationSearch").addEventListener("input", renderApplicationList);
  $("uApplicationStatus").addEventListener("change", renderApplicationList);
  $("uApplicationList").addEventListener("click", e => { const card = e.target.closest("[data-app-id]"); if (!card) return; selectedApplicationId = card.dataset.appId; renderApplicationList(); });
  $("uApplicationReview").addEventListener("click", e => { const btn = e.target.closest("[data-review-action]"); if (btn) saveReview(btn.dataset.reviewAction); });

  document.querySelector('[data-open-modal="courseModal"]')?.addEventListener("click", resetCourseForm);

  $("courseTable").addEventListener("click", e => {
    const btn = e.target.closest("[data-edit-course]");
    if (btn) editCourse(btn.dataset.editCourse);
  });

  $("courseForm").addEventListener("submit", e => {
    e.preventDefault();
    const payload = {
      title:$("courseName").value.trim(),
      level:$("courseLevel").value,
      duration:$("courseDuration").value.trim(),
      currency:$("courseCurrency").value,
      totalFee:Number($("courseTotalFee").value||0),
      gstPercent:Number($("courseGst").value||0),
      active:$("courseActive").value === "true",
      breakdownText:$("courseBreakdown").value.trim()
    };
    if (editingCourseId) {
      store.update(db => {
        const course = db.courses.find(c => c.id === editingCourseId && c.universityId === universityId);
        if (course) Object.assign(course, payload);
      });
      $("courseModal").hidden = true;
      render();
      toast("Course updated successfully in front-end preview.");
      resetCourseForm();
      return;
    }
    const id = `${universityId}_${payload.title.toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_|_$/g,"")}_${Date.now().toString().slice(-4)}`;
    store.update(db => db.courses.push({ id, universityId, ...payload, semesters:[] }));
    $("courseModal").hidden = true;
    render();
    toast("Course saved to front-end preview.");
    resetCourseForm();
  });

  $("scholarshipForm").addEventListener("submit", e => {
    e.preventDefault();
    store.update(db => db.scholarships.push({ id:store.uid("sch"), universityId, name:$("scholarshipName").value.trim(), percentage:Number($("scholarshipPercent").value||0), scope:$("scholarshipScope").value, courseIds:[$("scholarshipCourse").value].filter(Boolean), semesterRules:[$("scholarshipSemester").value.trim()].filter(Boolean), maintenanceTerms:$("scholarshipTerms").value.trim(), active:true }));
    e.target.reset(); $("scholarshipModal").hidden = true; render(); toast("Scholarship saved to front-end preview.");
  });

  $("packageForm").addEventListener("submit", e => {
    e.preventDefault(); store.update(db => db.packages.push({ id:store.uid("pkg"), universityId, name:$("packageName").value.trim(), entryQualification:$("packageQualification").value, type:$("packageType").value, coursesText:$("packageCourses").value.trim(), notes:$("packageNotes").value.trim(), active:true }));
    e.target.reset(); $("packageModal").hidden = true; render(); toast("Pathway package saved.");
  });

  $("offerApplication").addEventListener("change", syncOfferFromApplication);
  $("offerCourse").addEventListener("change", syncOfferFromCourse);
  $("offerScholarship").addEventListener("change", syncScholarship);
  ["offerScholarshipPercent","offerGst","offerTuition"].forEach(id => $(id).addEventListener("input", recalcOffer));

  $("offerForm").addEventListener("submit", e => {
    e.preventDefault(); const db = store.read(); const app = db.applications.find(a => a.id === $("offerApplication").value); const course = db.courses.find(c => c.id === $("offerCourse").value);
    if (!app || !course) { toast("Select a student application and course."); return; }
    if (app.academicDecision !== "eligible") { toast("Academic eligibility must be marked Eligible before an offer is sent."); return; }
    if (!["sufficient","scholarship_needed"].includes(app.financialDecision)) { toast("Complete the financial assessment before an offer is sent."); return; }
    const calc = recalcOffer(); const scholarship = db.scholarships.find(s => s.id === $("offerScholarship").value); const pkg = db.packages.find(p => p.id === $("offerPackage").value);
    store.createOffer({ applicationId:app.id, studentId:app.studentId, universityId, courseTitle:course.title, packageTitle:pkg?.name || "", scholarshipName:scholarship?.name || "", scholarshipPercentage:calc.pct, tuitionBeforeDiscount:calc.tuition, discountAmount:calc.discount, gstPercent:calc.gstPct, gstAmount:calc.gst, payableTotal:calc.payable, currency:course.currency || "MYR", terms:$("offerTerms").value.trim() });
    render(); toast("Conditional offer sent in front-end preview.");
  });

  $("acceptedList").addEventListener("change", e => {
    const input = e.target.closest("[data-offer-letter]"); if (!input || !input.files?.[0]) return;
    const file = input.files[0]; store.update(db => { const offer = db.offers.find(o => o.id === input.dataset.offerLetter); if (offer) offer.offerLetterName = file.name; }); renderAccepted(); toast("Formal offer-letter filename saved in preview. Supabase Storage comes next.");
  });

  $("officerLogoutBtn").addEventListener("click", () => { store.clearStaffSession(); window.location.href = "/pages/staff-login.html"; });
  render();
});
