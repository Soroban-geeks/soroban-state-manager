/**
 * soroban-state-manager
 *
 * Programmatic TTL management and ledger entry expiration toolkit
 * for Soroban smart contracts on Stellar.
 *
 * @packageDocumentation
 */

// Core
export { StateManager } from "./core/StateManager.js";
export { ExpirationWatcher } from "./core/ExpirationWatcher.js";

// Types
export type {
  BumpOptions,
  BumpResult,
  ContractExpirationState,
  EntryExpirationState,
  ExpirationInfo,
  ExpirationMap,
  LedgerKey,
  RestoreOptions,
  RestoreResult,
  StateManagerConfig,
  StorageType,
  WatcherConfig,
  WatcherEvents,
} from "./types/index.js";

// Utilities (exposed for advanced usage)
export { formatDuration, ledgersToMs, msToLedgers } from "./utils/ledger.js";
