/**
 * parseIntent — Regex-based intent parser used as Step 1 in the pipeline.
 *
 * Note: Step 3 (Gemini agent transaction) is where the LLM is invoked.
 * This parser is intentionally deterministic so the comparison engine
 * has a reliable "ground truth" from the user's original words.
 *
 * The individual /api/parse-intent endpoint also attempts Gemini enhancement
 * when a key is available.
 */

import { geminiParseIntent, isGeminiEnabled } from "./gemini.js";
import type { ParsedIntent } from "./types.js";

const ASSET_PATTERNS = [
  { pattern: /\b(USDC)\b/i, asset: "USDC" },
  { pattern: /\b(USDT)\b/i, asset: "USDT" },
  { pattern: /\b(ETH|ether(?:eum)?)\b/i, asset: "ETH" },
  { pattern: /\b(BTC|bitcoin)\b/i, asset: "BTC" },
  { pattern: /\b(SOL|solana)\b/i, asset: "SOL" },
];

const AMOUNT_WITH_ASSET = /\b(\d+(?:\.\d+)?)\s*(USDC|USDT|ETH|ether(?:eum)?|BTC|bitcoin|SOL|solana)\b/i;
const ADDRESS_PATTERN = /\b(0x[a-fA-F0-9]{40})\b/;
const RECIPIENT_PATTERN =
  /\b(?:to|pay|send|transfer)\s+(?:\d+(?:\.\d+)?\s*(?:USDC|USDT|ETH|BTC|SOL)\s+to\s+)?([A-Z][a-zA-Z0-9_-]+|0x[a-fA-F0-9]{40})\b/i;
const INVOICE_PATTERN = /\b(INV[-\s]?\d+)\b/i;
const ACTION_PATTERN = /\b(pay|send|transfer|submit)\b/i;

export function parseIntentSync(text: string): ParsedIntent {
  const raw = String(text ?? "").trim();
  let confidence = 0;
  let recipientName: string | null = null;
  let asset: string | null = null;
  let amount: string | null = null;
  let invoiceId: string | null = null;

  const actionMatch = raw.match(ACTION_PATTERN);
  const action = actionMatch ? actionMatch[1].toLowerCase() : "pay";
  if (actionMatch) confidence += 0.1;

  const amountMatch = raw.match(AMOUNT_WITH_ASSET);
  if (amountMatch) {
    amount = amountMatch[1];
    confidence += 0.25;
  }

  for (const candidate of ASSET_PATTERNS) {
    if (candidate.pattern.test(raw)) {
      asset = candidate.asset;
      confidence += 0.2;
      break;
    }
  }

  const addressMatch = raw.match(ADDRESS_PATTERN);
  const recipientMatch = raw.match(RECIPIENT_PATTERN);
  if (addressMatch) {
    recipientName = addressMatch[1];
    confidence += 0.2;
  } else if (recipientMatch) {
    recipientName = recipientMatch[1].trim();
    confidence += 0.2;
  }

  const invoiceMatch = raw.match(INVOICE_PATTERN);
  if (invoiceMatch) {
    invoiceId = invoiceMatch[1].replace(/\s+/, "-").toUpperCase();
    confidence += 0.2;
  }

  return {
    action,
    recipientName,
    asset,
    amount,
    invoiceId,
    chain: "ethereum",
    confidence: Math.min(Number(confidence.toFixed(2)), 1),
    raw,
  };
}

/** Used by individual /api/parse-intent endpoint — tries Gemini, falls back to regex */
export async function parseIntent(text: string): Promise<ParsedIntent> {
  if (isGeminiEnabled()) {
    const result = await geminiParseIntent(text);
    if (result) {
      const { reasoning: _r, ...intent } = result;
      return intent;
    }
    console.warn("[parseIntent] Gemini call failed, using regex fallback");
  }
  return parseIntentSync(text);
}
