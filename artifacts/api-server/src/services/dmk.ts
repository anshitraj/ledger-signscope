/**
 * DMK (Device Management Kit) service — Speculos transport integration.
 *
 * Connects to a Speculos emulator (http://localhost:5000) via the official
 * @ledgerhq/device-transport-kit-speculos package.
 *
 * Flow:
 *   1. Build DMK with speculosTransportFactory
 *   2. startDiscovering() → take first DiscoveredDevice
 *   3. connect(device) → DeviceSessionId
 *   4. SignerEthBuilder(dmk, sessionId).build() → get address / sign tx
 *   5. signTransaction gated by SignScope verdict (blocked → throws)
 */

import { firstValueFrom, filter } from "rxjs";
import {
  DeviceManagementKitBuilder,
  DeviceActionStatus,
  ConsoleLogger,
} from "@ledgerhq/device-management-kit";
import { speculosTransportFactory } from "@ledgerhq/device-transport-kit-speculos";
import { SignerEthBuilder } from "@ledgerhq/device-signer-kit-ethereum";
import type { DeviceSessionId } from "@ledgerhq/device-management-kit";
import { addAuditLog } from "./auditLog.js";
import type { Verdict } from "./types.js";

// ---------------------------------------------------------------------------
// DMK singleton
// ---------------------------------------------------------------------------

const SPECULOS_URL = process.env.SPECULOS_URL ?? "http://127.0.0.1:5000";
const DEFAULT_DERIVATION = "44'/60'/0'/0/0";

const dmk = new DeviceManagementKitBuilder()
  .addTransport(speculosTransportFactory(SPECULOS_URL))
  .addLogger(new ConsoleLogger())
  .build();

// ---------------------------------------------------------------------------
// Speculos health check (plain HTTP HEAD to :5000)
// ---------------------------------------------------------------------------

export async function speculosHealth(): Promise<{
  reachable: boolean;
  url: string;
  error?: string;
}> {
  try {
    const resp = await fetch(`${SPECULOS_URL}/apdu`, {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
    });
    return { reachable: resp.ok || resp.status < 500, url: SPECULOS_URL };
  } catch (err) {
    return {
      reachable: false,
      url: SPECULOS_URL,
      error: (err as Error).message,
    };
  }
}

// ---------------------------------------------------------------------------
// Discover + connect to Speculos device
// ---------------------------------------------------------------------------

export async function connectSpeculos(): Promise<{
  sessionId: DeviceSessionId;
  deviceInfo: string;
}> {
  // startDiscovering emits DiscoveredDevice objects
  const discovered = await firstValueFrom(
    dmk.startDiscovering({ transport: "SPECULOS_HTTP_TRANSPORT" }),
  );

  const sessionId = await dmk.connect({ device: discovered });

  addAuditLog({
    eventType: "DMK_SPECULOS_CONNECTED",
    status: "completed",
    source: "ledger-cli",
  });

  return {
    sessionId,
    deviceInfo: discovered.deviceModel?.name ?? "Speculos Device",
  };
}

// ---------------------------------------------------------------------------
// Get Ethereum address from device
// ---------------------------------------------------------------------------

export async function dmkGetAddress(
  sessionId: DeviceSessionId,
  derivationPath = DEFAULT_DERIVATION,
): Promise<{ address: string; publicKey: string }> {
  const signer = new SignerEthBuilder({ dmk, sessionId }).build();

  const { observable } = signer.getAddress(derivationPath, {
    checkOnDevice: false,
  });

  // Wait for terminal state (Completed or Error)
  const finalState = await firstValueFrom(
    observable.pipe(
      filter(
        (s) =>
          s.status === DeviceActionStatus.Completed ||
          s.status === DeviceActionStatus.Error,
      ),
    ),
  );

  if (finalState.status === DeviceActionStatus.Error) {
    const rawErr = (finalState as { error?: unknown }).error;
    const errMsg = rawErr == null
      ? "unknown error"
      : typeof rawErr === "object"
        ? JSON.stringify(rawErr)
        : String(rawErr);
    throw new Error(`DMK getAddress failed: ${errMsg}`);
  }

  const output = (
    finalState as unknown as {
      output: { address: string; publicKey: string };
    }
  ).output;

  addAuditLog({
    eventType: "DMK_GET_ADDRESS",
    status: "completed",
    source: "ledger-cli",
  });

  return { address: output.address, publicKey: output.publicKey };
}

// ---------------------------------------------------------------------------
// Sign an Ethereum transaction via DMK (gated by SignScope verdict)
// ---------------------------------------------------------------------------

