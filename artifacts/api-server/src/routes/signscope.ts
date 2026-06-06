import { Router } from "express";
import { parseIntent } from "../services/parseIntent.js";
import { scanDocument } from "../services/scanDocument.js";
import { compareTransaction } from "../services/compareTransaction.js";
import { simulateLedgerGate } from "../services/ledgerGate.js";
import { getAuditLogs, addAuditLog, getStats } from "../services/auditStore.js";
import {
  ParseIntentBody,
  ScanDocumentBody,
  CompareTransactionBody,
  SimulateLedgerGateBody,
  CreateAuditLogBody,
} from "@workspace/api-zod";

const router = Router();

// POST /parse-intent
router.post("/parse-intent", (req, res) => {
  const parsed = ParseIntentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const result = parseIntent(parsed.data.text);
  res.json(result);
});

// POST /scan-document
router.post("/scan-document", (req, res) => {
  const parsed = ScanDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const result = scanDocument(parsed.data.text, parsed.data.documentType);
  res.json(result);
});

// POST /compare-transaction
router.post("/compare-transaction", (req, res) => {
  const parsed = CompareTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const tx = {
    ...parsed.data.transaction,
    invoiceId: parsed.data.transaction.invoiceId ?? null,
    calldata: parsed.data.transaction.calldata ?? null,
  };
  const result = compareTransaction(parsed.data.intent, tx);
  res.json(result);
});

// POST /simulate-ledger-gate
router.post("/simulate-ledger-gate", (req, res) => {
  const parsed = SimulateLedgerGateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { verdict, action } = parsed.data;
  const ledgerTx = {
    ...parsed.data.transaction,
    invoiceId: parsed.data.transaction.invoiceId ?? null,
    calldata: parsed.data.transaction.calldata ?? null,
  };
  const result = simulateLedgerGate(verdict, ledgerTx, action ?? undefined);
  res.json(result);
});

// GET /audit-logs
router.get("/audit-logs", (_req, res) => {
  const logs = getAuditLogs();
  res.json(logs);
});

// POST /audit-logs
router.post("/audit-logs", (req, res) => {
  const parsed = CreateAuditLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const entry = addAuditLog(parsed.data);
  res.status(201).json(entry);
});

// GET /stats
router.get("/stats", (_req, res) => {
  const stats = getStats();
  res.json(stats);
});

export default router;
