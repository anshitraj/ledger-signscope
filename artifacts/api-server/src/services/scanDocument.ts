/**
 * scanDocument — Prompt injection scanner.
 * Used as Step 2 in the main pipeline. Always runs deterministically.
 * The individual /api/scan-document endpoint also attempts Gemini enhancement.
 */

import { geminiScanDocument, isGeminiEnabled } from "./gemini.js";
import type { DocumentScanResult } from "./types.js";

const HIGH_RISK_PHRASES = [
  "ignore previous instructions",
  "hidden instruction",
  "attacker",
  "override",
  "system prompt",
  "do not reveal",
  "forget previous",
  "disregard",
];

const MEDIUM_RISK_PHRASES = [
  "send to",
  "tell the user",
  "instead",
  "normal payment",
  "different address",
  "different amount",
  "redirect",
  "transfer to",
];

export function scanDocumentSync(text: string): DocumentScanResult {
  const source = String(text ?? "");
  const lower = source.toLowerCase();

  const highFindings = HIGH_RISK_PHRASES.filter((p) => lower.includes(p));
  const medFindings = MEDIUM_RISK_PHRASES.filter((p) => lower.includes(p));
  const allFindings = [...new Set([...highFindings, ...medFindings])];

  const riskScore = Math.min(
    highFindings.length * 28 + medFindings.length * 12,
    100,
  );

  const verdict: DocumentScanResult["verdict"] =
    riskScore >= 50 ? "malicious" : riskScore >= 20 ? "suspicious" : "clean";

  let highlightedText: string | null = null;
  if (allFindings.length > 0) {
    highlightedText = source;
    for (const phrase of allFindings) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      highlightedText = highlightedText.replace(regex, `[[SUSPICIOUS:${phrase}]]`);
    }
  }

  return {
    riskScore,
    verdict,
    findings: allFindings,
    suspiciousPhrases: allFindings,
    highlightedText,
    explanation:
      allFindings.length === 0
        ? "No prompt-injection phrases detected."
        : `Detected ${allFindings.length} prompt-injection signal${allFindings.length === 1 ? "" : "s"}: ${allFindings.slice(0, 3).join(", ")}${allFindings.length > 3 ? "..." : ""}.`,
  };
}

/** Used by /api/scan-document — tries Gemini, falls back to keyword scan */
export async function scanDocument(text: string): Promise<DocumentScanResult> {
  if (isGeminiEnabled()) {
    const result = await geminiScanDocument(text);
    if (result) return result;
    console.warn("[scanDocument] Gemini call failed, using keyword fallback");
  }
  return scanDocumentSync(text);
}
