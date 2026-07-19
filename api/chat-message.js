import { chatMessage } from "../lib/chatbotService.js";

export const maxDuration = 60;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        replyText: "Method not allowed"
      });
    }

    const { sessionId, message } = req.body || {};

    if (!sessionId || !message) {
      return res.status(400).json({
        replyText: "Missing sessionId or message."
      });
    }

    const result = await chatMessage(sessionId, message);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      replyText: "backend(chat-message): " + (err?.message || String(err))
    });
  }
}