# Setup Guide

## Requirements

- Node.js 20 or newer
- pnpm 9 or newer
- Docker Desktop for Speculos Ledger emulator flows
- Google Gemini API key from Google AI Studio

## Install Dependencies

```bash
pnpm install
```

## Environment

Copy the example file:

```bash
cp .env.example .env
```

Set the required key:

```env
GEMINI_API_KEY=your_key_here
```

Useful defaults:

```env
PORT=3001
VITE_API_BASE_URL=http://localhost:3001/api
ENABLE_REAL_LEDGER_CLI=false
ENABLE_REAL_SIGNING=false
SPECULOS_URL=http://127.0.0.1:5000
```

## Start the App

```bash
pnpm dev
```

If you prefer separate processes:

```bash
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
pnpm --filter @workspace/signscope run dev
```

## Optional Speculos Setup

Speculos lets the project prove Ledger signing behavior without a physical device.

1. Download the Ledger Ethereum app ELF from Ledger releases.
2. Place it in a local folder such as `C:/speculos-apps`.
3. Start Speculos:

```bash
docker run --rm -d \
  -p 5000:5000 -p 9999:9999 \
  -v /path/to/speculos-apps:/apps \
  ghcr.io/ledgerhq/speculos \
  --model nanosp --display headless --apdu-port 9999 \
  /apps/ethereum_nanos2.elf
```

Then open the SignScope DMK page and check `/api/dmk/status`.

## Verification

```bash
pnpm run typecheck
pnpm run build
pnpm test
```

If tests depend on Speculos and it is not running, DMK-specific checks may fail while normal API checks still explain the missing dependency.
