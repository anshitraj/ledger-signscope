# Demo Guide

This guide is written for a reviewer watching or running the app for the first time.

## Story

The user wants to pay Alice. A malicious invoice secretly tells the AI agent to ignore the user and send more ETH to an attacker address. SignScope catches the difference between the user's original request and the AI-generated transaction.

## Main Demo

1. Start the app with `pnpm dev`.
2. Open the frontend URL printed by Vite.
3. Go to `Request Check`.
4. Choose a safe invoice such as `INV-102`.
5. Run the pipeline and observe a safe verdict.
6. Choose attack invoice `INV-301`.
7. Run the pipeline again.
8. Observe the scanner finding injection risk, Gemini proposing a changed transaction, and SignScope returning `blocked`.
9. Open `Audit Logs` to show the trace.

## What to Point Out

- The LLM is allowed to be wrong.
- The deterministic diff is the final decision-maker.
- The dangerous transaction is blocked before Ledger signing.
- The audit log makes the decision explainable.

## Ledger Demo

If Speculos is running:

1. Open `Speculos DMK`.
2. Check DMK status.
3. Connect to Speculos.
4. Run a safe signing scenario and show the returned signature fields.
5. Run a blocked scenario and show that signing is rejected.

## Demo Presets

| Preset | Expected Result | Why |
| --- | --- | --- |
| `INV-102` | Safe | Normal invoice for Alice |
| `INV-205` | Safe | Normal invoice for Bob |
| `INV-301` | Blocked | Hidden instruction redirects funds |
| `INV-404` | Blocked | Hidden instruction attempts to drain funds |
| `INV-501` | Warning | Large unusual amount |
