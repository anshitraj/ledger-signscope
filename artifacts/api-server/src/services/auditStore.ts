import { randomUUID } from "crypto";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userIntent: string;
  extractedRecipient: string;
  agentTransaction: string;
  riskScore: number;
  status: "safe" | "warning" | "blocked" | "approved" | "rejected";
  ledgerGateStatus: "pending" | "approved" | "rejected" | "blocked" | "not_triggered";
}

// In-memory store seeded with sample data
const auditLog: AuditLogEntry[] = [
  {
    id: randomUUID(),
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    userIntent: "Pay 25 USDC to Alice for invoice INV-102",
    extractedRecipient: "Alice",
    agentTransaction: "25 USDC → 0xA11CE... (Alice)",
    riskScore: 2,
    status: "safe",
    ledgerGateStatus: "approved",
  },
  {
    id: randomUUID(),
    timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    userIntent: "Pay 25 USDC to Alice for invoice INV-102",
    extractedRecipient: "Alice",
    agentTransaction: "0.25 ETH → 0xAttacker (Unknown)",
    riskScore: 92,
    status: "blocked",
    ledgerGateStatus: "blocked",
  },
  {
    id: randomUUID(),
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    userIntent: "Send 100 USDC to Bob for consulting INV-205",
    extractedRecipient: "Bob",
    agentTransaction: "100 USDC → 0xB0B000... (Bob)",
    riskScore: 5,
    status: "safe",
    ledgerGateStatus: "pending",
  },
  {
    id: randomUUID(),
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    userIntent: "Pay 0.5 ETH to Alice for design work",
    extractedRecipient: "Alice",
    agentTransaction: "1.5 ETH → 0xUnknown999 (Unknown)",
    riskScore: 78,
    status: "blocked",
    ledgerGateStatus: "blocked",
  },
];

export function getAuditLogs(): AuditLogEntry[] {
  return [...auditLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function addAuditLog(
  entry: Omit<AuditLogEntry, "id" | "timestamp">,
): AuditLogEntry {
  const newEntry: AuditLogEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  auditLog.push(newEntry);
  return newEntry;
}

export function getStats() {
  const total = auditLog.length;
  const safe = auditLog.filter((e) => e.status === "safe" || e.status === "approved").length;
  const blocked = auditLog.filter((e) => e.status === "blocked").length;
  const warning = auditLog.filter((e) => e.status === "warning").length;
  const ledgerRequired = auditLog.filter(
    (e) => e.ledgerGateStatus === "pending" || e.ledgerGateStatus === "approved",
  ).length;

  const recent = getAuditLogs().slice(0, 5);

  return {
    totalSimulations: total,
    safeFlows: safe,
    blockedFlows: blocked,
    warningFlows: warning,
    ledgerApprovalsRequired: ledgerRequired,
    recentRiskEvents: recent,
  };
}
