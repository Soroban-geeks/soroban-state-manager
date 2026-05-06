/**
 * Minimal React example app showing useEntryExpiration and useContractExpiration.
 */

import React, { useMemo, useState } from "react";
import { Networks } from "@stellar/stellar-sdk";
import { StateManager } from "../../../src/index.js";
import { useContractExpiration } from "../../../src/hooks/index.js";
import { formatDuration } from "../../../src/utils/ledger.js";

export default function App() {
  const [contractId, setContractId] = useState("");
  const [rpcUrl, setRpcUrl] = useState("https://soroban-testnet.stellar.org");

  const sm = useMemo(
    () =>
      rpcUrl
        ? new StateManager({
            rpcUrl,
            networkPassphrase: Networks.TESTNET,
          })
        : null,
    [rpcUrl]
  );

  const { expirationMap, isLoading, error, refresh, bumpAll } =
    useContractExpiration(sm, contractId, 30_000);

  return (
    <div style={{ fontFamily: "monospace", padding: 24, maxWidth: 800 }}>
      <h1 style={{ fontSize: 20 }}>🛰 Soroban State Manager Demo</h1>

      <label>RPC URL</label>
      <input
        value={rpcUrl}
        onChange={(e) => setRpcUrl(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: 8 }}
      />

      <label>Contract ID</label>
      <input
        value={contractId}
        onChange={(e) => setContractId(e.target.value)}
        placeholder="C…"
        style={{ display: "block", width: "100%", marginBottom: 8 }}
      />

      <button onClick={refresh} disabled={isLoading}>
        {isLoading ? "Loading…" : "Refresh"}
      </button>
      <button onClick={() => bumpAll({ ledgerBuffer: 100_000 })} disabled={isLoading} style={{ marginLeft: 8 }}>
        Bump All (+100k ledgers)
      </button>

      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}

      <table style={{ marginTop: 16, width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Entry", "Storage", "Expires At", "Time Left", "Status"].map((h) => (
              <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 4 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {expirationMap.size === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 8, color: "#888" }}>
                No entries found — enter a contract ID and click Refresh.
              </td>
            </tr>
          )}
          {[...expirationMap.entries()].map(([id, info]) => (
            <tr key={id}>
              <td style={{ padding: 4 }}>{info.ledgerKey.key}</td>
              <td style={{ padding: 4 }}>{info.ledgerKey.storageType}</td>
              <td style={{ padding: 4 }}>{info.expiresAtLedger}</td>
              <td style={{ padding: 4 }}>{formatDuration(info.timeUntilExpiryMs)}</td>
              <td style={{ padding: 4, color: info.isExpired ? "red" : info.isExpiringSoon ? "orange" : "green" }}>
                {info.isExpired ? "Expired" : info.isExpiringSoon ? "Soon" : "OK"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
