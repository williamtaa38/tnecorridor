import { supabaseAdmin } from "./supabaseAdmin.js";

const COURSES = "courses";
const ENTRY_REQUIREMENTS = "entry_requirements";
const UNIVERSITIES = "universities";
const SCHOLARSHIPS = "scholarships";

function norm(value) {
  return String(value || "").trim().toLowerCase();
}

function uniqueBy(items, keyFn) {
  const seen = new Set();

  return (items || []).filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function attachUniversityInfoToCourse(course) {
  const item = { ...(course || {}) };

  if (!item.universityCode) return item;

  const { data, error } = await supabaseAdmin
    .from(UNIVERSITIES)
    .select("*")
    .eq("universityCode", item.universityCode)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    item.universityTitle = data.title || "";
    item.universityShortName = data.universityShortName || "";
    item.universityLocation = data.location || "";
  }

  return item;
}

export async function resolveUniversityByInput(input) {
  const q = String(input || "").trim();
  if (!q) return null;

  let result = await supabaseAdmin
    .from(UNIVERSITIES)
    .select("*")
    .eq("title", q)
    .limit(1)
    .maybeSingle();

  if (result.error) throw result.error;
  if (result.data) return result.data;

  result = await supabaseAdmin
    .from(UNIVERSITIES)
    .select("*")
    .eq("universityShortName", q)
    .limit(1)
    .maybeSingle();

  if (result.error) throw result.error;
  if (result.data) return result.data;

  result = await supabaseAdmin
    .from(UNIVERSITIES)
    .select("*")
    .eq("universityCode", q.toUpperCase())
    .limit(1)
    .maybeSingle();

  if (result.error) throw result.error;
  if (result.data) return result.data;

  const { data, error } = await supabaseAdmin
    .from(UNIVERSITIES)
    .select("*")
    .ilike("title", `%${q}%`)
    .limit(10);

  if (error) throw error;

  return data?.[0] || null;
}

export async function searchCourses(keyword, limit = 10) {
  const q = String(keyword || "").trim();
  if (!q) return [];

  const { data, error } = await supabaseAdmin
    .from(COURSES)
    .select("*")
    .or(`title.ilike.%${q}%,courseCode.ilike.%${q}%,level.ilike.%${q}%`)
    .limit(limit);

  if (error) throw error;

  const items = uniqueBy(data || [], (x) => x.id || x._id || x.courseCode);

  const enriched = [];

  for (const course of items.slice(0, limit)) {
    enriched.push(await attachUniversityInfoToCourse(course));
  }

  return enriched.slice(0, limit);
}

export async function getCourseBundleByCourseId(courseId) {
  const { data: course, error } = await supabaseAdmin
    .from(COURSES)
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (error) throw error;
  if (!course) return null;

  const courseWithUni = await attachUniversityInfoToCourse(course);

  const { data: entryRequirements, error: reqError } = await supabaseAdmin
    .from(ENTRY_REQUIREMENTS)
    .select("*")
    .eq("courseCode", course.courseCode)
    .order("qualification", { ascending: true })
    .limit(50);

  if (reqError) throw reqError;

  return {
    course: courseWithUni,
    entryRequirements: entryRequirements || []
  };
}

export async function getCourseBundleByName(courseName) {
  const q = String(courseName || "").trim();
  if (!q) return null;

  let result = await supabaseAdmin
    .from(COURSES)
    .select("*")
    .eq("title", q)
    .limit(1)
    .maybeSingle();

  if (result.error) throw result.error;

  let course = result.data || null;

  if (!course) {
    result = await supabaseAdmin
      .from(COURSES)
      .select("*")
      .ilike("title", `%${q}%`)
      .limit(1)
      .maybeSingle();

    if (result.error) throw result.error;
    course = result.data || null;
  }

  if (!course) return null;

  return getCourseBundleByCourseId(course.id);
}

export async function getScholarshipsForCourseOrUniversity({
  courseCode = "",
  universityCode = "",
  intendedCourse = ""
} = {}) {
  const out = [];

  const courseCodeNorm = String(courseCode || "").trim();
  const universityCodeNorm = String(universityCode || "").trim();
  const intendedCourseNorm = norm(intendedCourse);

  if (courseCodeNorm) {
    const { data, error } = await supabaseAdmin
      .from(SCHOLARSHIPS)
      .select("*")
      .eq("courseCode", courseCodeNorm)
      .limit(50);

    if (error) throw error;

    out.push(...(data || []));
  }

  if (universityCodeNorm) {
    const { data, error } = await supabaseAdmin
      .from(SCHOLARSHIPS)
      .select("*")
      .eq("universityCode", universityCodeNorm)
      .limit(100);

    if (error) throw error;

    for (const row of data || []) {
      const rowCourseCode = String(row.courseCode || "").trim();

      if (!rowCourseCode) {
        out.push(row);
        continue;
      }

      if (courseCodeNorm && rowCourseCode === courseCodeNorm) {
        out.push(row);
      }
    }
  }

  if (!out.length && intendedCourseNorm) {
    const { data, error } = await supabaseAdmin
      .from(SCHOLARSHIPS)
      .select("*")
      .ilike("title", `%${intendedCourse}%`)
      .limit(30);

    if (error) throw error;

    out.push(...(data || []));
  }

  const deduped = uniqueBy(
    out,
    (x) => x.id || x._id || x.scholarshipCode || x.title
  );

  const courseMap = {};

  for (const row of deduped) {
    const cCode = String(row.courseCode || "").trim();

    if (cCode && !courseMap[cCode]) {
      const { data, error } = await supabaseAdmin
        .from(COURSES)
        .select("*")
        .eq("courseCode", cCode)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      courseMap[cCode] = data || null;
    }
  }

  return deduped.map((row) => ({
    ...row,
    courseTitle: courseMap[row.courseCode]?.title || ""
  }));
}