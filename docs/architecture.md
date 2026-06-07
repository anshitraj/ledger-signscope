# Architecture Guide

SignScope is organized as a pnpm workspace. The frontend, backend, and shared API packages are separated so the demo can stay readable while still using typed contracts.

## Runtime Flow

```mermaid
flowchart LR
  Request["User request"] --> Parse["parseIntent"]
  Invoice["Invoice text"] --> Scan["scanDocument"]
  Parse --> Gemini["geminiGenerateTransaction"]
  Scan --> Gemini
  Gemini --> Compare["compareTransaction"]
  Parse --> Compare
  Scan --> Compare
  Compare --> Verdict{"verdict"}
  Verdict -->|safe| Ledger["Ledger gate available"]
  Verdict -->|warning| Review["Human review before signing"]
  Verdict -->|blocked| Audit["Audit log only"]
```

## Frontend

`artifacts/signscope` contains the React/Vite app. It uses route-based pages under `src/pages`, shared UI components under `src/components`, and client helpers under `src/lib`.

Key pages:

- `IntentLab.tsx` - full Request Check pipeline demo.
- `LedgerGate.tsx` - signing gate and verdict review.
- `SpeculosDmk.tsx` - DMK plus Speculos proof flow.
- `AuditLogs.tsx` - full event trail.
- `Settings.tsx` - feature flags and runtime controls.

## Backend

`artifacts/api-server` contains the Express API and services.

Key files:

- `src/routes/requestCheck.ts` - the single end-to-end pipeline endpoint.
- `src/routes/signscope.ts` - individual parse, scan, compare, audit, settings, and wallet-cli endpoints.
- `src/routes/dmk.ts` - Ledger DMK and Speculos endpoints.
- `src/services/gemini.ts` - Gemini transaction generation.
- `src/services/compareTransaction.ts` - deterministic final safety diff.
- `src/services/auditLog.ts` - local audit trail.

## Shared Packages

| Package | Purpose |
| --- | --- |
| `lib/api-spec` | OpenAPI source contract |
| `lib/api-zod` | Generated Zod/types package |
| `lib/api-client-react` | Generated React client package |
| `lib/db` | Shared database schema package |

## Ledger Path

```mermaid
sequenceDiagram
  participant UI as Frontend
  participant API as API Server
  participant DMK as Ledger DMK Service
  participant SP as Speculos

  UI->>API: POST /api/dmk/connect
  API->>DMK: discover and connect
  DMK->>SP: open Speculos transport
  SP-->>DMK: session ready
  DMK-->>API: session id
  API-->>UI: connected

  UI->>API: POST /api/dmk/sign-auto
  API->>API: reject if verdict is blocked
  API->>DMK: sign EIP-1559 transaction
  DMK->>SP: APDU review and sign
  SP-->>DMK: ECDSA signature
  DMK-->>API: v, r, s
  API-->>UI: signature result
```

The important security point is that blocked transactions stop in the API before any signing call is made.
