document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const store = window.TNEAdmissions;
  if (!store) return;
  const session = store.getStaffSession() || { role: "administrator", name: "TNE Administrator", email: "preview" };

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const statusLabel = s => String(s || "").replaceAll("_", " ");
  const fmtDate = value => value ? new Date(value).toLocaleDateString("en-MY", { day:"2-digit", month:"short", year:"numeric" }) : "—";

  $("adminName").textContent = session.name || "Administrator";
  $("adminEmail").textContent = session.email || "";

  function toast(message) {
    const el = $("adminToast"); el.textContent = message; el.classList.add("show");
    clearTimeout(window.__admToast); window.__admToast = setTimeout(() => el.classList.remove("show"), 2600);
  }

  function openModal(id) { const el = $(id); if (el) el.hidden = false; }
  function closeModal(el) { const modal = el.closest(".modal"); if (modal) modal.hidden = true; }

  document.querySelectorAll("[data-open-modal]").forEach(btn => btn.addEventListener("click", () => openModal(btn.dataset.openModal)));
  document.querySelectorAll("[data-close-modal]").forEach(btn => btn.addEventListener("click", () => closeModal(btn)));
  document.querySelectorAll(".modal").forEach(modal => modal.addEventListener("click", e => { if (e.target === modal) modal.hidden = true; }));

  $("adminNav").addEventListener("click", e => {
    const btn = e.target.closest("button[data-panel]"); if (!btn) return;
    document.querySelectorAll("#adminNav button").forEach(b => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".adm-panel").forEach(p => p.classList.toggle("active", p.id === `panel-${btn.dataset.panel}`));
  });

  function render() {
    store.syncCurrentStudent();
    const db = store.read();
    $("statUniversities").textContent = db.universities.length;
    $("statOfficers").textContent = db.staffAccounts.filter(a => a.role === "university_officer").length;
    $("statStudents").textContent = db.studentAccounts.length;
    $("statApplications").textContent = db.applications.length;

    $("officerUniversity").innerHTML = db.universities.filter(u => u.status === "active").map(u => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join("");

    $("universityTable").innerHTML = db.universities.map(u => `<tr><td><strong>${esc(u.name)}</strong><br><small>${esc(u.shortName || "")}</small></td><td>${esc(u.id)}</td><td>${esc(u.location || "—")}</td><td><span class="status ${esc(u.status)}">${esc(u.status)}</span></td><td><button class="btn-small" data-toggle-university="${esc(u.id)}">${u.status === "active" ? "Deactivate" : "Activate"}</button></td></tr>`).join("");

    renderOfficers(); renderStudents(); renderApplications();
  }

  function renderOfficers() {
    const db = store.read(); const q = ($("officerSearch").value || "").toLowerCase();
    const rows = db.staffAccounts.filter(a => a.role === "university_officer").filter(a => !q || [a.name,a.email,store.universityName(a.universityId)].join(" ").toLowerCase().includes(q));
    $("officerTable").innerHTML = rows.length ? rows.map(a => `<tr><td><strong>${esc(a.name)}</strong><br><small>${esc(a.email)}</small></td><td>${esc(store.universityName(a.universityId))}</td><td>University Officer</td><td><span class="status ${esc(a.status)}">${esc(a.status)}</span></td><td><button class="btn-small" data-reset-officer="${esc(a.id)}">Reset Password</button> <button class="btn-small" data-toggle-officer="${esc(a.id)}">${a.status === "active" ? "Deactivate" : "Activate"}</button></td></tr>`).join("") : `<tr><td colspan="5">No officer accounts found.</td></tr>`;
  }

  function renderStudents() {
    const db = store.read(); const q = ($("studentSearch").value || "").toLowerCase();
    const rows = db.studentAccounts.filter(s => !q || [s.name,s.email,s.qualification].join(" ").toLowerCase().includes(q));
    $("studentTable").innerHTML = rows.length ? rows.map(s => {
      const count = db.applications.filter(a => a.studentId === s.id).length;
      return `<tr><td><strong>${esc(s.name)}</strong><br><small>${esc(s.email)}</small></td><td>${esc(s.qualification || "—")}</td><td><span class="status ${esc(s.status)}">${esc(s.status)}</span></td><td>${count}</td><td><button class="btn-small" data-reset-student="${esc(s.id)}">Reset Password</button> <button class="btn-small" data-toggle-student="${esc(s.id)}">${s.status === "active" ? "Deactivate" : "Activate"}</button></td></tr>`;
    }).join("") : `<tr><td colspan="5">No student accounts found.</td></tr>`;
  }

  function renderApplications() {
    const db = store.read(); const q = ($("applicationSearch").value || "").toLowerCase(); const st = $("applicationStatus").value;
    const rows = db.applications.filter(a => (!st || a.status === st) && (!q || [a.studentName,a.studentEmail,a.courseTitle,store.universityName(a.universityId)].join(" ").toLowerCase().includes(q)));
    $("applicationTable").innerHTML = rows.length ? rows.map(a => `<tr><td><strong>${esc(a.studentName)}</strong><br><small>${esc(a.studentEmail)}</small></td><td>${esc(store.universityName(a.universityId))}</td><td>${esc(a.courseTitle)}</td><td>${esc(a.qualification)}</td><td><span class="status ${esc(a.status)}">${esc(statusLabel(a.status))}</span></td><td>${esc(fmtDate(a.updatedAt))}</td></tr>`).join("") : `<tr><td colspan="6">No applications match your filter.</td></tr>`;
  }

  $("universityForm").addEventListener("submit", e => {
    e.preventDefault(); const code = $("uniCode").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!code) return;
    store.update(db => db.universities.push({ id: code, name: $("uniName").value.trim(), shortName: code, location: $("uniLocation").value.trim(), status: "active" }));
    e.target.reset(); $("universityModal").hidden = true; render(); toast("University added to preview data.");
  });

  $("officerForm").addEventListener("submit", e => {
    e.preventDefault();
    store.update(db => db.staffAccounts.push({ id: store.uid("staff"), name: $("officerName").value.trim(), email: $("officerEmail").value.trim().toLowerCase(), role: "university_officer", universityId: $("officerUniversity").value, status: "active", createdAt: store.nowIso() }));
    e.target.reset(); $("officerModal").hidden = true; render(); toast("Preview officer account created.");
  });

  $("studentForm").addEventListener("submit", e => {
    e.preventDefault();
    store.update(db => db.studentAccounts.push({ id: store.uid("student"), name: $("newStudentName").value.trim(), email: $("newStudentEmail").value.trim().toLowerCase(), qualification: $("newStudentQualification").value, status: "active", createdAt: store.nowIso() }));
    e.target.reset(); $("studentModal").hidden = true; render(); toast("Preview student account created.");
  });

  $("officerSearch").addEventListener("input", renderOfficers);
  $("studentSearch").addEventListener("input", renderStudents);
  $("applicationSearch").addEventListener("input", renderApplications);
  $("applicationStatus").addEventListener("change", renderApplications);

  document.addEventListener("click", e => {
    const toggleUni = e.target.closest("[data-toggle-university]");
    if (toggleUni) { store.update(db => { const u = db.universities.find(x => x.id === toggleUni.dataset.toggleUniversity); if (u) u.status = u.status === "active" ? "inactive" : "active"; }); render(); }
    const toggleOfficer = e.target.closest("[data-toggle-officer]");
    if (toggleOfficer) { store.update(db => { const a = db.staffAccounts.find(x => x.id === toggleOfficer.dataset.toggleOfficer); if (a) a.status = a.status === "active" ? "inactive" : "active"; }); render(); }
    const toggleStudent = e.target.closest("[data-toggle-student]");
    if (toggleStudent) { store.update(db => { const a = db.studentAccounts.find(x => x.id === toggleStudent.dataset.toggleStudent); if (a) a.status = a.status === "active" ? "inactive" : "active"; }); render(); }
    if (e.target.closest("[data-reset-officer]")) toast("Preview reset created. Supabase will send/set the real reset later.");
    if (e.target.closest("[data-reset-student]")) toast("Preview reset created. Supabase will handle the real password reset later.");
  });

  $("resetPreviewBtn").addEventListener("click", () => { if (confirm("Reset all front-end admissions preview data?")) { store.resetPreview(); render(); toast("Preview data reset."); } });
  $("adminLogoutBtn").addEventListener("click", () => { store.clearStaffSession(); window.location.href = "/pages/staff-login.html"; });
  window.addEventListener("tne-admissions-changed", () => {});
  render();
});
