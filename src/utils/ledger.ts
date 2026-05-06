/**
 * Utility helpers for ledger sequence arithmetic and time estimation.
 */

/** Approximate ledger close time in milliseconds (Stellar mainnet avg) */
export const DEFAULT_MS_PER_LEDGER = 5_000;

/**
 * Converts a ledger count into approximate milliseconds.
 */
export function ledgersToMs(ledgers: number, msPerLedger = DEFAULT_MS_PER_LEDGER): number {
  return ledgers * msPerLedger;
}

/**
 * Converts milliseconds into an approximate ledger count.
 */
export function msToLedgers(ms: number, msPerLedger = DEFAULT_MS_PER_LEDGER): number {
  return Math.ceil(ms / msPerLedger);
}

/**
 * Returns a human-readable duration string from milliseconds.
 * e.g. "2 days 3 hours"
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "expired";

  const seconds = Math.floor(ms / 1_000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Calculates how many ledgers remain until a given expiry ledger.
 * Returns 0 (not negative) if already expired.
 */
export function ledgersRemaining(currentLedger: number, expiresAtLedger: number): number {
  return Math.max(0, expiresAtLedger - currentLedger);
}

/**
 * Derives a stable map key for a LedgerKey object.
 */
export function ledgerKeyId(contractId: string, key: string, storageType: string): string {
  return `${contractId}:${storageType}:${key}`;
}
