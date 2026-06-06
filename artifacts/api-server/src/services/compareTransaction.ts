export interface ParsedIntentForCompare {
  recipientName: string | null;
  asset: string | null;
  amount: number | null;
  invoiceId: string | null;
  chain: string;
  confidence: number;
  raw: string;
}

export interface GeneratedTransaction {
  recipientName: string | null;
  recipientAddress: string;
  asset: string;
  amount: number;
  chain: string;
  invoiceId: string | null;
  calldata: string | null;
}

export interface DiffCheck {
  field: string;
  intentValue: string | null;
  txValue: string | null;
  status: "pass" | "warning" | "fail";
  explanation: string;
}

export interface CompareResult {
  verdict: "safe" | "warning" | "blocked";
  checks: DiffCheck[];
  summary: string;
}

const ALLOWLISTED_ADDRESSES: Record<string, string> = {
  alice: "0xa11ce00000000000000000000000000000000000",
  bob: "0xb0b000000000000000000000000000000000000",
};

function isAllowlisted(address: string): boolean {
  const lower = address.toLowerCase();
  return Object.values(ALLOWLISTED_ADDRESSES).some(
    (a) => a.toLowerCase() === lower,
  );
}

export function compareTransaction(
  intent: ParsedIntentForCompare,
  tx: GeneratedTransaction,
): CompareResult {
  const checks: DiffCheck[] = [];
  let hasFailure = false;
  let hasWarning = false;

  // Check recipient name
  if (intent.recipientName) {
    const nameMatch =
      tx.recipientName &&
      intent.recipientName.toLowerCase() === tx.recipientName.toLowerCase();
    checks.push({
      field: "Recipient Name",
      intentValue: intent.recipientName,
      txValue: tx.recipientName,
      status: nameMatch ? "pass" : tx.recipientName ? "fail" : "warning",
      explanation: nameMatch
        ? "Recipient names match"
        : tx.recipientName
          ? `Intent says "${intent.recipientName}" but transaction targets "${tx.recipientName}"`
          : "Transaction recipient name is missing",
    });
    if (!nameMatch) {
      if (tx.recipientName) hasFailure = true;
      else hasWarning = true;
    }
  }

  // Check address allowlist
  const addressAllowlisted = isAllowlisted(tx.recipientAddress);
  checks.push({
    field: "Recipient Address",
    intentValue: intent.recipientName
      ? ALLOWLISTED_ADDRESSES[intent.recipientName.toLowerCase()] ||
        "not in allowlist"
      : null,
    txValue: tx.recipientAddress,
    status: addressAllowlisted ? "pass" : "fail",
    explanation: addressAllowlisted
      ? "Address is on the allowlist"
      : `Address ${tx.recipientAddress} is NOT on the allowlist — this is a risk signal`,
  });
  if (!addressAllowlisted) hasFailure = true;

  // Check asset
  if (intent.asset) {
    const assetMatch =
      intent.asset.toUpperCase() === tx.asset.toUpperCase();
    checks.push({
      field: "Asset",
      intentValue: intent.asset,
      txValue: tx.asset,
      status: assetMatch ? "pass" : "fail",
      explanation: assetMatch
        ? "Asset types match"
        : `Intent requests ${intent.asset} but transaction uses ${tx.asset}`,
    });
    if (!assetMatch) hasFailure = true;
  }

  // Check amount
  if (intent.amount !== null) {
    const amountMatch = Math.abs(intent.amount - tx.amount) < 0.001;
    checks.push({
      field: "Amount",
      intentValue: String(intent.amount),
      txValue: String(tx.amount),
      status: amountMatch ? "pass" : "fail",
      explanation: amountMatch
        ? "Amounts match"
        : `Intent specifies ${intent.amount} but transaction sends ${tx.amount}`,
    });
    if (!amountMatch) hasFailure = true;
  }

  // Check invoice ID
  const invoiceMatch =
    intent.invoiceId &&
    tx.invoiceId &&
    intent.invoiceId.toUpperCase() === tx.invoiceId.toUpperCase();
  checks.push({
    field: "Invoice ID",
    intentValue: intent.invoiceId,
    txValue: tx.invoiceId,
    status: invoiceMatch
      ? "pass"
      : tx.invoiceId && intent.invoiceId
        ? "fail"
        : "warning",
    explanation: invoiceMatch
      ? "Invoice IDs match"
      : tx.invoiceId && intent.invoiceId
        ? `Invoice mismatch: intent references ${intent.invoiceId}, transaction has ${tx.invoiceId}`
        : "Invoice ID not present in transaction",
  });
  if (!invoiceMatch) {
    if (tx.invoiceId && intent.invoiceId) hasFailure = true;
    else hasWarning = true;
  }

  const verdict: "safe" | "warning" | "blocked" = hasFailure
    ? "blocked"
    : hasWarning
      ? "warning"
      : "safe";

  const summary =
    verdict === "safe"
      ? "All checks passed. Transaction matches user intent and is ready for Ledger review."
      : verdict === "blocked"
        ? "Transaction BLOCKED. Critical mismatches detected between user intent and generated transaction. Ledger signing will not be triggered."
        : "Transaction has warnings. Manual review recommended before proceeding to Ledger gate.";

  return { verdict, checks, summary };
}
