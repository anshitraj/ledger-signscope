import type {
  AiStatus,
  AuditLogEvent,
  ComparisonResult,
  DocumentScanResult,
  GeneratedTransaction,
  ParsedIntent,
  RequestCheckResult,
  Settings,
  Verdict,
  WalletCliResult,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new Error(
      "Backend unavailable. Start the server with: npm run dev",
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error((payload as { error?: string }).error ?? response.statusText);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  // ── Health & status ──────────────────────────────────────────────────────
  health: () =>
    request<{ status: string; geminiEnabled: boolean; model: string }>("/health"),

  aiStatus: () => request<AiStatus>("/ai/status"),

  stats: () =>
    request<{
      totalRuns: number;
      safeFlows: number;
      blockedFlows: number;
      warningFlows: number;
      ledgerApprovalsRequired: number;
      walletCliStatus: string;
      recentRiskEvents: AuditLogEvent[];
    }>("/stats"),

  // ── Main pipeline (single call) ──────────────────────────────────────────
  requestCheck: (payload: {
    userRequest: string;
    invoiceText: string;
    mode?: "real";
  }) =>
    request<RequestCheckResult>("/request-check/run", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ── Individual step endpoints (Dev Sandbox / tests) ──────────────────────
  parseIntent: (text: string) =>
    request<{ success: true; intent: ParsedIntent }>("/parse-intent", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  scanDocument: (text: string) =>
    request<{ success: true; scan: DocumentScanResult }>("/scan-document", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  generateAgentTransaction: (payload: {
    userRequest: string;
    invoiceText?: string;
    intent?: ParsedIntent;
  }) =>
    request<{
      success: true;
      model: string;
      jsonParseStatus: string;
      transaction: GeneratedTransaction;
      rawResponse: string;
    }>("/agent/generate-transaction", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  compareTransaction: (payload: {
    intent: ParsedIntent;
    documentScan: DocumentScanResult | null;
    generatedTransaction: GeneratedTransaction;
  }) =>
    request<{ success: true; comparison: ComparisonResult }>("/compare-transaction", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ── Settings ─────────────────────────────────────────────────────────────
  settings: () => request<Settings>("/settings"),
  saveSettings: (settings: Partial<Settings>) =>
    request<Settings>("/settings", { method: "POST", body: JSON.stringify(settings) }),

  // ── Audit logs ───────────────────────────────────────────────────────────
  auditLogs: () => request<AuditLogEvent[]>("/audit-logs"),
  clearAuditLogs: () => request<void>("/audit-logs", { method: "DELETE" }),
  exportAuditLogs: () => `${API_BASE}/audit-logs/export`,

  // ── Wallet CLI ───────────────────────────────────────────────────────────
  walletStatus: () => request<WalletCliResult>("/wallet-cli/status"),
  walletVersion: () => request<WalletCliResult>("/wallet-cli/version", { method: "POST" }),
  genuineCheck: () => request<WalletCliResult>("/wallet-cli/genuine-check", { method: "POST" }),
  discover: (network: "ethereum" | "solana" | "bitcoin") =>
    request<WalletCliResult>("/wallet-cli/discover", {
      method: "POST",
      body: JSON.stringify({ network }),
    }),
  balances: (accountLabel: string) =>
    request<WalletCliResult>("/wallet-cli/balances", {
      method: "POST",
      body: JSON.stringify({ accountLabel }),
    }),
  sessionView: () => request<WalletCliResult>("/wallet-cli/session-view", { method: "POST" }),
  sessionReset: () => request<WalletCliResult>("/wallet-cli/session-reset", { method: "POST" }),
  dryRunSend: (payload: {
    verdict: Verdict;
    accountLabel: string;
    to: string;
    amount: string;
    asset: string;
  }) =>
    request<WalletCliResult>("/wallet-cli/dry-run-send", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  signSend: (payload: {
    verdict: Verdict;
    accountLabel: string;
    to: string;
    amount: string;
    asset: string;
    confirmation: string;
  }) =>
    request<WalletCliResult>("/wallet-cli/sign-send", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
