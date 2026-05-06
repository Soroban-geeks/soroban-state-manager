import {
  formatDuration,
  ledgerKeyId,
  ledgersRemaining,
  ledgersToMs,
  msToLedgers,
} from "../utils/ledger";

describe("ledger utilities", () => {
  describe("ledgersToMs", () => {
    it("converts ledgers to ms using default rate", () => {
      expect(ledgersToMs(1)).toBe(5_000);
      expect(ledgersToMs(100)).toBe(500_000);
    });

    it("uses custom msPerLedger", () => {
      expect(ledgersToMs(10, 6_000)).toBe(60_000);
    });
  });

  describe("msToLedgers", () => {
    it("rounds up", () => {
      expect(msToLedgers(5_001)).toBe(2);
      expect(msToLedgers(5_000)).toBe(1);
    });
  });

  describe("formatDuration", () => {
    it("returns 'expired' for 0 or negative", () => {
      expect(formatDuration(0)).toBe("expired");
      expect(formatDuration(-1)).toBe("expired");
    });

    it("formats days and hours", () => {
      const twoDays = 2 * 24 * 60 * 60 * 1_000;
      expect(formatDuration(twoDays)).toMatch(/2d/);
    });

    it("formats minutes and seconds", () => {
      expect(formatDuration(90_000)).toBe("1m 30s");
    });

    it("formats seconds only", () => {
      expect(formatDuration(42_000)).toBe("42s");
    });
  });

  describe("ledgersRemaining", () => {
    it("returns the difference when positive", () => {
      expect(ledgersRemaining(100, 200)).toBe(100);
    });

    it("returns 0 when already expired", () => {
      expect(ledgersRemaining(200, 150)).toBe(0);
      expect(ledgersRemaining(200, 200)).toBe(0);
    });
  });

  describe("ledgerKeyId", () => {
    it("produces a stable composite key", () => {
      expect(ledgerKeyId("C123", "balance", "persistent")).toBe(
        "C123:persistent:balance"
      );
    });
  });
});
