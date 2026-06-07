import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { isGeminiEnabled } from "../services/gemini.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    geminiEnabled: isGeminiEnabled(),
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
  });
});

export default router;