export async function dmkSignTransaction(
  sessionId: DeviceSessionId,
  derivationPath: string,
  rawTxHex: string,
  verdict: Verdict | undefined,
): Promise<{ v: string; r: string; s: string; signedTxHex: string }> {
  // HARD GATE: blocked verdicts never reach Ledger
  if (verdict === "blocked") {
    addAuditLog({
      eventType: "DMK_SIGN_REJECTED_BY_POLICY",
      status: "blocked",
      source: "signscope",
      verdict: "blocked",
    });
    throw new Error(
      "Blocked by SignScope firewall. Ledger signing not triggered.",
    );
  }

  // Convert hex → Uint8Array
  const hexClean = rawTxHex.startsWith("0x") ? rawTxHex.slice(2) : rawTxHex;
  const txBytes = new Uint8Array(
    hexClean.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
  );

  const signer = new SignerEthBuilder({ dmk, sessionId }).build();

  const { observable } = signer.signTransaction(derivationPath, txBytes);

  const finalState = await firstValueFrom(
    observable.pipe(
      filter(
        (s) =>
          s.status === DeviceActionStatus.Completed ||
          s.status === DeviceActionStatus.Error,
      ),
    ),
  );

  if (finalState.status === DeviceActionStatus.Error) {
    addAuditLog({
      eventType: "DMK_SIGN_FAILED",
      status: "failed",
      source: "ledger-cli",
      verdict: verdict ?? null,
    });
    const rawErr = (finalState as { error?: unknown }).error;
    const errMsg = rawErr == null
      ? "unknown error"
      : typeof rawErr === "object"
        ? JSON.stringify(rawErr)
        : String(rawErr);
    throw new Error(`DMK signTransaction failed: ${errMsg}`);
  }

  const sig = (
    finalState as unknown as {
      output: { v: number; r: string; s: string };
    }
  ).output;

  addAuditLog({
    eventType: "DMK_SIGN_COMPLETED",
    status: "completed",
    source: "ledger-cli",
    verdict: verdict ?? null,
  });

  return {
    v: sig.v.toString(16),
    r: sig.r,
    s: sig.s,
    signedTxHex: "",
  };
}

// ---------------------------------------------------------------------------
// Auto-approve: press Speculos buttons until "Sign transaction" screen, confirm
// ---------------------------------------------------------------------------

async function speculosButtonPress(button: "right" | "left" | "both"): Promise<void> {
  await fetch(`${SPECULOS_URL}/button/${button}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "press-and-release" }),
    signal: AbortSignal.timeout(3000),
  });
}

async function speculosGetEventsSince(offset: number): Promise<{ events: { text: string; tag: string }[]; total: number }> {
  try {
    const resp = await fetch(`${SPECULOS_URL}/events`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = (await resp.json()) as { events: { text: string; tag: string }[] };
    return { events: data.events.slice(offset), total: data.events.length };
  } catch {
    return { events: [], total: 0 };
  }
}

async function speculosClearEvents(): Promise<void> {
  try {
    await fetch(`${SPECULOS_URL}/events`, {
      method: "DELETE",
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // ignore — older Speculos versions may not support DELETE
  }
}

export async function dmkSignWithAutoApprove(
  sessionId: DeviceSessionId,
  derivationPath: string,
  rawTxHex: string,
  verdict: Verdict | undefined,
): Promise<{ v: string; r: string; s: string; screens: string[] }> {
  // HARD GATE: blocked never reaches device
  if (verdict === "blocked") {
    addAuditLog({
      eventType: "DMK_SIGN_REJECTED_BY_POLICY",
      status: "blocked",
      source: "signscope",
      verdict: "blocked",
    });
    throw new Error("Blocked by SignScope firewall. Ledger signing not triggered.");
  }

  const hexClean = rawTxHex.startsWith("0x") ? rawTxHex.slice(2) : rawTxHex;
  const txBytes = new Uint8Array(
    hexClean.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
  );

  // Clear Speculos event log so we only see events from THIS signing
  await speculosClearEvents();

  const signer = new SignerEthBuilder({ dmk, sessionId }).build();
  const { observable } = signer.signTransaction(derivationPath, txBytes);

  const screens: string[] = [];

  // Race: signing observable vs button-pressing loop
  const signPromise = firstValueFrom(
    observable.pipe(
      filter(
        (s) =>
          s.status === DeviceActionStatus.Completed ||
          s.status === DeviceActionStatus.Error,
      ),
    ),
  );

  // Auto-press: EIP-1559 on Nano S+ = 5 right + 1 both (fixed sequence, deterministic)
  // Screens: Review → From → Amount → To → Max fees → Sign transaction
  const buttonLoop = (async () => {
    // Wait for APDU to land and Speculos to render first screen
    await new Promise((r) => setTimeout(r, 3500));

    const NAV_RIGHTS = 5; // number of right presses to reach "Sign transaction"
    for (let i = 0; i < NAV_RIGHTS; i++) {
      await speculosButtonPress("right");
      await new Promise((r) => setTimeout(r, 500));
      const { events } = await speculosGetEventsSince(0);
      screens.push(events.slice(-3).map((e) => e.text).join("|"));
    }

    // Now on "Sign transaction" — press both to confirm
    await speculosButtonPress("both");
    screens.push("→ pressed BOTH (confirm)");
  })();

  const [finalState] = await Promise.all([signPromise, buttonLoop]);

  if (finalState.status === DeviceActionStatus.Error) {
    const rawErr = (finalState as { error?: unknown }).error;
    const errMsg = rawErr == null
      ? "unknown error"
      : typeof rawErr === "object"
        ? JSON.stringify(rawErr)
        : String(rawErr);
    addAuditLog({ eventType: "DMK_SIGN_FAILED", status: "failed", source: "ledger-cli", verdict: verdict ?? null });
    throw new Error(`DMK signTransaction failed: ${errMsg}`);
  }

  const sig = (finalState as unknown as { output: { v: number; r: string; s: string } }).output;

  addAuditLog({ eventType: "DMK_SIGN_COMPLETED", status: "completed", source: "ledger-cli", verdict: verdict ?? null });

  return { v: sig.v.toString(16), r: sig.r, s: sig.s, screens };
}

// ---------------------------------------------------------------------------
// Disconnect
// ---------------------------------------------------------------------------

export async function dmkDisconnect(sessionId: DeviceSessionId): Promise<void> {
  await dmk.disconnect({ sessionId });
  addAuditLog({
    eventType: "DMK_SPECULOS_DISCONNECTED",
    status: "completed",
    source: "ledger-cli",
  });
}
