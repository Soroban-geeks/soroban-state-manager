/**
 * useEntryExpiration — React hook for monitoring a single Soroban ledger entry.
 *
 * @example
 * ```tsx
 * const { expirationInfo, bump, restore } = useEntryExpiration(sm, {
 *   contractId: "CCID...",
 *   key: "user_balance",
 *   storageType: "persistent",
 * });
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { StateManager } from "../core/StateManager.js";
import type {
  BumpOptions,
  BumpResult,
  EntryExpirationState,
  LedgerKey,
  RestoreOptions,
  RestoreResult,
} from "../types/index.js";

export function useEntryExpiration(
  sm: StateManager | null,
  ledgerKey: LedgerKey,
  /** How often to poll for updates (ms). Default: 30_000 */
  refreshIntervalMs = 30_000
): EntryExpirationState {
  const [state, setState] = useState<
    Pick<EntryExpirationState, "expirationInfo" | "isLoading" | "error">
  >({
    expirationInfo: null,
    isLoading: false,
    error: null,
  });

  const smRef = useRef(sm);
  smRef.current = sm;

  const fetch = useCallback(async () => {
    if (!smRef.current) return;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const info = await smRef.current.getEntryExpiration(ledgerKey);
      setState({ expirationInfo: info, isLoading: false, error: null });
    } catch (err) {
      setState({
        expirationInfo: null,
        isLoading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, [ledgerKey.contractId, ledgerKey.key, ledgerKey.storageType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void fetch();
    if (refreshIntervalMs > 0) {
      const id = setInterval(() => void fetch(), refreshIntervalMs);
      return () => clearInterval(id);
    }
    return undefined;
  }, [fetch, refreshIntervalMs]);

  const bump = useCallback(
    async (options?: Partial<BumpOptions>): Promise<BumpResult | null> => {
      if (!smRef.current) return null;
      const result = await smRef.current.bumpEntry(ledgerKey, {
        ledgerBuffer: 50_000,
        ...options,
      });
      await fetch();
      return result;
    },
    [ledgerKey, fetch]
  );

  const restore = useCallback(
    async (options?: Partial<RestoreOptions>): Promise<RestoreResult | null> => {
      if (!smRef.current) return null;
      const result = await smRef.current.autoRestore(ledgerKey, options);
      await fetch();
      return result;
    },
    [ledgerKey, fetch]
  );

  return {
    ...state,
    refresh: fetch,
    bump,
    restore,
  };
}
