import { Router, type Response } from "express";
import { parseIntent } from "../services/parseIntent.js";
import { scanDocument } from "../services/scanDocument.js";
import { compareTransaction } from "../services/compareTransaction.js";
import { addAuditLog, clearAuditLogs, getAuditLogs, getStats } from "../services/auditLog.js";
import { getSettings, saveSettings } from "../services/settingsStore.js";
import {
  balances,
  discover,
  dryRunSend,
  genuineCheck,
  sessionReset,
  sessionView,
  signSend,
  walletCliStatus,
  walletCliVersion,
} from "../services/walletCli.js";
import type { DocumentScanResult, GeneratedTransaction, ParsedIntent } from "../services/types.js";

const router = Router();

function badRequest(res: Response, error: unknown) {
  res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
}

function requireText(body: unknown): string {
  if (!body || typeof body !== "object" || typeof (body as { text?: unknown }).text !== "string") {
    throw new Error("text is required");
  }
  return (body as { text: string }).text;
}

// ---------------------------------------------------------------------------
// Individual step endpoints (used by tests and Dev Sandbox pages)
// ---------------------------------------------------------------------------

router.post("/parse-intent", async (req, res) => {
  try {
    const result = await parseIntent(requireText(req.body));
    addAuditLog({
      eventType: "INTENT_PARSED",
      status: "success",
      source: "signscope",
      intent: result,
      verdict: null,
    });
    res.json({ success: true, intent: result });
  } catch (error) {
    badRequest(res, error);
  }
});

router.post("/scan-document", async (req, res) => {
  try {
    const result = await scanDocument(requireText(req.body));
    addAuditLog({
      eventType: "DOCUMENT_SCANNED",
      status: result.verdict,
      source: "signscope",
      documentScan: result,
      verdict: result.verdict === "malicious" ? "blocked" : result.verdict === "suspicious" ? "warning" : "safe",
    });
    res.json({ success: true, scan: result });
  } catch (error) {
    badRequest(res, error);
  }
});

router.post("/agent/generate-transaction", async (req, res) => {
  // This endpoint is available for direct testing but the main pipeline
  // goes through /api/request-check/run which calls geminiGenerateTransaction directly
  const { geminiGenerateTransaction } = await import("../services/gemini.js");
  try {
    const body = req.body as {
      userRequest?: unknown;
      invoiceText?: unknown;
      intent?: unknown;
    };
    if (!body.userRequest || typeof body.userRequest !== "string") {
      throw new Error("userRequest is required");
    }
    const settings = getSettings();
    const intent = body.intent as ParsedIntent | undefined;
    const { parseIntentSync } = await import("../services/parseIntent.js");
    const resolvedIntent = intent ?? parseIntentSync(body.userRequest);

    const result = await geminiGenerateTransaction({
      userRequest: body.userRequest,
      invoiceText: typeof body.invoiceText === "string" ? body.invoiceText : "",
      intent: resolvedIntent,
      allowlist: settings.allowlistedRecipients,
      policies: settings.policies,
    });

    addAuditLog({
      eventType: "GEMINI_RESPONSE_RECEIVED",
      status: "success",
      source: "gemini",
      geminiPrompt: result.prompt,
      geminiRawResponse: result.rawResponse,
      agentTransaction: result.transaction,
    });

    res.json({
      success: true,
      model: result.model,
      jsonParseStatus: result.jsonParseStatus,
      transaction: result.transaction,
      rawResponse: result.rawResponse,
    });
  } catch (error) {
    badRequest(res, error);
  }
});

router.post("/compare-transaction", (req, res) => {
  try {
    const body = req.body as {
      intent?: unknown;
      documentScan?: unknown;
      generatedTransaction?: unknown;
    };
    if (!body.intent || !body.generatedTransaction) {
      throw new Error("intent and generatedTransaction are required");
    }
    const comparison = compareTransaction(
      body.intent as ParsedIntent,
      (body.documentScan as DocumentScanResult) ?? null,
      body.generatedTransaction as GeneratedTransaction,
    );
    addAuditLog({
      eventType: "TRANSACTION_COMPARED",
      status: comparison.verdict,
      source: "signscope",
      intent: body.intent as object,
      documentScan: body.documentScan as object,
      agentTransaction: body.generatedTransaction as object,
      comparisonResult: comparison,
      verdict: comparison.verdict,
    });
    res.json({ success: true, comparison });
  } catch (error) {
    badRequest(res, error);
  }
});

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

router.get("/settings", (_req, res) => {
  res.json(getSettings());
});

router.post("/settings", (req, res) => {
  try {
    res.json(saveSettings(req.body as object));
  } catch (error) {
    badRequest(res, error);
  }
});

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------

router.get("/audit-logs", (_req, res) => {
  res.json(getAuditLogs());
});

router.post("/audit-logs", (req, res) => {
  try {
    const event = addAuditLog({
      ...(req.body as object),
      eventType: (req.body as { eventType?: string }).eventType ?? "MANUAL_EVENT",
      status: (req.body as { status?: string }).status ?? "info",
    });
    res.json(event);
  } catch (error) {
    badRequest(res, error);
  }
});

router.delete("/audit-logs", (_req, res) => {
  clearAuditLogs();
  res.status(204).end();
});

router.get("/audit-logs/export", (_req, res) => {
  const logs = getAuditLogs();
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="signscope-audit-logs-${new Date().toISOString().slice(0, 10)}.json"`,
  );
  res.json(logs);
});

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

router.get("/stats", (_req, res) => {
  res.json(getStats());
});

// ---------------------------------------------------------------------------
// Wallet CLI
// ---------------------------------------------------------------------------

router.get("/wallet-cli/status", async (_req, res) => {
  try {
    res.json(await walletCliStatus());
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/wallet-cli/version", async (_req, res) => {
  try { res.json(await walletCliVersion()); } catch (e) { badRequest(res, e); }
});

router.post("/wallet-cli/genuine-check", async (_req, res) => {
  try { res.json(await genuineCheck()); } catch (e) { badRequest(res, e); }
});

router.post("/wallet-cli/discover", async (req, res) => {
  try {
    const { network } = req.body as { network?: unknown };
    res.json(await discover(network));
  } catch (e) { badRequest(res, e); }
});

router.post("/wallet-cli/balances", async (req, res) => {
  try {
    const { accountLabel } = req.body as { accountLabel?: unknown };
    res.json(await balances(accountLabel ?? getSettings().defaultAccountLabel));
  } catch (e) { badRequest(res, e); }
});

router.post("/wallet-cli/session-view", async (_req, res) => {
  try { res.json(await sessionView()); } catch (e) { badRequest(res, e); }
});

router.post("/wallet-cli/session-reset", async (_req, res) => {
  try { res.json(await sessionReset()); } catch (e) { badRequest(res, e); }
});

router.post("/wallet-cli/dry-run-send", async (req, res) => {
  try {
    res.json(await dryRunSend(req.body as Parameters<typeof dryRunSend>[0]));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

router.post("/wallet-cli/sign-send", async (req, res) => {
  try {
    res.json(await signSend(req.body as Parameters<typeof signSend>[0]));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

export default router;
