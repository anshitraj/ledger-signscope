/**
 * POST /api/request-check/run
 *
 * The single unified pipeline endpoint. Runs all steps in sequence,
 * stops on failure, saves a consolidated audit log, and returns the
 * full structured result to the frontend.
 *
 * HARD RULE: If GEMINI_API_KEY is not set, step 3 fails with a clear error.
 * There is NO silent fallback to mock data.
 */

import { Router } from "express";
import { randomUUID } from "node:crypto";
import { parseIntentSync } from "../services/parseIntent.js";
import { scanDocumentSync } from "../services/scanDocument.js";
import { geminiGenerateTransaction } from "../services/gemini.js";
import { compareTransaction } from "../services/compareTransaction.js";
import { getSettings, isRealSigningEnabled, isRealLedgerCliEnabled } from "../services/settingsStore.js";
import { addAuditLog } from "../services/auditLog.js";
import type {
  GeminiMeta,
  LedgerEligibility,
  ParsedIntent,
  DocumentScanResult,
  GeneratedTransaction,
  ComparisonResult,
  PipelineStep,
  RequestCheckResult,
} from "../services/types.js";

const router = Router();

function now(): string {
  return new Date().toISOString();
}

router.post("/run", async (req, res) => {
  const body = req.body as {
    userRequest?: unknown;
    invoiceText?: unknown;
    mode?: unknown;
  };

  const userRequest = typeof body.userRequest === "string" ? body.userRequest.trim() : "";
  const invoiceText = typeof body.invoiceText === "string" ? body.invoiceText.trim() : "";

  if (!userRequest) {
    res.status(400).json({ error: "userRequest is required" });
    return;
  }

  // ── Non-payment chat guard ────────────────────────────────────────────────
  // If the request has no payment signals at all, return a helpful chat
  // response instead of burning a Gemini API call.
  const PAYMENT_SIGNALS = /\b(pay|send|transfer|invoice|INV[-\s]?\d|ETH|BTC|SOL|USDC|USDT|ether|bitcoin|0x[a-fA-F0-9]{4,}|\d+(?:\.\d+)?\s*(?:eth|btc|sol|usdc))\b/i;
  if (!PAYMENT_SIGNALS.test(userRequest)) {
    res.json({
      success: true,
      isChat: true,
      chatResponse: [
        "👋 Hey! I'm **SignScope** — an AI-powered transaction firewall for Ethereum payments.",
        "",
        "I analyze payment requests through a 4-step pipeline:",
        "1. **Parse Intent** — extract recipient, amount, asset from your text",
        "2. **Scan Invoice** — detect prompt-injection attacks in invoice documents",
        "3. **Gemini AI Agent** — LLM proposes the actual transaction",
        "4. **SignScope Diff** — deterministically verify Gemini matches your intent",
        "",
        "**Try one of these:**",
        "• `Pay 0.001 ETH to Alice for invoice INV-102`",
        "• `Send 0.05 ETH to Bob for INV-205`",
        "• Or use the **Invoice Presets** above ↑ to load safe/attack examples",
      ].join("\n"),
      runId: randomUUID(),
      steps: [],
    });
    return;
  }

  const runId = randomUUID();
  const steps: PipelineStep[] = [];
  const settings = getSettings();

  addAuditLog({
    eventType: "REQUEST_CHECK_STARTED",
    status: "started",
    source: "signscope",
    runId,
    userRequest,
    invoiceText: invoiceText || null,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 1: Parse Intent (deterministic regex)
  // ──────────────────────────────────────────────────────────────────────────
  let intent!: ParsedIntent;
  {
    const startedAt = now();
    try {
      intent = parseIntentSync(userRequest);
      steps.push({
        name: "Parse Intent",
        status: "completed",
        endpoint: "/api/parse-intent",
        request: { text: userRequest },
        response: intent,
        startedAt,
        completedAt: now(),
      });
      addAuditLog({
        eventType: "INTENT_PARSED",
        status: "success",
        source: "signscope",
        runId,
        userRequest,
        intent,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      steps.push({
        name: "Parse Intent",
        status: "failed",
        endpoint: "/api/parse-intent",
        request: { text: userRequest },
        response: {},
        startedAt,
        completedAt: now(),
        error,
      });
      res.status(500).json({ success: false, runId, steps, error });
      return;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 2: Scan Invoice (deterministic keyword scan)
  // ──────────────────────────────────────────────────────────────────────────
  let documentScan!: DocumentScanResult;
  {
    const startedAt = now();
    try {
      documentScan = scanDocumentSync(invoiceText);
      steps.push({
        name: "Scan Invoice",
        status: "completed",
        endpoint: "/api/scan-document",
        request: { text: invoiceText },
        response: documentScan,
        startedAt,
        completedAt: now(),
      });
      addAuditLog({
        eventType: "DOCUMENT_SCANNED",
        status: documentScan.verdict,
        source: "signscope",
        runId,
        invoiceText: invoiceText || null,
        documentScan,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      steps.push({
        name: "Scan Invoice",
        status: "failed",
        endpoint: "/api/scan-document",
        request: { text: invoiceText },
        response: {},
        startedAt,
        completedAt: now(),
        error,
      });
      res.status(500).json({ success: false, runId, steps, error });
      return;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 3: Gemini Agent Transaction (REAL — hard fail if no key)
  // ──────────────────────────────────────────────────────────────────────────
  let geminiMeta!: GeminiMeta;
  let agentTransaction!: GeneratedTransaction;
  {
    const startedAt = now();
    try {
      addAuditLog({
        eventType: "GEMINI_REQUEST_SENT",
        status: "pending",
        source: "gemini",
        runId,
        userRequest,
        invoiceText: invoiceText || null,
        intent,
      });

      const result = await geminiGenerateTransaction({
        userRequest,
        invoiceText,
        intent,
        allowlist: settings.allowlistedRecipients,
        policies: settings.policies,
      });

      const { transaction, ...meta } = result;
      geminiMeta = meta;
      agentTransaction = transaction;

      addAuditLog({
        eventType: "GEMINI_RESPONSE_RECEIVED",
        status: "success",
        source: "gemini",
        runId,
        geminiPrompt: geminiMeta.prompt,
        geminiRawResponse: geminiMeta.rawResponse,
        agentTransaction,
      });

      addAuditLog({
        eventType: geminiMeta.jsonParseStatus === "success" || geminiMeta.jsonParseStatus === "markdown_extracted"
          ? "GEMINI_JSON_PARSED"
          : "GEMINI_JSON_PARSE_FAILED",
        status: geminiMeta.jsonParseStatus,
        source: "gemini",
        runId,
      });

      steps.push({
        name: "Gemini Agent Transaction",
        status: "completed",
        endpoint: "/api/agent/generate-transaction",
        request: { userRequest, invoiceText: invoiceText.slice(0, 200) + (invoiceText.length > 200 ? "..." : ""), intent },
        response: { model: geminiMeta.model, jsonParseStatus: geminiMeta.jsonParseStatus, transaction: agentTransaction },
        startedAt,
        completedAt: now(),
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      addAuditLog({
        eventType: "GEMINI_JSON_PARSE_FAILED",
        status: "failed",
        source: "gemini",
        runId,
        geminiRawResponse: error,
      });
      steps.push({
        name: "Gemini Agent Transaction",
        status: "failed",
        endpoint: "/api/agent/generate-transaction",
        request: { userRequest, invoiceText: invoiceText.slice(0, 200), intent },
        response: {},
        startedAt,
        completedAt: now(),
        error,
      });
      res.status(500).json({ success: false, runId, steps, error });
      return;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 4: SignScope Transaction Diff (deterministic)
  // ──────────────────────────────────────────────────────────────────────────
  let comparison!: ComparisonResult;
  {
    const startedAt = now();
    try {
      comparison = compareTransaction(intent, documentScan, agentTransaction);

      steps.push({
        name: "SignScope Transaction Diff",
        status: comparison.verdict === "blocked" ? "blocked" : "completed",
        endpoint: "/api/compare-transaction",
        request: { intent, documentScan, generatedTransaction: agentTransaction },
        response: comparison,
        startedAt,
        completedAt: now(),
      });

      addAuditLog({
        eventType: "TRANSACTION_COMPARED",
        status: comparison.verdict,
        source: "signscope",
        runId,
        intent,
        documentScan,
        agentTransaction,
        comparisonResult: comparison,
        verdict: comparison.verdict,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      steps.push({
        name: "SignScope Transaction Diff",
        status: "failed",
        endpoint: "/api/compare-transaction",
        request: { intent, documentScan, generatedTransaction: agentTransaction },
        response: {},
        startedAt,
        completedAt: now(),
        error,
      });
      res.status(500).json({ success: false, runId, steps, error });
      return;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Ledger Eligibility (not a wallet-cli call — that's on the Ledger Gate page)
  // ──────────────────────────────────────────────────────────────────────────
  const isBlocked = comparison.verdict === "blocked";
  const realCliEnabled = isRealLedgerCliEnabled();
  const realSigningEnabled = isRealSigningEnabled();

  const ledger: LedgerEligibility = {
    eligibleForDryRun: !isBlocked,
    eligibleForSigning: !isBlocked && realCliEnabled && realSigningEnabled,
    reason: isBlocked
      ? "Transaction blocked by SignScope. Ledger signing not triggered."
      : !realCliEnabled
        ? "Set ENABLE_REAL_LEDGER_CLI=true in .env to enable real wallet-cli dry-run."
        : !realSigningEnabled
          ? "Set ENABLE_REAL_SIGNING=true in .env to enable real signing. Requires Ledger device or Speculos."
          : "Transaction passed all checks. Ledger dry-run and signing available.",
  };

  // Final consolidated audit log
  addAuditLog({
    eventType:
      comparison.verdict === "safe"
        ? "VERDICT_SAFE"
        : comparison.verdict === "warning"
          ? "VERDICT_WARNING"
          : "VERDICT_BLOCKED",
    status: comparison.verdict,
    source: "signscope",
    runId,
    userRequest,
    invoiceText: invoiceText || null,
    intent,
    documentScan,
    geminiPrompt: geminiMeta.prompt,
    geminiRawResponse: geminiMeta.rawResponse,
    agentTransaction,
    comparisonResult: comparison,
    verdict: comparison.verdict,
  });

  const result: RequestCheckResult = {
    success: true,
    runId,
    steps,
    intent,
    documentScan,
    gemini: geminiMeta,
    agentTransaction,
    comparison,
    verdict: comparison.verdict,
    ledger,
  };

  res.json(result);
});

export default router;
