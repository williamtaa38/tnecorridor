/* TNE Corridor Supabase admissions data layer */
(() => {
  "use strict";
  const client = window.tneSupabase;
  const store = window.TNEAdmissions;
  const ready = () => {
    if (!client) throw new Error("Supabase is not configured.");
    if (!store) throw new Error("Admissions store is not available.");
  };
  const camelCourse = r => ({
    id:r.id, universityId:r.university_id, title:r.title, level:r.level, duration:r.duration || "",
    currency:r.currency || "MYR", totalFee:Number(r.total_fee || 0), gstPercent:Number(r.gst_percent || 0),
    active:r.active !== false, pricingMethod:r.pricing_method || "whole_programme", breakdownText:r.breakdown_text || "",
    semesters:Array.isArray(r.semesters) ? r.semesters : []
  });
  const camelScholarship = r => ({
    id:r.id, universityId:r.university_id, name:r.name, percentage:Number(r.percentage || 0), scope:r.scope || "whole_course",
    courseIds:Array.isArray(r.course_ids) ? r.course_ids : [], semesterRules:Array.isArray(r.semester_rules) ? r.semester_rules : [],
    maintenanceTerms:r.maintenance_terms || "", active:r.active !== false
  });
  const camelPackage = r => ({
    id:r.id, universityId:r.university_id, name:r.name, entryQualification:r.entry_qualification,
    immediateTarget:r.immediate_target || "", finalAward:r.final_award || "", type:r.pathway_type || "progression",
    stageCourseIds:Array.isArray(r.stage_course_ids) ? r.stage_course_ids : [], coursesText:r.courses_text || "",
    notes:r.notes || "", active:r.active !== false
  });
  const camelUniversity = r => ({ id:r.id, name:r.name, shortName:r.short_name || r.id, location:r.location || "", status:r.status || "active" });

  async function must(result) { if (result.error) throw result.error; return result.data; }

  async function loadCatalogue() {
    ready();
    const [u,c,s,p,a,o] = await Promise.all([
      client.from("universities").select("*").order("name"),
      client.from("courses").select("*").order("title"),
      client.from("scholarships").select("*").order("name"),
      client.from("pathway_packages").select("*").order("name"),
      client.from("student_applications").select("*").order("updated_at",{ascending:false}),
      client.from("offers").select("*").order("created_at",{ascending:false})
    ]);
    [u,c,s,p,a,o].forEach(x => { if (x.error) throw x.error; });
    const universities=u.data.map(camelUniversity); const courses=c.data.map(camelCourse);
    const universityIdFor = value => universities.find(x=>x.id===value || x.name===value)?.id || value || "";
    const courseFor = value => courses.find(x=>x.id===value || x.title===value);
    store.update(db => {
      db.universities = universities; db.courses = courses; db.scholarships = s.data.map(camelScholarship); db.packages = p.data.map(camelPackage);
      db.applications = a.data.map(r => { const course=courseFor(r.selected_course); return { id:r.id, studentId:r.user_id, studentName:r.full_name||"Student", studentEmail:r.email||"", universityId:universityIdFor(r.selected_university), courseId:course?.id||r.selected_course||"", courseTitle:course?.title||r.selected_course||"", qualification:r.qualification||"SPM", financialBand:r.financial_band||"", status:r.status||"submitted", academicDecision:r.academic_decision||"pending", financialDecision:r.financial_decision||"pending", officerNote:r.officer_note||"", missingDocuments:Array.isArray(r.missing_documents)?r.missing_documents:[], documents:Array.isArray(r.student_documents)?r.student_documents.map(x=>x.name||x.fileName||String(x)):[], createdAt:r.created_at, updatedAt:r.updated_at }; });
      db.offers = o.data.map(r=>({id:r.id,applicationId:r.application_id,studentId:r.student_id,universityId:r.university_id,courseTitle:r.course_title||"",packageTitle:r.package_title||"",scholarshipName:r.scholarship_name||"",scholarshipPercentage:Number(r.scholarship_percentage||0),tuitionBeforeDiscount:Number(r.tuition_before_discount||0),discountAmount:Number(r.discount_amount||0),gstPercent:Number(r.gst_percent||0),gstAmount:Number(r.gst_amount||0),payableTotal:Number(r.payable_total||0),currency:r.currency||"MYR",terms:r.terms||"",status:r.status||"sent",createdAt:r.created_at}));
    });
  }

  async function getMyStaffProfile() {
    ready();
    const { data:{ session } } = await client.auth.getSession();
    if (!session) return null;
    const { data, error } = await client.from("officer_profiles").select("id,full_name,email,role,university_id,status").eq("id",session.user.id).maybeSingle();
    if (error) throw error;
    if (!data || data.status === "inactive") return null;
    return { id:data.id, name:data.full_name || session.user.email, email:data.email || session.user.email, role:data.role, universityId:data.university_id || "" };
  }

  async function saveCourse(course) {
    return must(await client.from("courses").upsert({
      id:course.id, university_id:course.universityId, title:course.title, level:course.level, duration:course.duration,
      currency:course.currency, total_fee:course.totalFee, gst_percent:course.gstPercent, active:course.active,
      pricing_method:course.pricingMethod || "whole_programme", breakdown_text:course.breakdownText || "", semesters:course.semesters || []
    }).select().single());
  }
  async function deleteCourse(id) {
    const db=store.read();
    for(const scholarship of db.scholarships.filter(x=>(x.courseIds||[]).includes(id))){
      await saveScholarship({...scholarship,courseIds:(scholarship.courseIds||[]).filter(x=>x!==id)});
    }
    for(const pkg of db.packages.filter(x=>(x.stageCourseIds||[]).includes(id))){
      await deletePackage(pkg.id);
    }
    return must(await client.from("courses").delete().eq("id",id));
  }

  async function saveScholarship(s) {
    return must(await client.from("scholarships").upsert({
      id:s.id, university_id:s.universityId, name:s.name, percentage:s.percentage, scope:s.scope,
      course_ids:s.courseIds || [], semester_rules:s.semesterRules || [], maintenance_terms:s.maintenanceTerms || "", active:s.active
    }).select().single());
  }
  async function deleteScholarship(id) { return must(await client.from("scholarships").delete().eq("id",id)); }

  async function savePackage(p) {
    return must(await client.from("pathway_packages").upsert({
      id:p.id, university_id:p.universityId, name:p.name, entry_qualification:p.entryQualification,
      immediate_target:p.immediateTarget || "", final_award:p.finalAward || "", pathway_type:p.type,
      stage_course_ids:p.stageCourseIds || [], courses_text:p.coursesText || "", notes:p.notes || "", active:p.active
    }).select().single());
  }
  async function deletePackage(id) { return must(await client.from("pathway_packages").delete().eq("id",id)); }

  async function saveStudentApplication(a) {
    const { data:{ user } } = await client.auth.getUser(); if(!user) throw new Error("Please sign in again.");
    const payload={ id:a.id, user_id:user.id, full_name:a.studentName||a.fullName||"", email:a.studentEmail||a.email||user.email||"", selected_university:a.universityId, selected_course:a.courseId||a.courseTitle||"", qualification:a.qualification||"", financial_band:a.financialBand||"", pathway_request:a.pathwayRequest||"", status:a.status||"draft", student_documents:(a.documents||[]).map(x=>typeof x==="string"?{name:x}:x), updated_at:new Date().toISOString() };
    if(a.status==="submitted") payload.submitted_at=new Date().toISOString();
    return must(await client.from("student_applications").upsert(payload,{onConflict:"id"}).select().single());
  }
  async function uploadApplicationFiles(applicationId, files) {
    const { data:{ user } } = await client.auth.getUser(); if(!user) throw new Error("Please sign in again.");
    const uploaded=[];
    for(const file of Array.from(files||[])){
      const safe=String(file.name).replace(/[^a-zA-Z0-9._-]/g,"_"); const path=`${user.id}/${applicationId}/${Date.now()}_${safe}`;
      const { error }=await client.storage.from("application-documents").upload(path,file,{upsert:false}); if(error) throw error;
      uploaded.push({name:file.name,path});
    }
    return uploaded;
  }
  async function acceptOffer(id) { return must(await client.rpc("accept_offer",{p_offer_id:id})); }
  async function rejectOffer(id) { return must(await client.from("offers").update({status:"rejected"}).eq("id",id).select()); }

  async function requestPasswordReset(email) {
    const redirectTo = `${window.location.origin}/pages/reset-password.html`;
    const { error } = await client.auth.resetPasswordForEmail(String(email||"").trim().toLowerCase(), { redirectTo });
    if (error) throw error;
  }

  async function patchApplication(id, patch) {
    const payload={};
    if("academicDecision" in patch) payload.academic_decision=patch.academicDecision;
    if("financialDecision" in patch) payload.financial_decision=patch.financialDecision;
    if("missingDocuments" in patch) payload.missing_documents=patch.missingDocuments;
    if("officerNote" in patch) payload.officer_note=patch.officerNote;
    if("status" in patch) payload.status=patch.status;
    return must(await client.from("student_applications").update(payload).eq("id",id).select().single());
  }
  async function createOffer(o) {
    const id=o.id || `offer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
    const result=await client.from("offers").insert({id,application_id:o.applicationId,student_id:o.studentId||null,university_id:o.universityId,course_title:o.courseTitle,package_title:o.packageTitle||"",scholarship_name:o.scholarshipName||"",scholarship_percentage:o.scholarshipPercentage||0,tuition_before_discount:o.tuitionBeforeDiscount||0,discount_amount:o.discountAmount||0,gst_percent:o.gstPercent||0,gst_amount:o.gstAmount||0,payable_total:o.payableTotal||0,currency:o.currency||"MYR",terms:o.terms||"",status:"sent"}).select().single();
    if(result.error) throw result.error;
    await patchApplication(o.applicationId,{status:"conditional_offer"});
    return {id,...o,status:"sent",createdAt:new Date().toISOString()};
  }

  window.TNEAdmissionsSupabase = { loadCatalogue, getMyStaffProfile, saveCourse, deleteCourse, saveScholarship, deleteScholarship, savePackage, deletePackage, patchApplication, createOffer, saveStudentApplication, uploadApplicationFiles, acceptOffer, rejectOffer, requestPasswordReset };
})();
