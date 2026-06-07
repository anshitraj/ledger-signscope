export type Verdict = "safe" | "warning" | "blocked";
export type Mode = "simulation" | "real";

// ---------------------------------------------------------------------------
// Pipeline data types
// ---------------------------------------------------------------------------

export interface ParsedIntent {
  action: string;
  recipientName: string | null;
  asset: string | null;
  amount: string | null;
  invoiceId: string | null;
  chain: "ethereum" | "bitcoin" | "solana";
  confidence: number;
  raw: string;
}

export interface DocumentScanResult {
  riskScore: number;
  verdict: "clean" | "suspicious" | "malicious";
  findings: string[];
  suspiciousPhrases: string[];
  highlightedText: string | null;
  explanation: string;
}

export interface GeneratedTransaction {
  chain: "ethereum" | "bitcoin" | "solana";
  asset: string;
  amount: string;
  recipientName: string | null;
  to: string;
  invoiceId: string | null;
  type: "transfer";
  agentReason: string;
  sourceOfInstruction: "user_request" | "invoice" | "mixed";
}

export interface DiffCheck {
  key: string;
  label: string;
  expected: string | null;
  actual: string | null;
  status: "pass" | "warning" | "fail";
  explanation?: string;
}

export interface ComparisonResult {
  verdict: Verdict;
  riskScore: number;
  checks: DiffCheck[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Pipeline run types
// ---------------------------------------------------------------------------

export interface PipelineStep {
  name: string;
  status: "completed" | "failed" | "blocked";
  endpoint: string;
  request: object;
  response: object;
  startedAt: string;
  completedAt: string;
  error?: string;
}

export interface GeminiMeta {
  model: string;
  prompt: string;
  rawResponse: string;
  parsedJson: object | null;
  jsonParseStatus: "success" | "failed" | "markdown_extracted";
}

export interface LedgerEligibility {
  eligibleForDryRun: boolean;
  eligibleForSigning: boolean;
  reason: string;
}

export interface RequestCheckResult {
  success: boolean;
  runId: string;
  steps: PipelineStep[];
  intent: ParsedIntent;
  documentScan: DocumentScanResult;
  gemini: GeminiMeta;
  agentTransaction: GeneratedTransaction;
  comparison: ComparisonResult;
  verdict: Verdict;
  ledger: LedgerEligibility;
}

// ---------------------------------------------------------------------------
// Wallet CLI
// ---------------------------------------------------------------------------

export interface WalletCliResult {
  ok: boolean;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut?: boolean;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface Recipient {
  name: string;
  address: string;
  chain: string;
}

export interface Policy {
  requireAllowlistedRecipient: boolean;
  blockAssetMismatch: boolean;
  blockAmountMismatch: boolean;
  blockPromptInjection: boolean;
  ledgerApprovalRequired: boolean;
  maxNativeEthAmount: string;
}

export interface Settings {
  walletCliBin: string;
  defaultAccountLabel: string;
  defaultNetwork: "ethereum" | "bitcoin" | "solana";
  allowlistedRecipients: Recipient[];
  supportedAssets: string[];
  policies: Policy;
  // Derived from env (read-only in settings, overridden by env)
  simulationMode: boolean;
  enableRealSigning: boolean;
  enableRealLedgerCli: boolean;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export interface AuditLogEvent {
  id: string;
  timestamp: string;
  runId: string | null;
  eventType: string;
  status: string;
  source: "gemini" | "signscope" | "ledger-cli" | "system";
  mode: Mode;
  userRequest: string | null;
  invoiceText: string | null;
  intent: object | null;
  documentScan: object | null;
  geminiPrompt: string | null;
  geminiRawResponse: string | null;
  agentTransaction: object | null;
  comparisonResult: object | null;
  verdict: string | null;
  walletCliCommand: string | null;
  walletCliStdout: string | null;
  walletCliStderr: string | null;
  walletCliExitCode: number | null;
}
