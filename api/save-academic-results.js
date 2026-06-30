import { saveAcademicResults } from "../lib/chatbotService.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        replyText: "Method not allowed"
      });
    }

    const { sessionId, result } = req.body || {};

    if (!sessionId || !result) {
      return res.status(400).json({
        replyText: "Missing sessionId or result."
      });
    }

    const output = await saveAcademicResults(sessionId, result);

    return res.status(200).json(output);
  } catch (err) {
    return res.status(500).json({
      replyText: "backend(save-academic-results): " + (err?.message || String(err))
    });
  }
}