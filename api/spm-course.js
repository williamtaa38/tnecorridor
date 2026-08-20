const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-sol";
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 55000);

const LESSONS = {
  "bahasa-melayu": {
    subject: "Bahasa Melayu",
    chapter: "Karangan Respons Terbuka",
    notes: [
      "Fokus kepada memahami kehendak soalan sebelum merancang isi.",
      "Gunakan struktur pendahuluan, isi yang dihuraikan dengan contoh, dan penutup.",
      "Setiap isi perlu menjawab tugasan soalan dan dikembangkan secara logik.",
      "Gunakan penanda wacana yang sesuai dan variasikan struktur ayat.",
      "Semak ejaan, tatabahasa, tanda baca dan kesinambungan idea sebelum tamat."
    ]
  },
  english: {
    subject: "English",
    chapter: "Reading Comprehension Strategies",
    notes: [
      "Read the question first so you know what information to look for.",
      "Skim for the main idea and scan for names, dates, keywords and supporting details.",
      "Use context clues to infer unfamiliar vocabulary.",
      "Distinguish facts, opinions, inference and the writer's purpose.",
      "Support answers with evidence from the passage and avoid adding unsupported ideas."
    ]
  },
  mathematics: {
    subject: "Mathematics",
    chapter: "Quadratic Functions and Equations",
    notes: [
      "A quadratic expression has highest power 2 and commonly appears as ax² + bx + c, where a is not zero.",
      "A quadratic equation can be solved by factorisation, completing the square or the quadratic formula.",
      "The graph y = ax² + bx + c is a parabola.",
      "The axis of symmetry is x = -b/(2a), and the vertex lies on that axis.",
      "The discriminant b² - 4ac indicates whether there are two, one or no real roots."
    ]
  },
  sejarah: {
    subject: "Sejarah",
    chapter: "Warisan Negara Bangsa",
    notes: [
      "Fahami ciri negara bangsa kerajaan Alam Melayu seperti raja, undang-undang, wilayah pengaruh dan rakyat.",
      "Kesultanan Melayu Melaka mengukuhkan sistem pemerintahan melalui raja, pembesar dan pentadbiran tersusun.",
      "Undang-undang membantu memastikan keamanan, kestabilan dan kelancaran pentadbiran.",
      "Hubungan pemerintah dan rakyat membentuk asas ketaatan serta tanggungjawab dalam negara bangsa.",
      "Dalam jawapan SPM, kaitkan fakta dengan fungsi, kesan dan kepentingannya."
    ]
  },
  science: {
    subject: "Science",
    chapter: "Microorganisms",
    notes: [
      "Microorganisms include bacteria, fungi, protozoa, algae and viruses.",
      "Their growth is affected by nutrients, moisture, temperature, light and pH depending on the organism.",
      "Useful microorganisms are involved in food production, medicine, decomposition and biotechnology.",
      "Some microorganisms cause disease and food spoilage.",
      "Control methods include hygiene, sterilisation, disinfection, refrigeration and appropriate food preservation."
    ]
  },
  "additional-mathematics": {
    subject: "Additional Mathematics",
    chapter: "Functions",
    notes: [
      "A function maps each element in the domain to exactly one element in the codomain.",
      "Use function notation such as f(x), and substitute values carefully.",
      "Composite functions combine functions, for example fg(x) = f(g(x)).",
      "An inverse function reverses a one-to-one function and is written f⁻¹(x).",
      "For inverses, interchange x and y, then solve for y and check the valid domain."
    ]
  },
  physics: {
    subject: "Physics",
    chapter: "Force and Motion",
    notes: [
      "Distance is scalar while displacement is vector; speed is scalar while velocity is vector.",
      "Acceleration is the rate of change of velocity: a = (v - u)/t.",
      "Interpret displacement-time and velocity-time graphs using gradients and areas where appropriate.",
      "Newton's laws connect force, mass and acceleration; for constant mass, F = ma.",
      "Momentum is p = mv and is conserved in an isolated system."
    ]
  },
  chemistry: {
    subject: "Chemistry",
    chapter: "Matter and Atomic Structure",
    notes: [
      "Matter is made of particles and can exist as solid, liquid or gas.",
      "Atoms contain protons and neutrons in the nucleus and electrons in shells around it.",
      "Proton number identifies an element; nucleon number equals protons plus neutrons.",
      "Isotopes are atoms of the same element with the same proton number but different neutron numbers.",
      "Electron arrangement helps explain chemical behaviour and the formation of ions."
    ]
  },
  biology: {
    subject: "Biology",
    chapter: "Cell Biology and Organisation",
    notes: [
      "The cell is the basic structural and functional unit of living organisms.",
      "Key organelles include the nucleus, mitochondria, ribosomes, cell membrane and cytoplasm.",
      "Plant cells additionally have structures such as the cell wall, chloroplasts and a large vacuole.",
      "Specialised cells have structures adapted to their functions.",
      "Organisation progresses from cell to tissue, organ, system and organism."
    ]
  },
  accounting: {
    subject: "Principles of Accounting",
    chapter: "Introduction to Accounting and the Accounting Equation",
    notes: [
      "Accounting records, classifies, summarises and communicates financial information.",
      "The basic accounting equation is Assets = Liabilities + Owner's Equity.",
      "Every transaction has a dual effect and must keep the accounting equation balanced.",
      "Assets are resources controlled by the business; liabilities are obligations to outsiders.",
      "Owner's equity represents the owner's residual interest after liabilities are deducted from assets."
    ]
  }
};

