export const maxDuration = 60;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "METHOD_NOT_ALLOWED",
        replyText: "Method not allowed"
      });
    }

    const { sessionId, message } = req.body || {};

    if (!sessionId || !message) {
      return res.status(400).json({
        error: "MISSING_INPUT",
        replyText: "Missing sessionId or message."
      });
    }

    // Import inside try/catch so Vercel can report module-loading errors.
    const { chatMessage } = await import(
      "../lib/chatbotService.js"
    );

    const result = await chatMessage(sessionId, message);

    return res.status(200).json(result);

  } catch (err) {
    console.error("========== EDUSEEK CHAT API ERROR ==========");
    console.error(err);
    console.error("Message:", err?.message);
    console.error("Stack:", err?.stack);
    console.error("============================================");

    return res.status(500).json({
      error: "CHAT_MESSAGE_FAILED",
      replyText:
        "backend(chat-message): " +
        (err?.message || String(err))
    });
  }
}