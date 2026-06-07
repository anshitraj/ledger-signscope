import { getSettings } from "./settingsStore.js";
import type { ComparisonResult, DiffCheck, DocumentScanResult, GeneratedTransaction, ParsedIntent, Verdict } from "./types.js";

function chk(
  checks: DiffCheck[],
  key: string,
  label: string,
  expected: string | null,
  actual: string | null,
  status: DiffCheck["status"],
  explanation?: string,
): DiffCheck["status"] {
  checks.push({ key, label, expected, actual, status, explanation });
  return status;
}

function norm(v: string | null | undefined): string | null {
  return v == null ? null : String(v);
}

export function compareTransaction(
  intent: ParsedIntent,
  documentScan: DocumentScanResult | null,
  generatedTransaction: GeneratedTransaction,
): ComparisonResult {
  const settings = getSettings();
  const policies = settings.policies;
  const checks: DiffCheck[] = [];
  let hasFail = false;
  let hasWarning = false;
  let riskScore = 0;

  // 1. Recipient name match
  const recipientMatches =
    intent.recipientName != null &&
    generatedTransaction.recipientName != null &&
    intent.recipientName.toLowerCase() === generatedTransaction.recipientName.toLowerCase();

  if (
    chk(
      checks,
      "recipient",
      "Recipient Match",
      norm(intent.recipientName),
      norm(generatedTransaction.recipientName),
      recipientMatches ? "pass" : "fail",
      recipientMatches ? "Recipient name matches intent." : "Recipient name differs from the user intent.",
    ) === "fail"
  ) {
    hasFail = true;
    riskScore += 30;
  }

  // 2. Address allowlisted
  const allowlisted = settings.allowlistedRecipients.some(
    (r) => r.address.toLowerCase() === generatedTransaction.to.toLowerCase(),
  );
  const expectedAddress =
    settings.allowlistedRecipients.find(
      (r) => r.name.toLowerCase() === (intent.recipientName ?? "").toLowerCase(),
    )?.address ?? null;

  if (
    chk(
      checks,
      "address",
      "Address Allowlisted",
      expectedAddress,
      generatedTransaction.to,
      allowlisted ? "pass" : "fail",
      allowlisted ? "Address is in the allowlist." : "Address is NOT allowlisted. This is a red flag.",
    ) === "fail" &&
    policies.requireAllowlistedRecipient
  ) {
    hasFail = true;
    riskScore += 35;
  }

  // 3. Asset match
  const assetMatches =
    (intent.asset ?? "").toUpperCase() === generatedTransaction.asset.toUpperCase();

  if (
    chk(
      checks,
      "asset",
      "Asset Match",
      norm(intent.asset),
      generatedTransaction.asset,
      assetMatches ? "pass" : "fail",
      assetMatches ? "Asset matches intent." : "Agent changed the asset type.",
    ) === "fail" &&
    policies.blockAssetMismatch
  ) {
    hasFail = true;
    riskScore += 20;
  }

  // 4. Amount match
  const amountMatches = Number(intent.amount) === Number(generatedTransaction.amount);

  if (
    chk(
      checks,
      "amount",
      "Amount Match",
      norm(intent.amount),
      generatedTransaction.amount,
      amountMatches ? "pass" : "fail",
      amountMatches ? "Amount matches intent." : "Agent changed the amount.",
    ) === "fail" &&
    policies.blockAmountMismatch
  ) {
    hasFail = true;
    riskScore += 20;
  }

  // 5. Amount policy ceiling
  if (intent.asset?.toUpperCase() === "ETH" || generatedTransaction.asset.toUpperCase() === "ETH") {
    const max = Number(policies.maxNativeEthAmount);
    const actual = Number(generatedTransaction.amount);
    if (!Number.isNaN(actual) && !Number.isNaN(max) && actual > max) {
      chk(
        checks,
        "amountPolicy",
        "Amount Policy",
        `≤ ${policies.maxNativeEthAmount} ETH`,
        `${generatedTransaction.amount} ETH`,
        "fail",
        `Amount ${generatedTransaction.amount} ETH exceeds policy ceiling of ${policies.maxNativeEthAmount} ETH.`,
      );
      hasFail = true;
      riskScore += 15;
    }
  }

  // 6. Invoice ID match
  const invoiceMatches =
    intent.invoiceId != null &&
    generatedTransaction.invoiceId != null &&
    intent.invoiceId.toUpperCase() === generatedTransaction.invoiceId.toUpperCase();
  const invoiceMissing = !generatedTransaction.invoiceId;
  const invoiceStatus = invoiceMatches ? "pass" : invoiceMissing ? "warning" : "fail";

  const iCheck = chk(
    checks,
    "invoiceId",
    "Invoice ID Match",
    norm(intent.invoiceId),
    norm(generatedTransaction.invoiceId),
    invoiceStatus,
    invoiceMatches
      ? "Invoice ID matches."
      : invoiceMissing
        ? "Invoice ID missing from generated transaction."
        : "Invoice ID mismatch.",
  );
  if (iCheck === "fail") { hasFail = true; riskScore += 10; }
  if (iCheck === "warning") hasWarning = true;

  // 7. Chain match
  const chainMatches = intent.chain === generatedTransaction.chain;
  const chainCheck = chk(
    checks,
    "chain",
    "Chain Match",
    intent.chain,
    generatedTransaction.chain,
    chainMatches ? "pass" : "warning",
    chainMatches ? "Chain matches." : "Chain mismatch — manual review required.",
  );
  if (chainCheck === "warning") hasWarning = true;

  // 8. Prompt injection risk
  const promptRisk = documentScan?.verdict ?? "clean";
  const promptCheck = chk(
    checks,
    "promptInjection",
    "Prompt Injection Risk",
    "clean",
    promptRisk,
    promptRisk === "malicious" ? "fail" : promptRisk === "suspicious" ? "warning" : "pass",
    promptRisk === "clean"
      ? "Document scan is clean."
      : `Document scan found prompt-injection signals (verdict: ${promptRisk}).`,
  );
  if (promptCheck === "fail" && policies.blockPromptInjection) { hasFail = true; riskScore += 25; }
  if (promptCheck === "warning") hasWarning = true;

  const verdict: Verdict = hasFail ? "blocked" : hasWarning ? "warning" : "safe";

  return {
    verdict,
    riskScore: Math.min(riskScore, 100),
    checks,
    summary:
      verdict === "safe"
        ? "All checks passed. Transaction matches user intent."
        : verdict === "warning"
          ? "Some checks raised warnings. Manual review recommended."
          : "Transaction blocked. One or more critical checks failed.",
  };
}
