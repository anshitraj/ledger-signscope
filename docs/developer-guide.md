# Developer Guide

## Workspace Commands

```bash
pnpm install
pnpm dev
pnpm run typecheck
pnpm run build
pnpm test
```

## Package Layout

| Path | Description |
| --- | --- |
| `artifacts/api-server` | Express API and backend services |
| `artifacts/signscope` | Main React/Vite app |
| `artifacts/mockup-sandbox` | UI sandbox |
| `lib/api-spec` | OpenAPI contract |
| `lib/api-zod` | Generated Zod/types package |
| `lib/api-client-react` | Generated API client package |
| `lib/db` | Shared database package |
| `scripts` | Workspace utility scripts |

## Development Notes

- Keep security decisions in deterministic backend code.
- Treat LLM output, invoice text, and user prompt text as untrusted.
- Keep generated clients in sync with OpenAPI changes.
- Do not commit `.env`, logs, runtime audit data, or `node_modules`.
- Prefer adding focused tests when changing parser, scanner, diff, signing, or audit behavior.

## Frontend Notes

- Page-level experiences live in `artifacts/signscope/src/pages`.
- Shared UI lives in `artifacts/signscope/src/components`.
- API helpers live in `artifacts/signscope/src/lib`.
- Framer Motion is available for UI animation.
- Keep demo copy readable for both technical and non-technical users.

## Backend Notes

- `requestCheck.ts` is the best entry point for understanding the pipeline.
- `compareTransaction.ts` is the safety-critical diff layer.
- `dmk.ts` and `walletCli.ts` are the signing integrations.
- `auditLog.ts` stores the local trace used by the UI.

## Pull Request Checklist

- `pnpm run typecheck` passes.
- `pnpm run build` passes.
- `pnpm test` passes, or any unavailable external dependency is clearly noted.
- Security-sensitive behavior is tested.
- README/docs are updated when commands, routes, or architecture change.
