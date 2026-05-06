import { ExpirationWatcher } from "../core/ExpirationWatcher";
import type { ExpirationMap, LedgerKey } from "../types";

const mockKey: LedgerKey = {
  contractId: "CABC",
  key: "instance",
  storageType: "instance",
};

function makeMap(overrides: Partial<{
  isExpired: boolean;
  isExpiringSoon: boolean;
  ledgersUntilExpiry: number;
}>): ExpirationMap {
  const info = {
    ledgerKey: mockKey,
    expiresAtLedger: 1000,
    currentLedger: 900,
    ledgersUntilExpiry: overrides.ledgersUntilExpiry ?? 100,
    timeUntilExpiryMs: 500_000,
    isExpired: overrides.isExpired ?? false,
    isExpiringSoon: overrides.isExpiringSoon ?? false,
  };
  return new Map([["key", info]]);
}

describe("ExpirationWatcher", () => {
  let sm: {
    getExpirationMap: jest.Mock;
    bumpEntry: jest.Mock;
  };

  beforeEach(() => {
    sm = {
      getExpirationMap: jest.fn().mockResolvedValue(makeMap({})),
      bumpEntry: jest.fn().mockResolvedValue({ success: true }),
    };
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("emits 'poll' after start", async () => {
    const watcher = new ExpirationWatcher("CABC", sm, {
      warningThresholdLedgers: 10_000,
      pollIntervalMs: 60_000,
    });
    const pollCb = jest.fn();
    watcher.on("poll", pollCb);
    watcher.start();

    await Promise.resolve(); // flush microtasks
    // Let the initial fetch resolve
    await sm.getExpirationMap.mock.results[0].value;

    expect(pollCb).toHaveBeenCalledTimes(1);
    watcher.stop();
  });

  it("emits 'expiringSoon' when entry is near expiry", async () => {
    sm.getExpirationMap.mockResolvedValue(makeMap({ isExpiringSoon: true }));
    const watcher = new ExpirationWatcher("CABC", sm, {
      warningThresholdLedgers: 10_000,
    });
    const cb = jest.fn();
    watcher.on("expiringSoon", cb);
    watcher.start();
    await sm.getExpirationMap.mock.results[0].value;
    expect(cb).toHaveBeenCalledTimes(1);
    watcher.stop();
  });

  it("emits 'expired' for expired entries", async () => {
    sm.getExpirationMap.mockResolvedValue(makeMap({ isExpired: true }));
    const watcher = new ExpirationWatcher("CABC", sm, {
      warningThresholdLedgers: 10_000,
    });
    const cb = jest.fn();
    watcher.on("expired", cb);
    watcher.start();
    await sm.getExpirationMap.mock.results[0].value;
    expect(cb).toHaveBeenCalledTimes(1);
    watcher.stop();
  });

  it("calls bumpEntry when autoBumpOnWarning is true", async () => {
    sm.getExpirationMap.mockResolvedValue(makeMap({ isExpiringSoon: true }));
    const watcher = new ExpirationWatcher("CABC", sm, {
      warningThresholdLedgers: 10_000,
      autoBumpOnWarning: true,
      autoBumpBuffer: 50_000,
    });
    watcher.start();
    await sm.getExpirationMap.mock.results[0].value;
    // Give microtasks time to settle
    await Promise.resolve();
    expect(sm.bumpEntry).toHaveBeenCalled();
    watcher.stop();
  });

  it("stops polling after stop()", () => {
    const watcher = new ExpirationWatcher("CABC", sm, { warningThresholdLedgers: 10_000, pollIntervalMs: 1_000 });
    watcher.start();
    expect(watcher.isRunning).toBe(true);
    watcher.stop();
    expect(watcher.isRunning).toBe(false);
    jest.advanceTimersByTime(10_000);
    // Should not have called beyond the initial call
    expect(sm.getExpirationMap.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
