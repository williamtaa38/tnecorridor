import { supabaseAdmin } from "./supabaseAdmin.js";

const CACHE_TTL_MS = Number(process.env.EDUSEEK_CACHE_TTL_MS || 120000);
const MAX_ROWS_PER_TABLE = Number(process.env.EDUSEEK_MAX_ROWS || 5000);
const PAGE_SIZE = 500;

const TABLES = {
  courses: unique([
    process.env.COURSES_TABLE,
    "courses",
    "Courses"
  ]),
  requirements: unique([
    process.env.ENTRY_REQUIREMENTS_TABLE,
    "entry_requirements",
    "entryrequirements",
    "EntryRequirements"
  ]),
  scholarships: unique([
    process.env.SCHOLARSHIPS_TABLE,
    "scholarships",
    "Scholarships"
  ]),
  universities: unique([
    process.env.UNIVERSITIES_TABLE,
    "universities",
    "Universities"
  ])
};

const cache = new Map();

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function normalizedKey(value) {
  return clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function pick(row, names, fallback = "") {
  if (!row || typeof row !== "object") return fallback;

  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
      return row[name];
    }
  }

  const wanted = new Set(names.map(normalizedKey));

  for (const [key, value] of Object.entries(row)) {
    if (wanted.has(normalizedKey(key)) && value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

function toNumberOrText(value) {
  if (value === "" || value === undefined || value === null) return "";
  const number = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : clean(value);
}

function normalizeCourse(row) {
  return {
    id: clean(pick(row, ["id", "ID", "_id"])),
    title: clean(pick(row, ["title", "Title", "courseTitle", "course_name", "courseNameText", "programmeName"])),
    courseCode: clean(pick(row, ["courseCode", "course_code", "code", "programmeCode"])),
    universityCode: clean(pick(row, ["universityCode", "university_code", "uniCode"])).toUpperCase(),
    universityId: clean(pick(row, ["universityId", "university_id", "universityRef", "university_ref"])),
    universityTitle: clean(pick(row, ["universityTitle", "universityName", "university_name", "institutionName"])),
    level: clean(pick(row, ["level", "studyLevel", "study_level", "qualificationLevel"])),
    faculty: clean(pick(row, ["faculty", "school", "department"])),
    fieldOfStudy: clean(pick(row, ["fieldOfStudy", "field_of_study", "subjectArea", "category"])),
    duration: clean(pick(row, ["duration", "courseDuration", "course_duration"])),
    studyMode: clean(pick(row, ["studyMode", "study_mode", "modeOfStudy"])),
    intake: clean(pick(row, ["intake", "intakes", "availableIntakes", "applicableIntake"])),
    campus: clean(pick(row, ["campus", "location"])),
    description: clean(pick(row, ["description", "courseDescription", "overview", "summary"])),
    careerProspects: clean(pick(row, ["careerProspects", "career_prospects", "careers"])),
    tuitionCurrency: clean(pick(row, ["tuitionCurrency", "tuition_currency", "currency"], "MYR")),
    tuitionTotal_Malaysian: toNumberOrText(pick(row, [
      "tuitionTotal_Malaysian",
      "tuitionTotalMalaysian",
      "tuition_total_malaysian",
      "malaysianTuition",
      "localFee"
    ])),
    tuitionTotal_International: toNumberOrText(pick(row, [
      "tuitionTotal_International",
      "tuitionTotalInternational",
      "tuition_total_international",
      "internationalTuition",
      "internationalFee"
    ])),
    url: clean(pick(row, ["url", "courseUrl", "course_url", "website", "link"])),
    raw: row
  };
}

function normalizeRequirement(row) {
  return {
    id: clean(pick(row, ["id", "ID", "_id"])),
    courseRef: clean(pick(row, ["courseRef", "course_ref", "courseId", "course_id"])),
    courseCode: clean(pick(row, ["courseCode", "course_code"])),
    courseNameText: clean(pick(row, ["courseNameText", "course_name_text", "courseTitle", "title", "Title"])),
    qualification: clean(pick(row, ["qualification", "examType", "exam_type"])),
    minimumRequirement: clean(pick(row, ["minimumRequirement", "minimum_requirement", "minimumAcademicRequirement"])),
    englishRequirement: clean(pick(row, ["englishRequirement", "english_requirement", "english"])),
    malaysianAcademic: clean(pick(row, ["malaysianAcademic", "malaysian_academic"])),
    internationalAcademic: clean(pick(row, ["internationalAcademic", "international_academic"])),
    notes: clean(pick(row, ["notes", "note"])),
    raw: row
  };
}

function normalizeScholarship(row) {
  return {
    id: clean(pick(row, ["id", "ID", "_id"])),
    title: clean(pick(row, ["title", "Title", "scholarshipName"])),
    scholarshipCode: clean(pick(row, ["scholarshipCode", "scholarship_code"])),
    universityCode: clean(pick(row, ["universityCode", "university_code"])).toUpperCase(),
    courseCode: clean(pick(row, ["courseCode", "course_code"])),
    courseTitle: clean(pick(row, ["courseTitle", "course_title", "courseName"])),
    scholarshipType: clean(pick(row, ["scholarshipType", "scholarship_type", "type"])),
    amountOrBenefit: clean(pick(row, ["amountOrBenefit", "amount_or_benefit", "benefit", "amount"])),
    eligibilityCriteria: clean(pick(row, ["eligibilityCriteria", "eligibility_criteria", "eligibility"])),
    applicableIntake: clean(pick(row, ["applicableIntake", "applicable_intake", "intake"])),
    deadline: clean(pick(row, ["deadline", "closingDate", "closing_date"])),
    notes: clean(pick(row, ["notes", "note"])),
    raw: row
  };
}

function normalizeUniversity(row) {
  return {
    id: clean(pick(row, ["id", "ID", "_id"])),
    title: clean(pick(row, ["title", "Title", "universityName", "university_name", "name"])),
    universityCode: clean(pick(row, ["universityCode", "university_code", "code"])).toUpperCase(),
    shortName: clean(pick(row, ["shortName", "short_name", "abbreviation"])),
    campus: clean(pick(row, ["campus", "location", "city"])),
    description: clean(pick(row, ["description", "overview", "summary"])),
    website: clean(pick(row, ["website", "url", "link"])),
    raw: row
  };
}

async function readAllFromTable(tableName) {
  const rows = [];

  for (let start = 0; start < MAX_ROWS_PER_TABLE; start += PAGE_SIZE) {
    const end = Math.min(start + PAGE_SIZE - 1, MAX_ROWS_PER_TABLE - 1);
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select("*")
      .range(start, end);

    if (error) throw error;

    const page = Array.isArray(data) ? data : [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function readEntity(entity) {
  const cached = cache.get(entity);

  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.rows;
  }

  let lastError = null;

  for (const tableName of TABLES[entity]) {
    try {
      const rows = await readAllFromTable(tableName);
      cache.set(entity, { at: Date.now(), rows, tableName });
      return rows;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    console.error(`Unable to read ${entity}:`, lastError.message || lastError);
  }

  return [];
}

function compactText(...values) {
  return values
    .flat()
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map(clean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "at", "can", "course", "courses", "do", "for", "from",
  "i", "in", "is", "me", "my", "of", "on", "or", "please", "program", "programme",
  "show", "study", "the", "to", "university", "want", "what", "which", "with"
]);

function tokens(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function scoreMatch(query, text) {
  const q = clean(query).toLowerCase();
  const haystack = clean(text).toLowerCase();
  if (!q || !haystack) return 0;

  let score = haystack === q ? 120 : 0;
  if (haystack.includes(q)) score += 55;

  const queryTokens = tokens(q);
  const textTokens = new Set(tokens(haystack));

  for (const token of queryTokens) {
    if (textTokens.has(token)) score += 14;
    else if ([...textTokens].some((candidate) => candidate.startsWith(token) || token.startsWith(candidate))) score += 7;
    else if (haystack.includes(token)) score += 4;
  }

  return score;
}

function equalsLoose(a, b) {
  return !!clean(a) && !!clean(b) && normalizedKey(a) === normalizedKey(b);
}

function universityName(course, universities) {
  if (course.universityTitle) return course.universityTitle;

  const found = universities.find((uni) =>
    equalsLoose(uni.universityCode, course.universityCode) ||
    equalsLoose(uni.id, course.universityId)
  );

  return found?.title || found?.shortName || course.universityCode || "";
}

function publicCourse(course) {
  const { raw, ...result } = course;
  return result;
}

function publicRequirement(requirement) {
  const { raw, ...result } = requirement;
  return result;
}

function publicScholarship(scholarship) {
  const { raw, ...result } = scholarship;
  return result;
}

function publicUniversity(university) {
  const { raw, ...result } = university;
  return result;
}

async function normalizedUniversities() {
  return (await readEntity("universities"))
    .map(normalizeUniversity)
    .filter((row) => row.id || row.title || row.universityCode);
}

async function normalizedCourses() {
  const [courseRows, universities] = await Promise.all([
    readEntity("courses"),
    normalizedUniversities()
  ]);

  return courseRows
    .map(normalizeCourse)
    .filter((course) => course.id || course.title || course.courseCode)
    .map((course) => ({
      ...course,
      universityTitle: universityName(course, universities)
    }));
}

export function clearEducationDataCache() {
  cache.clear();
}

export async function getUniversities(query = "", limit = 20) {
  const universities = await normalizedUniversities();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));

  if (!clean(query)) {
    return universities.slice(0, safeLimit).map(publicUniversity);
  }

  return universities
    .map((university) => ({
      university,
      score: scoreMatch(query, compactText(
        university.title,
        university.shortName,
        university.universityCode,
        university.campus,
        university.description
      ))
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, safeLimit)
    .map((item) => publicUniversity(item.university));
}

export async function resolveUniversityByInput(input) {
  const universities = await normalizedUniversities();
  const query = clean(input);
  if (!query) return null;

  const exact = universities.find((university) =>
    equalsLoose(university.universityCode, query) ||
    equalsLoose(university.shortName, query) ||
    equalsLoose(university.title, query)
  );

  if (exact) return publicUniversity(exact);

  const aliases = {
    mdis: "MDIS",
    numed: "NUMED",
    newcastle: "NUMED",
    reading: "UORM",
    uorm: "UORM",
    southampton: "UOSM",
    uosm: "UOSM",
    usm: "USM",
    "sains malaysia": "USM"
  };

  const lower = query.toLowerCase();
  const aliasCode = Object.entries(aliases).find(([key]) => lower.includes(key))?.[1];

  if (aliasCode) {
    const aliased = universities.find((university) => equalsLoose(university.universityCode, aliasCode));
    if (aliased) return publicUniversity(aliased);

    return {
      id: "",
      title: query,
      universityCode: aliasCode,
      shortName: aliasCode,
      campus: "",
      description: "",
      website: ""
    };
  }

  return (await getUniversities(query, 1))[0] || null;
}

export async function searchCourses(query, limitOrOptions = 10) {
  const options = typeof limitOrOptions === "object" && limitOrOptions !== null
    ? limitOrOptions
    : { limit: limitOrOptions };

  const limit = Math.max(1, Math.min(Number(options.limit) || 10, 30));
  const university = clean(options.university || options.universityCode);
  const level = clean(options.level);
  const courses = await normalizedCourses();

  let candidates = courses;

  if (university) {
    const universityQuery = university.toLowerCase();
    candidates = candidates.filter((course) =>
      course.universityCode.toLowerCase() === universityQuery ||
      course.universityTitle.toLowerCase().includes(universityQuery) ||
      scoreMatch(university, compactText(course.universityCode, course.universityTitle)) >= 14
    );
  }

  if (level) {
    candidates = candidates.filter((course) => scoreMatch(level, course.level) > 0);
  }

  if (!clean(query)) return candidates.slice(0, limit).map(publicCourse);

  return candidates
    .map((course) => ({
      course,
      score: scoreMatch(query, compactText(
        course.title,
        course.courseCode,
        course.fieldOfStudy,
        course.faculty,
        course.level,
        course.description,
        course.careerProspects,
        course.universityTitle,
        course.universityCode
      ))
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.course.title.localeCompare(b.course.title))
    .slice(0, limit)
    .map((item) => publicCourse(item.course));
}

async function requirementsForCourse(course) {
  const requirements = (await readEntity("requirements"))
    .map(normalizeRequirement)
    .filter((row) => row.id || row.courseRef || row.courseCode || row.courseNameText);

  return requirements
    .filter((requirement) =>
      equalsLoose(requirement.courseRef, course.id) ||
      equalsLoose(requirement.courseRef, course.courseCode) ||
      equalsLoose(requirement.courseCode, course.courseCode) ||
      equalsLoose(requirement.courseNameText, course.title)
    )
    .map(publicRequirement);
}

export async function getCourseBundleByCourseId(courseId) {
  const courses = await normalizedCourses();
  const query = clean(courseId);
  const course = courses.find((item) =>
    equalsLoose(item.id, query) || equalsLoose(item.courseCode, query)
  );

  if (!course) return { course: null, entryRequirements: [] };

  return {
    course: publicCourse(course),
    entryRequirements: await requirementsForCourse(course)
  };
}

export async function getCourseBundleByName(courseName) {
  const query = clean(courseName);
  if (!query) return { course: null, entryRequirements: [] };

  const courses = await normalizedCourses();
  let course = courses.find((item) =>
    equalsLoose(item.title, query) || equalsLoose(item.courseCode, query)
  );

  if (!course) {
    const hit = (await searchCourses(query, 1))[0];
    course = hit
      ? courses.find((item) =>
          equalsLoose(item.id, hit.id) ||
          equalsLoose(item.courseCode, hit.courseCode) ||
          equalsLoose(item.title, hit.title)
        )
      : null;
  }

  if (!course) return { course: null, entryRequirements: [] };

  return {
    course: publicCourse(course),
    entryRequirements: await requirementsForCourse(course)
  };
}

export async function getScholarshipsForCourseOrUniversity(options = {}) {
  const courseCode = clean(options.courseCode);
  const universityCode = clean(options.universityCode).toUpperCase();
  const intendedCourse = clean(options.intendedCourse || options.query);
  const limit = Math.max(1, Math.min(Number(options.limit) || 30, 50));
  const scholarships = (await readEntity("scholarships"))
    .map(normalizeScholarship)
    .filter((row) => row.id || row.title || row.scholarshipCode);

  const ranked = scholarships.map((scholarship) => {
    let score = 0;

    if (
      universityCode &&
      scholarship.universityCode &&
      !equalsLoose(scholarship.universityCode, universityCode)
    ) {
      return { scholarship, score: 0 };
    }

    if (courseCode && equalsLoose(scholarship.courseCode, courseCode)) score += 100;
    if (universityCode && equalsLoose(scholarship.universityCode, universityCode)) score += 45;

    if (intendedCourse) {
      score += scoreMatch(intendedCourse, compactText(
        scholarship.title,
        scholarship.universityCode,
        scholarship.courseTitle,
        scholarship.courseCode,
        scholarship.scholarshipType,
        scholarship.eligibilityCriteria,
        scholarship.notes
      ));
    }

    if (!courseCode && !universityCode && !intendedCourse) score = 1;
    return { scholarship, score };
  });

  return ranked
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.scholarship.title.localeCompare(b.scholarship.title))
    .slice(0, limit)
    .map((item) => publicScholarship(item.scholarship));
}

function formatCourseContext(course, index) {
  return [
    `COURSE ${index + 1}`,
    `ID: ${course.id || "-"}`,
    `Title: ${course.title || "-"}`,
    `Code: ${course.courseCode || "-"}`,
    `University: ${course.universityTitle || course.universityCode || "-"}`,
    `Level: ${course.level || "-"}`,
    `Duration: ${course.duration || "-"}`,
    `Study mode: ${course.studyMode || "-"}`,
    `Intake: ${course.intake || "-"}`,
    `Malaysian tuition: ${course.tuitionCurrency || ""} ${course.tuitionTotal_Malaysian || "-"}`.trim(),
    `International tuition: ${course.tuitionCurrency || ""} ${course.tuitionTotal_International || "-"}`.trim(),
    course.description ? `Description: ${course.description}` : "",
    course.careerProspects ? `Career prospects: ${course.careerProspects}` : ""
  ].filter(Boolean).join("\n");
}

function formatRequirementContext(requirement, index) {
  return [
    `REQUIREMENT ${index + 1}`,
    `Course: ${requirement.courseNameText || requirement.courseCode || requirement.courseRef || "-"}`,
    `Qualification: ${requirement.qualification || "-"}`,
    `Minimum: ${requirement.minimumRequirement || "-"}`,
    `English: ${requirement.englishRequirement || "-"}`,
    requirement.malaysianAcademic ? `Malaysian academic: ${requirement.malaysianAcademic}` : "",
    requirement.internationalAcademic ? `International academic: ${requirement.internationalAcademic}` : "",
    requirement.notes ? `Notes: ${requirement.notes}` : ""
  ].filter(Boolean).join("\n");
}

function formatScholarshipContext(scholarship, index) {
  return [
    `SCHOLARSHIP ${index + 1}`,
    `Title: ${scholarship.title || "-"}`,
    `University code: ${scholarship.universityCode || "-"}`,
    `Course code: ${scholarship.courseCode || "-"}`,
    `Type: ${scholarship.scholarshipType || "-"}`,
    `Benefit: ${scholarship.amountOrBenefit || "-"}`,
    `Eligibility: ${scholarship.eligibilityCriteria || "-"}`,
    `Intake: ${scholarship.applicableIntake || "-"}`,
    `Deadline: ${scholarship.deadline || "-"}`,
    scholarship.notes ? `Notes: ${scholarship.notes}` : ""
  ].filter(Boolean).join("\n");
}

export async function buildEducationRagContext(query, state = {}) {
  const student = state?.student || {};
  const courseQuery = compactText(query, student.intendedCourse);
  const universityQuery = clean(student.intendedUniversityCode || student.intendedUniversity);
  const courses = await searchCourses(courseQuery, {
    university: universityQuery,
    limit: 8
  });

  const fallbackCourses = courses.length || !student.intendedCourse
    ? courses
    : await searchCourses(student.intendedCourse, 8);

  const bundles = await Promise.all(
    fallbackCourses.slice(0, 4).map((course) => getCourseBundleByCourseId(course.id || course.courseCode))
  );

  const requirements = bundles.flatMap((bundle) => bundle.entryRequirements || []).slice(0, 12);
  const primaryCourse = fallbackCourses[0] || {};
  const scholarships = await getScholarshipsForCourseOrUniversity({
    courseCode: primaryCourse.courseCode || state?.selectedCourseCode || "",
    universityCode: primaryCourse.universityCode || student.intendedUniversityCode || "",
    intendedCourse: courseQuery,
    limit: 8
  });

  const universities = await getUniversities(universityQuery || query, 5);
  const sections = [];

  if (fallbackCourses.length) {
    sections.push(fallbackCourses.map(formatCourseContext).join("\n\n"));
  }

  if (requirements.length) {
    sections.push(requirements.map(formatRequirementContext).join("\n\n"));
  }

  if (scholarships.length) {
    sections.push(scholarships.map(formatScholarshipContext).join("\n\n"));
  }

  if (universities.length) {
    sections.push(
      universities.map((university, index) => [
        `UNIVERSITY ${index + 1}`,
        `Name: ${university.title || university.shortName || "-"}`,
        `Code: ${university.universityCode || "-"}`,
        `Campus: ${university.campus || "-"}`,
        university.description ? `Description: ${university.description}` : "",
        university.website ? `Website: ${university.website}` : ""
      ].filter(Boolean).join("\n")).join("\n\n")
    );
  }

  return {
    contextText: sections.join("\n\n---\n\n").slice(0, 32000),
    courses: fallbackCourses,
    requirements,
    scholarships,
    universities
  };
}