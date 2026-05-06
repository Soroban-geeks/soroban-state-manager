/**
 * Core types for soroban-state-manager
 * Covers Soroban ledger entry TTL management, expiration tracking, and restoration.
 */

// ─── Storage Types ────────────────────────────────────────────────────────────

/** The three storage durability tiers in Soroban */
export type StorageType = "persistent" | "temporary" | "instance";

// ─── Ledger Entry Key ─────────────────────────────────────────────────────────

/** Identifies a single ledger entry on the Stellar network */
export interface LedgerKey {
  /** The contract that owns this entry */
  contractId: string;
  /** XDR-encoded key string, or a human-readable label */
  key: string;
  /** Storage durability tier */
  storageType: StorageType;
}

// ─── Expiration Info ──────────────────────────────────────────────────────────

/** Live expiration metadata for a single ledger entry */
export interface ExpirationInfo {
  /** The ledger entry key this info describes */
  ledgerKey: LedgerKey;
  /** Ledger sequence number at which this entry expires */
  expiresAtLedger: number;
  /** Current ledger sequence number at time of fetch */
  currentLedger: number;
  /** How many ledgers remain before expiry */
  ledgersUntilExpiry: number;
  /** Approximate wall-clock time remaining (ms), based on ~5 s/ledger */
  timeUntilExpiryMs: number;
  /** True when the entry has already expired */
  isExpired: boolean;
  /** True when within the configured warning threshold */
  isExpiringSoon: boolean;
}

// ─── Expiration Map ───────────────────────────────────────────────────────────

/** Maps entry key strings to their expiration info */
export type ExpirationMap = Map<string, ExpirationInfo>;

// ─── Bump Options ─────────────────────────────────────────────────────────────

/** Options for a TTL bump operation */
export interface BumpOptions {
  /** Target minimum ledger-until-expiry after the bump */
  ledgerBuffer: number;
  /** Fee in stroops for each bump transaction (default: 100) */
  fee?: number;
  /** Maximum time in ms to wait for transaction confirmation */
  timeoutMs?: number;
  /** Network passphrase override */
  networkPassphrase?: string;
}

// ─── Bump Result ──────────────────────────────────────────────────────────────

/** Outcome of a single bump operation */
export interface BumpResult {
  ledgerKey: LedgerKey;
  success: boolean;
  transactionHash?: string;
  /** New expiry ledger after bump, if successful */
  newExpiresAtLedger?: number;
  error?: string;
}

// ─── Restore Options ─────────────────────────────────────────────────────────

/** Options for restoring an expired entry */
export interface RestoreOptions {
  fee?: number;
  timeoutMs?: number;
  networkPassphrase?: string;
  /** If true, automatically bump after restore */
  bumpAfterRestore?: boolean;
  /** Buffer for the auto-bump if bumpAfterRestore is true */
  bumpBuffer?: number;
}

/** Outcome of a restore operation */
export interface RestoreResult {
  ledgerKey: LedgerKey;
  success: boolean;
  transactionHash?: string;
  error?: string;
  bumpResult?: BumpResult;
}

// ─── Watcher Config ───────────────────────────────────────────────────────────

/** Configuration for the background expiration watcher */
export interface WatcherConfig {
  /** Ledgers before expiry at which to fire a warning event */
  warningThresholdLedgers: number;
  /** How often to poll the RPC (ms). Default: 60_000 */
  pollIntervalMs?: number;
  /** If true, automatically bump entries that hit the warning threshold */
  autoBumpOnWarning?: boolean;
  /** Buffer to use when autoBumpOnWarning is enabled */
  autoBumpBuffer?: number;
}

// ─── Watcher Events ──────────────────────────────────────────────────────────

/** Events emitted by the background watcher */
export interface WatcherEvents {
  /** Fired when an entry crosses the warning threshold */
  expiringSoon: (info: ExpirationInfo) => void;
  /** Fired when an entry has already expired */
  expired: (info: ExpirationInfo) => void;
  /** Fired after a successful auto-bump */
  autoBumped: (result: BumpResult) => void;
  /** Fired on any watcher-internal error */
  error: (err: Error) => void;
  /** Fired on each completed poll cycle */
  poll: (map: ExpirationMap) => void;
}

// ─── StateManager Config ──────────────────────────────────────────────────────

/** Top-level configuration for StateManager */
export interface StateManagerConfig {
  /** Soroban RPC endpoint URL */
  rpcUrl: string;
  /** Stellar network passphrase */
  networkPassphrase: string;
  /** Base58 or hex secret key for signing transactions */
  secretKey?: string;
  /** Watcher configuration (required to use startWatcher) */
  watcherConfig?: WatcherConfig;
  /** Approximate ms per ledger for time estimates. Default: 5000 */
  msPerLedger?: number;
}

// ─── React Hook State ─────────────────────────────────────────────────────────

/** State returned by useEntryExpiration */
export interface EntryExpirationState {
  expirationInfo: ExpirationInfo | null;
  isLoading: boolean;
  error: Error | null;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Bump this entry's TTL */
  bump: (options?: Partial<BumpOptions>) => Promise<BumpResult | null>;
  /** Restore this entry if expired */
  restore: (options?: Partial<RestoreOptions>) => Promise<RestoreResult | null>;
}

/** State returned by useContractExpiration */
export interface ContractExpirationState {
  expirationMap: ExpirationMap;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  bumpAll: (options?: Partial<BumpOptions>) => Promise<BumpResult[]>;
}
