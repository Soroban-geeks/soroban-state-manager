/**
 * ExpirationWatcher — a background polling loop that monitors Soroban
 * ledger entry TTLs and emits events before they expire.
 *
 * Attach listeners with .on() before calling .start().
 *
 * @example
 * ```ts
 * const watcher = sm.startWatcher("CCID...");
 * watcher.on("expiringSoon", (info) => console.warn("Expiring!", info));
 * watcher.on("autoBumped",   (result) => console.log("Bumped", result));
 * ```
 */

import EventEmitter from "eventemitter3";
import {
  BumpResult,
  ExpirationInfo,
  ExpirationMap,
  WatcherConfig,
  WatcherEvents,
} from "../types/index.js";

// Forward-declare to avoid circular import; resolved at runtime
type StateManagerLike = {
  getExpirationMap(contractId: string): Promise<ExpirationMap>;
  bumpEntry(
    ledgerKey: import("../types/index.js").LedgerKey,
    opts: import("../types/index.js").BumpOptions
  ): Promise<BumpResult>;
};

export class ExpirationWatcher extends EventEmitter<WatcherEvents> {
  private readonly contractId: string;
  private readonly sm: StateManagerLike;
  private readonly config: Required<WatcherConfig>;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    contractId: string,
    sm: StateManagerLike,
    config?: WatcherConfig
  ) {
    super();
    this.contractId = contractId;
    this.sm = sm;
    this.config = {
      warningThresholdLedgers: 10_000,
      pollIntervalMs: 60_000,
      autoBumpOnWarning: false,
      autoBumpBuffer: 50_000,
      ...config,
    };
  }

  /** Starts the polling loop */
  start(): void {
    if (this.running) return;
    this.running = true;
    // Poll immediately, then on interval
    void this._poll();
    this.timer = setInterval(() => void this._poll(), this.config.pollIntervalMs);
  }

  /** Stops the polling loop */
  stop(): void {
    this.running = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Whether the watcher is currently running */
  get isRunning(): boolean {
    return this.running;
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  private async _poll(): Promise<void> {
    if (!this.running) return;

    try {
      const map = await this.sm.getExpirationMap(this.contractId);
      this.emit("poll", map);

      for (const [, info] of map) {
        if (info.isExpired) {
          this.emit("expired", info);
          continue;
        }

        if (info.isExpiringSoon) {
          this.emit("expiringSoon", info);

          if (this.config.autoBumpOnWarning) {
            await this._autoBump(info);
          }
        }
      }
    } catch (err) {
      this.emit(
        "error",
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }

  private async _autoBump(info: ExpirationInfo): Promise<void> {
    try {
      const result = await this.sm.bumpEntry(info.ledgerKey, {
        ledgerBuffer: this.config.autoBumpBuffer,
      });
      this.emit("autoBumped", result);
    } catch (err) {
      this.emit(
        "error",
        err instanceof Error ? err : new Error(`Auto-bump failed: ${String(err)}`)
      );
    }
  }
}
