import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { getSettings, isRealLedgerCliEnabled, isRealSigningEnabled } from "./settingsStore.js";
import { addAuditLog } from "./auditLog.js";
import { assertAccountLabel, assertEthereumAddress, assertPositiveDecimal, normalizeAsset, normalizeNetwork } from "./validators.js";
import type { Verdict, WalletCliResult } from "./types.js";

const execFileAsync = promisify(execFile);
const TIMEOUT_MS = 30_000;
const CONFIRMATION = "I UNDERSTAND THIS WILL REQUEST LEDGER SIGNING";

function commandText(bin: string, args: string[]): string {
  return [bin, ...args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg))].join(" ");
}

function resolveWalletCliCommand(args: string[]) {
  const { walletCliBin } = getSettings();
  if (process.platform === "win32" && walletCliBin.toLowerCase().endsWith(".cmd")) {
    const entry = path.join(
      path.dirname(walletCliBin),
      "node_modules",
      "@ledgerhq",
      "wallet-cli",
      "bin",
      "wallet-cli",
    );
    return {
      file: process.execPath,
      args: [entry, ...args],
      command: commandText(walletCliBin, args),
    };
  }
  return {
    file: walletCliBin,
    args,
    command: commandText(walletCliBin, args),
  };
}

async function runWalletCli(args: string[], eventType: string): Promise<WalletCliResult> {
  const resolved = resolveWalletCliCommand(args);
  const command = resolved.command;

  try {
    const result = await execFileAsync(resolved.file, resolved.args, {
      timeout: TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });

    const payload: WalletCliResult = {
      ok: true,
      command,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
    };

    addAuditLog({
      eventType,
      status: "completed",
      source: "ledger-cli",
      walletCliCommand: command,
      walletCliStdout: result.stdout,
      walletCliStderr: result.stderr || null,
      walletCliExitCode: 0,
    });

    return payload;
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: number;
      killed?: boolean;
      signal?: string;
    };

    const exitCode = typeof err.code === "number" ? err.code : null;
    const timedOut = err.killed || err.signal === "SIGTERM";
    const payload: WalletCliResult = {
      ok: false,
      command,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? "",
      exitCode,
      timedOut,
      error: err.message,
    };

    addAuditLog({
      eventType,
      status: timedOut ? "timeout" : "failed",
      source: "ledger-cli",
      walletCliCommand: command,
      walletCliStdout: payload.stdout || null,
      walletCliStderr: payload.stderr || payload.error || null,
      walletCliExitCode: exitCode,
    });

    return payload;
  }
}

export async function walletCliStatus(): Promise<WalletCliResult> {
  return runWalletCli(["--version"], "WALLET_CLI_COMMAND_RUN");
}

export async function walletCliVersion(): Promise<WalletCliResult> {
  return runWalletCli(["--version"], "WALLET_CLI_COMMAND_RUN");
}

export async function genuineCheck(): Promise<WalletCliResult> {
  return runWalletCli(["genuine-check"], "WALLET_CLI_COMMAND_RUN");
}

export async function discover(networkInput: unknown): Promise<WalletCliResult> {
  const network = normalizeNetwork(networkInput);
  if (!network) throw new Error("network must be ethereum, bitcoin, or solana");
  return runWalletCli(["account", "discover", network], "WALLET_CLI_COMMAND_RUN");
}

export async function balances(labelInput: unknown): Promise<WalletCliResult> {
  const label = assertAccountLabel(labelInput);
  return runWalletCli(["balances", label, "--format", "json"], "WALLET_CLI_COMMAND_RUN");
}

export async function sessionView(): Promise<WalletCliResult> {
  return runWalletCli(["session", "view"], "WALLET_CLI_COMMAND_RUN");
}

export async function sessionReset(): Promise<WalletCliResult> {
  return runWalletCli(["session", "reset"], "WALLET_CLI_COMMAND_RUN");
}

