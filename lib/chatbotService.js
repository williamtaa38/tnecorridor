import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabaseAdmin } from "./supabaseAdmin.js";
import {
  searchCourses,
  getCourseBundleByCourseId,
  getCourseBundleByName,
  resolveUniversityByInput,
  getScholarshipsForCourseOrUniversity,
  buildEducationRagContext
} from "./courseService.js";

const OPENAI_MODEL = "gpt-4.1-mini";

function safeParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function normalizeJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "string") return safeParse(value, fallback);
  return value;
}

function norm(msg) {
  return String(msg || "").trim().toLowerCase();
}

function isGreeting(msg) {
  const t = norm(msg);
  return ["hi", "hello", "hey", "hai", "start", "menu", "home"].includes(t);
}

function normalizeLetters(msg) {
  const up = String(msg || "").trim().toUpperCase();
  return up.replace(/[^A-Z]/g, "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function isValidPhone(phone) {
  const cleaned = String(phone || "").replace(/[^\d+]/g, "");
  return cleaned.length >= 9 && cleaned.length <= 15;
}

function parseChoiceNumber(msg) {
  const t = String(msg || "").trim();
  const m = t.match(/^(\d{1,2})$/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

function cleanPhone(phone) {
  return String(phone || "").replace(/\s+/g, " ").trim();
}

function quick(label, text) {
  return { label, text };
}

function finalActionButtons() {
  return [
    { label: "Start over again", action: "restart_chat" },
    { label: "Back to mainpage", action: "open_url", url: "/" },
    { label: "Sign Up Now!", action: "open_url", url: "/pages/register.html" }
  ];
}

function reply(replyText, extras = {}) {
  return {
    replyText,
    quickReplies: extras.quickReplies || [],
    actionButtons: extras.actionButtons || [],
    showDownloadPdf: !!extras.showDownloadPdf,
    reviewResults: extras.reviewResults || null
  };
}

function courseUniversityName(course) {
  return (
    course?.universityTitle ||
    course?.universityName ||
    course?.universityShortName ||
    course?.universityCode ||
    "Unknown University"
  );
}

function formatMoney(currency, amount) {
  if (amount === undefined || amount === null || amount === "") return "-";
  return `${currency || ""} ${amount}`.trim();
}

function defaultState() {
  return {
    stage: "ask_name",
    student: {
      fullName: "",
      email: "",
      phone: "",
      intendedCourse: "",
      intendedUniversity: "",
      intendedUniversityCode: ""
    },
    spm: {
      received: false,
      fileUrl: null,
      ocrText: null,
      parsedGrades: null,
      parseConfidence: 0
    },
    academicResult: {
      studentName: "",
      country: "",
      examType: "",
      subjects: [],
      overallConfidence: 0,
      needsHumanReview: true,
      notes: "",
      confirmed: false
    },
    personality: {
      qIndex: 0,
      answers: [],
      score: null
    },
    nextAction: null,
    coursePick: {
      pending: false,
      options: []
    },
    selectedCourseId: null,
    selectedCourseCode: "",
    eligibilitySummary: ""
  };
}

function sanitizeAcademicResult(obj) {
  const raw = obj || {};

  const subjects = Array.isArray(raw.subjects)
    ? raw.subjects
        .map((x) => ({
          subject: String(x?.subject || "").trim(),
          grade: String(x?.grade || "").trim(),
          confidence: Number(x?.confidence || 0)
        }))
        .filter((x) => x.subject && x.grade)
    : [];

  return {
    studentName: String(raw.student_name || raw.studentName || "").trim(),
    country: String(raw.country || "").trim(),
    examType: String(raw.exam_type || raw.examType || "").trim(),
    subjects,
    overallConfidence: Number(raw.overall_confidence || raw.overallConfidence || 0),
    needsHumanReview: !!(raw.needs_human_review ?? raw.needsHumanReview ?? true),
    notes: String(raw.notes || "").trim(),
    confirmed: !!raw.confirmed
  };
}

function academicSubjectsToMap(subjects) {
  const out = {};

  for (const item of subjects || []) {
    const subject = String(item?.subject || "").trim();
    const grade = String(item?.grade || "").trim();

    if (subject && grade && !out[subject]) {
      out[subject] = grade;
    }
  }

  return out;
}

function buildAcademicPreview(result) {
  const subjects = Array.isArray(result?.subjects) ? result.subjects : [];

  if (!subjects.length) return "(No subjects detected)";

  return subjects.map((x) => `• ${x.subject}: ${x.grade}`).join("\n");
}

function wrapText(text, maxChars = 92) {
  const lines = [];
  const paragraphs = String(text || "").split("\n");

  for (const p of paragraphs) {
    if (!p.trim()) {
      lines.push("");
      continue;
    }

    let current = "";
    const words = p.split(/\s+/);

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;

      if (test.length > maxChars) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }

    if (current) lines.push(current);
  }

  return lines;
}

function formatRequirementList(entryRequirements) {
  const rows = Array.isArray(entryRequirements) ? entryRequirements : [];

  if (!rows.length) return "No entry requirements found in CMS.";

  return rows
    .map(
      (r, i) =>
        `${i + 1}. Qualification: ${r.qualification || "-"}\n` +
        `   Minimum requirement: ${r.minimumRequirement || "-"}\n` +
        `   English requirement: ${r.englishRequirement || "-"}`
    )
    .join("\n\n");
}

function formatScholarshipRows(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return "I could not find a matching scholarship in our CMS for this selection yet.";
  }

  return rows
    .map((s, i) => {
      const courseScope = s.courseTitle ? `Course: ${s.courseTitle}\n` : "";

      return (
        `${i + 1}. ${s.title || "Scholarship"}\n` +
        `   Type: ${s.scholarshipType || "-"}\n` +
        `   Benefit: ${s.amountOrBenefit || "-"}\n` +
        `   ${courseScope}` +
        `   Eligibility: ${s.eligibilityCriteria || "-"}\n` +
        `   Intake: ${s.applicableIntake || "-"}\n` +
        `   Deadline: ${s.deadline || "-"}`
      );
    })
    .join("\n\n");
}

async function loadSession(sessionId) {
  const { data, error } = await supabaseAdmin
    .from("chat_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    return {
      _id: data.id,
      sessionId,
      history: normalizeJson(data.history_json, []),
      state: normalizeJson(data.state_json, null) || defaultState()
    };
  }

  return {
    _id: null,
    sessionId,
    history: [],
    state: defaultState()
  };
}

