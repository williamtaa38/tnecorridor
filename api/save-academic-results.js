import { saveAcademicResults } from "../lib/chatbotService.js";

export const maxDuration = 60;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({
        replyText: "Method not allowed"
      });
    }

    const { sessionId, result, academicResult, resultPayload } = req.body || {};
    const payload =
      result ||
      academicResult ||
      resultPayload ||
      (Array.isArray(req.body?.subjects) ? req.body : null);

    if (!sessionId || !payload) {
      return res.status(400).json({
        replyText: "Missing sessionId or academic result."
      });
    }

    const response = await saveAcademicResults(sessionId, payload);
    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({
      replyText: "backend(save-academic-results): " + (err?.message || String(err))
    });
  }
}