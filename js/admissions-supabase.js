/* TNE Corridor Supabase admissions data layer */
(() => {
  "use strict";

  const client = window.tneSupabase;
  const store = window.TNEAdmissions;

  const ready = () => {
    if (!client) throw new Error("Supabase is not configured.");
    if (!store) throw new Error("Admissions store is not available.");
  };

  const camelCourse = (r) => ({
    id: r.id,
    universityId: r.university_id,
    title: r.title,
    level: r.level,
    duration: r.duration || "",
    currency: r.currency || "MYR",
    totalFee: Number(r.total_fee || 0),
    gstPercent: Number(r.gst_percent || 0),
    active: r.active !== false,
    pricingMethod: r.pricing_method || "whole_programme",
    breakdownText: r.breakdown_text || "",
    semesters: Array.isArray(r.semesters) ? r.semesters : []
  });

  const camelScholarship = (r) => ({
    id: r.id,
    universityId: r.university_id,
    name: r.name,
    discountType: r.discount_type || "percentage",
    discountValue: Number(r.discount_value ?? r.percentage ?? 0),
    percentage: Number(r.percentage || (r.discount_type === "percentage" ? r.discount_value : 0) || 0),
    scope: r.scope || "whole_course",
    courseIds: Array.isArray(r.course_ids) ? r.course_ids : [],
    scopeYears: Array.isArray(r.scope_years) ? r.scope_years : [],
    semesterRules: Array.isArray(r.semester_rules) ? r.semester_rules : [],
    maintenanceTerms: r.maintenance_terms || "",
    rawBenefit: r.raw_benefit || "",
    active: r.active !== false
  });

  const camelPackage = (r) => ({
    id: r.id,
    universityId: r.university_id,
    name: r.name,
    entryQualification: r.entry_qualification,
    immediateTarget: r.immediate_target || "",
    finalAward: r.final_award || "",
    type: r.pathway_type || "progression",
    stageCourseIds: Array.isArray(r.stage_course_ids) ? r.stage_course_ids : [],
    coursesText: r.courses_text || "",
    notes: r.notes || "",
    active: r.active !== false
  });

  const camelUniversity = (r) => ({
    id: r.id,
    name: r.name,
    shortName: r.short_name || r.id,
    location: r.location || "",
    status: r.status || "active"
  });

  async function must(result) {
    if (result.error) throw result.error;
    return result.data;
  }

  async function getCurrentUser() {
    const {
      data: { user },
      error
    } = await client.auth.getUser();

    if (error) throw error;
    if (!user) throw new Error("Please sign in again.");
    return user;
  }

  function safeFileName(name) {
    return String(name || "file")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 180);
  }

  async function loadCatalogue() {
    ready();

    const [u, c, s, p, a, o] = await Promise.all([
      client.from("universities").select("*").order("name"),
      client.from("courses").select("*").order("title"),
      client.from("scholarships").select("*").order("name"),
      client.from("pathway_packages").select("*").order("name"),
      client.from("student_applications").select("*").order("updated_at", { ascending: false }),
      client.from("offers").select("*").order("created_at", { ascending: false })
    ]);

    [u, c, s, p, a, o].forEach((x) => {
      if (x.error) throw x.error;
    });

    const universities = (u.data || []).map(camelUniversity);
    const courses = (c.data || []).map(camelCourse);
    const universityIdFor = (value) =>
      universities.find((x) => x.id === value || x.name === value)?.id || value || "";
    const courseFor = (value) => courses.find((x) => x.id === value || x.title === value);

    store.update((db) => {
      db.universities = universities;
      db.courses = courses;
      db.scholarships = (s.data || []).map(camelScholarship);
      db.packages = (p.data || []).map(camelPackage);

      db.applications = (a.data || []).map((r) => {
        const course = courseFor(r.selected_course);
        return {
          id: r.id,
          studentId: r.user_id,
          studentName: r.full_name || "Student",
          studentEmail: r.email || "",
          universityId: universityIdFor(r.selected_university),
          courseId: course?.id || r.selected_course || "",
          courseTitle: course?.title || r.selected_course || "",
          qualification: r.qualification || "SPM",
          financialBand: r.financial_band || "",
          pathwayRequest: r.pathway_request || "",
          status: r.status || "submitted",
          academicDecision: r.academic_decision || "pending",
          financialDecision: r.financial_decision || "pending",
          officerNote: r.officer_note || "",
          missingDocuments: Array.isArray(r.missing_documents) ? r.missing_documents : [],
          documents: Array.isArray(r.student_documents) ? r.student_documents : [],
          createdAt: r.created_at,
          updatedAt: r.updated_at
        };
      });

      db.offers = (o.data || []).map((r) => ({
        id: r.id,
        applicationId: r.application_id,
        studentId: r.student_id,
        universityId: r.university_id,
        courseTitle: r.course_title || "",
        packageTitle: r.package_title || "",
        scholarshipName: r.scholarship_name || "",
        scholarshipDiscountType: r.scholarship_discount_type || "percentage",
        scholarshipDiscountValue: Number(r.scholarship_discount_value ?? r.scholarship_percentage ?? 0),
        scholarshipPercentage: Number(r.scholarship_percentage || 0),
        tuitionBeforeDiscount: Number(r.tuition_before_discount || 0),
        discountAmount: Number(r.discount_amount || 0),
        gstPercent: Number(r.gst_percent || 0),
        gstAmount: Number(r.gst_amount || 0),
        payableTotal: Number(r.payable_total || 0),
        currency: r.currency || "MYR",
        terms: r.terms || "",
        status: r.status || "sent",
        offerLetterName: r.offer_letter_name || "",
        offerLetterPath: r.offer_letter_path || "",
        signedLetterName: r.signed_letter_name || "",
        signedLetterPath: r.signed_letter_path || "",
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));
    });
  }

  async function getMyStaffProfile() {
    ready();
    const {
      data: { session }
    } = await client.auth.getSession();

    if (!session) return null;

    const { data, error } = await client
      .from("officer_profiles")
      .select("id,full_name,email,role,university_id,status")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data || data.status === "inactive") return null;

    return {
      id: data.id,
      name: data.full_name || session.user.email,
      email: data.email || session.user.email,
      role: data.role,
      universityId: data.university_id || ""
    };
  }

  async function getMyStudentProfile() {
    ready();
    const user = await getCurrentUser();

    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    if (data.account_type !== "student") {
      throw new Error("This account is not a student account.");
    }
    if (data.account_status === "inactive") {
      throw new Error("This student account is inactive.");
    }

    return data;
  }

  async function saveCourse(course) {
    return must(
      await client
        .from("courses")
        .upsert({
          id: course.id,
          university_id: course.universityId,
          title: course.title,
          level: course.level,
          duration: course.duration,
          currency: course.currency,
          total_fee: course.totalFee,
          gst_percent: course.gstPercent,
          active: course.active,
          pricing_method: course.pricingMethod || "whole_programme",
          breakdown_text: course.breakdownText || "",
          semesters: course.semesters || []
        })
        .select()
        .single()
    );
  }

  async function deleteCourse(id) {
    const db = store.read();

    for (const scholarship of db.scholarships.filter((x) =>
      (x.courseIds || []).includes(id)
    )) {
      await saveScholarship({
        ...scholarship,
        courseIds: (scholarship.courseIds || []).filter((x) => x !== id)
      });
    }

    for (const pkg of db.packages.filter((x) =>
      (x.stageCourseIds || []).includes(id)
    )) {
      await deletePackage(pkg.id);
    }

    return must(await client.from("courses").delete().eq("id", id));
  }

  async function saveScholarship(s) {
    return must(
      await client
        .from("scholarships")
        .upsert({
          id: s.id,
          university_id: s.universityId,
          name: s.name,
          discount_type: s.discountType || "percentage",
          discount_value: Number(s.discountValue ?? s.percentage ?? 0),
          percentage: (s.discountType || "percentage") === "percentage" ? Number(s.discountValue ?? s.percentage ?? 0) : 0,
          scope: s.scope,
          course_ids: s.courseIds || [],
          scope_years: s.scopeYears || [],
          semester_rules: s.semesterRules || [],
          maintenance_terms: s.maintenanceTerms || "",
          active: s.active
        })
        .select()
        .single()
    );
  }

  async function deleteScholarship(id) {
    return must(await client.from("scholarships").delete().eq("id", id));
  }

  async function savePackage(p) {
    return must(
      await client
        .from("pathway_packages")
        .upsert({
          id: p.id,
          university_id: p.universityId,
          name: p.name,
          entry_qualification: p.entryQualification,
          immediate_target: p.immediateTarget || "",
          final_award: p.finalAward || "",
          pathway_type: p.type,
          stage_course_ids: p.stageCourseIds || [],
          courses_text: p.coursesText || "",
          notes: p.notes || "",
          active: p.active
        })
        .select()
        .single()
    );
  }

  async function deletePackage(id) {
    return must(await client.from("pathway_packages").delete().eq("id", id));
  }

  async function saveStudentApplication(a) {
    const user = await getCurrentUser();

    const payload = {
      id: a.id,
      user_id: user.id,
      full_name: a.studentName || a.fullName || "",
      email: a.studentEmail || a.email || user.email || "",
      selected_university: a.universityId,
      selected_course: a.courseId || a.courseTitle || "",
      qualification: a.qualification || "",
      financial_band: a.financialBand || "",
      pathway_request: a.pathwayRequest || "",
      status: a.status || "draft",
      student_documents: (a.documents || []).map((x) =>
        typeof x === "string" ? { name: x } : x
      ),
      updated_at: new Date().toISOString()
    };

    if (a.status === "submitted") {
      payload.submitted_at = new Date().toISOString();
    }

    return must(
      await client
        .from("student_applications")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single()
    );
  }

  async function uploadApplicationFiles(applicationId, files) {
    const user = await getCurrentUser();
    const uploaded = [];

    for (const file of Array.from(files || [])) {
      const safe = safeFileName(file.name);
      const path = `${user.id}/${applicationId}/${Date.now()}_${safe}`;

      const { error } = await client.storage
        .from("application-documents")
        .upload(path, file, { upsert: false });

      if (error) throw error;
      uploaded.push({ name: file.name, path, size: file.size, type: file.type });
    }

    return uploaded;
  }

  async function acceptOffer(id) {
    return must(await client.rpc("accept_offer", { p_offer_id: id }));
  }

  async function rejectOffer(id) {
    return must(await client.rpc("reject_offer", { p_offer_id: id }));
  }

  async function requestPasswordReset(email) {
    const redirectTo = `${window.location.origin}/pages/reset-password.html`;
    const { error } = await client.auth.resetPasswordForEmail(
      String(email || "").trim().toLowerCase(),
      { redirectTo }
    );
    if (error) throw error;
  }

  async function patchApplication(id, patch) {
    const payload = {};
    if ("academicDecision" in patch) payload.academic_decision = patch.academicDecision;
    if ("financialDecision" in patch) payload.financial_decision = patch.financialDecision;
    if ("missingDocuments" in patch) payload.missing_documents = patch.missingDocuments;
    if ("officerNote" in patch) payload.officer_note = patch.officerNote;
    if ("status" in patch) payload.status = patch.status;

    return must(
      await client
        .from("student_applications")
        .update(payload)
        .eq("id", id)
        .select()
        .single()
    );
  }

  async function createOffer(o) {
    const id =
      o.id || `offer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

    const result = await client
      .from("offers")
      .insert({
        id,
        application_id: o.applicationId,
        student_id: o.studentId || null,
        university_id: o.universityId,
        course_title: o.courseTitle,
        package_title: o.packageTitle || "",
        scholarship_name: o.scholarshipName || "",
        scholarship_discount_type: o.scholarshipDiscountType || "percentage",
        scholarship_discount_value: Number(o.scholarshipDiscountValue ?? o.scholarshipPercentage ?? 0),
        scholarship_percentage: o.scholarshipDiscountType === "fixed_amount" ? 0 : (o.scholarshipPercentage || o.scholarshipDiscountValue || 0),
        tuition_before_discount: o.tuitionBeforeDiscount || 0,
        discount_amount: o.discountAmount || 0,
        gst_percent: o.gstPercent || 0,
        gst_amount: o.gstAmount || 0,
        payable_total: o.payableTotal || 0,
        currency: o.currency || "MYR",
        terms: o.terms || "",
        status: "sent"
      })
      .select()
      .single();

    if (result.error) throw result.error;
    await patchApplication(o.applicationId, { status: "conditional_offer" });

    return {
      id,
      ...o,
      status: "sent",
      offerLetterName: "",
      offerLetterPath: "",
      signedLetterName: "",
      signedLetterPath: "",
      createdAt: new Date().toISOString()
    };
  }

  async function uploadFormalOffer(offerId, file) {
    ready();
    if (!file) throw new Error("Select an offer letter first.");

    const { data: offer, error: offerError } = await client
      .from("offers")
      .select("id,university_id")
      .eq("id", offerId)
      .single();

    if (offerError) throw offerError;

    const path = `${offer.university_id}/${offerId}/formal/${Date.now()}_${safeFileName(file.name)}`;
    const { error: uploadError } = await client.storage
      .from("offer-documents")
      .upload(path, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data, error } = await client
      .from("offers")
      .update({
        offer_letter_name: file.name,
        offer_letter_path: path,
        updated_at: new Date().toISOString()
      })
      .eq("id", offerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function uploadSignedOffer(offerId, file) {
    ready();
    if (!file) throw new Error("Select a signed offer letter first.");

    const user = await getCurrentUser();
    const { data: offer, error: offerError } = await client
      .from("offers")
      .select("id,university_id,status,student_id")
      .eq("id", offerId)
      .single();

    if (offerError) throw offerError;
    if (offer.student_id !== user.id || offer.status !== "accepted") {
      throw new Error("Only the student who accepted this offer can upload the signed letter.");
    }

    const path = `${offer.university_id}/${offerId}/signed/${user.id}/${Date.now()}_${safeFileName(file.name)}`;
    const { error: uploadError } = await client.storage
      .from("offer-documents")
      .upload(path, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { error: rpcError } = await client.rpc("record_signed_offer_document", {
      p_offer_id: offerId,
      p_path: path,
      p_name: file.name
    });

    if (rpcError) throw rpcError;
    return { name: file.name, path };
  }

  async function createSignedUrl(bucket, path, expiresIn = 900) {
    if (!path) throw new Error("Document path is missing.");
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  }

  window.TNEAdmissionsSupabase = {
    loadCatalogue,
    getMyStaffProfile,
    getMyStudentProfile,
    saveCourse,
    deleteCourse,
    saveScholarship,
    deleteScholarship,
    savePackage,
    deletePackage,
    patchApplication,
    createOffer,
    saveStudentApplication,
    uploadApplicationFiles,
    uploadFormalOffer,
    uploadSignedOffer,
    createSignedUrl,
    acceptOffer,
    rejectOffer,
    requestPasswordReset
  };
})();