async function saveSession(session) {
  const payload = {
    session_id: session.sessionId,
    history_json: session.history || [],
    state_json: session.state || {},
    updated_at: new Date().toISOString()
  };

  if (session._id) {
    const { error } = await supabaseAdmin
      .from("chat_sessions")
      .update(payload)
      .eq("id", session._id);

    if (error) throw error;
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("chat_sessions")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;

  session._id = data.id;
}

async function callOpenAISimple(prompt) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are EduSeek AI, a concise Malaysian education counsellor. Be practical, specific, and easy to understand."
        },
        { role: "user", content: prompt }
      ]
    })
  });

  const raw = await resp.text();

  if (!resp.ok) {
    throw new Error(`OpenAI error ${resp.status}: ${raw.slice(0, 300)}`);
  }

  const data = JSON.parse(raw);

  return data?.choices?.[0]?.message?.content || "";
}

// ===============================
// FLEXIBLE EDUCATION RAG MODE
// ===============================

function looksLikeGeneralQuestion(msg) {
  const t = norm(msg);

  if (!t) return false;

  return (
    t.includes("?") ||
    t.startsWith("what ") ||
    t.startsWith("why ") ||
    t.startsWith("how ") ||
    t.startsWith("can ") ||
    t.startsWith("could ") ||
    t.startsWith("should ") ||
    t.startsWith("do ") ||
    t.startsWith("does ") ||
    t.startsWith("is ") ||
    t.startsWith("are ") ||
    t.startsWith("which ") ||
    t.startsWith("when ") ||
    t.startsWith("where ") ||
    t.includes("difference") ||
    t.includes("meaning") ||
    t.includes("explain") ||
    t.includes("compare") ||
    t.includes("recommend") ||
    t.includes("suggest") ||
    t.includes("tell me about")
  );
}

function hasEducationKeyword(msg) {
  const t = norm(msg);

  const keywords = [
    "course",
    "courses",
    "programme",
    "program",
    "programmes",
    "university",
    "universities",
    "college",
    "degree",
    "diploma",
    "foundation",
    "master",
    "masters",
    "phd",
    "spm",
    "igcse",
    "a level",
    "a-level",
    "alevel",
    "uec",
    "stpm",
    "result",
    "grade",
    "academic",
    "entry",
    "requirement",
    "requirements",
    "ielts",
    "muet",
    "english",
    "scholarship",
    "scholarships",
    "tuition",
    "fee",
    "fees",
    "intake",
    "visa",
    "student visa",
    "accommodation",
    "hostel",
    "career",
    "careers",
    "job",
    "internship",
    "malaysia",
    "uk pathway",
    "pathway",
    "reading",
    "southampton",
    "newcastle",
    "mdis",
    "numed",
    "uorm",
    "uosm",
    "usm",
    "medicine",
    "mbbs",
    "pharmacy",
    "engineering",
    "computer science",
    "business",
    "accounting",
    "finance",
    "psychology",
    "data science",
    "ai",
    "artificial intelligence",
    "application",
    "apply",
    "admission",
    "offer letter"
  ];

  return keywords.some((k) => t.includes(k));
}

function hasOffTopicKeyword(msg) {
  const t = norm(msg);

  const keywords = [
    "bitcoin",
    "crypto",
    "forex",
    "stock price",
    "casino",
    "betting",
    "gambling",
    "relationship",
    "girlfriend",
    "boyfriend",
    "movie",
    "game",
    "gaming",
    "recipe",
    "cook",
    "politics",
    "election",
    "war",
    "weapon",
    "gun",
    "hack",
    "password",
    "crack"
  ];

  return keywords.some((k) => t.includes(k));
}

function isLikelyStageAnswer(state, msg) {
  const stage = state?.stage || "";
  const t = norm(msg);
  const letters = normalizeLetters(msg);
  const n = parseChoiceNumber(msg);

  if (!msg) return true;
  if (t === "restart_chat") return true;

  if (stage === "ask_name") {
    return !looksLikeGeneralQuestion(msg) && !hasEducationKeyword(msg) && !hasOffTopicKeyword(msg);
  }

  if (stage === "ask_email") {
    return isValidEmail(msg);
  }

  if (stage === "ask_phone") {
    return isValidPhone(msg);
  }

  if (stage === "ask_course_interest") {
    return !looksLikeGeneralQuestion(msg) && !hasOffTopicKeyword(msg);
  }

  if (stage === "ask_university_interest") {
    return !looksLikeGeneralQuestion(msg) && !hasOffTopicKeyword(msg);
  }

  if (stage === "await_spm") {
    return ["skip", "no", "later", "skip result", "skip spm"].includes(t);
  }

  if (stage === "options_after_spm") {
    return (
      t === "1" ||
      t === "2" ||
      t === "3" ||
      t.includes("personality") ||
      t.includes("suitable") ||
      t.includes("directly provide") ||
      t.includes("scholarship") ||
      t === "option_personality" ||
      t === "option_direct_courses" ||
      t === "option_scholarship"
    );
  }

  if (stage === "personality") {
    return ["A", "B", "C", "D"].includes(letters);
  }

  if (stage === "pick_course") {
    return !!n || (!looksLikeGeneralQuestion(msg) && hasEducationKeyword(msg));
  }

  if (stage === "done") {
    return t === "menu" || t === "home" || t === "start" || t === "restart_chat";
  }

  return false;
}

function stageReminder(state) {
  const stage = state?.stage || "";

  if (stage === "ask_name") {
    return "To continue your education counselling flow, please enter your full name.";
  }

  if (stage === "ask_email") {
    return "To continue, please enter your email address.";
  }

  if (stage === "ask_phone") {
    return "To continue, please enter your phone number.";
  }

  if (stage === "ask_course_interest") {
    return "To continue, please tell me what course you would like to study.";
  }

  if (stage === "ask_university_interest") {
    return "To continue, please tell me which university you are interested in.";
  }

  if (stage === "await_spm") {
    return "To continue, upload your result using + → Add photos & files, or type: skip.";
  }

  if (stage === "options_after_spm") {
    return "To continue, choose Personality Test, Suitable Courses, or Scholarship.";
  }

  if (stage === "personality") {
    return "To continue the personality test, please reply A, B, C, or D.";
  }

  if (stage === "pick_course") {
    return "To continue, please reply with the course number from the CMS list.";
  }

  if (stage === "done") {
    return "You can download your PDF report, start over, go back to the main page, or sign up.";
  }

  return "You may ask me about courses, universities, entry requirements, scholarships, intakes, fees, accommodation, student visa, or career study pathways.";
}

