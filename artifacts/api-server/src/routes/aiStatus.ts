import { Router } from "express";
import { isGeminiEnabled } from "../services/gemini.js";

const router = Router();

router.get("/status", (_req, res) => {
  const configured = isGeminiEnabled();
  const model = process.env["GEMINI_MODEL"] ?? "gemini-2.0-flash";

  if (!configured) {
    res.json({
      configured: false,
      error: "GEMINI_API_KEY missing. Add it to .env and restart the server.",
      model,
      agentMode: "none",
      keySource: "none",
    });
    return;
  }

  res.json({
    configured: true,
    model,
    agentMode: process.env["AI_AGENT_MODE"] ?? "gemini",
    keySource: "server_env",
  });
});

export default router;
