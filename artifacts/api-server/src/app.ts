import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ---------------------------------------------------------------------------
// Human-readable request logger — visible in terminal for demos/video
// ---------------------------------------------------------------------------
const ROUTE_LABELS: Record<string, string> = {
  "/api/health":                    "🏥  Health check",
  "/api/ai-status":                 "🤖  Gemini AI status",
  "/api/parse-intent":              "📝  Parse Intent        [step 1]",
  "/api/scan-document":             "🔍  Scan Invoice        [step 2]",
  "/api/agent/generate-transaction":"✨  Gemini Agent Tx     [step 3]",
  "/api/compare-transaction":       "⚖️   SignScope Diff      [step 4]",
  "/api/request-check":             "🚀  Full Pipeline       [all steps]",
  "/api/ledger/dry-run":            "💧  Wallet-CLI dry-run",
  "/api/ledger/sign":               "🔐  Wallet-CLI SIGN",
  "/api/dmk/status":                "📡  DMK — Speculos health",
  "/api/dmk/connect":               "🔌  DMK — Connect Speculos",
  "/api/dmk/get-address":           "🗝️   DMK — Get ETH address",
  "/api/dmk/sign-auto":             "✍️   DMK — Sign tx (auto-approve)",
  "/api/dmk/disconnect":            "🔌  DMK — Disconnect",
  "/api/audit-logs":                "📋  Audit logs",
  "/api/settings":                  "⚙️   Settings",
};

function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const route = req.path;
  const label = ROUTE_LABELS[route] ?? `📨  ${route}`;

  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const statusIcon = status < 300 ? "✅" : status < 400 ? "↩️" : status === 403 ? "🚫" : "❌";
    const sep = "─".repeat(60);
    console.log(`\n${sep}`);
    console.log(`  ${statusIcon}  ${label}`);
    console.log(`     ${req.method} ${route}  →  ${status}  (${ms}ms)`);
    if (status === 403) console.log(`     🛡️  BLOCKED by SignScope firewall`);
    console.log(sep);
  });

  next();
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res)  { return { statusCode: res.statusCode }; },
    },
  }),
);
app.use(requestLogger);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
