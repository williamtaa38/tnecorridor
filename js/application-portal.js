/* ===============================
   APPLICATION PORTAL
   File: /js/application-portal.js

   Works now with localStorage.
   Supabase-ready: fill SUPABASE_URL and SUPABASE_ANON_KEY below,
   then connect tables/storage using the SQL file provided.
================================ */

(function () {
  /* ===============================
     SUPABASE SETTINGS
     Replace these when you are ready.
  ================================ */

  const SUPABASE_URL = "https://rppmrmaadchjrofmdkwp.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwcG1ybWFhZGNoanJvZm1ka3dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzQ3MTUsImV4cCI6MjA5NzQ1MDcxNX0.BHKiiIqfX2TKWSW4GY-TzmL9VR8J2nIJ720O2Pqmeq0";
  const APPLICATION_BUCKET = "application-documents";

  const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
  const supabaseClient = hasSupabaseConfig
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  const STORAGE_KEY = "tne_student_application_demo";
  const USER_KEY = "tne_demo_logged_in_user";

  const statusLabels = {
    draft: "Draft",
    submitted: "Submitted",
    processing: "Processing",
    action_required: "Action Required",
    successful: "Successful",
    failed: "Failed"
  };

  const statusMessages = {
    draft: "Your application has not been submitted yet. Complete the form below to begin.",
    submitted: "Your application has been submitted successfully. Our officer will check your documents soon.",
    processing: "Your application is now being processed by the admission officer.",
    action_required: "Action is required. Please read the officer message and update the requested documents or details.",
    successful: "Congratulations. Your application has been approved. Released documents are available below.",
    failed: "Your application was not successful at this stage. Please read the officer message and update your application if requested."
  };

  let currentUser = null;
  let currentApplication = null;
  let selectedStudentDocuments = [];
  let selectedOfficerDocuments = [];
  let officerApplications = [];
  let selectedOfficerApplicationId = null;

  document.addEventListener("DOMContentLoaded", async function () {
    const page = document.body.dataset.page;

    bindGlobalEvents();

    if (page === "student") {
      await initStudentPage();
    }

    if (page === "officer") {
      await initOfficerPage();
    }
  });

  /* ===============================
     GLOBAL HELPERS
  ================================ */

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  }

  function checked(id) {
    const el = document.getElementById(id);
    return Boolean(el && el.checked);
  }

  function setChecked(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(value);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-MY", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function statusChip(status) {
    const safeStatus = status || "draft";
    return `<span class="status-chip ${safeStatus}">${escapeHtml(statusLabels[safeStatus] || safeStatus)}</span>`;
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 3200);
  }

  function bindGlobalEvents() {
    $all("[data-scroll-target]").forEach(function (button) {
      button.addEventListener("click", function () {
        const target = document.querySelector(button.dataset.scrollTarget);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  async function getCurrentUser() {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.getUser();
      if (!error && data && data.user) {
        return {
          id: data.user.id,
          email: data.user.email || "student@email.com",
          name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Student"
        };
      }
    }

    const saved = JSON.parse(localStorage.getItem(USER_KEY) || "null");

    if (saved) return saved;

    const demoUser = {
      id: "demo-user-001",
      name: "Student",
      email: "student@email.com"
    };

    localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
    return demoUser;
  }

  function normalizeApplication(record) {
    const now = new Date().toISOString();
    return {
      id: record?.id || createId(),
      user_id: record?.user_id || currentUser?.id || "demo-user-001",
      full_name: record?.full_name || "",
      email: record?.email || currentUser?.email || "",
      phone: record?.phone || "",
      nationality: record?.nationality || "Malaysian",
      selected_university: record?.selected_university || "",
      selected_course: record?.selected_course || "",
      need_visa: Boolean(record?.need_visa),
      need_airport_transport: Boolean(record?.need_airport_transport),
      need_accommodation: Boolean(record?.need_accommodation),
      arrival_airport: record?.arrival_airport || "",
      arrival_date: record?.arrival_date || "",
      accommodation_type: record?.accommodation_type || "",
      emergency_contact: record?.emergency_contact || "",
      student_notes: record?.student_notes || "",
      consent_university: Boolean(record?.consent_university),
      consent_data: Boolean(record?.consent_data),
      consent_whatsapp: Boolean(record?.consent_whatsapp),
      status: record?.status || "draft",
      priority: record?.priority || "Normal",
      officer_note: record?.officer_note || "",
      created_at: record?.created_at || now,
      submitted_at: record?.submitted_at || null,
      updated_at: record?.updated_at || now,
      student_documents: Array.isArray(record?.student_documents) ? record.student_documents : [],
      officer_documents: Array.isArray(record?.officer_documents) ? record.officer_documents : []
    };
  }

  function createId() {
    return "app_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
  }

  /* ===============================
     DATA LAYER
  ================================ */

  async function loadStudentApplication() {
    if (supabaseClient && currentUser) {
      const { data, error } = await supabaseClient
        .from("student_applications")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) return normalizeApplication(data);
    }

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return normalizeApplication(saved);
  }

  async function saveApplication(application) {
    const normalized = normalizeApplication({
      ...application,
      updated_at: new Date().toISOString()
    });

    if (supabaseClient) {
      const payload = { ...normalized };
      const { data, error } = await supabaseClient
        .from("student_applications")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();

      if (!error && data) {
        currentApplication = normalizeApplication(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentApplication));
        return currentApplication;
      }

      console.error("Supabase save error:", error);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    currentApplication = normalized;
    return normalized;
  }

  async function loadAllApplicationsForOfficer() {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("student_applications")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!error && data) return data.map(normalizeApplication);
      console.error("Supabase load applications error:", error);
    }

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const demo = saved ? [normalizeApplication(saved)] : [];

    if (!demo.length) {
      demo.push(normalizeApplication({
        id: "demo-app-submitted",
        full_name: "Demo Student",
        email: "student@email.com",
        phone: "+60 12 345 6789",
        nationality: "International",
        selected_university: "University of Southampton Malaysia",
        selected_course: "BSc Computer Science",
        need_visa: true,
        need_airport_transport: true,
        need_accommodation: true,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        student_documents: [
          { id: createId(), type: "Academic Result", name: "demo-result.pdf", size: 120000, url: "#", uploaded_at: new Date().toISOString() },
          { id: createId(), type: "Passport", name: "demo-passport.pdf", size: 90000, url: "#", uploaded_at: new Date().toISOString() }
        ],
        consent_university: true,
        consent_data: true,
        consent_whatsapp: true
      }));
    }

    return demo;
  }

  async function saveOfficerApplication(application) {
    return saveApplication(application);
  }

  async function fileToDocument(file, type, audience) {
    if (!file) return null;

    const baseRecord = {
      id: createId(),
      type,
      audience,
      name: file.name,
      size: file.size,
      mime_type: file.type,
      uploaded_at: new Date().toISOString()
    };

    if (supabaseClient && currentApplication) {
      const filePath = `${currentApplication.id}/${audience}/${Date.now()}-${file.name}`;
      const { data, error } = await supabaseClient.storage
        .from(APPLICATION_BUCKET)
        .upload(filePath, file, { upsert: true });

      if (!error && data) {
        const { data: publicUrlData } = supabaseClient.storage
          .from(APPLICATION_BUCKET)
          .getPublicUrl(filePath);

        return {
          ...baseRecord,
          path: filePath,
          url: publicUrlData?.publicUrl || "#"
        };
      }

      console.error("Supabase file upload error:", error);
    }

    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve({
          ...baseRecord,
          url: reader.result
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  /* ===============================
     STUDENT PAGE
  ================================ */

  async function initStudentPage() {
    currentUser = await getCurrentUser();
    currentApplication = await loadStudentApplication();

    bindStudentEvents();
    hydrateStudentForm();
    renderStudentPage();
  }

  function bindStudentEvents() {
    const form = document.getElementById("applicationFormCard");
    if (form) form.addEventListener("submit", handleStudentSubmit);

    const nationality = document.getElementById("nationality");
    if (nationality) nationality.addEventListener("change", handleNationalityChange);

    ["needVisa", "needAirportTransport", "needAccommodation"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", renderChoiceCards);
    });

    const refreshBtn = document.getElementById("refreshApplicationBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", async function () {
        currentApplication = await loadStudentApplication();
        hydrateStudentForm();
        renderStudentPage();
        showToast("Application refreshed.");
      });
    }

    const uploadMap = [
      { id: "resultFile", type: "Academic Result" },
      { id: "icFile", type: "IC / MyKad" },
      { id: "passportFile", type: "Passport" },
      { id: "englishFile", type: "English Result" },
      { id: "otherFile", type: "Other Supporting Document" }
    ];

    uploadMap.forEach(function (item) {
      const input = document.getElementById(item.id);
      if (!input) return;

      input.addEventListener("change", async function () {
        const file = input.files && input.files[0];
        if (!file) return;

        const doc = await fileToDocument(file, item.type, "student");
        selectedStudentDocuments = selectedStudentDocuments.filter(d => d.type !== item.type);
        selectedStudentDocuments.push(doc);
        input.closest(".upload-box")?.classList.add("has-file");
        renderStudentDocumentPreview();
        renderChecklist();
      });
    });
  }

  function hydrateStudentForm() {
    setValue("fullName", currentApplication.full_name || currentUser.name || "");
    setValue("email", currentApplication.email || currentUser.email || "");
    setValue("phone", currentApplication.phone);
    setValue("nationality", currentApplication.nationality || "Malaysian");
    setValue("selectedUniversity", currentApplication.selected_university);
    setValue("selectedCourse", currentApplication.selected_course);
    setChecked("needVisa", currentApplication.need_visa);
    setChecked("needAirportTransport", currentApplication.need_airport_transport);
    setChecked("needAccommodation", currentApplication.need_accommodation);
    setValue("arrivalAirport", currentApplication.arrival_airport);
    setValue("arrivalDate", currentApplication.arrival_date);
    setValue("accommodationType", currentApplication.accommodation_type);
    setValue("emergencyContact", currentApplication.emergency_contact);
    setChecked("consentUniversity", currentApplication.consent_university);
    setChecked("consentData", currentApplication.consent_data);
    setChecked("consentWhatsapp", currentApplication.consent_whatsapp);
    setValue("studentNotes", currentApplication.student_notes);

    selectedStudentDocuments = [...(currentApplication.student_documents || [])];
    handleNationalityChange();
  }

  function handleNationalityChange() {
    const nationality = getValue("nationality");
    const needVisa = document.getElementById("needVisa");
    const visaCard = document.querySelector('[data-choice-card="visa"]');
    const icBox = document.getElementById("icUploadBox");
    const passportBox = document.getElementById("passportUploadBox");

    if (nationality === "Malaysian") {
      if (needVisa) {
        needVisa.checked = false;
        needVisa.disabled = true;
      }
      visaCard?.classList.add("disabled");
      if (icBox) icBox.style.display = "grid";
      if (passportBox) passportBox.style.display = "none";
    } else {
      if (needVisa) needVisa.disabled = false;
      visaCard?.classList.remove("disabled");
      if (icBox) icBox.style.display = "none";
      if (passportBox) passportBox.style.display = "grid";
    }

    renderChoiceCards();
    renderChecklist();
  }

  function renderChoiceCards() {
    $all(".choice-card").forEach(function (card) {
      const input = card.querySelector("input");
      card.classList.toggle("checked", Boolean(input && input.checked));
    });
  }

  function collectStudentForm() {
    const nationality = getValue("nationality") || "Malaysian";
    const status = currentApplication.status === "draft" ? "submitted" : currentApplication.status;

    return normalizeApplication({
      ...currentApplication,
      full_name: getValue("fullName"),
      email: getValue("email"),
      phone: getValue("phone"),
      nationality,
      selected_university: getValue("selectedUniversity"),
      selected_course: getValue("selectedCourse"),
      need_visa: nationality === "International" ? checked("needVisa") : false,
      need_airport_transport: checked("needAirportTransport"),
      need_accommodation: checked("needAccommodation"),
      arrival_airport: getValue("arrivalAirport"),
      arrival_date: getValue("arrivalDate"),
      accommodation_type: getValue("accommodationType"),
      emergency_contact: getValue("emergencyContact"),
      student_notes: getValue("studentNotes"),
      consent_university: checked("consentUniversity"),
      consent_data: checked("consentData"),
      consent_whatsapp: checked("consentWhatsapp"),
      status,
      submitted_at: currentApplication.submitted_at || new Date().toISOString(),
      student_documents: mergeDocuments(currentApplication.student_documents, selectedStudentDocuments)
    });
  }

  function mergeDocuments(existing, incoming) {
    const output = [];
    [...(existing || []), ...(incoming || [])].forEach(function (doc) {
      if (!doc) return;
      const index = output.findIndex(d => d.type === doc.type && d.audience === doc.audience);
      if (index >= 0) output[index] = doc;
      else output.push(doc);
    });
    return output;
  }

  async function handleStudentSubmit(event) {
    event.preventDefault();

    const validation = validateStudentForm();
    if (!validation.ok) {
      showToast(validation.message);
      const target = validation.target ? document.getElementById(validation.target) : null;
      if (target) target.focus();
      return;
    }

    const data = collectStudentForm();
    currentApplication = await saveApplication(data);
    selectedStudentDocuments = [...currentApplication.student_documents];
    renderStudentPage();

    document.getElementById("progressCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("Application submitted successfully.");
  }

  function validateStudentForm() {
    if (!getValue("fullName")) return { ok: false, message: "Please enter full name.", target: "fullName" };
    if (!getValue("email")) return { ok: false, message: "Please enter email.", target: "email" };
    if (!getValue("phone")) return { ok: false, message: "Please enter phone number.", target: "phone" };

    const docs = mergeDocuments(currentApplication.student_documents, selectedStudentDocuments);
    const hasResult = docs.some(d => d.type === "Academic Result");
    const hasIc = docs.some(d => d.type === "IC / MyKad");
    const hasPassport = docs.some(d => d.type === "Passport");
    const nationality = getValue("nationality");

    if (!hasResult) return { ok: false, message: "Please upload academic result." };
    if (nationality === "Malaysian" && !hasIc) return { ok: false, message: "Please upload IC / MyKad for Malaysian student." };
    if (nationality === "International" && !hasPassport) return { ok: false, message: "Please upload passport for international student." };

    if (!checked("consentUniversity")) return { ok: false, message: "Please tick consent to share information with university." };
    if (!checked("consentData")) return { ok: false, message: "Please tick data storage declaration." };
    if (!checked("consentWhatsapp")) return { ok: false, message: "Please tick contact consent." };

    return { ok: true };
  }

  function renderStudentPage() {
    renderStudentIdentity();
    renderStatusSnapshot();
    renderTimeline(currentApplication.status);
    renderStatusMessage();
    renderStudentDocumentPreview();
    renderReleasedDocumentsStudent();
    renderChecklist();
    renderChoiceCards();
  }

  function renderStudentIdentity() {
    const name = getValue("fullName") || currentApplication.full_name || currentUser.name || "Student";
    const email = getValue("email") || currentApplication.email || currentUser.email || "student@email.com";

    setText("studentNameDisplay", name);
    setText("studentEmailDisplay", email);
    setText("studentAvatar", name.slice(0, 1).toUpperCase());
  }

  function calculateCompletion() {
    let score = 10;

    if (getValue("fullName") && getValue("email") && getValue("phone")) score += 20;
    if (getValue("selectedUniversity") || getValue("selectedCourse")) score += 10;
    if (checked("needVisa") || checked("needAirportTransport") || checked("needAccommodation") || getValue("nationality") === "Malaysian") score += 15;

    const docs = mergeDocuments(currentApplication.student_documents, selectedStudentDocuments);
    if (docs.some(d => d.type === "Academic Result")) score += 15;
    if (getValue("nationality") === "Malaysian" && docs.some(d => d.type === "IC / MyKad")) score += 10;
    if (getValue("nationality") === "International" && docs.some(d => d.type === "Passport")) score += 10;
    if (checked("consentUniversity") && checked("consentData") && checked("consentWhatsapp")) score += 20;

    return Math.min(score, 100);
  }

  function renderStatusSnapshot() {
    const status = currentApplication.status || "draft";
    const score = calculateCompletion();
    const ring = document.getElementById("completionRing");
    const chip = document.getElementById("snapshotChip");

    setText("snapshotStatus", statusLabels[status] || status);
    setText("completionScore", score);
    setText("completionHint", score >= 100 ? "Your application profile is complete." : "Complete the missing items to improve processing speed.");

    if (ring) ring.style.setProperty("--progress", score);

    if (chip) {
      chip.className = `status-chip ${status}`;
      chip.textContent = statusLabels[status] || status;
    }
  }

  function renderTimeline(status) {
    const order = ["submitted", "processing", "action_required", "successful"];
    const effectiveStatus = status || "draft";
    const indexMap = {
      draft: -1,
      submitted: 0,
      processing: 1,
      action_required: 2,
      successful: 3,
      failed: 3
    };

    const activeIndex = indexMap[effectiveStatus] ?? -1;

    $all(".timeline-step").forEach(function (step, index) {
      step.classList.remove("done", "active", "failed");

      if (effectiveStatus === "failed" && index === 3) {
        step.classList.add("failed", "active");
        return;
      }

      if (index < activeIndex) step.classList.add("done");
      if (index === activeIndex) step.classList.add("active");
    });
  }

  function renderStatusMessage() {
    const message = document.getElementById("statusMessage");
    if (!message) return;

    const status = currentApplication.status || "draft";
    const officerNote = currentApplication.officer_note;
    let html = `<strong>${escapeHtml(statusLabels[status] || status)}:</strong> ${escapeHtml(statusMessages[status] || statusMessages.draft)}`;

    if (officerNote) {
      html += `<br><br><strong>Officer Message:</strong> ${escapeHtml(officerNote)}`;
    }

    if (currentApplication.submitted_at) {
      html += `<br><small>Submitted: ${escapeHtml(formatDateTime(currentApplication.submitted_at))}</small>`;
    }

    message.innerHTML = html;
  }

  function renderStudentDocumentPreview() {
    const container = document.getElementById("studentDocumentPreview");
    if (!container) return;

    const docs = mergeDocuments(currentApplication.student_documents, selectedStudentDocuments);

    if (!docs.length) {
      container.classList.add("empty-doc-list");
      container.innerHTML = "No file selected yet.";
      return;
    }

    container.classList.remove("empty-doc-list");
    container.innerHTML = docs.map(function (doc) {
      return `
        <div class="selected-file-row">
          <div>
            <strong>${escapeHtml(doc.type)}</strong><br />
            <small>${escapeHtml(doc.name)} · ${escapeHtml(formatBytes(doc.size))}</small>
          </div>
          <a href="${escapeHtml(doc.url || "#")}" target="_blank" rel="noopener">View</a>
        </div>
      `;
    }).join("");
  }

  function renderReleasedDocumentsStudent() {
    const panel = document.getElementById("offerPanel");
    const container = document.getElementById("releasedDocuments");
    if (!panel || !container) return;

    const docs = currentApplication.officer_documents || [];

    if (currentApplication.status !== "successful" && !docs.length) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;

    if (!docs.length) {
      container.innerHTML = `<div class="empty-doc-list">No released document uploaded yet.</div>`;
      return;
    }

    container.innerHTML = docs.map(documentRowHtml).join("");
  }

  function documentRowHtml(doc) {
    return `
      <div class="document-link-row">
        <div>
          <strong>${escapeHtml(doc.type || "Document")}</strong><br />
          <small>${escapeHtml(doc.name || "File")} · ${escapeHtml(formatBytes(doc.size))} · ${escapeHtml(formatDateTime(doc.uploaded_at))}</small>
        </div>
        <a href="${escapeHtml(doc.url || "#")}" target="_blank" rel="noopener">Open</a>
      </div>
    `;
  }

  function renderChecklist() {
    const docs = mergeDocuments(currentApplication.student_documents, selectedStudentDocuments);
    const nationality = getValue("nationality") || currentApplication.nationality || "Malaysian";
    const hasProfile = Boolean(getValue("fullName") && getValue("email") && getValue("phone"));
    const hasNeeds = nationality === "Malaysian" || checked("needVisa") || checked("needAirportTransport") || checked("needAccommodation") || getValue("arrivalAirport") || getValue("accommodationType");
    const hasDocuments = docs.some(d => d.type === "Academic Result") &&
      (nationality === "Malaysian" ? docs.some(d => d.type === "IC / MyKad") : docs.some(d => d.type === "Passport"));
    const hasConsent = checked("consentUniversity") && checked("consentData") && checked("consentWhatsapp");

    const map = {
      profile: hasProfile,
      needs: hasNeeds,
      documents: hasDocuments,
      consent: hasConsent
    };

    Object.keys(map).forEach(function (key) {
      const el = document.querySelector(`[data-check="${key}"]`);
      if (el) el.classList.toggle("done", map[key]);
    });

    renderStatusSnapshot();
  }

  /* ===============================
     OFFICER PAGE
  ================================ */

  async function initOfficerPage() {
    currentUser = await getCurrentUser();
    bindOfficerEvents();
    await refreshOfficerApplications();
  }

  function bindOfficerEvents() {
    const refreshBtn = document.getElementById("officerRefreshBtn");
    if (refreshBtn) refreshBtn.addEventListener("click", refreshOfficerApplications);

    const search = document.getElementById("officerSearch");
    const filter = document.getElementById("officerStatusFilter");
    if (search) search.addEventListener("input", renderOfficerList);
    if (filter) filter.addEventListener("change", renderOfficerList);

    const form = document.getElementById("officerUpdateForm");
    if (form) form.addEventListener("submit", handleOfficerSubmit);

    const uploadMap = [
      { id: "offerLetterFile", type: "Offer Letter" },
      { id: "visaLetterFile", type: "Visa Document" },
      { id: "otherReleaseFile", type: "Other Released Document" }
    ];

    uploadMap.forEach(function (item) {
      const input = document.getElementById(item.id);
      if (!input) return;

      input.addEventListener("change", async function () {
        const file = input.files && input.files[0];
        if (!file || !selectedOfficerApplicationId) return;

        const app = officerApplications.find(a => a.id === selectedOfficerApplicationId);
        currentApplication = app;
        const doc = await fileToDocument(file, item.type, "officer");

        selectedOfficerDocuments = selectedOfficerDocuments.filter(d => d.type !== item.type);
        selectedOfficerDocuments.push(doc);
        input.closest(".upload-box")?.classList.add("has-file");
        renderOfficerReleasedDocuments(app, selectedOfficerDocuments);
      });
    });
  }

  async function refreshOfficerApplications() {
    officerApplications = await loadAllApplicationsForOfficer();
    renderOfficerStats();
    renderOfficerList();
    showToast("Officer dashboard refreshed.");
  }

  function renderOfficerStats() {
    const counts = {
      submitted: 0,
      processing: 0,
      action_required: 0,
      successful: 0
    };

    officerApplications.forEach(function (app) {
      if (counts[app.status] !== undefined) counts[app.status] += 1;
    });

    setText("statSubmitted", counts.submitted);
    setText("statProcessing", counts.processing);
    setText("statAction", counts.action_required);
    setText("statSuccess", counts.successful);
  }

  function renderOfficerList() {
    const container = document.getElementById("officerApplicationList");
    if (!container) return;

    const filter = getValue("officerStatusFilter");
    const query = getValue("officerSearch").toLowerCase();

    const filtered = officerApplications.filter(function (app) {
      const haystack = [
        app.full_name,
        app.email,
        app.selected_course,
        app.selected_university,
        app.nationality,
        app.status
      ].join(" ").toLowerCase();

      const matchFilter = !filter || app.status === filter;
      const matchQuery = !query || haystack.includes(query);
      return matchFilter && matchQuery;
    });

    if (!filtered.length) {
      container.innerHTML = `<div class="empty-doc-list">No applications found.</div>`;
      return;
    }

    container.innerHTML = filtered.map(function (app) {
      return `
        <button type="button" class="application-list-item ${app.id === selectedOfficerApplicationId ? "active" : ""}" data-application-id="${escapeHtml(app.id)}">
          <strong>${escapeHtml(app.full_name || "Unnamed Student")}</strong>
          <small>${escapeHtml(app.selected_course || "Course not selected")}</small>
          <small>${escapeHtml(app.selected_university || "University not selected")}</small>
          <div class="list-item-bottom">
            ${statusChip(app.status)}
            <small>${escapeHtml(formatDateTime(app.updated_at))}</small>
          </div>
        </button>
      `;
    }).join("");

    $all("[data-application-id]", container).forEach(function (button) {
      button.addEventListener("click", function () {
        selectedOfficerApplicationId = button.dataset.applicationId;
        selectedOfficerDocuments = [];
        renderOfficerList();
        renderOfficerReview();
      });
    });
  }

  function renderOfficerReview() {
    const app = officerApplications.find(a => a.id === selectedOfficerApplicationId);
    const empty = document.getElementById("officerEmptyState");
    const panel = document.getElementById("officerReviewPanel");

    if (!app) {
      if (empty) empty.hidden = false;
      if (panel) panel.hidden = true;
      return;
    }

    if (empty) empty.hidden = true;
    if (panel) panel.hidden = false;

    setText("reviewStudentName", app.full_name || "Unnamed Student");
    setText("reviewStudentCourse", `${app.selected_course || "Course not selected"} · ${app.selected_university || "University not selected"}`);

    const chip = document.getElementById("reviewStatusChip");
    if (chip) {
      chip.className = `status-chip ${app.status}`;
      chip.textContent = statusLabels[app.status] || app.status;
    }

    const details = document.getElementById("reviewStudentDetails");
    if (details) {
      details.innerHTML = `
        <div><strong>Email</strong><span>${escapeHtml(app.email)}</span></div>
        <div><strong>Phone</strong><span>${escapeHtml(app.phone || "-")}</span></div>
        <div><strong>Nationality</strong><span>${escapeHtml(app.nationality)}</span></div>
        <div><strong>Submitted</strong><span>${escapeHtml(formatDateTime(app.submitted_at))}</span></div>
        <div><strong>Consent</strong><span>${app.consent_university && app.consent_data && app.consent_whatsapp ? "Completed" : "Incomplete"}</span></div>
      `;
    }

    const needs = document.getElementById("reviewSupportNeeds");
    if (needs) {
      needs.innerHTML = `
        <div><strong>Visa</strong><span>${app.need_visa ? "Needed" : "Not needed"}</span></div>
        <div><strong>Airport Transport</strong><span>${app.need_airport_transport ? "Needed" : "Not needed"}</span></div>
        <div><strong>Accommodation</strong><span>${app.need_accommodation ? "Needed" : "Not needed"}</span></div>
        <div><strong>Arrival Airport</strong><span>${escapeHtml(app.arrival_airport || "-")}</span></div>
        <div><strong>Arrival Date</strong><span>${escapeHtml(app.arrival_date || "-")}</span></div>
        <div><strong>Accommodation Type</strong><span>${escapeHtml(app.accommodation_type || "-")}</span></div>
        <div><strong>Student Notes</strong><span>${escapeHtml(app.student_notes || "-")}</span></div>
      `;
    }

    const docs = document.getElementById("reviewStudentDocuments");
    if (docs) {
      docs.innerHTML = app.student_documents?.length
        ? app.student_documents.map(documentRowHtml).join("")
        : `<div class="empty-doc-list">No student documents uploaded.</div>`;
    }

    setValue("officerStatus", app.status || "submitted");
    setValue("officerPriority", app.priority || "Normal");
    setValue("officerNote", app.officer_note || "");
    renderOfficerReleasedDocuments(app, selectedOfficerDocuments);
  }

  function renderOfficerReleasedDocuments(app, newDocs = []) {
    const container = document.getElementById("officerReleasedDocuments");
    if (!container) return;

    const docs = mergeDocuments(app?.officer_documents || [], newDocs);

    if (!docs.length) {
      container.classList.add("empty-doc-list");
      container.innerHTML = "No released documents yet.";
      return;
    }

    container.classList.remove("empty-doc-list");
    container.innerHTML = docs.map(documentRowHtml).join("");
  }

  async function handleOfficerSubmit(event) {
    event.preventDefault();

    const app = officerApplications.find(a => a.id === selectedOfficerApplicationId);
    if (!app) {
      showToast("Please select an application first.");
      return;
    }

    const updated = normalizeApplication({
      ...app,
      status: getValue("officerStatus"),
      priority: getValue("officerPriority"),
      officer_note: getValue("officerNote"),
      officer_documents: mergeDocuments(app.officer_documents, selectedOfficerDocuments)
    });

    const saved = await saveOfficerApplication(updated);

    officerApplications = officerApplications.map(function (item) {
      return item.id === saved.id ? saved : item;
    });

    currentApplication = saved;
    selectedOfficerDocuments = [];
    renderOfficerStats();
    renderOfficerList();
    renderOfficerReview();
    showToast("Officer update saved. Student portal will show the latest status.");
  }
})();
