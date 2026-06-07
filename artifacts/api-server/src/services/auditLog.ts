import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { AuditLogEvent } from "./types.js";

function logPath(): string {
  const rel = process.env["AUDIT_LOG_PATH"] ?? "./data/audit-logs.json";
  return path.resolve(process.cwd(), rel);
}

function readLogs(): AuditLogEvent[] {
  const file = logPath();
  if (!existsSync(file)) return [];
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    return Array.isArray(data) ? (data as AuditLogEvent[]) : [];
  } catch {
    return [];
  }
}

function writeLogs(logs: AuditLogEvent[]): void {
  const file = logPath();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(logs, null, 2));
}

export function getAuditLogs(): AuditLogEvent[] {
  return readLogs().sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

export function addAuditLog(
  input: Partial<AuditLogEvent> & { eventType: string; status: string },
): AuditLogEvent {
  const isSimMode = (process.env["SIMULATION_MODE"] ?? "true").toLowerCase() !== "false";

  const event: AuditLogEvent = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    runId: input.runId ?? null,
    eventType: input.eventType,
    status: input.status,
    source: input.source ?? "signscope",
    mode: input.mode ?? (isSimMode ? "simulation" : "real"),
    userRequest: input.userRequest ?? null,
    invoiceText: input.invoiceText ?? null,
    intent: input.intent ?? null,
    documentScan: input.documentScan ?? null,
    geminiPrompt: input.geminiPrompt ?? null,
    geminiRawResponse: input.geminiRawResponse ?? null,
    agentTransaction: input.agentTransaction ?? null,
    comparisonResult: input.comparisonResult ?? null,
    verdict: input.verdict ?? null,
    walletCliCommand: input.walletCliCommand ?? null,
    walletCliStdout: input.walletCliStdout ?? null,
    walletCliStderr: input.walletCliStderr ?? null,
    walletCliExitCode: input.walletCliExitCode ?? null,
  };

  const logs = readLogs();
  logs.push(event);
  writeLogs(logs);
  return event;
}

export function clearAuditLogs(): void {
  writeLogs([]);
}

export function getStats() {
  const logs = getAuditLogs();
  const verdicts = logs.filter((l) => l.verdict);
  return {
    totalRuns: logs.filter((l) =>
      l.eventType === "VERDICT_SAFE" ||
      l.eventType === "VERDICT_WARNING" ||
      l.eventType === "VERDICT_BLOCKED"
    ).length,
    safeFlows: verdicts.filter((l) => l.verdict === "safe").length,
    blockedFlows: verdicts.filter((l) => l.verdict === "blocked").length,
    warningFlows: verdicts.filter((l) => l.verdict === "warning").length,
    ledgerApprovalsRequired: logs.filter((l) =>
      l.eventType.startsWith("LEDGER_DRY_RUN") || l.eventType.startsWith("LEDGER_SIGN"),
    ).length,
    walletCliStatus: "Use /api/wallet-cli/status for live status",
    recentRiskEvents: logs.slice(0, 5),
  };
}