function educationQuickReplies(state) {
  const stage = state?.stage || "";

  if (stage === "await_spm") {
    return [
      quick("How to upload result", "How do I upload my result?"),
      quick("Skip upload", "skip"),
      quick("Scholarship", "scholarship")
    ];
  }

  if (stage === "options_after_spm") {
    return [
      quick("Personality test", "Option_Personality"),
      quick("Suitable courses", "Option_Direct_Courses"),
      quick("Scholarship", "Option_Scholarship")
    ];
  }

  if (stage === "personality") {
    return [quick("A", "A"), quick("B", "B"), quick("C", "C"), quick("D", "D")];
  }

  if (stage === "pick_course") {
    return [
      quick("Explain requirements", "Can you explain the entry requirements?"),
      quick("Scholarship", "scholarship"),
      quick("Start over", "restart_chat")
    ];
  }

  return [
    quick("Find suitable courses", "I want to find suitable courses"),
    quick("Check scholarship", "scholarship"),
    quick("Upload result", "How do I upload my result?")
  ];
}

async function callOpenAIJson(prompt) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a strict JSON classifier for an education chatbot. Return valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  const raw = await resp.text();

  if (!resp.ok) {
    throw new Error(`OpenAI JSON error ${resp.status}: ${raw.slice(0, 300)}`);
  }

  const data = JSON.parse(raw);
  const content = data?.choices?.[0]?.message?.content || "{}";

  return safeParse(content, {});
}

async function classifyFlexibleMessage(state, msg) {
  const localEducation = hasEducationKeyword(msg);
  const localQuestion = looksLikeGeneralQuestion(msg);
  const localOffTopic = hasOffTopicKeyword(msg);

  if (!localEducation && !localQuestion && !localOffTopic) {
    return {
      category: "stage_answer",
      reason: "Looks like a normal answer to the current form stage."
    };
  }

  try {
    const prompt = `
Classify this user message for EduSeek AI.

EduSeek AI only handles education-related topics:
- courses
- universities
- scholarships
- entry requirements
- visa for students
- student accommodation
- intakes
- fees
- career guidance related to study
- academic results
- application process

Current stage: ${state?.stage || "unknown"}

User message:
"${msg}"

Return JSON only:
{
  "category": "education_question" | "off_topic" | "stage_answer",
  "reason": "short reason"
}

Rules:
- If the message asks about education, courses, universities, scholarships, visa, accommodation, fees, intake, career study path, or application, use "education_question".
- If the message is unrelated to education, use "off_topic".
- If the message looks like the expected answer for the current chatbot stage, use "stage_answer".
`.trim();

    const out = await callOpenAIJson(prompt);

    if (
      out?.category === "education_question" ||
      out?.category === "off_topic" ||
      out?.category === "stage_answer"
    ) {
      return out;
    }
  } catch (err) {
    console.error("Flexible classifier failed:", err?.message || err);
  }

  if (localOffTopic && !localEducation) {
    return {
      category: "off_topic",
      reason: "Local keyword check detected off-topic message."
    };
  }

  if (localEducation || localQuestion) {
    return {
      category: "education_question",
      reason: "Local keyword/question check detected education or general question."
    };
  }

  return {
    category: "stage_answer",
    reason: "Fallback to normal stage flow."
  };
}

async function answerEducationQuestionWithRag(state, msg) {
  const rag = await buildEducationRagContext(msg, state);
  const student = state?.student || {};
  const hasRagContext = !!rag.contextText;

  const prompt = `
You are EduSeek AI, a Malaysian education counsellor.

Your job:
1. Answer only education-related questions.
2. Use the CMS/RAG context first when available.
3. If the CMS/RAG context does not contain the exact answer, say that the database does not show the exact information yet, then give careful general guidance.
4. Do not invent exact tuition fees, scholarship amounts, deadlines, or entry requirements if not shown in the CMS/RAG context.
5. Keep the answer clear, practical, and student-friendly.
6. End by guiding the student back to the current application flow.

Current student info:
- Name: ${student.fullName || "Not collected yet"}
- Interested course: ${student.intendedCourse || "Not stated"}
- Interested university: ${student.intendedUniversity || "Not stated"}
- Current chatbot stage: ${state?.stage || "unknown"}

User question:
"${msg}"

CMS/RAG context:
${hasRagContext ? rag.contextText : "No direct CMS/RAG match found."}

Current flow reminder:
${stageReminder(state)}

Write the answer now.
`.trim();

  const aiText = await callOpenAISimple(prompt);

  return reply(aiText + "\n\n" + stageReminder(state), {
    quickReplies: educationQuickReplies(state)
  });
}

function offTopicReply(state) {
  return reply(
    "I’m EduSeek AI, so I can only help with education-related questions such as courses, universities, scholarships, entry requirements, intakes, student visa, accommodation, fees, and career study pathways.\n\n" +
      stageReminder(state),
    {
      quickReplies: educationQuickReplies(state)
    }
  );
}

async function maybeHandleFlexibleMessage(session, state, msg) {
  if (!msg) return null;
  if (norm(msg) === "restart_chat") return null;

  if (isLikelyStageAnswer(state, msg)) {
    return null;
  }

  const classification = await classifyFlexibleMessage(state, msg);

  if (classification.category === "stage_answer") {
    return null;
  }

  const r =
    classification.category === "off_topic"
      ? offTopicReply(state)
      : await answerEducationQuestionWithRag(state, msg);

  session.history.push({
    role: "assistant",
    content: r.replyText
  });

  await saveSession(session);

  return r;
}

