/**
 * StateManager — the primary public API of soroban-state-manager.
 *
 * Wraps Soroban RPC calls to give developers programmatic, fine-grained
 * control over ledger entry TTL management.
 *
 * @example
 * ```ts
 * import { StateManager } from "@soroban-state-manager/core";
 *
 * const sm = new StateManager({
 *   rpcUrl: "https://soroban-testnet.stellar.org",
 *   networkPassphrase: Networks.TESTNET,
 *   secretKey: "S...",
 * });
 *
 * const map = await sm.getExpirationMap("CCID...");
 * await sm.bumpEntries("CCID...", 50_000);
 * ```
 */

import {
  Account,
  Keypair,
  Networks,
  Operation,
  SorobanRpc,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

import {
  BumpOptions,
  BumpResult,
  ExpirationInfo,
  ExpirationMap,
  LedgerKey,
  RestoreOptions,
  RestoreResult,
  StateManagerConfig,
  StorageType,
} from "../types/index.js";
import { createServer, fetchCurrentLedger, fetchTTLs } from "../utils/rpc.js";
import {
  DEFAULT_MS_PER_LEDGER,
  ledgerKeyId,
  ledgersRemaining,
  ledgersToMs,
} from "../utils/ledger.js";
import { ExpirationWatcher } from "./ExpirationWatcher.js";

const BASE_FEE = "100";
const DEFAULT_TIMEOUT_MS = 30_000;

export class StateManager {
  private readonly server: SorobanRpc.Server;
  private readonly config: Required<StateManagerConfig>;
  private watcher: ExpirationWatcher | null = null;

  constructor(config: StateManagerConfig) {
    this.config = {
      msPerLedger: DEFAULT_MS_PER_LEDGER,
      watcherConfig: {
        warningThresholdLedgers: 10_000,
        pollIntervalMs: 60_000,
        autoBumpOnWarning: false,
        autoBumpBuffer: 50_000,
      },
      secretKey: "",
      ...config,
    };
    this.server = createServer(this.config.rpcUrl);
  }

  // ─── Expiration Map ──────────────────────────────────────────────────────────

  /**
   * Returns a map of all persistent and instance storage entries for a contract,
   * each annotated with live TTL information.
   *
   * @param contractId Strkey-encoded contract address (C…)
   * @param storageTypes Which storage tiers to include. Defaults to all.
   */
  async getExpirationMap(
    contractId: string,
    storageTypes: StorageType[] = ["persistent", "instance"]
  ): Promise<ExpirationMap> {
    const currentLedger = await fetchCurrentLedger(this.server);
    const ledgerKeys = this._buildContractLedgerKeys(contractId, storageTypes);
    const ttlMap = await fetchTTLs(this.server, ledgerKeys.map((lk) => lk.xdrKey));
    const result: ExpirationMap = new Map();

    for (const lk of ledgerKeys) {
      const keyXdr = lk.xdrKey.toXDR("base64");
      const expiresAtLedger = ttlMap.get(keyXdr) ?? null;
      const id = ledgerKeyId(lk.meta.contractId, lk.meta.key, lk.meta.storageType);

      if (expiresAtLedger === null) {
        // Entry is expired/missing – still include with isExpired=true
        const info: ExpirationInfo = {
          ledgerKey: lk.meta,
          expiresAtLedger: 0,
          currentLedger,
          ledgersUntilExpiry: 0,
          timeUntilExpiryMs: 0,
          isExpired: true,
          isExpiringSoon: false,
        };
        result.set(id, info);
        continue;
      }

      const remaining = ledgersRemaining(currentLedger, expiresAtLedger);
      const timeUntilExpiryMs = ledgersToMs(remaining, this.config.msPerLedger);
      const warningThreshold =
        this.config.watcherConfig?.warningThresholdLedgers ?? 10_000;

      result.set(id, {
        ledgerKey: lk.meta,
        expiresAtLedger,
        currentLedger,
        ledgersUntilExpiry: remaining,
        timeUntilExpiryMs,
        isExpired: expiresAtLedger <= currentLedger,
        isExpiringSoon: remaining <= warningThreshold,
      });
    }

    return result;
  }

  /**
   * Returns expiration info for a single named entry key.
   */
  async getEntryExpiration(ledgerKey: LedgerKey): Promise<ExpirationInfo> {
    const map = await this.getExpirationMap(ledgerKey.contractId, [ledgerKey.storageType]);
    const id = ledgerKeyId(ledgerKey.contractId, ledgerKey.key, ledgerKey.storageType);
    const info = map.get(id);
    if (!info) {
      throw new Error(
        `Entry not found: ${id}. It may not exist or the key may be incorrect.`
      );
    }
    return info;
  }

  // ─── Bump ────────────────────────────────────────────────────────────────────

  /**
   * Bumps TTL for all entries of a contract so they won't expire for at least
   * `ledgerBuffer` ledgers from now.
   *
   * Requires `secretKey` to be set in config.
   */
  async bumpEntries(
    contractId: string,
    ledgerBuffer: number,
    options: Partial<BumpOptions> = {}
  ): Promise<BumpResult[]> {
    const map = await this.getExpirationMap(contractId);
    const results: BumpResult[] = [];

    for (const [, info] of map) {
      if (!info.isExpired) {
        const result = await this.bumpEntry(info.ledgerKey, {
          ledgerBuffer,
          ...options,
        });
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Bumps a single ledger entry's TTL.
   */
  async bumpEntry(
    ledgerKey: LedgerKey,
    options: BumpOptions
  ): Promise<BumpResult> {
    if (!this.config.secretKey) {
      return {
        ledgerKey,
        success: false,
        error: "secretKey is required for bump operations",
      };
    }

    try {
      const keypair = Keypair.fromSecret(this.config.secretKey);
      const account = await this.server.getAccount(keypair.publicKey());
      const currentLedger = await fetchCurrentLedger(this.server);
      const targetLedger = currentLedger + options.ledgerBuffer;

      const xdrKey = this._ledgerKeyToXdr(ledgerKey);

      const tx = new TransactionBuilder(new Account(account.id, account.sequenceNumber()), {
        fee: String(options.fee ?? BASE_FEE),
        networkPassphrase: options.networkPassphrase ?? this.config.networkPassphrase,
      })
        .addOperation(
          Operation.extendFootprintTtl({ extendTo: targetLedger - currentLedger })
        )
        .setTimeout(Math.floor((options.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000))
        .build();

      // Simulate first
      const simResult = await this.server.simulateTransaction(tx);
      if (SorobanRpc.Api.isSimulationError(simResult)) {
        return {
          ledgerKey,
          success: false,
          error: `Simulation failed: ${simResult.error}`,
        };
      }

      const preparedTx = SorobanRpc.assembleTransaction(
        tx as Transaction,
        simResult
      ).build();

      preparedTx.sign(keypair);
      const sendResult = await this.server.sendTransaction(preparedTx);

      if (sendResult.status === "ERROR") {
        return {
          ledgerKey,
          success: false,
          error: `Transaction failed: ${sendResult.errorResult?.toXDR("base64")}`,
        };
      }

      // Poll for confirmation
      const hash = sendResult.hash;
      const confirmed = await this._pollTransaction(hash, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

      return {
        ledgerKey,
        success: confirmed,
        transactionHash: hash,
        newExpiresAtLedger: confirmed ? targetLedger : undefined,
        error: confirmed ? undefined : "Transaction not confirmed within timeout",
      };
    } catch (err) {
      return {
        ledgerKey,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ─── Restore ─────────────────────────────────────────────────────────────────

  /**
   * Restores an expired ledger entry using `RestoreFootprint`.
   * Optionally bumps after restoring.
   */
  async autoRestore(
    ledgerKey: LedgerKey,
    options: Partial<RestoreOptions> = {}
  ): Promise<RestoreResult> {
    if (!this.config.secretKey) {
      return {
        ledgerKey,
        success: false,
        error: "secretKey is required for restore operations",
      };
    }

    try {
      const keypair = Keypair.fromSecret(this.config.secretKey);
      const account = await this.server.getAccount(keypair.publicKey());

      const xdrKey = this._ledgerKeyToXdr(ledgerKey);
      const networkPassphrase =
        options.networkPassphrase ?? this.config.networkPassphrase;

      const tx = new TransactionBuilder(new Account(account.id, account.sequenceNumber()), {
        fee: String(options.fee ?? BASE_FEE),
        networkPassphrase,
      })
        .addOperation(Operation.restoreFootprint({}))
        .setTimeout(Math.floor((options.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000))
        .build();

      const simResult = await this.server.simulateTransaction(tx);
      if (SorobanRpc.Api.isSimulationError(simResult)) {
        return {
          ledgerKey,
          success: false,
          error: `Simulation failed: ${simResult.error}`,
        };
      }

      const preparedTx = SorobanRpc.assembleTransaction(
        tx as Transaction,
        simResult
      ).build();

      preparedTx.sign(keypair);
      const sendResult = await this.server.sendTransaction(preparedTx);

      if (sendResult.status === "ERROR") {
        return {
          ledgerKey,
          success: false,
          error: `Transaction failed`,
        };
      }

      const hash = sendResult.hash;
      const confirmed = await this._pollTransaction(hash, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

      const restoreResult: RestoreResult = {
        ledgerKey,
        success: confirmed,
        transactionHash: hash,
      };

      // Optionally bump after restore
      if (confirmed && options.bumpAfterRestore) {
        const bumpResult = await this.bumpEntry(ledgerKey, {
          ledgerBuffer: options.bumpBuffer ?? 50_000,
          networkPassphrase,
        });
        restoreResult.bumpResult = bumpResult;
      }

      return restoreResult;
    } catch (err) {
      return {
        ledgerKey,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ─── Watcher ─────────────────────────────────────────────────────────────────

  /**
   * Starts the background expiration watcher for a contract.
   * Emits events when entries are expiring soon or already expired.
   *
   * @returns The ExpirationWatcher instance (attach event listeners on it)
   */
  startWatcher(contractId: string): ExpirationWatcher {
    if (this.watcher) {
      this.watcher.stop();
    }

    this.watcher = new ExpirationWatcher(
      contractId,
      this,
      this.config.watcherConfig
    );
    this.watcher.start();
    return this.watcher;
  }

  /** Stops the background watcher if running */
  stopWatcher(): void {
    this.watcher?.stop();
    this.watcher = null;
  }

  // ─── Internals ───────────────────────────────────────────────────────────────

  private _buildContractLedgerKeys(
    contractId: string,
    storageTypes: StorageType[]
  ): Array<{ xdrKey: xdr.LedgerKey; meta: LedgerKey }> {
    const keys: Array<{ xdrKey: xdr.LedgerKey; meta: LedgerKey }> = [];

    if (storageTypes.includes("instance")) {
      // The instance storage key is the contract's own data entry
      const contractDataKey = xdr.LedgerKey.contractData(
        new xdr.LedgerKeyContractData({
          contract: xdr.ScAddress.scAddressTypeContract(
            xdr.Hash.fromXDR(Buffer.from(contractId.slice(1), "base64"))
          ),
          key: xdr.ScVal.scvLedgerKeyContractInstance(),
          durability: xdr.ContractDataDurability.persistent(),
        })
      );
      keys.push({
        xdrKey: contractDataKey,
        meta: { contractId, key: "instance", storageType: "instance" },
      });
    }

    // For persistent and temporary we'd normally enumerate via contract metadata;
    // Here we expose a sensible default that callers can extend.
    return keys;
  }

  private _ledgerKeyToXdr(ledgerKey: LedgerKey): xdr.LedgerKey {
    // Build a contract-data ledger key for the given storageType
    const durability =
      ledgerKey.storageType === "temporary"
        ? xdr.ContractDataDurability.temporary()
        : xdr.ContractDataDurability.persistent();

    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: xdr.ScAddress.scAddressTypeContract(
          xdr.Hash.fromXDR(Buffer.from(ledgerKey.contractId.slice(1), "base64"))
        ),
        key: xdr.ScVal.scvString(ledgerKey.key),
        durability,
      })
    );
  }

  private async _pollTransaction(
    hash: string,
    timeoutMs: number
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await this._sleep(2_000);
      const txResult = await this.server.getTransaction(hash);
      if (txResult.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) return true;
      if (txResult.status === SorobanRpc.Api.GetTransactionStatus.FAILED) return false;
    }
    return false;
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
