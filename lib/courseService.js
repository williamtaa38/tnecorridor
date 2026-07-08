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

// ===============================
// RAG SEARCH HELPERS
// ===============================

function cleanSearchText(value) {
  return String(value || "")
    .trim()
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ");
}

function clipText(value, max = 500) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

function rowToCompactText(row = {}) {
  return Object.entries(row)
    .filter(([_, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${clipText(v, 220)}`)
    .join(" | ");
}

async function safeSelect(table, builder) {
  try {
    const { data, error } = await builder;
    if (error) {
      console.error(`RAG search error in ${table}:`, error.message || error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error(`RAG search exception in ${table}:`, err?.message || err);
    return [];
  }
}

export async function searchUniversitiesRag(query, limit = 5) {
  const q = cleanSearchText(query);
  if (!q) return [];

  return safeSelect(
    UNIVERSITIES,
    supabaseAdmin
      .from(UNIVERSITIES)
      .select("*")
      .or(
        `title.ilike.%${q}%,universityShortName.ilike.%${q}%,universityCode.ilike.%${q}%,location.ilike.%${q}%`
      )
      .limit(limit)
  );
}

export async function searchCoursesRag(query, limit = 8) {
  const q = cleanSearchText(query);
  if (!q) return [];

  return safeSelect(
    COURSES,
    supabaseAdmin
      .from(COURSES)
      .select("*")
      .or(
        `title.ilike.%${q}%,courseCode.ilike.%${q}%,level.ilike.%${q}%,universityCode.ilike.%${q}%,duration.ilike.%${q}%,studyMode.ilike.%${q}%`
      )
      .limit(limit)
  );
}

export async function searchEntryRequirementsRag(query, limit = 8) {
  const q = cleanSearchText(query);
  if (!q) return [];

  return safeSelect(
    ENTRY_REQUIREMENTS,
    supabaseAdmin
      .from(ENTRY_REQUIREMENTS)
      .select("*")
      .or(
        `courseCode.ilike.%${q}%,courseNameText.ilike.%${q}%,qualification.ilike.%${q}%,minimumRequirement.ilike.%${q}%,englishRequirement.ilike.%${q}%,malaysianAcademic.ilike.%${q}%,internationalAcademic.ilike.%${q}%,english.ilike.%${q}%`
      )
      .limit(limit)
  );
}

export async function searchScholarshipsRag(query, limit = 8) {
  const q = cleanSearchText(query);
  if (!q) return [];

  return safeSelect(
    SCHOLARSHIPS,
    supabaseAdmin
      .from(SCHOLARSHIPS)
      .select("*")
      .or(
        `title.ilike.%${q}%,scholarshipCode.ilike.%${q}%,scholarshipType.ilike.%${q}%,amountOrBenefit.ilike.%${q}%,eligibilityCriteria.ilike.%${q}%,applicableIntake.ilike.%${q}%,deadline.ilike.%${q}%,courseCode.ilike.%${q}%,universityCode.ilike.%${q}%`
      )
      .limit(limit)
  );
}

export async function buildEducationRagContext(query, state = {}) {
  const student = state?.student || {};

  const searchTerms = uniqueBy(
    [
      query,
      student.intendedCourse,
      student.intendedUniversity,
      student.intendedUniversityCode
    ].filter(Boolean),
    (x) => norm(x)
  );

  const universities = [];
  const courses = [];
  const requirements = [];
  const scholarships = [];

  for (const term of searchTerms.slice(0, 3)) {
    const [u, c, r, s] = await Promise.all([
      searchUniversitiesRag(term, 5),
      searchCoursesRag(term, 8),
      searchEntryRequirementsRag(term, 8),
      searchScholarshipsRag(term, 8)
    ]);

    universities.push(...u);
    courses.push(...c);
    requirements.push(...r);
    scholarships.push(...s);
  }

  const uniqueUniversities = uniqueBy(
    universities,
    (x) => x.id || x._id || x.universityCode || x.title
  ).slice(0, 6);

  const uniqueCourses = uniqueBy(
    courses,
    (x) => x.id || x._id || x.courseCode || x.title
  ).slice(0, 10);

  const uniqueRequirements = uniqueBy(
    requirements,
    (x) => x.id || x._id || `${x.courseCode}-${x.qualification}-${x.minimumRequirement}`
  ).slice(0, 10);

  const uniqueScholarships = uniqueBy(
    scholarships,
    (x) => x.id || x._id || x.scholarshipCode || x.title
  ).slice(0, 10);

  const contextParts = [];

  if (uniqueUniversities.length) {
    contextParts.push(
      "UNIVERSITIES:\n" +
        uniqueUniversities.map((x, i) => `${i + 1}. ${rowToCompactText(x)}`).join("\n")
    );
  }

  if (uniqueCourses.length) {
    contextParts.push(
      "COURSES:\n" +
        uniqueCourses.map((x, i) => `${i + 1}. ${rowToCompactText(x)}`).join("\n")
    );
  }

  if (uniqueRequirements.length) {
    contextParts.push(
      "ENTRY REQUIREMENTS:\n" +
        uniqueRequirements.map((x, i) => `${i + 1}. ${rowToCompactText(x)}`).join("\n")
    );
  }

  if (uniqueScholarships.length) {
    contextParts.push(
      "SCHOLARSHIPS:\n" +
        uniqueScholarships.map((x, i) => `${i + 1}. ${rowToCompactText(x)}`).join("\n")
    );
  }

  return {
    universities: uniqueUniversities,
    courses: uniqueCourses,
    entryRequirements: uniqueRequirements,
    scholarships: uniqueScholarships,
    contextText: contextParts.join("\n\n").trim()
  };
}