async function extractAcademicResultWithOpenAI({ base64, mimeType, fileName }) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  if (!base64) {
    throw new Error("Missing base64.");
  }

  const schema = {
    name: "academic_result",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        student_name: { type: "string" },
        country: { type: "string" },
        exam_type: { type: "string" },
        subjects: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              subject: { type: "string" },
              grade: { type: "string" },
              confidence: { type: "number" }
            },
            required: ["subject", "grade", "confidence"]
          }
        },
        overall_confidence: { type: "number" },
        needs_human_review: { type: "boolean" },
        notes: { type: "string" }
      },
      required: [
        "student_name",
        "country",
        "exam_type",
        "subjects",
        "overall_confidence",
        "needs_human_review",
        "notes"
      ]
    }
  };

  const userContent = [
    {
      type: "text",
      text:
        "Extract academic results from this high school / secondary school result document.\n\n" +
        "Rules:\n" +
        "- Extract only what is visible.\n" +
        "- Do not invent missing subjects.\n" +
        "- Keep original grade labels as shown when possible.\n" +
        "- Return all detected subject-grade pairs.\n" +
        "- If uncertain, lower confidence.\n" +
        "- If the result is unclear or incomplete, set needs_human_review = true.\n" +
        "- Return valid JSON only."
    }
  ];

  if (String(mimeType || "").startsWith("image/")) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${base64}`,
        detail: "high"
      }
    });
  } else {
    userContent.push({
      type: "file",
      file: {
        filename: fileName || "result-file",
        file_data: `data:${mimeType || "application/octet-stream"};base64,${base64}`
      }
    });
  }

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: schema
      },
      messages: [
        {
          role: "system",
          content:
            "You extract structured academic result data from school result documents."
        },
        {
          role: "user",
          content: userContent
        }
      ]
    })
  });

  const raw = await resp.text();

  if (!resp.ok) {
    throw new Error(`OpenAI extraction error ${resp.status}: ${raw.slice(0, 600)}`);
  }

  const data = JSON.parse(raw);
  const content = data?.choices?.[0]?.message?.content || "";

  let parsed = {};

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned non-JSON extraction output.");
  }

  return sanitizeAcademicResult(parsed);
}

const P_QUESTIONS = [
  "🧠 Q1/10: Which activity do you enjoy the MOST?\nA) Fixing/building things\nB) Solving maths/logic problems\nC) Helping/guiding others\nD) Designing/creating something",
  "🧠 Q2/10: In group projects, you usually:\nA) Do practical tasks\nB) Analyse/plan\nC) Coordinate/communicate\nD) Design/present",
  "🧠 Q3/10: Your strongest subject type is:\nA) Technical\nB) Maths/Science\nC) Languages/Humanities\nD) Art/Design/Media",
  "🧠 Q4/10: You feel satisfied when you:\nA) Make something work\nB) Solve difficult problems\nC) Help someone\nD) Create something new",
  "🧠 Q5/10: Which environment suits you best?\nA) Workshop/Lab\nB) Data/Systems office\nC) Clinic/Classroom\nD) Studio",
  "🧠 Q6/10: You prefer learning by:\nA) Hands-on\nB) Theory/logic\nC) Discussion\nD) Visual/explore",
  "🧠 Q7/10: Your future job should mainly:\nA) Build/maintain\nB) Analyse/optimise\nC) Support people\nD) Create/innovate",
  "🧠 Q8/10: You are comfortable with:\nA) Tools/machines\nB) Numbers/facts\nC) People/emotions\nD) Ideas/imagination",
  "🧠 Q9/10: What motivates you most?\nA) Real results\nB) Challenges\nC) Helping others\nD) Creativity",
  "🧠 Q10/10: Ideal career is:\nA) Skill-based practical\nB) Logical structured\nC) Meaningful to people\nD) Creative expressive"
];

function scorePersonality(answers) {
  const score = { A: 0, B: 0, C: 0, D: 0 };

  (answers || []).forEach((x) => {
    if (score[x] !== undefined) {
      score[x] += 1;
    }
  });

  return score;
}

async function buildRecommendationsText(state, cmsHits = []) {
  const student = state.student || {};
  const grades = JSON.stringify(state.spm?.parsedGrades || {});
  const personality = JSON.stringify(state.personality?.score || {});

  const cmsSummary = cmsHits.length
    ? cmsHits.map((x) => `- ${x.title} (${courseUniversityName(x)})`).join("\n")
    : "No direct CMS match found yet.";

  const prompt = `
Student details:
- Name: ${student.fullName || "Unknown"}
- Interested course: ${student.intendedCourse || "Not stated"}
- Interested university: ${student.intendedUniversity || "Not stated"}

Confirmed academic results:
${grades}

Personality score:
${personality}

Relevant CMS courses:
${cmsSummary}

Please recommend exactly 3 suitable study options in Malaysia.

For each option provide:
1. Course/program name
2. Why it suits the student
3. Example career
4. Estimated Risk of Automation by AI (%)
5. Estimated Future Career Demand (%)
6. Why this role may face AI automation risk
7. One short note

Use this exact format for each option:

1. 🎓 [Course Name] — 🏫 [University]

  ✅ Suits you because: [short reason]
  💼 Career: [example career]
  🤖 Estimated Risk of Automation by AI: [number]%
  📈 Estimated Future Career Demand: [number]%
  ⚠️ Why this role may face AI automation risk: [short explanation]
  📝 Note: [one short note]

Important rules:
- Keep it concise and friendly.
- Prefer the CMS course titles and universities when relevant.
- Do not leave percentages blank.
- Use realistic rounded estimates.
- End by telling the student to choose one course from the CMS list below.
`.trim();

  return callOpenAISimple(prompt);
}

async function buildScholarshipTextFromCms(state) {
  const courseCode = state?.selectedCourseCode || "";
  const universityCode = state?.student?.intendedUniversityCode || "";
  const intendedCourse = state?.student?.intendedCourse || "";

  const rows = await getScholarshipsForCourseOrUniversity({
    courseCode,
    universityCode,
    intendedCourse
  });

  let intro = "Here are the scholarships or financial aid options I found from our CMS:\n\n";

  if (!rows.length) {
    intro = "I could not find a matching scholarship row in our CMS yet.\n\n";
  }

  return {
    scholarshipText: intro + formatScholarshipRows(rows),
    rows
  };
}

async function getCmsMatches(state) {
  const intendedCourse = String(state?.student?.intendedCourse || "").trim();

  if (!intendedCourse) return [];

  let hits = await searchCourses(intendedCourse, 8);

  const intendedUniCode = String(
    state?.student?.intendedUniversityCode || ""
  )
    .trim()
    .toUpperCase();

  const intendedUniText = String(state?.student?.intendedUniversity || "")
    .trim()
    .toLowerCase();

  if (intendedUniCode) {
    const filtered = hits.filter(
      (c) => String(c.universityCode || "").toUpperCase() === intendedUniCode
    );

    if (filtered.length) hits = filtered;
  } else if (intendedUniText) {
    const filtered = hits.filter((c) =>
      courseUniversityName(c).toLowerCase().includes(intendedUniText)
    );

    if (filtered.length) hits = filtered;
  }

  return hits.slice(0, 8);
}

async function assessEligibilityForBundle(bundle, state) {
  const student = state.student || {};
  const grades = JSON.stringify(state.spm?.parsedGrades || {});
  const course = bundle?.course || {};
  const requirements = Array.isArray(bundle?.entryRequirements)
    ? bundle.entryRequirements
    : [];

  const requirementText = formatRequirementList(requirements);

  const prompt = `
