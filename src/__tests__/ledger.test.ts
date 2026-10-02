import { SorobanRpc, xdr } from "@stellar/stellar-sdk";
import {
  createServer,
  fetchCurrentLedger,
  fetchTTLs,
} from "../utils/rpc";
import {
  DEFAULT_MS_PER_LEDGER,
  formatDuration,
  ledgerKeyId,
  ledgersRemaining,
  ledgersToMs,
  msToLedgers,
} from "../utils/ledger";

describe("ledger utilities", () => {
  describe("constants", () => {
    it("exports DEFAULT_MS_PER_LEDGER as 5000", () => {
      expect(DEFAULT_MS_PER_LEDGER).toBe(5_000);
    });
  });

  describe("ledgersToMs", () => {
    it("converts ledgers to ms using default rate", () => {
      expect(ledgersToMs(1)).toBe(5_000);
      expect(ledgersToMs(100)).toBe(500_000);
      expect(ledgersToMs(0)).toBe(0);
    });

    it("uses custom msPerLedger", () => {
      expect(ledgersToMs(10, 6_000)).toBe(60_000);
      expect(ledgersToMs(5, 1_000)).toBe(5_000);
    });
  });

  describe("msToLedgers", () => {
    it("rounds up to the nearest ledger", () => {
      expect(msToLedgers(5_001)).toBe(2);
      expect(msToLedgers(5_000)).toBe(1);
      expect(msToLedgers(1)).toBe(1);
      expect(msToLedgers(0)).toBe(0);
    });

    it("uses custom msPerLedger", () => {
      expect(msToLedgers(10_000, 4_000)).toBe(3);
      expect(msToLedgers(8_000, 4_000)).toBe(2);
    });
  });

  describe("formatDuration", () => {
    it("returns 'expired' for 0 or negative", () => {
      expect(formatDuration(0)).toBe("expired");
      expect(formatDuration(-1)).toBe("expired");
      expect(formatDuration(-100_000)).toBe("expired");
    });

    it("formats days and hours", () => {
      const twoDays = 2 * 24 * 60 * 60 * 1_000;
      expect(formatDuration(twoDays)).toBe("2d 0h");
      const twoDaysThreeHours = (2 * 24 + 3) * 60 * 60 * 1_000;
      expect(formatDuration(twoDaysThreeHours)).toBe("2d 3h");
    });

    it("formats hours and minutes", () => {
      const threeHoursFiveMin = (3 * 60 + 5) * 60 * 1_000;
      expect(formatDuration(threeHoursFiveMin)).toBe("3h 5m");
    });

    it("formats minutes and seconds", () => {
      expect(formatDuration(90_000)).toBe("1m 30s");
      expect(formatDuration(60_000)).toBe("1m 0s");
    });

    it("formats seconds only", () => {
      expect(formatDuration(42_000)).toBe("42s");
      expect(formatDuration(500)).toBe("0s");
    });
  });

  describe("ledgersRemaining", () => {
    it("returns the difference when positive", () => {
      expect(ledgersRemaining(100, 200)).toBe(100);
      expect(ledgersRemaining(0, 50)).toBe(50);
    });

    it("returns 0 when already expired or exact match", () => {
      expect(ledgersRemaining(200, 150)).toBe(0);
      expect(ledgersRemaining(200, 200)).toBe(0);
      expect(ledgersRemaining(500, 100)).toBe(0);
    });
  });

  describe("ledgerKeyId", () => {
    it("produces a stable composite key", () => {
      expect(ledgerKeyId("C123", "balance", "persistent")).toBe(
        "C123:persistent:balance"
      );
      expect(ledgerKeyId("CXYZ", "nonce", "temporary")).toBe(
        "CXYZ:temporary:nonce"
      );
    });
  });
});

describe("RPC utilities", () => {
  describe("createServer", () => {
    it("builds a SorobanRpc.Server instance with allowHttp for http URLs", () => {
      const serverHttp = createServer("http://localhost:8000");
      expect(serverHttp).toBeInstanceOf(SorobanRpc.Server);
      expect(serverHttp.serverURL.toString()).toMatch(/^http:\/\/localhost:8000/);
    });

    it("builds a SorobanRpc.Server instance for https URLs", () => {
      const serverHttps = createServer("https://soroban-testnet.stellar.org");
      expect(serverHttps).toBeInstanceOf(SorobanRpc.Server);
      expect(serverHttps.serverURL.toString()).toMatch(
        /^https:\/\/soroban-testnet\.stellar\.org/
      );
    });
  });

  describe("fetchCurrentLedger", () => {
    it("returns latest ledger sequence from server.getLatestLedger", async () => {
      const mockServer = {
        getLatestLedger: jest.fn().mockResolvedValue({
          sequence: 123456,
          id: "mock-id",
          protocolVersion: 20,
        }),
      } as unknown as SorobanRpc.Server;

      const seq = await fetchCurrentLedger(mockServer);
      expect(seq).toBe(123456);
      expect(mockServer.getLatestLedger).toHaveBeenCalledTimes(1);
    });
  });

  describe("fetchTTLs", () => {
    const makeLedgerKey = (byteVal: number): xdr.LedgerKey => {
      const hash = Buffer.alloc(32, byteVal);
      return xdr.LedgerKey.contractCode(new xdr.LedgerKeyContractCode({ hash }));
    };

    it("returns empty map when keys array is empty", async () => {
      const mockServer = {
        getLedgerEntries: jest.fn(),
      } as unknown as SorobanRpc.Server;

      const result = await fetchTTLs(mockServer, []);
      expect(result.size).toBe(0);
      expect(mockServer.getLedgerEntries).not.toHaveBeenCalled();
    });

    it("fetches TTLs and maps existing and missing keys properly", async () => {
      const key1 = makeLedgerKey(1);
      const key2 = makeLedgerKey(2);
      const key3 = makeLedgerKey(3);

      const key1Xdr = key1.toXDR("base64");
      const key2Xdr = key2.toXDR("base64");
      const key3Xdr = key3.toXDR("base64");

      const mockResponse = {
        latestLedger: 1000,
        entries: [
          {
            key: key1,
            liveUntilLedgerSeq: 5500,
          },
          {
            key: key2,
            liveUntilLedgerSeq: undefined, // entry exists but liveUntilLedgerSeq is undefined
          },
        ],
      };

      const mockServer = {
        getLedgerEntries: jest.fn().mockResolvedValue(mockResponse),
      } as unknown as SorobanRpc.Server;

      const result = await fetchTTLs(mockServer, [key1, key2, key3]);

      expect(mockServer.getLedgerEntries).toHaveBeenCalledWith(key1, key2, key3);
      expect(result.size).toBe(3);
      expect(result.get(key1Xdr)).toBe(5500);
      expect(result.get(key2Xdr)).toBeNull();
      expect(result.get(key3Xdr)).toBeNull(); // Missing key not in response entries
    });

    it("handles response with null/undefined entries array gracefully", async () => {
      const key1 = makeLedgerKey(4);
      const key1Xdr = key1.toXDR("base64");

      const mockServer = {
        getLedgerEntries: jest.fn().mockResolvedValue({
          latestLedger: 2000,
          entries: undefined,
        }),
      } as unknown as SorobanRpc.Server;

      const result = await fetchTTLs(mockServer, [key1]);
      expect(result.size).toBe(1);
      expect(result.get(key1Xdr)).toBeNull();
    });
  });
});
