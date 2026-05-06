# Soroban-geeks

**Ledger Entry Expiration Toolkit for Soroban**

[![CI](https://github.com/Soroban-geeks/Soroban-geeks/actions/workflows/ci.yml/badge.svg)](https://github.com/Soroban-geeks/Soroban-geeks/actions)
[![npm version](https://img.shields.io/npm/v/@Soroban-geeks/core)](https://www.npmjs.com/package/@Soroban-geeks/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

> Programmatic, fine-grained control over Soroban ledger entry TTL management — bump entries in bulk, monitor expiration windows, auto-restore expired state, and integrate directly into React apps.

---

## Why this exists

State expiration is the most disruptive concept introduced to Soroban. Ledger entries **expire and must be bumped or restored** — and the community-side JavaScript tooling for managing this barely existed. This library fills that gap with a clean TypeScript API that wraps Soroban RPC calls for TTL management, so you stop worrying about surprise expirations in production.

---

## Features

| Feature | Description |
|---------|-------------|
| `getExpirationMap(contractId)` | Full expiration snapshot of all entries for a contract |
| `bumpEntries(contractId, buffer)` | Bulk TTL bump — extend all entries by N ledgers |
| `bumpEntry(ledgerKey, options)` | Bump a single entry with fine-grained control |
| `autoRestore(entry)` | Restore an expired entry, with optional auto-bump after |
| `ExpirationWatcher` | Background poller that emits `expiringSoon` / `expired` events |
| `useEntryExpiration()` | React hook for a single entry |
| `useContractExpiration()` | React hook for an entire contract's entries |
| `formatDuration(ms)` | Human-readable time-until-expiry strings |

---

## Installation

```bash
npm install @Soroban-geeks/core @stellar/stellar-sdk
```

For React hooks:

```bash
npm install @Soroban-geeks/core @stellar/stellar-sdk react
```

---

## Quick Start

### Node.js / TypeScript

```typescript
import { Networks } from "@stellar/stellar-sdk";
import { StateManager, formatDuration } from "@Soroban-geeks/core";

const sm = new StateManager({
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: Networks.TESTNET,
  secretKey: process.env.STELLAR_SECRET,   // required for bump/restore
});

// 1. Inspect what's expiring
const map = await sm.getExpirationMap("CCID...");
for (const [id, info] of map) {
  console.log(`${id}: ${formatDuration(info.timeUntilExpiryMs)} remaining`);
  // → "instance: 11d 4h remaining"
}

// 2. Extend TTL for all entries by 100 000 ledgers (~5.7 days)
const results = await sm.bumpEntries("CCID...", 100_000);
results.forEach(r => console.log(r.success, r.transactionHash));

// 3. Restore a single expired entry
const restoreResult = await sm.autoRestore(
  { contractId: "CCID...", key: "user_balance", storageType: "persistent" },
  { bumpAfterRestore: true, bumpBuffer: 200_000 }
);
```

### Background Watcher

```typescript
const watcher = sm.startWatcher("CCID...");

watcher.on("expiringSoon", (info) => {
  console.warn(`⚠️ ${info.ledgerKey.key} expires in ${formatDuration(info.timeUntilExpiryMs)}`);
});

watcher.on("expired", (info) => {
  console.error(`❌ ${info.ledgerKey.key} has expired!`);
});

watcher.on("autoBumped", (result) => {
  console.log(`🔧 Auto-bumped: tx ${result.transactionHash}`);
});
```

Enable automatic bumping in the config:

```typescript
const sm = new StateManager({
  // ...
  watcherConfig: {
    warningThresholdLedgers: 50_000,   // ~3 days
    pollIntervalMs: 60_000,
    autoBumpOnWarning: true,
    autoBumpBuffer: 200_000,
  },
});
```

### React Hooks

```tsx
import { useContractExpiration } from "@Soroban-geeks/core/react";

function ContractHealth({ sm, contractId }) {
  const { expirationMap, isLoading, bumpAll } = useContractExpiration(sm, contractId);

  if (isLoading) return <Spinner />;

  return (
    <ul>
      {[...expirationMap.values()].map((info) => (
        <li key={info.ledgerKey.key}>
          {info.ledgerKey.key}: {info.isExpired ? "❌ Expired" : `✅ ${formatDuration(info.timeUntilExpiryMs)}`}
        </li>
      ))}
      <button onClick={() => bumpAll({ ledgerBuffer: 100_000 })}>
        Bump All
      </button>
    </ul>
  );
}
```

```tsx
import { useEntryExpiration } from "@Soroban-geeks/core/react";

function EntryCard({ sm, ledgerKey }) {
  const { expirationInfo, bump, restore } = useEntryExpiration(sm, ledgerKey);

  return (
    <div>
      <p>Expires at ledger: {expirationInfo?.expiresAtLedger}</p>
      <p>Time left: {formatDuration(expirationInfo?.timeUntilExpiryMs ?? 0)}</p>
      <button onClick={() => bump({ ledgerBuffer: 50_000 })}>Bump</button>
      {expirationInfo?.isExpired && (
        <button onClick={() => restore({ bumpAfterRestore: true })}>Restore</button>
      )}
    </div>
  );
}
```

---

## API Reference

### `new StateManager(config)`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rpcUrl` | `string` | ✅ | Soroban RPC endpoint |
| `networkPassphrase` | `string` | ✅ | Stellar network passphrase |
| `secretKey` | `string` | For write ops | Signing key for bump/restore |
| `watcherConfig` | `WatcherConfig` | No | Configures background watcher |
| `msPerLedger` | `number` | No | Time estimation rate (default: 5000) |

### `getExpirationMap(contractId, storageTypes?)`

Returns a `Map<string, ExpirationInfo>` for all entries of a contract.

### `bumpEntries(contractId, ledgerBuffer, options?)`

Bumps all non-expired entries so they live at least `ledgerBuffer` ledgers from now. Returns `BumpResult[]`.

### `bumpEntry(ledgerKey, options)`

Bumps a single entry. `options.ledgerBuffer` is required.

### `autoRestore(ledgerKey, options?)`

Restores an expired entry. Pass `bumpAfterRestore: true` to immediately bump after restoring.

### `startWatcher(contractId)` → `ExpirationWatcher`

Starts the background polling loop. The returned `ExpirationWatcher` extends `EventEmitter` — attach handlers with `.on()`.

**Events:** `expiringSoon` · `expired` · `autoBumped` · `error` · `poll`

---

## Storage Types

Soroban has three storage durability tiers. This library manages `persistent` and `instance` by default (which covers most contracts). `temporary` is supported via explicit `storageType` in `LedgerKey`.

| Type | Description |
|------|-------------|
| `persistent` | Survives ledger closes, requires explicit TTL bumps |
| `instance` | Tied to the contract's lifecycle |
| `temporary` | Low-cost, short-lived, not restorable |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs are welcome against the `develop` branch.

---

## License

[MIT](LICENSE)