function extractResponseText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  return (data?.output || [])
    .filter((item) => item?.type === "message")
    .flatMap((item) => item?.content || [])
    .filter((item) => item?.type === "output_text" && item?.text)
    .map((item) => item.text)
    .join("\n")
    .trim();
}

async function askOpenAI({ instructions, input, maxOutputTokens = 1500 }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY environment variable.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  const body = {
    model: OPENAI_MODEL,
    store: false,
    instructions,
    input,
    max_output_tokens: maxOutputTokens
  };

  if (/^(gpt-5|o[1-9])/i.test(OPENAI_MODEL)) {
    body.reasoning = { effort: "low" };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      signal: controller.signal,
      body: JSON.stringify(body)
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`OpenAI error ${response.status}: ${raw.slice(0, 500)}`);
    }

    const text = extractResponseText(JSON.parse(raw));
    if (!text) throw new Error("OpenAI returned an empty response.");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export const maxDuration = 60;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed." });
    }

    const { action = "lesson", subjectId, language = "English" } = req.body || {};
    const lesson = LESSONS[String(subjectId || "")];

    if (!lesson) {
      return res.status(400).json({ error: "This chapter is not available yet." });
    }

    const source = lesson.notes.map((item, index) => `${index + 1}. ${item}`).join("\n");

    if (action === "summary") {
      const summary = await askOpenAI({
        instructions:
          "You are an SPM revision tutor. Use only the supplied approved lesson notes. " +
          "Create a short chapter revision summary. Do not invent syllabus facts. " +
          "Use the requested language, concise headings and bullets, and finish with 3 exam reminders.",
        input:
          `Subject: ${lesson.subject}\nChapter: ${lesson.chapter}\nLanguage: ${language}\n\n` +
          `Approved lesson notes:\n${source}`,
        maxOutputTokens: 900
      });

      return res.status(200).json({
        ok: true,
        action: "summary",
        subject: lesson.subject,
        chapter: lesson.chapter,
        text: summary
      });
    }

    const text = await askOpenAI({
      instructions:
        "You are Cikgu AI, a friendly Malaysian SPM bootcamp teacher. Use only the supplied approved lesson notes as the factual base. " +
        "Create one clear beginner-friendly lesson suitable both for a whiteboard and for being read aloud by a browser voice. " +
        "Do not mention prompts or AI limitations. Do not claim this is the complete official syllabus. " +
        "Write in the requested language. Keep paragraphs short. Include: learning objective, core explanation, one simple example or worked example, common mistake, and a final quick recap. " +
        "Avoid markdown tables and avoid excessively long output.",
      input:
        `Subject: ${lesson.subject}\nChapter: ${lesson.chapter}\nLanguage: ${language}\n\n` +
        `Approved lesson notes:\n${source}`,
      maxOutputTokens: 1500
    });

    return res.status(200).json({
      ok: true,
      action: "lesson",
      subject: lesson.subject,
      chapter: lesson.chapter,
      text
    });
  } catch (error) {
    console.error("SPM course API error:", error);
    return res.status(500).json({
      error: error?.name === "AbortError"
        ? "The lesson request timed out. Please try again."
        : (error?.message || "Unable to prepare the lesson.")
    });
  }
}
