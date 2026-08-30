document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const store = window.TNEAdmissions;
  if (!store) return;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const label = value => String(value || "").replaceAll("_", " ");
  const money = (value, currency="MYR") => `${currency} ${Number(value || 0).toLocaleString("en-MY", { maximumFractionDigits:2 })}`;
  const fmtDate = value => value ? new Date(value).toLocaleDateString("en-MY", { day:"2-digit", month:"short", year:"numeric" }) : "—";

  let student = store.syncCurrentStudent();

  function toast(message) {
    const el = $("studentToast"); el.textContent = message; el.classList.add("show");
    clearTimeout(window.__studentToast); window.__studentToast = setTimeout(() => el.classList.remove("show"), 3000);
  }
  function openModal(id) { if ($(id)) $(id).hidden = false; }
  function closeModal(btn) { const modal = btn.closest(".modal"); if (modal) modal.hidden = true; }

  document.querySelectorAll("[data-close-modal]").forEach(btn => btn.addEventListener("click", () => closeModal(btn)));
  document.querySelectorAll(".modal").forEach(modal => modal.addEventListener("click", e => { if (e.target === modal) modal.hidden = true; }));

  $("studentNav").addEventListener("click", e => {
    const btn = e.target.closest("button[data-panel]"); if (!btn) return;
    document.querySelectorAll("#studentNav button").forEach(b => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".adm-panel").forEach(p => p.classList.toggle("active", p.id === `panel-${btn.dataset.panel}`));
  });

  function getStudentApplications(db) {
    return db.applications.filter(a => a.studentId === student.id || String(a.studentEmail).toLowerCase() === String(student.email).toLowerCase());
  }
  function getStudentOffers(db) {
    const appIds = new Set(getStudentApplications(db).map(a => a.id));
    return db.offers.filter(o => o.studentId === student.id || appIds.has(o.applicationId));
  }
  function acceptedOffer(db) { return getStudentOffers(db).find(o => o.status === "accepted"); }

  function timelineHtml(status) {
    const order = ["submitted","under_review","action_required","conditional_offer","accepted"];
    let pos = order.indexOf(status);
    if (status === "draft") pos = -1;
    if (["failed","offer_rejected","closed_other_offer_accepted"].includes(status)) pos = Math.max(1,pos);
    return `<div class="timeline">${order.map((s,i) => `<div class="timeline-step ${i <= pos ? "done" : ""}">${esc(label(s))}</div>`).join("")}</div>`;
  }

  function render() {
    student = store.syncCurrentStudent();
    const db = store.read(); const apps = getStudentApplications(db); const offers = getStudentOffers(db); const accepted = acceptedOffer(db);
    $("studentFirstName").textContent = (student.name || "Student").split(" ")[0];
    $("studentName").textContent = student.name || "Student";
    $("studentEmail").textContent = student.email || "";
    $("studentQualification").textContent = `Qualification: ${student.qualification || "Not set"}`;
    $("sStatApplications").textContent = apps.length;
    $("sStatAction").textContent = apps.filter(a => a.status === "action_required").length;
    $("sStatOffers").textContent = offers.filter(o => ["sent","accepted"].includes(o.status)).length;
    $("sStatAccepted").textContent = accepted ? 1 : 0;
    $("newApplicationBtn").disabled = Boolean(accepted);
    $("applicationRuleNotice").className = `notice ${accepted ? "success" : ""}`;
    $("applicationRuleNotice").innerHTML = accepted
      ? `<strong>Final choice confirmed:</strong> You accepted ${esc(store.universityName(accepted.universityId))}. New university applications are disabled because only one university may be chosen.`
      : `<strong>Flexible application history:</strong> You can start another application if you change your preference, an application is unsuccessful, or a university requests resubmission.`;

    renderApplications(apps); renderOffers(offers, accepted); renderPreferences(db, accepted); renderDocuments(apps, offers); populateApplicationCourses(db);
  }

  function renderApplications(apps) {
    $("studentApplicationList").innerHTML = apps.length ? apps.map(a => {
      const editable = ["draft","action_required"].includes(a.status);
      return `<article class="list-card">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;"><div><h3>${esc(a.courseTitle)}</h3><p>${esc(store.universityName(a.universityId))}</p></div><span class="status ${esc(a.status)}">${esc(label(a.status))}</span></div>
        ${timelineHtml(a.status)}
        <div class="info-grid" style="margin-top:14px;"><div class="info-box"><span>Qualification</span><strong>${esc(a.qualification)}</strong></div><div class="info-box"><span>Submitted / Updated</span><strong>${esc(fmtDate(a.updatedAt))}</strong></div></div>
        ${a.officerNote ? `<div class="notice ${a.status === "action_required" ? "warning" : ""}" style="margin-top:14px;"><strong>University message:</strong> ${esc(a.officerNote)}</div>` : ""}
        ${(a.missingDocuments||[]).length ? `<div class="notice warning" style="margin-top:10px;"><strong>Missing / required:</strong> ${esc(a.missingDocuments.join(", "))}</div>` : ""}
        <div class="offer-actions">
          ${editable ? `<button class="btn-primary" data-edit-application="${esc(a.id)}">${a.status === "action_required" ? "Edit & Resubmit" : "Continue Draft"}</button>` : ""}
          ${!["accepted","closed_other_offer_accepted"].includes(a.status) ? `<button class="btn-secondary" data-duplicate-application="${esc(a.id)}">Start New Application</button>` : ""}
        </div>
      </article>`;
    }).join("") : `<div class="empty"><h3>No application yet</h3><p>Start from one of your preferred courses, or create a new application.</p><button class="btn-primary" id="emptyNewApplication">Start First Application</button></div>`;
    $("emptyNewApplication")?.addEventListener("click", () => openNewApplication());
  }

  function renderOffers(offers, accepted) {
    $("studentOfferList").innerHTML = offers.length ? offers.map(o => {
      const disabled = Boolean(accepted && accepted.id !== o.id);
      return `<article class="offer-card"><div class="offer-top"><div><span class="adm-kicker">${esc(store.universityName(o.universityId))}</span><h3>${esc(o.packageTitle || o.courseTitle)}</h3><p style="color:var(--adm-muted);margin:7px 0 0;">${esc(o.terms || "Review the offer conditions before responding.")}</p></div><span class="status ${esc(o.status)}">${esc(label(o.status))}</span></div>
        <div class="fee-grid"><div class="fee-box"><span>Tuition</span><strong>${esc(money(o.tuitionBeforeDiscount,o.currency))}</strong></div><div class="fee-box"><span>Scholarship</span><strong>${Number(o.scholarshipPercentage||0)}%</strong></div><div class="fee-box"><span>Discount</span><strong>${esc(money(o.discountAmount,o.currency))}</strong></div><div class="fee-box"><span>Estimated Payable</span><strong>${esc(money(o.payableTotal,o.currency))}</strong></div></div>
        ${o.scholarshipName ? `<div class="notice success"><strong>${esc(o.scholarshipName)}</strong> applied to this offer.</div>` : ""}
        ${o.offerLetterName ? `<div class="notice" style="margin-top:10px;"><strong>Formal Offer Letter:</strong> ${esc(o.offerLetterName)}</div>` : ""}
        ${o.signedLetterName ? `<div class="notice success" style="margin-top:10px;"><strong>Signed copy returned:</strong> ${esc(o.signedLetterName)}</div>` : ""}
        <div class="offer-actions">
          ${o.status === "sent" ? `<button class="btn-primary" data-accept-offer="${esc(o.id)}" ${disabled?"disabled":""}>Accept Offer</button><button class="btn-danger" data-reject-offer="${esc(o.id)}" ${disabled?"disabled":""}>Reject Offer</button>` : ""}
          ${o.status === "accepted" && o.offerLetterName && !o.signedLetterName ? `<button class="btn-primary" data-sign-offer="${esc(o.id)}">Upload Signed Offer Letter</button>` : ""}
        </div></article>`;
    }).join("") : `<div class="empty">No university offers have been issued yet.</div>`;
  }

  function renderPreferences(db, accepted) {
    const allowed = store.qualificationAllowedLevels(student.qualification);
    $("qualificationGuide").innerHTML = `<strong>${esc(student.qualification || "Current qualification")} pathway:</strong> Recommended next level: ${esc(allowed.join(" or "))}. University officers can create a packaged pathway (for example Foundation + Degree) or assess Diploma credit transfer.`;
    const preferences = Array.isArray(student.selectedCourses) ? student.selectedCourses : [];
    $("preferenceGrid").innerHTML = preferences.length ? preferences.map((course,index) => {
      const level = course.level || ""; const eligible = store.isCourseLevelAllowed(student.qualification, level);
      const uniId = course.universityCode || course.universityId || ""; const courseId = course.courseCode || course.id || "";
      return `<article class="choice-card"><span class="adm-kicker">Choice ${index+1}</span><h3>${esc(course.Title || course.title || "Course")}</h3><p>${esc(store.universityName(uniId))}</p><p>${esc(level || "Level not stated")}</p><div class="notice ${eligible?"success":"warning"}" style="margin-top:12px;">${eligible ? "Suitable next-study level based on your current qualification." : `Direct entry may not fit the progression rule. Ask the university for a ${esc(allowed.join(" / "))} pathway package.`}</div><div class="choice-actions"><button class="btn-primary" data-apply-preference="${esc(courseId)}" data-uni="${esc(uniId)}" ${accepted?"disabled":""}>Apply</button></div></article>`;
    }).join("") : `<div class="empty" style="grid-column:1/-1;">No saved course preferences were found. <a href="/pages/student-onboarding.html" style="color:var(--adm-gold)">Return to onboarding to select up to 3 courses.</a></div>`;
  }

  function renderDocuments(apps, offers) {
    const blocks = apps.map(a => `<article class="list-card"><h3>${esc(a.courseTitle)}</h3><p>${esc(store.universityName(a.universityId))}</p><p><strong>Student documents:</strong> ${esc((a.documents||[]).join(", ") || "No documents uploaded")}</p>${(a.missingDocuments||[]).length ? `<p><strong>Requested:</strong> ${esc(a.missingDocuments.join(", "))}</p>` : ""}</article>`);
    offers.filter(o => o.offerLetterName || o.signedLetterName).forEach(o => blocks.push(`<article class="list-card"><h3>${esc(store.universityName(o.universityId))} Offer Documents</h3><p><strong>Formal offer:</strong> ${esc(o.offerLetterName || "Not uploaded yet")}</p><p><strong>Signed return:</strong> ${esc(o.signedLetterName || "Not returned yet")}</p></article>`));
    $("studentDocumentsList").innerHTML = blocks.length ? blocks.join("") : `<div class="empty">No application documents yet.</div>`;
  }

  function populateApplicationCourses(db) {
    const preferred = (student.selectedCourses || []).map(c => ({ id:c.courseCode || c.id, universityId:c.universityCode || c.universityId, title:c.Title || c.title, level:c.level || "" })).filter(c => c.id && c.universityId);
    const all = [...preferred];
    db.courses.forEach(c => { if (!all.some(x => x.id === c.id)) all.push({ id:c.id, universityId:c.universityId, title:c.title, level:c.level }); });
    $("applicationCourse").innerHTML = `<option value="">Select a course</option>` + all.map(c => `<option value="${esc(c.id)}" data-university="${esc(c.universityId)}" data-level="${esc(c.level)}">${esc(store.universityName(c.universityId))} — ${esc(c.title)} (${esc(c.level || "Programme")})</option>`).join("");
  }

  function updateEligibilityHint() {
    const option = $("applicationCourse").selectedOptions[0]; if (!option || !option.value) { $("applicationEligibilityHint").textContent = ""; return true; }
    const eligible = store.isCourseLevelAllowed(student.qualification, option.dataset.level);
    $("applicationEligibilityHint").textContent = eligible ? "✓ This level matches your current progression stage." : `⚠ Direct entry may not match. Recommended next level: ${store.qualificationAllowedLevels(student.qualification).join(" / ")}. You can still submit a pathway request for officer assessment.`;
    $("applicationEligibilityHint").style.color = eligible ? "#76ebb3" : "#ffd37a";
    return eligible;
  }

  function openNewApplication(courseId="") {
    const db = store.read(); if (acceptedOffer(db)) { toast("You already accepted a university. Only one university can be chosen."); return; }
    $("applicationModalTitle").textContent = "Start New Application"; $("editApplicationId").value = ""; $("studentApplicationForm").reset();
    $("applicationQualification").value = student.qualification || ""; $("applicationBudget").value = student.budgetRange || ""; populateApplicationCourses(db);
    if (courseId) $("applicationCourse").value = courseId; updateEligibilityHint(); openModal("applicationModal");
  }

  function openEditApplication(id) {
    const db = store.read(); const app = getStudentApplications(db).find(a => a.id === id); if (!app) return;
    $("applicationModalTitle").textContent = app.status === "action_required" ? "Edit & Resubmit Application" : "Continue Draft";
    $("editApplicationId").value = app.id; populateApplicationCourses(db); $("applicationCourse").value = app.courseId; $("applicationQualification").value = app.qualification; $("applicationBudget").value = app.financialBand || ""; $("applicationPathway").value = app.pathwayRequest || ""; updateEligibilityHint(); openModal("applicationModal");
  }

  function saveApplication(status) {
    const selected = $("applicationCourse").selectedOptions[0]; if (!selected || !selected.value) { toast("Select a university and course first."); return; }
    const files = Array.from($("applicationDocuments").files || []).map(f => f.name); const editId = $("editApplicationId").value;
    if (editId) {
      const db = store.read(); const current = db.applications.find(a => a.id === editId);
      store.patchApplication(editId, { universityId:selected.dataset.university, courseId:selected.value, courseTitle:selected.textContent.split(" — ").slice(1).join(" — ").replace(/\s\([^)]*\)$/, ""), financialBand:$("applicationBudget").value, pathwayRequest:$("applicationPathway").value.trim(), documents:files.length ? [...new Set([...(current?.documents||[]),...files])] : (current?.documents||[]), status, missingDocuments: status === "submitted" ? [] : (current?.missingDocuments||[]) });
    } else {
      store.createApplication({ universityId:selected.dataset.university, courseId:selected.value, courseTitle:selected.textContent.split(" — ").slice(1).join(" — ").replace(/\s\([^)]*\)$/, ""), qualification:student.qualification, financialBand:$("applicationBudget").value, pathwayRequest:$("applicationPathway").value.trim(), documents:files, status });
    }
    $("applicationModal").hidden = true; render(); toast(status === "draft" ? "Application saved as draft." : "Application submitted.");
  }

  $("newApplicationBtn").addEventListener("click", () => openNewApplication());
  $("applicationCourse").addEventListener("change", updateEligibilityHint);
  $("studentApplicationForm").addEventListener("submit", e => { e.preventDefault(); saveApplication("submitted"); });
  $("saveDraftBtn").addEventListener("click", () => saveApplication("draft"));

  $("studentApplicationList").addEventListener("click", e => {
    const edit = e.target.closest("[data-edit-application]"); if (edit) return openEditApplication(edit.dataset.editApplication);
    const dup = e.target.closest("[data-duplicate-application]"); if (dup) return openNewApplication();
  });
  $("preferenceGrid").addEventListener("click", e => { const btn = e.target.closest("[data-apply-preference]"); if (btn) openNewApplication(btn.dataset.applyPreference); });

  $("studentOfferList").addEventListener("click", e => {
    const accept = e.target.closest("[data-accept-offer]");
    if (accept) {
      if (!confirm("Accept this university offer? You can accept only ONE university. Other active offers will be closed.")) return;
      const result = store.acceptOffer(accept.dataset.acceptOffer); toast(result.message); render(); return;
    }
    const reject = e.target.closest("[data-reject-offer]");
    if (reject) { if (confirm("Reject this offer?")) { store.rejectOffer(reject.dataset.rejectOffer); render(); toast("Offer rejected."); } return; }
    const sign = e.target.closest("[data-sign-offer]");
    if (sign) { $("signedOfferId").value = sign.dataset.signOffer; $("signedOfferFile").value = ""; openModal("signatureModal"); }
  });

  $("signedOfferForm").addEventListener("submit", e => {
    e.preventDefault(); const file = $("signedOfferFile").files?.[0]; if (!file) return;
    store.update(db => { const offer = db.offers.find(o => o.id === $("signedOfferId").value); if (offer) offer.signedLetterName = file.name; });
    $("signatureModal").hidden = true; render(); toast("Signed offer-letter filename returned in preview. Actual upload will use Supabase Storage.");
  });

  render();
});
