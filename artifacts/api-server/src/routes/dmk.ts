/**
 * DMK routes — Speculos emulator integration via Device Management Kit.
 *
 * GET  /api/dmk/status         Speculos health + DMK readiness
 * POST /api/dmk/connect        Discover Speculos device + open session
 * POST /api/dmk/get-address    Get Ethereum address from connected device
 * POST /api/dmk/sign           Sign a raw Ethereum tx (gated by SignScope verdict)
 * POST /api/dmk/disconnect     Close device session
 */

import { Router } from "express";
import {
  speculosHealth,
  connectSpeculos,
  dmkGetAddress,
  dmkSignTransaction,
  dmkSignWithAutoApprove,
  dmkDisconnect,
} from "../services/dmk.js";
import type { DeviceSessionId } from "@ledgerhq/device-management-kit";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/dmk/status
// ---------------------------------------------------------------------------

router.get("/status", async (_req, res) => {
  try {
    const health = await speculosHealth();
    res.json({
      dmk: "device-management-kit",
      transport: "speculos",
      speculosUrl: health.url,
      speculosReachable: health.reachable,
      speculosError: health.error ?? null,
      packages: {
        dmk: "@ledgerhq/device-management-kit@1.5.1",
        transport: "@ledgerhq/device-transport-kit-speculos@1.2.1",
        signer: "@ledgerhq/device-signer-kit-ethereum@1.16.0",
      },
      hint: health.reachable
        ? "Speculos is running. POST /api/dmk/connect to open a session."
        : "Start Speculos: docker run --rm -p 5000:5000 -p 9999:9999 -v <appsdir>:/apps ghcr.io/ledgerhq/speculos --model nanosp --display headless /apps/<app>.elf",
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/dmk/connect
// ---------------------------------------------------------------------------

router.post("/connect", async (_req, res) => {
  try {
    const { sessionId, deviceInfo } = await connectSpeculos();
    res.json({
      ok: true,
      sessionId,
      deviceInfo,
      message: "Speculos device connected via DMK. Use sessionId for signing.",
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: (err as Error).message,
      hint: "Make sure Speculos is running at http://localhost:5000 with an Ethereum app loaded.",
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/dmk/get-address
// { sessionId, derivationPath? }
// ---------------------------------------------------------------------------

router.post("/get-address", async (req, res) => {
  const { sessionId, derivationPath } = req.body as {
    sessionId?: DeviceSessionId;
    derivationPath?: string;
  };

  if (!sessionId) {
    res
      .status(400)
      .json({ error: "sessionId required. Call POST /api/dmk/connect first." });
    return;
  }

  try {
    const result = await dmkGetAddress(
      sessionId,
      derivationPath ?? "44'/60'/0'/0/0",
    );
    res.json({ ok: true, ...result, derivationPath: derivationPath ?? "44'/60'/0'/0/0" });
  } catch (err) {
    res.status(503).json({ ok: false, error: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/dmk/sign
// { sessionId, derivationPath?, rawTxHex, verdict }
// ---------------------------------------------------------------------------

router.post("/sign", async (req, res) => {
  const { sessionId, derivationPath, rawTxHex, verdict } = req.body as {
    sessionId?: DeviceSessionId;
    derivationPath?: string;
    rawTxHex?: string;
    verdict?: "safe" | "warning" | "blocked";
  };

  if (!sessionId) {
    res.status(400).json({ error: "sessionId required." });
    return;
  }

  if (!rawTxHex) {
    res.status(400).json({
      error: "rawTxHex required. Provide RLP-encoded unsigned transaction as hex string.",
    });
    return;
  }

  try {
    const signature = await dmkSignTransaction(
      sessionId,
      derivationPath ?? "44'/60'/0'/0/0",
      rawTxHex,
      verdict,
    );
    res.json({ ok: true, ...signature, verdict: verdict ?? null });
  } catch (err) {
    const msg = (err as Error).message;
    const isBlocked = msg.includes("Blocked by SignScope");
    res.status(isBlocked ? 403 : 503).json({
      ok: false,
      error: msg,
      blocked: isBlocked,
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/dmk/sign-auto
// { sessionId, derivationPath?, verdict }
// Connects, auto-presses Speculos buttons, returns real signature
// ---------------------------------------------------------------------------

router.post("/sign-auto", async (req, res) => {
  const { sessionId, derivationPath, verdict } = req.body as {
    sessionId?: DeviceSessionId;
    derivationPath?: string;
    verdict?: "safe" | "warning" | "blocked";
  };

  if (!sessionId) {
    res.status(400).json({ error: "sessionId required." });
    return;
  }

  // Pre-built EIP-1559 tx: 0.001 ETH → Alice (0xA11CE...)
  const RAW_TX =
    "02ee0180843b9aca00843b9aca0082520894a11ce0000000000000000000000000000000000087038d7ea4c6800080c0";

  // Give DMK time to fully settle after any prior action (e.g. get-address)
  // before sending the sign APDU to Speculos.
  await new Promise((r) => setTimeout(r, 800));

  try {
    const result = await dmkSignWithAutoApprove(
      sessionId,
      derivationPath ?? "44'/60'/0'/0/0",
      RAW_TX,
      verdict,
    );
    res.json({
      ok: true,
      ...result,
      verdict: verdict ?? null,
      transaction: {
        to: "0xA11CE00000000000000000000000000000000000",
        amount: "0.001",
        asset: "ETH",
        chain: "ethereum",
        rawTxHex: RAW_TX,
      },
    });
  } catch (err) {
    const msg = (err as Error).message;
    const isBlocked = msg.includes("Blocked by SignScope");
    res.status(isBlocked ? 403 : 503).json({ ok: false, error: msg, blocked: isBlocked });
  }
});

// ---------------------------------------------------------------------------
// POST /api/dmk/disconnect
// { sessionId }
// ---------------------------------------------------------------------------

router.post("/disconnect", async (req, res) => {
  const { sessionId } = req.body as { sessionId?: DeviceSessionId };

  if (!sessionId) {
    res.status(400).json({ error: "sessionId required." });
    return;
  }

  try {
    await dmkDisconnect(sessionId);
    res.json({ ok: true, message: "DMK session closed." });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
