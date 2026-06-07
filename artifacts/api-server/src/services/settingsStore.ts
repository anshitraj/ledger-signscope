import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Settings } from "./types.js";

export const DEFAULT_RECIPIENTS = [
  { name: "Alice", address: "0xA11CE00000000000000000000000000000000000", chain: "ethereum" },
  { name: "Bob", address: "0xB0B0000000000000000000000000000000000000", chain: "ethereum" },
];

export function isSimulationMode(): boolean {
  return (process.env["SIMULATION_MODE"] ?? "true").toLowerCase() !== "false";
}

export function isRealSigningEnabled(): boolean {
  return (process.env["ENABLE_REAL_SIGNING"] ?? "false").toLowerCase() === "true";
}

export function isRealLedgerCliEnabled(): boolean {
  return (process.env["ENABLE_REAL_LEDGER_CLI"] ?? "false").toLowerCase() === "true";
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env["GEMINI_API_KEY"]?.trim());
}

function settingsPath(): string {
  const rel = process.env["SETTINGS_PATH"] ?? "./data/settings.json";
  return path.resolve(process.cwd(), rel);
}

export function defaultSettings(): Settings {
  return {
    walletCliBin: process.env["WALLET_CLI_BIN"] ?? "wallet-cli",
    defaultAccountLabel: process.env["DEFAULT_ACCOUNT_LABEL"] ?? "ethereum-1",
    defaultNetwork: (process.env["DEFAULT_NETWORK"] as Settings["defaultNetwork"]) ?? "ethereum",
    allowlistedRecipients: DEFAULT_RECIPIENTS,
    supportedAssets: ["ETH"],
    policies: {
      requireAllowlistedRecipient: true,
      blockAssetMismatch: true,
      blockAmountMismatch: true,
      blockPromptInjection: true,
      ledgerApprovalRequired: true,
      maxNativeEthAmount: "0.005",
    },
    // Derived from env
    simulationMode: isSimulationMode(),
    enableRealSigning: isRealSigningEnabled(),
    enableRealLedgerCli: isRealLedgerCliEnabled(),
  };
}

export function getSettings(): Settings {
  const defaults = defaultSettings();
  const file = settingsPath();
  if (!existsSync(file)) return defaults;

  try {
    const stored = JSON.parse(readFileSync(file, "utf8")) as Partial<Settings>;
    return {
      ...defaults,
      ...stored,
      // Env always wins for these
      simulationMode: isSimulationMode(),
      enableRealSigning: isRealSigningEnabled(),
      enableRealLedgerCli: isRealLedgerCliEnabled(),
      walletCliBin: process.env["WALLET_CLI_BIN"] ?? stored.walletCliBin ?? defaults.walletCliBin,
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(input: Partial<Settings>): Settings {
  const next: Settings = {
    ...getSettings(),
    ...input,
    // Never let frontend override env-controlled fields
    simulationMode: isSimulationMode(),
    enableRealSigning: isRealSigningEnabled(),
    enableRealLedgerCli: isRealLedgerCliEnabled(),
  };
  const file = settingsPath();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(next, null, 2));
  return next;
}