export async function dryRunSend(input: {
  verdict?: Verdict;
  accountLabel?: unknown;
  to?: unknown;
  amount?: unknown;
  asset?: unknown;
}): Promise<WalletCliResult> {
  if (input.verdict === "blocked") {
    throw new Error("Blocked by SignScope. Ledger signing not triggered.");
  }

  const accountLabel = assertAccountLabel(input.accountLabel ?? getSettings().defaultAccountLabel);
  const to = assertEthereumAddress(input.to);
  const amount = assertPositiveDecimal(input.amount);
  const asset = normalizeAsset(input.asset);

  if (asset !== "ETH") {
    throw new Error(
      "Native ETH is the supported asset for wallet-cli proof mode. ERC-20/USDC requires token-send support in wallet-cli.",
    );
  }

  const command = commandText(getSettings().walletCliBin, [
    "send", accountLabel, "--to", to, "--amount", `${amount} ETH`, "--dry-run", "--format", "json",
  ]);

  if (!isRealLedgerCliEnabled()) {
    // Honest response — we did NOT run the command
    addAuditLog({
      eventType: "LEDGER_DRY_RUN_ATTEMPTED",
      status: "skipped",
      source: "signscope",
      walletCliCommand: command,
      walletCliStdout: null,
      walletCliStderr: null,
      walletCliExitCode: null,
      verdict: input.verdict ?? null,
    });
    return {
      ok: false,
      skipped: true,
      skipReason:
        "Set ENABLE_REAL_LEDGER_CLI=true in .env to run real wallet-cli commands. Without it, no CLI command is executed.",
      command,
      stdout: "",
      stderr: "",
      exitCode: null,
    };
  }

  addAuditLog({
    eventType: "LEDGER_DRY_RUN_ATTEMPTED",
    status: "attempted",
    source: "ledger-cli",
    walletCliCommand: command,
    verdict: input.verdict ?? null,
  });

  const result = await runWalletCli(
    ["send", accountLabel, "--to", to, "--amount", `${amount} ETH`, "--dry-run", "--format", "json"],
    "LEDGER_DRY_RUN_COMPLETED",
  );

  addAuditLog({
    eventType: result.ok ? "LEDGER_DRY_RUN_COMPLETED" : "LEDGER_DRY_RUN_FAILED",
    status: result.ok ? "completed" : "failed",
    source: "ledger-cli",
    walletCliCommand: result.command,
    walletCliStdout: result.stdout || null,
    walletCliStderr: result.stderr || null,
    walletCliExitCode: result.exitCode,
    verdict: input.verdict ?? null,
  });

  return result;
}

export async function signSend(input: {
  verdict?: Verdict;
  accountLabel?: unknown;
  to?: unknown;
  amount?: unknown;
  asset?: unknown;
  confirmation?: unknown;
}): Promise<WalletCliResult> {
  if (input.verdict === "blocked") {
    addAuditLog({
      eventType: "LEDGER_SIGN_REJECTED_BY_POLICY",
      status: "blocked",
      source: "signscope",
      verdict: "blocked",
    });
    throw new Error("Blocked by SignScope. Ledger signing not triggered.");
  }

  if (!isRealLedgerCliEnabled()) {
    throw new Error(
      "Set ENABLE_REAL_LEDGER_CLI=true in .env to enable Ledger CLI commands.",
    );
  }

  if (!isRealSigningEnabled()) {
    addAuditLog({
      eventType: "LEDGER_SIGN_REJECTED_BY_POLICY",
      status: "blocked",
      source: "signscope",
    });
    throw new Error(
      "Real signing is disabled. Set ENABLE_REAL_SIGNING=true in .env to enable. This requires a connected Ledger device or Speculos.",
    );
  }

  if (input.confirmation !== CONFIRMATION) {
    throw new Error(
      `Signing requires exact confirmation: "${CONFIRMATION}"`,
    );
  }

  const accountLabel = assertAccountLabel(input.accountLabel ?? getSettings().defaultAccountLabel);
  const to = assertEthereumAddress(input.to);
  const amount = assertPositiveDecimal(input.amount);
  const asset = normalizeAsset(input.asset);

  if (asset !== "ETH") {
    throw new Error("Native ETH only in local proof mode.");
  }

  addAuditLog({
    eventType: "LEDGER_SIGN_ATTEMPTED",
    status: "attempted",
    source: "ledger-cli",
    verdict: input.verdict ?? null,
  });

  const result = await runWalletCli(
    ["send", accountLabel, "--to", to, "--amount", `${amount} ETH`],
    "LEDGER_SIGN_COMPLETED",
  );

  addAuditLog({
    eventType: result.ok ? "LEDGER_SIGN_COMPLETED" : "LEDGER_SIGN_FAILED",
    status: result.ok ? "completed" : "failed",
    source: "ledger-cli",
    walletCliCommand: result.command,
    walletCliStdout: result.stdout || null,
    walletCliStderr: result.stderr || null,
    walletCliExitCode: result.exitCode,
    verdict: input.verdict ?? null,
  });

  return result;
}
