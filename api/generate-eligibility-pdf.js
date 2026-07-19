import { generateEligibilityPdf } from "../lib/chatbotService.js";

export const maxDuration = 60;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed"
      });
    }

    const { sessionId } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({
        ok: false,
        error: "Missing sessionId."
      });
    }

    const result = await generateEligibilityPdf(sessionId);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "backend(generate-eligiblity-pdf): " + (err?.message || String(err))
    });
  }
}