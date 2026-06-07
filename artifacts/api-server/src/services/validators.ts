const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const ACCOUNT_LABEL = /^[a-zA-Z0-9:_-]+$/;
const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const SUPPORTED_NETWORKS = new Set(["ethereum", "bitcoin", "solana"]);
const SUPPORTED_ASSETS = new Set(["ETH", "USDC", "USDT", "BTC", "SOL"]);

export function isEthereumAddress(value: unknown): value is string {
  return typeof value === "string" && ETH_ADDRESS.test(value);
}

export function isAccountLabel(value: unknown): value is string {
  return typeof value === "string" && ACCOUNT_LABEL.test(value);
}

export function isPositiveDecimal(value: unknown): value is string {
  return (
    (typeof value === "string" || typeof value === "number") &&
    DECIMAL.test(String(value)) &&
    Number(String(value)) > 0
  );
}

export function normalizeAsset(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const asset = value.toUpperCase();
  return SUPPORTED_ASSETS.has(asset) ? asset : null;
}

export function normalizeNetwork(value: unknown): "ethereum" | "bitcoin" | "solana" | null {
  if (typeof value !== "string") return null;
  const network = value.toLowerCase();
  return SUPPORTED_NETWORKS.has(network) ? (network as "ethereum" | "bitcoin" | "solana") : null;
}

export function assertEthereumAddress(value: unknown, label = "address"): string {
  if (!isEthereumAddress(value)) {
    throw new Error(`${label} must match /^0x[a-fA-F0-9]{40}$/`);
  }
  return value;
}

export function assertAccountLabel(value: unknown, label = "account label"): string {
  if (!isAccountLabel(value)) {
    throw new Error(`${label} must match /^[a-zA-Z0-9:_-]+$/`);
  }
  return value;
}

export function assertPositiveDecimal(value: unknown, label = "amount"): string {
  if (!isPositiveDecimal(value)) {
    throw new Error(`${label} must be a positive decimal`);
  }
  return String(value);
}
