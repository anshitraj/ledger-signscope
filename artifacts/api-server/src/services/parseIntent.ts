export interface ParsedIntent {
  recipientName: string | null;
  asset: string | null;
  amount: number | null;
  invoiceId: string | null;
  chain: string;
  confidence: number;
  raw: string;
}

const ASSET_PATTERNS = [
  { pattern: /\b(USDC)\b/i, asset: "USDC" },
  { pattern: /\b(USDT)\b/i, asset: "USDT" },
  { pattern: /\b(ETH|ether(?:eum)?)\b/i, asset: "ETH" },
  { pattern: /\b(BTC|bitcoin)\b/i, asset: "BTC" },
  { pattern: /\b(DAI)\b/i, asset: "DAI" },
];

const AMOUNT_PATTERN = /\b(\d+(?:\.\d+)?)\b/;

const RECIPIENT_PATTERNS = [
  /\bto\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
  /\bpay\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
  /\bsend\s+(?:to\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
];

const INVOICE_PATTERN = /\b(INV[-\s]?\d+)\b/i;

export function parseIntent(text: string): ParsedIntent {
  let confidence = 0;
  let recipientName: string | null = null;
  let asset: string | null = null;
  let amount: number | null = null;
  let invoiceId: string | null = null;

  // Extract recipient
  for (const pattern of RECIPIENT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      recipientName = match[1].trim();
      confidence += 0.25;
      break;
    }
  }

  // Extract asset
  for (const { pattern, asset: assetName } of ASSET_PATTERNS) {
    if (pattern.test(text)) {
      asset = assetName;
      confidence += 0.25;
      break;
    }
  }

  // Extract amount
  const amountMatch = text.match(AMOUNT_PATTERN);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1]);
    confidence += 0.25;
  }

  // Extract invoice ID
  const invoiceMatch = text.match(INVOICE_PATTERN);
  if (invoiceMatch) {
    invoiceId = invoiceMatch[1].replace(/\s/, "-").toUpperCase();
    confidence += 0.25;
  }

  return {
    recipientName,
    asset,
    amount,
    invoiceId,
    chain: "ethereum",
    confidence: Math.min(confidence, 1),
    raw: text,
  };
}
