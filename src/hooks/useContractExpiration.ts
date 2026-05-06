/**
 * useContractExpiration — React hook that fetches and tracks the expiration
 * map for an entire contract.
 *
 * @example
 * ```tsx
 * const { expirationMap, bumpAll } = useContractExpiration(sm, "CCID...");
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { StateManager } from "../core/StateManager.js";
import type {
  BumpOptions,
  BumpResult,
  ContractExpirationState,
  ExpirationMap,
} from "../types/index.js";

export function useContractExpiration(
  sm: StateManager | null,
  contractId: string,
  refreshIntervalMs = 60_000
): ContractExpirationState {
  const [state, setState] = useState<
    Pick<ContractExpirationState, "expirationMap" | "isLoading" | "error">
  >({
    expirationMap: new Map(),
    isLoading: false,
    error: null,
  });

  const smRef = useRef(sm);
  smRef.current = sm;

  const fetch = useCallback(async () => {
    if (!smRef.current || !contractId) return;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const map = await smRef.current.getExpirationMap(contractId);
      setState({ expirationMap: map, isLoading: false, error: null });
    } catch (err) {
      setState({
        expirationMap: new Map(),
        isLoading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, [contractId]);

  useEffect(() => {
    void fetch();
    if (refreshIntervalMs > 0) {
      const id = setInterval(() => void fetch(), refreshIntervalMs);
      return () => clearInterval(id);
    }
    return undefined;
  }, [fetch, refreshIntervalMs]);

  const bumpAll = useCallback(
    async (options?: Partial<BumpOptions>): Promise<BumpResult[]> => {
      if (!smRef.current) return [];
      const results = await smRef.current.bumpEntries(contractId, 50_000, options);
      await fetch();
      return results;
    },
    [contractId, fetch]
  );

  return {
    ...state,
    refresh: fetch,
    bumpAll,
  };
}
