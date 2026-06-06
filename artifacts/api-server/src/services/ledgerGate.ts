export interface GeneratedTransactionForLedger {
  recipientName: string | null;
  recipientAddress: string;
  asset: string;
  amount: number;
  chain: string;
  invoiceId: string | null;
  calldata: string | null;
}

export interface LedgerGateResult {
  gateStatus: "pending_review" | "approved" | "rejected" | "blocked";
  commandPreview: string;
  dryRunPreview: string;
  message: string;
  allowApproval: boolean;
}

export function simulateLedgerGate(
  verdict: "safe" | "warning" | "blocked",
  transaction: GeneratedTransactionForLedger,
  action?: "approve" | "reject" | null,
): LedgerGateResult {
  const commandPreview = `wallet-cli send ${transaction.chain}-1 --to ${transaction.recipientAddress} --amount "${transaction.amount} ${transaction.asset}" --dry-run --format json`;

  const dryRunPreview = JSON.stringify(
    {
      status: verdict === "blocked" ? "rejected_by_policy" : "dry_run_ok",
      simulation_mode: true,
      from: "0xAgentWallet0000000000000000000000000000",
      to: transaction.recipientAddress,
      asset: transaction.asset,
      amount: transaction.amount,
      chain: transaction.chain,
      invoice_ref: transaction.invoiceId,
      policy_checks: {
        recipient_allowlisted: verdict !== "blocked",
        asset_match: verdict !== "blocked",
        amount_match: verdict !== "blocked",
        intent_match: verdict !== "blocked",
      },
      ledger_signing: "required — hardware confirmation needed",
      note: "Actual signing must be performed through Ledger Wallet CLI with Ledger device or Speculos.",
    },
    null,
    2,
  );

  if (verdict === "blocked") {
    return {
      gateStatus: "blocked",
      commandPreview,
      dryRunPreview,
      message:
        "Blocked by SignScope policy. Ledger signing not triggered. Transaction mismatch was detected between user intent and generated transaction.",
      allowApproval: false,
    };
  }

  if (!action) {
    return {
      gateStatus: "pending_review",
      commandPreview,
      dryRunPreview,
      message:
        "Transaction ready for Ledger review. In a real deployment, this would display on the Ledger device screen for hardware confirmation. Simulation Mode — real signing requires Ledger Wallet CLI or Speculos integration.",
      allowApproval: true,
    };
  }

  if (action === "approve") {
    return {
      gateStatus: "approved",
      commandPreview,
      dryRunPreview,
      message:
        "Simulated approval recorded. Ready for real wallet-cli integration. In production: wallet-cli send would be executed after physical Ledger button press.",
      allowApproval: true,
    };
  }

  return {
    gateStatus: "rejected",
    commandPreview,
    dryRunPreview,
    message:
      "Transaction rejected at Ledger gate. No funds moved. The transaction has been logged for audit purposes.",
    allowApproval: true,
  };
}
