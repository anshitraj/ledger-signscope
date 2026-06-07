import { useState } from "react";
import { Cpu, Wifi, WifiOff, Key, PenLine, ShieldX, CheckCircle2, Loader2, ChevronRight, Lock } from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data as T;
}

type Step = "idle" | "checking" | "connecting" | "address" | "signing" | "done" | "blocked" | "error";

interface DmkState {
  step: Step;
  speculosReachable: boolean | null;
  sessionId: string | null;
  address: string | null;
  publicKey: string | null;
  signature: { v: string; r: string; s: string } | null;
  screens: string[];
  error: string | null;
  verdict: "safe" | "blocked";
}

const INIT: DmkState = {
  step: "idle",
  speculosReachable: null,
  sessionId: null,
  address: null,
  publicKey: null,
  signature: null,
  screens: [],
  error: null,
  verdict: "safe",
};

const RAW_TX = "02ee0180843b9aca00843b9aca0082520894a11ce0000000000000000000000000000000000087038d7ea4c6800080c0";

export default function SpeculosDmk() {
  const [state, setState] = useState<DmkState>(INIT);

  function set(patch: Partial<DmkState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  async function runFullFlow() {
    setState({ ...INIT, step: "checking", verdict: state.verdict });

    // Step 1 — Speculos health
    try {
      const status = await apiFetch<{ speculosReachable: boolean }>("/dmk/status");
      set({ speculosReachable: status.speculosReachable });
      if (!status.speculosReachable) {
        set({ step: "error", error: "Speculos not reachable at localhost:5000. Start it with Docker." });
        return;
      }
    } catch (e) {
      set({ step: "error", error: String(e) });
      return;
    }

    // Step 2 — Connect
    set({ step: "connecting" });
    let sessionId: string;
    try {
      const conn = await apiFetch<{ ok: boolean; sessionId: string; deviceInfo: string }>("/dmk/connect", { method: "POST" });
      sessionId = conn.sessionId;
      set({ sessionId });
    } catch (e) {
      set({ step: "error", error: String(e) });
      return;
    }

    // Step 3 — Get address
    set({ step: "address" });
    try {
      const addr = await apiFetch<{ ok: boolean; address: string; publicKey: string }>("/dmk/get-address", {
        method: "POST",
        body: JSON.stringify({ sessionId, derivationPath: "44'/60'/0'/0/0" }),
      });
      set({ address: addr.address, publicKey: addr.publicKey });
    } catch (e) {
      set({ step: "error", error: String(e) });
      return;
    }

    // Step 4 — Sign (or block)
    set({ step: "signing" });

    if (state.verdict === "blocked") {
      try {
        await apiFetch("/dmk/sign-auto", {
          method: "POST",
          body: JSON.stringify({ sessionId, verdict: "blocked" }),
        });
        set({ step: "error", error: "Should have been blocked!" });
      } catch (e) {
        const msg = String(e);
        if (msg.includes("Blocked by SignScope")) {
          set({ step: "blocked", error: msg });
        } else {
          set({ step: "error", error: msg });
        }
      }
      return;
    }

    // Safe — sign with auto Speculos button press
    try {
      const sig = await apiFetch<{
        ok: boolean;
        v: string;
        r: string;
        s: string;
        screens: string[];
      }>("/dmk/sign-auto", {
        method: "POST",
        body: JSON.stringify({ sessionId, verdict: "safe" }),
      });
      set({ step: "done", signature: { v: sig.v, r: sig.r, s: sig.s }, screens: sig.screens ?? [] });
    } catch (e) {
      set({ step: "error", error: String(e) });
    }
  }

  const stepIdx = ["idle", "checking", "connecting", "address", "signing", "done", "blocked", "error"].indexOf(state.step);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <Cpu className="w-6 h-6 text-emerald-700" />
          DMK + Speculos Signing
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Device Management Kit connects to Speculos emulator via{" "}
          <code className="bg-stone-100 px-1 rounded text-xs">speculosTransportFactory</code>.
          Real ECDSA signature produced — same cryptography as mainnet. Not broadcast.
        </p>
      </div>

      {/* Verdict selector */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-stone-700">Select scenario:</p>
        <div className="flex gap-3">
          <button
            onClick={() => set({ verdict: "safe" })}
            className={`flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
              state.verdict === "safe"
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-stone-200 text-stone-500 hover:border-stone-300"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
            Safe — Sign Transaction
            <div className="text-xs font-normal mt-0.5 opacity-70">0.001 ETH → Alice</div>
            <div className="text-xs font-normal opacity-70">Verdict: safe → Speculos signs</div>
          </button>
          <button
            onClick={() => set({ verdict: "blocked" })}
            className={`flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
              state.verdict === "blocked"
                ? "border-red-500 bg-red-50 text-red-800"
                : "border-stone-200 text-stone-500 hover:border-stone-300"
            }`}
          >
            <ShieldX className="w-4 h-4 mx-auto mb-1" />
            Attack — Firewall Blocks
            <div className="text-xs font-normal mt-0.5 opacity-70">Verdict: blocked</div>
            <div className="text-xs font-normal opacity-70">SignScope stops before DMK</div>
          </button>
        </div>
      </div>

      {/* Transaction details */}
      <div className="rounded-xl border bg-white p-4 space-y-2">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Transaction</p>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-stone-400 text-xs">To</div>
            <div className="font-mono font-medium text-stone-800 text-xs break-all">0xA11CE000...0000</div>
            <div className="text-stone-500 text-xs">Alice (allowlisted)</div>
          </div>
          <div>
            <div className="text-stone-400 text-xs">Amount</div>
            <div className="font-bold text-stone-800">0.001 ETH</div>
          </div>
          <div>
            <div className="text-stone-400 text-xs">Chain</div>
            <div className="font-medium text-stone-800">Ethereum</div>
            <div className="text-stone-500 text-xs">EIP-1559 type 2</div>
          </div>
        </div>
        <div className="text-xs text-stone-400 mt-1 font-mono break-all bg-stone-50 p-2 rounded">
          {RAW_TX}
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={runFullFlow}
        disabled={["checking", "connecting", "address", "signing"].includes(state.step)}
        className="w-full rounded-xl bg-emerald-700 text-white font-semibold py-3 px-6 flex items-center justify-center gap-2 hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {["checking", "connecting", "address", "signing"].includes(state.step) ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Running DMK flow...</>
        ) : (
          <><Cpu className="w-4 h-4" /> Run DMK + Speculos Flow</>
        )}
      </button>

      {/* Steps */}
      {state.step !== "idle" && (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="p-4 border-b bg-stone-50">
            <p className="text-sm font-semibold text-stone-700">Execution Steps</p>
          </div>
          <div className="divide-y">

            {/* Step 1: Speculos health */}
            <StepRow
              label="Speculos Health Check"
              sub="GET /api/dmk/status"
              status={
                state.step === "checking" ? "loading" :
                state.speculosReachable === null ? "pending" :
                state.speculosReachable ? "done" : "error"
              }
              detail={
                state.speculosReachable !== null
                  ? state.speculosReachable
                    ? "Speculos reachable at localhost:5000"
                    : "Not reachable — start Speculos with Docker"
                  : undefined
              }
            />

            {/* Step 2: Connect */}
            <StepRow
              label="DMK Connect (speculosTransportFactory)"
              sub="POST /api/dmk/connect"
              status={
                state.step === "connecting" ? "loading" :
                stepIdx < 2 ? "pending" :
                state.sessionId ? "done" : "error"
              }
              detail={state.sessionId ? `sessionId: ${state.sessionId.slice(0, 18)}…` : undefined}
            />

            {/* Step 3: Get address */}
            <StepRow
              label="Get Ethereum Address (derivation 44'/60'/0'/0/0)"
              sub="POST /api/dmk/get-address"
              status={
                state.step === "address" ? "loading" :
                stepIdx < 3 ? "pending" :
                state.address ? "done" : "error"
              }
              detail={state.address ?? undefined}
            />

            {/* Step 4: Sign */}
            <StepRow
              label={
                state.verdict === "blocked"
                  ? "SignScope Firewall Gate (verdict=blocked)"
                  : "Sign Transaction via Speculos (auto-approve)"
              }
              sub={state.verdict === "blocked" ? "POST /api/dmk/sign-auto → 403 blocked" : "POST /api/dmk/sign-auto + Speculos button press"}
              status={
                state.step === "signing" ? "loading" :
                stepIdx < 4 ? "pending" :
                state.step === "done" ? "done" :
                state.step === "blocked" ? "blocked" :
                state.step === "error" ? "error" : "pending"
              }
              detail={
                state.step === "blocked"
                  ? "Blocked by SignScope firewall. Ledger signing not triggered."
                  : state.signature
                    ? `v: ${state.signature.v}  r: ${state.signature.r.slice(0, 18)}…`
                    : undefined
              }
            />
          </div>
        </div>
      )}

      {/* Result: blocked */}
      {state.step === "blocked" && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5 space-y-2">
          <div className="flex items-center gap-2 text-red-800 font-bold">
            <ShieldX className="w-5 h-5" />
            SignScope Blocked — Ledger Never Reached
          </div>
          <p className="text-red-700 text-sm">
            Verdict was <strong>blocked</strong>. The DMK signing function threw before sending any APDU to Speculos.
            The Ledger device cryptographic key was never accessed.
          </p>
          <div className="bg-red-100 rounded-lg p-3 font-mono text-xs text-red-900">
            HTTP 403 — {state.error}
          </div>
        </div>
      )}

      {/* Result: real signature */}
      {state.step === "done" && state.signature && (
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <CheckCircle2 className="w-5 h-5" />
            Real ECDSA Signature — Produced by Speculos
          </div>
          <p className="text-emerald-700 text-sm">
            Speculos signed the raw EIP-1559 transaction with its private key (secp256k1 ECDSA).
            This is the same cryptography used on Ethereum mainnet.
            The transaction is valid and could be broadcast to mainnet/testnet with a funded account.
          </p>

          {/* Signer address */}
          {state.address && (
            <div className="bg-white rounded-lg p-3 space-y-1">
              <div className="text-xs text-stone-500 font-semibold flex items-center gap-1">
                <Key className="w-3 h-3" /> Signer Address (from Speculos device key)
              </div>
              <div className="font-mono text-sm text-stone-800 break-all">{state.address}</div>
            </div>
          )}

          {/* Signature */}
          <div className="bg-white rounded-lg p-3 space-y-2">
            <div className="text-xs text-stone-500 font-semibold flex items-center gap-1">
              <PenLine className="w-3 h-3" /> ECDSA Signature Components
            </div>
            <div className="space-y-1 font-mono text-xs break-all">
              <div><span className="text-stone-400">v: </span><span className="text-stone-800">{state.signature.v}</span></div>
              <div><span className="text-stone-400">r: </span><span className="text-stone-800">{state.signature.r}</span></div>
              <div><span className="text-stone-400">s: </span><span className="text-stone-800">{state.signature.s}</span></div>
            </div>
          </div>

          {/* Speculos screens navigated */}
          {state.screens.length > 0 && (
            <div className="bg-white rounded-lg p-3 space-y-1">
              <div className="text-xs text-stone-500 font-semibold">Speculos Screens Navigated</div>
              <div className="space-y-1">
                {state.screens.map((s, i) => (
                  <div key={i} className="text-xs text-stone-600 flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 text-stone-300 shrink-0" />
                    <span className="font-mono">{s.split("|").slice(-2).join(" › ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-100 rounded-lg px-3 py-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            Transaction passed SignScope firewall (verdict: safe) before Speculos was called.
            Blocked transactions never reach this point.
          </div>
        </div>
      )}

      {/* Error */}
      {state.step === "error" && state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
          <strong>Error:</strong> {state.error}
        </div>
      )}

      {/* DMK info box */}
      <div className="rounded-xl border bg-stone-50 p-4 text-xs text-stone-500 space-y-1">
        <p className="font-semibold text-stone-600">Packages used</p>
        <p>@ledgerhq/device-management-kit@1.5.1</p>
        <p>@ledgerhq/device-transport-kit-speculos@1.2.1</p>
        <p>@ledgerhq/device-signer-kit-ethereum@1.16.0</p>
      </div>
    </div>
  );
}

// ── Helper component ──────────────────────────────────────────────────────────

type RowStatus = "pending" | "loading" | "done" | "error" | "blocked";

function StepRow({ label, sub, status, detail }: {
  label: string;
  sub: string;
  status: RowStatus;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="mt-0.5 shrink-0">
        {status === "loading" && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
        {status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        {status === "error" && <ShieldX className="w-4 h-4 text-red-500" />}
        {status === "blocked" && <ShieldX className="w-4 h-4 text-red-500" />}
        {status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-stone-200" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-stone-800">{label}</div>
        <div className="text-xs text-stone-400 font-mono">{sub}</div>
        {detail && (
          <div className={`text-xs mt-1 font-mono break-all ${
            status === "error" || status === "blocked" ? "text-red-600" : "text-emerald-700"
          }`}>
            {detail}
          </div>
        )}
      </div>
      <div className="shrink-0 text-xs font-semibold">
        {status === "done" && <span className="text-emerald-600">✓</span>}
        {status === "blocked" && <span className="text-red-600">BLOCKED</span>}
        {status === "error" && <span className="text-red-600">ERROR</span>}
      </div>
    </div>
  );
}