Student name: ${student.fullName || "Unknown"}
Interested course: ${course.title || "Unknown"}
University: ${courseUniversityName(course)}

Confirmed academic results:
${grades}

Course entry requirements from CMS:
${requirementText}

Write a short preliminary eligibility assessment.

Use this format:
Status: Eligible / Possibly Eligible / Need Review
Reason:
Next step:

Rules:
- If data is incomplete, use Need Review.
- Compare only with the CMS requirements shown above.
- Keep it short and practical.
`.trim();

  return callOpenAISimple(prompt);
}

function formatCourseForList(course) {
  const uni = courseUniversityName(course);
  const feeLocal = formatMoney(course.tuitionCurrency, course.tuitionTotal_Malaysian);

  return `${course.title} — ${uni}${
    feeLocal !== "-" ? ` | Malaysian tuition: ${feeLocal}` : ""
  }`;
}

export async function chatMessage(sessionId, message) {
  try {
    if (!sessionId) throw new Error("Missing sessionId.");

    const session = await loadSession(sessionId);
    const state = session.state || defaultState();

    if (!state.personality) {
      state.personality = {
        qIndex: 0,
        answers: [],
        score: null
      };
    }

    if (!Array.isArray(state.personality.answers)) {
      state.personality.answers = [];
    }

    if (!state.student) {
      state.student = defaultState().student;
    }

    if (!state.coursePick) {
      state.coursePick = {
        pending: false,
        options: []
      };
    }

    if (!state.academicResult) {
      state.academicResult = defaultState().academicResult;
    }

    const msg = String(message || "").trim();
    const letters = normalizeLetters(msg);

    session.history.push({
      role: "user",
      content: msg
    });

    // Flexible interruption mode:
    // - If the user asks an education question outside the prepared flow,
    //   answer using CMS/RAG + AI, then guide them back.
    // - If the user asks something outside education, politely redirect.
    const flexibleReply = await maybeHandleFlexibleMessage(session, state, msg);

    if (flexibleReply) {
      return flexibleReply;
    }

    if (norm(msg) === "restart_chat") {
      session.state = defaultState();
      session.history = [];

      const r = reply(
        "Hi! I can help with course counselling, personality test, and result evaluation.\nBefore start may I get your full name:"
      );

      session.history.push({
        role: "assistant",
        content: r.replyText
      });

      await saveSession(session);

      return r;
    }

    if (isGreeting(msg) && state.stage === "done") {
      session.state = defaultState();
      session.history = [];

      const r = reply(
        "Hi! I can help with course counselling, personality test, and result evaluation.\nBefore start may I get your full name:"
      );

      session.history.push({
        role: "assistant",
        content: r.replyText
      });

      await saveSession(session);

      return r;
    }

    if (isGreeting(msg) && !state.student.fullName) {
      state.stage = "ask_name";
      session.state = state;

      const r = reply(
        "Hi! I can help with course counselling, personality test, and result evaluation.\nBefore start may I get your full name:"
      );

      session.history.push({
        role: "assistant",
        content: r.replyText
      });

      await saveSession(session);

      return r;
    }

    if (state.stage === "ask_name") {
      if (!msg || msg.length < 2) {
        const r = reply("Please enter your full name first.");

        session.history.push({
          role: "assistant",
          content: r.replyText
        });

        await saveSession(session);

        return r;
      }

      state.student.fullName = msg;
      state.stage = "ask_email";
      session.state = state;

      const r = reply(`Thanks ${msg}.\nPlease enter your email address:`);

      session.history.push({
        role: "assistant",
        content: r.replyText
      });

      await saveSession(session);

      return r;
    }

    if (state.stage === "ask_email") {
      if (!isValidEmail(msg)) {
        const r = reply("Please enter a valid email address.");

        session.history.push({
          role: "assistant",
          content: r.replyText
        });

        await saveSession(session);

        return r;
      }

      state.student.email = msg;
      state.stage = "ask_phone";
      session.state = state;

      const r = reply("Thank you.\nPlease enter your phone number:");

      session.history.push({
        role: "assistant",
        content: r.replyText
      });

      await saveSession(session);

      return r;
    }

    if (state.stage === "ask_phone") {
      if (!isValidPhone(msg)) {
        const r = reply("Please enter a valid phone number.");

        session.history.push({
          role: "assistant",
          content: r.replyText
        });

        await saveSession(session);

        return r;
      }

      state.student.phone = cleanPhone(msg);
      state.stage = "ask_course_interest";
      session.state = state;

      const r = reply("What course would you like to study?", {
        quickReplies: [
          quick("Computer Science", "Computer Science"),
          quick("Engineering", "Engineering"),
          quick("Business & Management", "Business & Management"),
          quick("Accounting & Finance", "Accounting & Finance"),
          quick("MBBS", "MBBS"),
          quick("Pharmacy", "Pharmacy"),
          quick("IT", "IT"),
          quick("Psychology", "Psychology")
        ]
      });

      session.history.push({
        role: "assistant",
        content: r.replyText
      });

      await saveSession(session);

      return r;
    }

    if (state.stage === "ask_course_interest") {
      if (!msg) {
        const r = reply("Please tell me the course you want to study.");

        session.history.push({
          role: "assistant",
          content: r.replyText
        });

        await saveSession(session);

        return r;
      }

      state.student.intendedCourse = msg;
      state.stage = "ask_university_interest";
      session.state = state;

      const r = reply("Which university would you like to study at?", {
        quickReplies: [
          quick("MDIS", "MDIS"),
          quick("Newcastle University Medicine Malaysia", "Newcastle University Medicine Malaysia"),
          quick("University of Reading Malaysia", "University of Reading Malaysia"),
          quick("University of Southampton Malaysia", "University of Southampton Malaysia"),
          quick("Universiti Sains Malaysia", "Universiti Sains Malaysia")
        ]
      });

      session.history.push({
        role: "assistant",
        content: r.replyText
      });

      await saveSession(session);

      return r;
    }

    if (state.stage === "ask_university_interest") {
      if (!msg) {
        const r = reply("Please tell me the university you are interested in.");

        session.history.push({
          role: "assistant",
          content: r.replyText
        });

        await saveSession(session);

        return r;
      }

      state.student.intendedUniversity = msg;

      const university = await resolveUniversityByInput(msg);

      state.student.intendedUniversityCode = university?.universityCode || "";
      state.stage = "await_spm";
      session.state = state;

      const r = reply(
        "Great. Now please upload your high school / secondary school result by clicking + → Add photos & files.\n\nIf you prefer not to upload now, just type: skip",
        {
          quickReplies: [quick("Skip result upload", "skip")]
        }
      );

      session.history.push({
        role: "assistant",
        content: r.replyText
      });

      await saveSession(session);

      return r;
    }

    if (state.stage === "await_spm") {
      const t = norm(msg);

      if (["skip", "no", "later", "skip result", "skip spm"].includes(t)) {
        state.stage = "options_after_spm";

        state.spm = {
          received: false,
          fileUrl: null,
          ocrText: "",
          parsedGrades: {},
          parseConfidence: 0
        };

        state.academicResult = {
          studentName: state.student.fullName || "",
          country: "",
          examType: "",
          subjects: [],
          overallConfidence: 0,
          needsHumanReview: true,
          notes: "Student skipped upload.",
          confirmed: true
        };

        session.state = state;

        const r = reply(
          "No problem — we can continue without uploaded results for now.\n\nWhat would you like to do next?",
          {
            quickReplies: [
              quick("1. Do Personality test for more accurate result for career", "Option_Personality"),
              quick("2. Directly provide the Courses suitable for me", "Option_Direct_Courses"),
              quick("3. Scholarship", "Option_Scholarship")
            ]
          }
        );

        session.history.push({
          role: "assistant",
          content: r.replyText
        });

        await saveSession(session);

        return r;
      }

      const r = reply(
        "Please upload your result by clicking + → Add photos & files.\n\nIf you want to continue without uploading, just type: skip",
        {
          quickReplies: [quick("Skip result upload", "skip")]
        }
      );

      session.history.push({
        role: "assistant",
        content: r.replyText
      });

      await saveSession(session);

      return r;
    }

    if (state.stage === "options_after_spm") {
      const t = norm(msg);

      if (
        t === "1" ||
        t.includes("personality") ||
        t.includes("more accurate") ||
        t === "option_personality"
      ) {
        state.nextAction = "personality";
        state.stage = "personality";
        state.personality = {
          qIndex: 0,
          answers: [],
          score: null
        };

        session.state = state;

        const r = reply(P_QUESTIONS[0] + "\n\nReply A/B/C/D.");

        session.history.push({
          role: "assistant",
          content: r.replyText
        });

        await saveSession(session);

        return r;
      }

      if (
        t === "2" ||
        t.includes("directly provide") ||
        t.includes("suitable") ||
        t === "option_direct_courses"
      ) {
        const cmsHits = await getCmsMatches(state);
        const aiText = await buildRecommendationsText(state, cmsHits);

        state.nextAction = "direct_courses";
        state.stage = "pick_course";

        state.coursePick = {
          pending: true,
          options: cmsHits.map((x) => ({
            _id: x.id || x._id,
            courseCode: x.courseCode,
            title: x.title,
            universityCode: x.universityCode,
            universityTitle: courseUniversityName(x)
          }))
        };

        session.state = state;

        let replyText = aiText;

        if (cmsHits.length) {
          replyText += `\n\nAvailable courses from our CMS:\n${cmsHits
            .map((c, i) => `${i + 1}) ${formatCourseForList(c)}`)
            .join("\n")}\n\nPlease reply with the number of the course you like.`;
        } else {
          replyText +=
            "\n\nI could not find a matching CMS course yet. Please type the course name again exactly as in your CMS.";
        }

        const r = reply(replyText);

        session.history.push({
          role: "assistant",
          content: r.replyText
        });

        await saveSession(session);

        return r;
      }

      if (t === "3" || t.includes("scholarship") || t === "option_scholarship") {
        state.nextAction = "scholarship";
        session.state = state;

        const out = await buildScholarshipTextFromCms(state);

        const r = reply(out.scholarshipText + "\n\nWhat would you like to do next?", {
          quickReplies: [
            quick("Do personality test", "Option_Personality"),
            quick("Show suitable courses", "Option_Direct_Courses")
          ]
        });

        session.history.push({
          role: "assistant",
          content: r.replyText
        });

        await saveSession(session);

        return r;
      }

      const r = reply("Please choose one option below:", {
        quickReplies: [
          quick("1. Do Personality test for more accurate result for career", "Option_Personality"),
          quick("2. Directly provide the Courses they are suitable", "Option_Direct_Courses"),
          quick("3. Scholarship", "Option_Scholarship")
        ]
      });

      session.history.push({
        role: "assistant",
        content: r.replyText
      });

      await saveSession(session);

      return r;
    }

    if (state.stage === "personality") {
      if (!["A", "B", "C", "D"].includes(letters)) {
        const r = reply("Please reply with A, B, C, or D.");

        session.history.push({
          role: "assistant",
          content: r.replyText
        });

        await saveSession(session);

        return r;
      }

      state.personality.answers.push(letters);
      state.personality.qIndex += 1;

      if (state.personality.qIndex >= P_QUESTIONS.length) {
        state.personality.score = scorePersonality(state.personality.answers);

        const cmsHits = await getCmsMatches(state);
        const aiText = await buildRecommendationsText(state, cmsHits);

        state.stage = "pick_course";

        state.coursePick = {
          pending: true,
          options: cmsHits.map((x) => ({
            _id: x.id || x._id,
            courseCode: x.courseCode,
            title: x.title,
            universityCode: x.universityCode,
            universityTitle: courseUniversityName(x)
          }))
        };

        session.state = state;

        let replyText = "✅ Personality test completed.\n\n" + aiText;

        if (cmsHits.length) {
          replyText += `\n\nAvailable courses from our CMS:\n${cmsHits
            .map((c, i) => `${i + 1}) ${formatCourseForList(c)}`)
            .join("\n")}\n\nPlease reply with the number of the course you like.`;
        } else {
          replyText +=
            "\n\nI could not find a matching CMS course yet. Please type the course name exactly as in your CMS.";
        }

        const r = reply(replyText);

        session.history.push({
          role: "assistant",
          content: r.replyText
        });

        await saveSession(session);

        return r;
      }

      const r = reply(P_QUESTIONS[state.personality.qIndex] + "\n\nReply A/B/C/D.");

      session.history.push({
        role: "assistant",
        content: r.replyText
      });

      await saveSession(session);

      return r;
    }

    if (state.stage === "pick_course") {
      const n = parseChoiceNumber(msg);
      const options = Array.isArray(state.coursePick.options)
        ? state.coursePick.options
        : [];

      if (n && n >= 1 && n <= options.length) {
        const picked = options[n - 1];

        state.selectedCourseId = picked._id;
        state.selectedCourseCode = picked.courseCode || "";
        session.state = state;

        const bundle = await getCourseBundleByCourseId(picked._id);
        const eligibility = await assessEligibilityForBundle(bundle, state);

        state.eligibilitySummary = eligibility;
        state.stage = "done";
        session.state = state;

        const scholarships = await getScholarshipsForCourseOrUniversity({
          courseCode: bundle?.course?.courseCode || picked.courseCode || "",
          universityCode:
            bundle?.course?.universityCode ||
            picked.universityCode ||
            state.student.intendedUniversityCode ||
            ""
        });

        let replyText =
          `You selected:\n` +
          `Course: ${bundle?.course?.title || picked.title}\n` +
          `University: ${courseUniversityName(bundle?.course || picked)}\n\n` +
          `Preliminary eligibility:\n${eligibility}`;

        if (scholarships.length) {
          replyText += `\n\nPossible scholarship / financial aid matches from CMS:\n${formatScholarshipRows(
            scholarships.slice(0, 5)
          )}`;
        }

        replyText += "\n\nPlease choose one option below.";

        const r = reply(replyText, {
          showDownloadPdf: true,
          actionButtons: finalActionButtons()
        });

        session.history.push({
          role: "assistant",
          content: r.replyText
        });

        await saveSession(session);

        return r;
      }

      const bundleByName = await getCourseBundleByName(msg);

      if (bundleByName?.course?.id) {
        state.selectedCourseId = bundleByName.course.id;
        state.selectedCourseCode = bundleByName.course.courseCode || "";

        const eligibility = await assessEligibilityForBundle(bundleByName, state);

        state.eligibilitySummary = eligibility;
        state.stage = "done";
        session.state = state;

        const scholarships = await getScholarshipsForCourseOrUniversity({
          courseCode: bundleByName.course.courseCode || "",
          universityCode:
            bundleByName.course.universityCode ||
            state.student.intendedUniversityCode ||
            ""
        });

        let replyText =
          `You selected:\n` +
          `Course: ${bundleByName.course.title}\n` +
          `University: ${courseUniversityName(bundleByName.course)}\n\n` +
          `Preliminary eligibility:\n${eligibility}`;

        if (scholarships.length) {
          replyText += `\n\nPossible scholarship / financial aid matches from CMS:\n${formatScholarshipRows(
            scholarships.slice(0, 5)
          )}`;
        }

        replyText += "\n\nPlease choose one option below.";

        const r = reply(replyText, {
          showDownloadPdf: true,
          actionButtons: finalActionButtons()
        });

        session.history.push({
          role: "assistant",
          content: r.replyText
        });

        await saveSession(session);

        return r;
      }

      const r = reply(
        "Please reply with the number of the course you want from the CMS list above."
      );

      session.history.push({
        role: "assistant",
        content: r.replyText
      });

      await saveSession(session);

      return r;
    }

    if (state.stage === "done") {
      const r = reply("Your report flow is completed. Please choose one option below:", {
        actionButtons: finalActionButtons()
      });

      session.history.push({
        role: "assistant",
        content: r.replyText
      });

      await saveSession(session);

      return r;
    }

    state.stage = "ask_name";
    session.state = state;

    const r = reply(
      "Hi! I can help with course counselling, personality test, and result evaluation.\nBefore start may I get your full name:"
    );

    session.history.push({
      role: "assistant",
      content: r.replyText
    });

    await saveSession(session);

    return r;
  } catch (err) {
    console.error("chatMessage error:", err);

    return reply(
      "Sorry, something went wrong while processing your message. Please try again, or type restart_chat to start over.",
      {
        quickReplies: [
          quick("Start over", "restart_chat"),
          quick("Find suitable courses", "I want to find suitable courses"),
          quick("Check scholarship", "scholarship")
        ]
      }
    );
  }
}

export async function spmUploadBase64(sessionId, payload) {
  try {
    if (!sessionId) throw new Error("Missing sessionId.");

    const fileName = payload?.fileName || payload?.name || "result-file";
    const mimeType = payload?.mimeType || payload?.mime || "application/octet-stream";
    const base64 = payload?.base64 || "";

    if (!base64) throw new Error("Missing base64.");

    const session = await loadSession(sessionId);
    const state = session.state || defaultState();

    if (!state.academicResult) {
      state.academicResult = defaultState().academicResult;
    }

    const extracted = await extractAcademicResultWithOpenAI({
      base64,
      mimeType,
      fileName
    });

    const { error: uploadError } = await supabaseAdmin.from("spm_uploads").insert({
      session_id: sessionId,
      file_url: null,
      file_name: fileName,
      file_type: mimeType,
      ocr_json: extracted,
      created_at: new Date().toISOString()
    });

    if (uploadError) throw uploadError;

    state.academicResult = {
      ...extracted,
      confirmed: false
    };

    state.spm = {
      received: true,
      fileUrl: null,
      ocrText: JSON.stringify(extracted),
      parsedGrades: {},
      parseConfidence: Number(extracted.overallConfidence || 0)
    };

    session.state = state;

    session.history.push({
      role: "user",
      content: `Result uploaded: ${fileName} (${mimeType})`
    });

    const preview = buildAcademicPreview(extracted);

    const r = reply(
      `✅ I detected the following academic results.\n\n${preview}\n\nPlease review and edit them if needed, then confirm.`,
      {
        reviewResults: extracted
      }
    );

    session.history.push({
      role: "assistant",
      content: r.replyText
    });

    await saveSession(session);

    return r;
  } catch (err) {
    return reply("backend(spmUploadBase64): " + (err?.message || String(err)));
  }
}

export async function saveAcademicResults(sessionId, resultPayload) {
  try {
    if (!sessionId) throw new Error("Missing sessionId.");

    const session = await loadSession(sessionId);
    const state = session.state || defaultState();

    const cleaned = sanitizeAcademicResult({
      ...resultPayload,
      confirmed: true
    });

    if (!Array.isArray(cleaned.subjects) || !cleaned.subjects.length) {
      throw new Error("Please add at least 1 subject before confirming.");
    }

    state.academicResult = cleaned;

    state.spm = {
      received: true,
      fileUrl: null,
      ocrText: JSON.stringify(cleaned),
      parsedGrades: academicSubjectsToMap(cleaned.subjects),
      parseConfidence: Number(cleaned.overallConfidence || 0)
    };

    state.stage = "options_after_spm";
    session.state = state;

    session.history.push({
      role: "user",
      content: `Academic results confirmed: ${cleaned.subjects.length} subjects`
    });

    const preview = buildAcademicPreview(cleaned);

    const r = reply(
      `✅ Results confirmed.\n\nDetected subjects (${cleaned.subjects.length}):\n${preview}\n\nWhat would you like to do next?`,
      {
        quickReplies: [
          quick("1. Do Personality test for more accurate result for career", "Option_Personality"),
          quick("2. Directly provide the Courses they are suitable", "Option_Direct_Courses"),
          quick("3. Scholarship", "Option_Scholarship")
        ]
      }
    );

    session.history.push({
      role: "assistant",
      content: r.replyText
    });

    await saveSession(session);

    return r;
  } catch (err) {
    return reply("backend(saveAcademicResults): " + (err?.message || String(err)));
  }
}

export async function generateEligibilityPdf(sessionId) {
  try {
    if (!sessionId) throw new Error("Missing sessionId.");

    const session = await loadSession(sessionId);
    const state = session.state || defaultState();

    if (!state.selectedCourseId) {
      throw new Error("No selected course found for PDF generation.");
    }

    const bundle = await getCourseBundleByCourseId(state.selectedCourseId);
    const course = bundle?.course || {};
    const requirements = Array.isArray(bundle?.entryRequirements)
      ? bundle.entryRequirements
      : [];

    const student = state.student || {};
    const university = courseUniversityName(course);
    const eligibility = state.eligibilitySummary || "Pending assessment";

    const scholarships = await getScholarshipsForCourseOrUniversity({
      courseCode: course.courseCode || state.selectedCourseCode || "",
      universityCode: course.universityCode || state.student.intendedUniversityCode || ""
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;
    const left = 50;

    function drawLine(text, opts = {}) {
      const size = opts.size || 11;
      const fontRef = opts.bold ? fontBold : font;
      const color = opts.color || rgb(0, 0, 0);
      const wrapped = wrapText(text, opts.maxChars || 92);

      for (const line of wrapped) {
        if (y < 60) return false;

        page.drawText(line, {
          x: left,
          y,
          size,
          font: fontRef,
          color
        });

        y -= opts.lineGap || 16;
      }

      return true;
    }

    drawLine("EduSeek AI Eligibility Report", {
      bold: true,
      size: 18,
      lineGap: 24
    });

    drawLine(`Student Name: ${student.fullName || "-"}`, {
      bold: true
    });

    drawLine(`Email: ${student.email || "-"}`);
    drawLine(`Phone: ${student.phone || "-"}`);
    drawLine(`Preferred Course: ${student.intendedCourse || "-"}`);
    drawLine(`Preferred University: ${student.intendedUniversity || "-"}`);

    y -= 8;

    drawLine("Selected CMS Course", {
      bold: true,
      size: 14,
      lineGap: 20
    });

    drawLine(`Course: ${course.title || "-"}`);
    drawLine(`Course Code: ${course.courseCode || "-"}`);
    drawLine(`University: ${university}`);
    drawLine(`Level: ${course.level || "-"}`);
    drawLine(`Duration: ${course.duration || "-"}`);
    drawLine(`Study Mode: ${course.studyMode || "-"}`);
    drawLine(`Intake: ${course.intake || "-"}`);
    drawLine(`Malaysian Tuition: ${formatMoney(course.tuitionCurrency, course.tuitionTotal_Malaysian)}`);
    drawLine(`International Tuition: ${formatMoney(course.tuitionCurrency, course.tuitionTotal_International)}`);

    y -= 8;

    drawLine("Preliminary Eligibility", {
      bold: true,
      size: 14,
      lineGap: 20
    });

    drawLine(eligibility);

    y -= 8;

    drawLine("CMS Entry Requirements", {
      bold: true,
      size: 14,
      lineGap: 20
    });

    if (requirements.length) {
      for (const req of requirements) {
        if (!drawLine(`Qualification: ${req.qualification || "-"}`, { bold: true })) break;
        if (!drawLine(`Minimum Requirement: ${req.minimumRequirement || "-"}`)) break;
        if (!drawLine(`English Requirement: ${req.englishRequirement || "-"}`)) break;

        y -= 4;
      }
    } else {
      drawLine("No entry requirements found in CMS.");
    }

    y -= 8;

    drawLine("Relevant Scholarships / Financial Aid", {
      bold: true,
      size: 14,
      lineGap: 20
    });

    if (scholarships.length) {
      for (const s of scholarships.slice(0, 6)) {
        if (!drawLine(`${s.title || "Scholarship"} (${s.scholarshipType || "-"})`, { bold: true })) break;
        if (!drawLine(`Benefit: ${s.amountOrBenefit || "-"}`)) break;
        if (!drawLine(`Eligibility: ${s.eligibilityCriteria || "-"}`)) break;
        if (!drawLine(`Intake: ${s.applicableIntake || "-"}`)) break;
        if (!drawLine(`Deadline: ${s.deadline || "-"}`)) break;

        y -= 4;
      }
    } else {
      drawLine("No matching scholarship found in CMS.");
    }

    y -= 8;

    drawLine("Confirmed Academic Results", {
      bold: true,
      size: 14,
      lineGap: 20
    });

    const subjects = Array.isArray(state.academicResult?.subjects)
      ? state.academicResult.subjects
      : [];

    if (subjects.length) {
      subjects.forEach((s) => {
        drawLine(`• ${s.subject}: ${s.grade}`);
      });
    } else {
      drawLine("No confirmed academic results uploaded.");
    }

    const pdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");
    const fileName = `eligibility-report-${Date.now()}.pdf`;

    const { error: reportError } = await supabaseAdmin.from("reports").insert({
      session_id: sessionId,
      report_json: {
        student: {
          fullName: student.fullName || "",
          email: student.email || "",
          phone: student.phone || ""
        },
        course: {
          title: course.title || "",
          courseCode: course.courseCode || "",
          university
        },
        eligibility,
        scholarships: scholarships.slice(0, 6).map((s) => ({
          title: s.title || "",
          scholarshipCode: s.scholarshipCode || "",
          scholarshipType: s.scholarshipType || "",
          amountOrBenefit: s.amountOrBenefit || ""
        })),
        generatedAt: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    });

    if (reportError) throw reportError;

    return {
      ok: true,
      fileName,
      base64
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || String(err)
    };
  }
}