/**
 * Basic Node.js example: monitor and bump a contract's ledger entries.
 *
 * Run:
 *   npx ts-node examples/basic/index.ts
 */

import { Networks } from "@stellar/stellar-sdk";
import { StateManager, formatDuration } from "../../src/index.js";

const CONTRACT_ID = process.env.CONTRACT_ID ?? "YOUR_CONTRACT_ID_HERE";
const SECRET_KEY  = process.env.SECRET_KEY  ?? "YOUR_SECRET_KEY_HERE";
const RPC_URL     = process.env.RPC_URL     ?? "https://soroban-testnet.stellar.org";

async function main() {
  const sm = new StateManager({
    rpcUrl: RPC_URL,
    networkPassphrase: Networks.TESTNET,
    secretKey: SECRET_KEY,
    watcherConfig: {
      warningThresholdLedgers: 50_000,   // ~3 days
      pollIntervalMs: 30_000,
      autoBumpOnWarning: true,
      autoBumpBuffer: 200_000,           // ~11.5 days
    },
  });

  // ── 1. Inspect expiration state ────────────────────────────────────────────
  console.log("\n📊 Fetching expiration map for contract:", CONTRACT_ID);
  const map = await sm.getExpirationMap(CONTRACT_ID);

  for (const [id, info] of map) {
    const status = info.isExpired
      ? "❌ EXPIRED"
      : info.isExpiringSoon
        ? `⚠️  expires in ${formatDuration(info.timeUntilExpiryMs)}`
        : `✅ expires in ${formatDuration(info.timeUntilExpiryMs)}`;
    console.log(`  ${id}: ${status} (ledger ${info.expiresAtLedger})`);
  }

  // ── 2. Bump all entries ────────────────────────────────────────────────────
  console.log("\n🔧 Bumping all entries with 100 000 ledger buffer…");
  const results = await sm.bumpEntries(CONTRACT_ID, 100_000);
  for (const r of results) {
    console.log(`  ${r.ledgerKey.key}: ${r.success ? "✅ " + r.transactionHash : "❌ " + r.error}`);
  }

  // ── 3. Start the background watcher ───────────────────────────────────────
  console.log("\n👁  Starting expiration watcher (Ctrl-C to quit)…");
  const watcher = sm.startWatcher(CONTRACT_ID);

  watcher.on("expiringSoon", (info) => {
    console.warn(`⚠️  Expiring soon: ${info.ledgerKey.key} — ${formatDuration(info.timeUntilExpiryMs)} remaining`);
  });

  watcher.on("expired", (info) => {
    console.error(`❌ Expired: ${info.ledgerKey.key}`);
  });

  watcher.on("autoBumped", (result) => {
    console.log(`🔧 Auto-bumped: ${result.ledgerKey.key} — tx ${result.transactionHash}`);
  });

  watcher.on("error", (err) => {
    console.error("Watcher error:", err.message);
  });

  process.on("SIGINT", () => {
    sm.stopWatcher();
    console.log("\nWatcher stopped. Goodbye.");
    process.exit(0);
  });
}

main().catch(console.error);
