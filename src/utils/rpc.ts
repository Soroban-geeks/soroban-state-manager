/**
 * Thin helpers around @stellar/stellar-sdk RPC calls used by StateManager.
 * Keeping this isolated makes it easy to mock in tests.
 */

import { SorobanRpc, xdr } from "@stellar/stellar-sdk";

export type SorobanServer = SorobanRpc.Server;

/**
 * Returns the latest ledger sequence from the RPC server.
 */
export async function fetchCurrentLedger(server: SorobanServer): Promise<number> {
  const latestLedger = await server.getLatestLedger();
  return latestLedger.sequence;
}

/**
 * Fetches the live TTL for a set of ledger keys.
 * Returns a map from ledger key XDR string → expiresAtLedger.
 *
 * Uses getLedgerEntries under the hood; entries that do not exist
 * (already expired and archived) return null.
 */
export async function fetchTTLs(
  server: SorobanServer,
  keys: xdr.LedgerKey[]
): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>();

  if (keys.length === 0) return result;

  const response = await server.getLedgerEntries(...keys);

  // Build a set of keys that came back in the response
  const found = new Set<string>();
  for (const entry of response.entries ?? []) {
    const keyXdr = entry.key.toXDR("base64");
    // expirationLedgerSeq lives on the entry's liveUntilLedgerSeq field
    const liveUntil = entry.liveUntilLedgerSeq ?? null;
    result.set(keyXdr, liveUntil ?? null);
    found.add(keyXdr);
  }

  // Keys that weren't returned are either expired or never existed → null
  for (const key of keys) {
    const keyXdr = key.toXDR("base64");
    if (!found.has(keyXdr)) {
      result.set(keyXdr, null);
    }
  }

  return result;
}

/**
 * Builds a Soroban server instance.
 */
export function createServer(rpcUrl: string): SorobanServer {
  return new SorobanRpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
}
