document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const store = window.TNEAdmissions;
  if (!store) return;

  const role = document.getElementById("staffRole");
  const university = document.getElementById("staffUniversity");
  const universityWrap = document.getElementById("universitySelectWrap");
  const email = document.getElementById("staffEmail");
  const password = document.getElementById("staffPassword");
  const form = document.getElementById("staffLoginForm");

  const db = store.read();
  university.innerHTML = db.universities
    .filter(u => u.status === "active")
    .map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.name)}</option>`)
    .join("");

  function refreshRole() {
    const isAdmin = role.value === "administrator";
    universityWrap.hidden = isAdmin;
    university.required = !isAdmin;
  }

  function openWorkspace(session) {
    store.setStaffSession(session);
    window.location.href = session.role === "administrator"
      ? "/pages/admin-portal.html"
      : "/pages/university-portal.html";
  }

  role.addEventListener("change", refreshRole);
  refreshRole();

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!email.value.trim() || !password.value) return;

    openWorkspace({
      role: role.value,
      email: email.value.trim().toLowerCase(),
      name: role.value === "administrator" ? "TNE Administrator" : "University Officer",
      universityId: role.value === "administrator" ? "" : university.value,
      preview: true
    });
  });

  document.getElementById("previewAdminBtn")?.addEventListener("click", function () {
    openWorkspace({ role: "administrator", email: "admin.preview@tnecorridor.local", name: "TNE Administrator", universityId: "", preview: true });
  });

  document.getElementById("previewOfficerBtn")?.addEventListener("click", function () {
    openWorkspace({ role: "university_officer", email: "officer.preview@uosm.local", name: "Admissions Officer", universityId: "UOSM", preview: true });
  });

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }
});
