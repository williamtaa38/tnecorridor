import { spmUploadBase64 } from "../lib/chatbotService.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        replyText: "Method not allowed"
      });
    }

    const { sessionId, file } = req.body || {};

    if (!sessionId || !file?.base64) {
      return res.status(400).json({
        replyText: "Missing sessionId or file."
      });
    }

    const result = await spmUploadBase64(sessionId, {
      fileName: file.name,
      mimeType: file.mime,
      base64: file.base64
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      replyText: "backend(spm-upload): " + (err?.message || String(err))
    });
  }
}