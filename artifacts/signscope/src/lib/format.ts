export function shortAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function outputText(result?: { stdout?: string; stderr?: string; error?: string } | null): string {
  if (!result) return "No command output yet.";
  return [result.stdout, result.stderr, result.error].filter(Boolean).join("\n") || "Command completed with no output.";
}
