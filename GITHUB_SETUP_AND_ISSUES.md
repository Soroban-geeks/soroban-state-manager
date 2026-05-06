# GitHub Organisation Setup & Issues Pipeline Guide

Complete step-by-step instructions to create a GitHub organisation, push this project,
and set up the 10-issue development pipeline that makes this project wave-ready for
the Stellar Drips program.

---

## PART 1 — Create a GitHub Organisation

### Step 1 — Sign in to GitHub
Go to https://github.com and sign in with your personal account.

### Step 2 — Open the New Organisation page
Click your profile avatar (top-right) → **Your organizations** → **New organization**.

### Step 3 — Pick a plan
Select **Free** and click **Create a free organization**.

### Step 4 — Fill in the organisation details
- **Organization account name:** `Soroban-geeks`
  *(This must be unique. If taken, try `soroban-state-mgr` or `ssm-stellar`)*
- **Contact email:** your email address
- **This organization belongs to:** My personal account
Click **Next**.

### Step 5 — Skip the member invite step
Click **Complete setup** (you can invite contributors later).

---

## PART 2 — Create the Repository inside the Organisation

### Step 6 — Create the repository
From your new organisation page click **New repository** (or go to
`https://github.com/organizations/Soroban-geeks/repositories/new`).

Fill in:
- **Repository name:** `Soroban-geeks`
- **Description:** `Ledger entry expiration toolkit for Soroban — TypeScript library for TTL management, auto-restore, and expiration monitoring`
- **Visibility:** ✅ Public
- **Initialize:** Leave ALL boxes (README, .gitignore, license) **unchecked** — the repo comes with its own.

Click **Create repository**.

### Step 7 — Copy the remote URL
GitHub will show you the empty repo. Copy the HTTPS URL — it will look like:
```
https://github.com/Soroban-geeks/Soroban-geeks.git
```

---

## PART 3 — Push the Project

### Step 8 — Initialise git in the project folder
Open a terminal inside the `Soroban-geeks/` folder (the one with `package.json`):

```bash
git init
git add .
git commit -m "feat: initial release — StateManager, ExpirationWatcher, React hooks"
```

### Step 9 — Add the remote and push
```bash
git remote add origin https://github.com/Soroban-geeks/Soroban-geeks.git
git branch -M main
git push -u origin main
```

### Step 10 — Create the develop branch
```bash
git checkout -b develop
git push -u origin develop
```

### Step 11 — Set develop as default branch (optional but recommended)
On GitHub: **Settings** → **General** → **Default branch** → change to `develop` → **Update**.

---

## PART 4 — Repository Settings for Wave Credibility

### Step 12 — Add repository topics
On the repository main page click the ⚙️ gear icon next to **About** (top-right of the code panel).

Add these topics one by one:
```
soroban  stellar  blockchain  typescript  sdk  ttl  state-expiration  ledger  smart-contracts  drips
```
Click **Save changes**.

### Step 13 — Add a repository description and website
Still in the About panel:
- **Description:** already set from Step 6
- **Website:** leave blank for now (add docs URL later)
- Check **Releases**, **Packages**
Click **Save changes**.

### Step 14 — Enable branch protection on main
Go to **Settings** → **Branches** → **Add branch protection rule**.
- Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Search for and add: `Test & Lint (18.x)`, `Test & Lint (20.x)`, `Build`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings
Click **Create**.

---

## PART 5 — Create the GitHub Project Board (Kanban Pipeline)

### Step 15 — Create a Project
Go to your organisation page: `https://github.com/Soroban-geeks`
Click **Projects** tab → **New project**.
- Select **Board** template
- Name it: `Soroban-geeks — Development Pipeline`
Click **Create project**.

### Step 16 — Configure columns
The default board has: Todo / In Progress / Done.
Add one more column: click **+ Add column** → name it `In Review`.

Final column order: **Todo → In Progress → In Review → Done**

### Step 17 — Link the project to the repository
In the project, click **⚙️ Settings** (top-right) → **Manage access** → under **Repository access** add `Soroban-geeks/Soroban-geeks`. Click **Save**.

---

## PART 6 — Create the 10 Development Issues

Go to your repository: `https://github.com/Soroban-geeks/Soroban-geeks`
Click **Issues** → **New issue** for each one below.

---

### Issue 1 — Project Foundation & Core Types

**Title:** `[Foundation] Define core TypeScript types and project scaffold`

**Labels:** `good first issue`, `foundation`

**Body:**
```markdown
## Overview
Establish the TypeScript type system that the entire library is built on.
This is the first task in the pipeline and blocks all other issues.

## Tasks
- [ ] Define `LedgerKey`, `ExpirationInfo`, `ExpirationMap` types in `src/types/index.ts`
- [ ] Define `BumpOptions`, `BumpResult`, `RestoreOptions`, `RestoreResult` types
- [ ] Define `StateManagerConfig` and `WatcherConfig` interfaces
- [ ] Define `EntryExpirationState` and `ContractExpirationState` for React hooks
- [ ] Configure `tsconfig.json` with strict mode
- [ ] Configure `tsup.config.ts` for dual CJS/ESM output
- [ ] Set up `package.json` with correct `exports` map

## Acceptance Criteria
- `tsc --noEmit` passes with zero errors
- All types are exported from `src/types/index.ts`
- Build produces `dist/index.js` and `dist/index.esm.js`

## References
- Soroban storage model: https://developers.stellar.org/docs/build/smart-contracts/storage
- Drips Wave program: https://drips.network/app/drip-lists
```

**Assign to:** yourself
**Project:** Soroban-geeks — Development Pipeline
**Column:** Todo

---

### Issue 2 — RPC Utilities & Ledger Math Helpers

**Title:** `[Core] Implement RPC utility layer and ledger arithmetic helpers`

**Labels:** `core`, `utilities`

**Body:**
```markdown
## Overview
Build the thin RPC wrapper (`src/utils/rpc.ts`) and pure ledger math utilities
(`src/utils/ledger.ts`) that the `StateManager` class depends on.

## Tasks
- [ ] Implement `createServer(rpcUrl)` — builds `SorobanRpc.Server` instance
- [ ] Implement `fetchCurrentLedger(server)` — returns current ledger sequence
- [ ] Implement `fetchTTLs(server, keys[])` — batch TTL fetch, returns `Map<xdrKey, expiresAtLedger | null>`
- [ ] Implement `ledgersToMs(ledgers, msPerLedger?)` — time estimation
- [ ] Implement `msToLedgers(ms, msPerLedger?)` — inverse conversion
- [ ] Implement `formatDuration(ms)` — human-readable string ("2d 3h", "expired")
- [ ] Implement `ledgersRemaining(current, expiresAt)` — never returns negative
- [ ] Implement `ledgerKeyId(contractId, key, storageType)` — stable composite map key

## Acceptance Criteria
- All pure utility functions have unit tests in `src/__tests__/ledger.test.ts`
- `fetchTTLs` correctly returns `null` for keys that do not exist in RPC response
- All tests pass: `npm test`

## Depends On
- Issue #1 (types)
```

---

### Issue 3 — StateManager Class: getExpirationMap

**Title:** `[StateManager] Implement getExpirationMap — full contract TTL snapshot`

**Labels:** `core`, `feature`

**Body:**
```markdown
## Overview
Implement the `getExpirationMap(contractId, storageTypes?)` method on `StateManager`.
This is the most-used read path in the library.

## Tasks
- [ ] Implement `StateManager` constructor with config merging
- [ ] Implement `getExpirationMap(contractId, storageTypes?)` 
  - Builds XDR ledger keys for the contract's instance storage entry
  - Calls `fetchTTLs` in bulk
  - Enriches raw TTL data into `ExpirationInfo` objects (isExpired, isExpiringSoon, timeUntilExpiryMs, etc.)
  - Returns `ExpirationMap`
- [ ] Implement `getEntryExpiration(ledgerKey)` single-entry convenience method
- [ ] Handle expired entries gracefully (return `isExpired: true`, not throw)

## Acceptance Criteria
- Returns correct `ExpirationInfo` for both live and expired entries
- `isExpiringSoon` is `true` when `ledgersUntilExpiry <= warningThresholdLedgers`
- Unit tested with mocked RPC responses
- `npm test` passes

## Depends On
- Issue #1, Issue #2
```

---

### Issue 4 — StateManager Class: bumpEntry & bumpEntries

**Title:** `[StateManager] Implement bumpEntry and bumpEntries — TTL extension`

**Labels:** `core`, `feature`

**Body:**
```markdown
## Overview
Implement the write path for bumping (extending) ledger entry TTLs.
Uses `Operation.extendFootprintTtl` and requires a signing keypair.

## Tasks
- [ ] Implement `bumpEntry(ledgerKey, options)`:
  - Builds and simulates `extendFootprintTtl` transaction
  - Assembles, signs, and submits using `SorobanRpc.assembleTransaction`
  - Polls for confirmation via `getTransaction` loop
  - Returns `BumpResult` with `transactionHash` and `newExpiresAtLedger`
- [ ] Implement `bumpEntries(contractId, ledgerBuffer, options?)`:
  - Calls `getExpirationMap` then iterates, bumping all non-expired entries
  - Returns `BumpResult[]`
- [ ] Return descriptive error string in `BumpResult.error` on failure (never throw)
- [ ] Respect `fee`, `timeoutMs`, and `networkPassphrase` from `BumpOptions`

## Acceptance Criteria
- Returns `{ success: false, error: "secretKey is required..." }` when no key configured
- Simulation errors surface in `BumpResult.error`
- All code paths covered by unit tests with mocked `SorobanRpc.Server`

## Depends On
- Issue #3
```

---

### Issue 5 — StateManager Class: autoRestore

**Title:** `[StateManager] Implement autoRestore — expired entry restoration`

**Labels:** `core`, `feature`

**Body:**
```markdown
## Overview
Implement `autoRestore(ledgerKey, options?)` which submits a `RestoreFootprint`
transaction and optionally bumps the entry immediately after.

## Tasks
- [ ] Implement `autoRestore(ledgerKey, options?)`:
  - Builds and simulates `Operation.restoreFootprint({})` transaction
  - Assembles, signs, and submits
  - Polls for confirmation
  - If `options.bumpAfterRestore` is `true`, call `bumpEntry` with `options.bumpBuffer`
  - Returns `RestoreResult` (with optional nested `bumpResult`)
- [ ] Ensure `RestoreResult.error` captures all failure modes

## Acceptance Criteria
- `bumpResult` is populated when `bumpAfterRestore: true` and restore succeeds
- Returns `{ success: false }` (not throw) when missing `secretKey`
- Covered by unit tests

## Depends On
- Issue #4
```

---

### Issue 6 — ExpirationWatcher Background Poller

**Title:** `[Watcher] Implement ExpirationWatcher — background TTL polling with events`

**Labels:** `core`, `feature`

**Body:**
```markdown
## Overview
Implement `ExpirationWatcher` — a class extending `EventEmitter` that runs a
polling loop to monitor contract entry TTLs and emit typed events.

## Tasks
- [ ] Class extends `EventEmitter<WatcherEvents>` (using `eventemitter3`)
- [ ] `start()` — begins polling immediately, then on `pollIntervalMs` interval
- [ ] `stop()` — clears interval, sets `running = false`
- [ ] `isRunning` getter
- [ ] Emit `poll` on every cycle with the full `ExpirationMap`
- [ ] Emit `expiringSoon` for entries where `isExpiringSoon === true`
- [ ] Emit `expired` for entries where `isExpired === true`
- [ ] When `autoBumpOnWarning` is true, call `sm.bumpEntry` and emit `autoBumped`
- [ ] Emit `error` (never crash) on RPC or bump failures
- [ ] `StateManager.startWatcher(contractId)` creates and starts a watcher, stops any existing one
- [ ] `StateManager.stopWatcher()` stops and nullifies

## Acceptance Criteria
- All 5 events tested in `src/__tests__/ExpirationWatcher.test.ts`
- Watcher stops cleanly with no dangling intervals
- `autoBumpOnWarning` path calls `bumpEntry` and emits `autoBumped`

## Depends On
- Issue #5
```

---

### Issue 7 — React Hooks: useEntryExpiration & useContractExpiration

**Title:** `[React] Implement useEntryExpiration and useContractExpiration hooks`

**Labels:** `react`, `feature`

**Body:**
```markdown
## Overview
Implement the two React hooks that allow frontend apps to integrate TTL monitoring
and management without manually managing polling state.

## Tasks

### useEntryExpiration(sm, ledgerKey, refreshIntervalMs?)
- [ ] Fetches `ExpirationInfo` for a single entry on mount and on interval
- [ ] Exposes `{ expirationInfo, isLoading, error, refresh, bump, restore }`
- [ ] `bump(options?)` calls `sm.bumpEntry` then refreshes
- [ ] `restore(options?)` calls `sm.autoRestore` then refreshes
- [ ] Cleans up interval on unmount

### useContractExpiration(sm, contractId, refreshIntervalMs?)
- [ ] Fetches full `ExpirationMap` for a contract on mount and on interval
- [ ] Exposes `{ expirationMap, isLoading, error, refresh, bumpAll }`
- [ ] `bumpAll(options?)` calls `sm.bumpEntries` then refreshes
- [ ] Exported from `src/hooks/index.ts` and the `./react` package export

## Acceptance Criteria
- Hooks compile against React 17+ and 18+ peer deps
- `peerDependencies` correctly marks React as optional
- Types match `EntryExpirationState` / `ContractExpirationState` interfaces

## Depends On
- Issue #6
```

---

### Issue 8 — Test Coverage & CI Green

**Title:** `[Testing] Achieve 80%+ coverage and green CI on Node 18 + 20`

**Labels:** `testing`, `ci`

**Body:**
```markdown
## Overview
Ensure the test suite covers all critical code paths, coverage thresholds are met,
and the GitHub Actions CI workflow passes on Node 18.x and 20.x.

## Tasks
- [ ] `src/__tests__/ledger.test.ts` — all utility functions (target: 100%)
- [ ] `src/__tests__/ExpirationWatcher.test.ts` — all 5 events, autoBump, stop() (target: 90%+)
- [ ] `src/__tests__/StateManager.test.ts` — mock RPC server, cover getExpirationMap / bumpEntry / autoRestore
- [ ] Verify CI workflow passes on both Node versions: `npm run test:coverage`
- [ ] Coverage report shows ≥80% statements, lines, and functions globally
- [ ] Ensure `npm run type-check` and `npm run lint` pass in CI

## Acceptance Criteria
- `npm run test:coverage` exits with code 0
- GitHub Actions badge on README shows green
- No `any` types, no lint errors

## Depends On
- Issue #7
```

---

### Issue 9 — Documentation & Examples

**Title:** `[Docs] Write README, API reference, and runnable examples`

**Labels:** `documentation`

**Body:**
```markdown
## Overview
Ensure the library is comprehensively documented so Wave reviewers can understand
it immediately and developers can use it without reading the source.

## Tasks
- [ ] README.md:
  - [ ] Feature table with all public API methods
  - [ ] Quick-start for Node.js / TypeScript
  - [ ] Background Watcher usage example
  - [ ] React hooks usage example (useContractExpiration + useEntryExpiration)
  - [ ] API reference table for StateManager constructor config
  - [ ] Storage types explainer table
  - [ ] Contributing and License sections
- [ ] `examples/basic/index.ts` — runnable Node.js demo with comments
- [ ] `examples/react-app/src/App.tsx` — minimal React demo
- [ ] `CONTRIBUTING.md` — dev setup, branch strategy, commit convention
- [ ] `CHANGELOG.md` — initial entry for v0.1.0
- [ ] Add JSDoc to all exported symbols

## Acceptance Criteria
- README renders correctly on GitHub (check headers, code blocks, tables)
- Example files have no TypeScript errors
- All exported functions have `@example` in JSDoc

## Depends On
- Issue #7
```

---

### Issue 10 — v0.1.0 Release Prep & npm Publish

**Title:** `[Release] Prepare v0.1.0 — version bump, tag, and npm publish`

**Labels:** `release`

**Body:**
```markdown
## Overview
Cut the first public release of `@Soroban-geeks/core`.

## Tasks
- [ ] Ensure all Issues #1–#9 are closed / in Done column
- [ ] Update `CHANGELOG.md` — move `[Unreleased]` to `[0.1.0]` with today's date
- [ ] Run full validation:
  ```bash
  npm run type-check
  npm run lint
  npm run test:coverage
  npm run build
  ls dist/
  ```
- [ ] Bump version in `package.json` to `0.1.0`
- [ ] Commit: `chore: release v0.1.0`
- [ ] Tag and push:
  ```bash
  git tag v0.1.0
  git push origin main --tags
  ```
- [ ] Verify GitHub Actions Release workflow publishes to npm
- [ ] Add npm badge to README once package is live
- [ ] Create GitHub Release from the tag with auto-generated notes

## Acceptance Criteria
- `npm install @Soroban-geeks/core` works from a fresh project
- Both `require` (CJS) and `import` (ESM) work
- React hooks importable via `@Soroban-geeks/core/react`

## Depends On
- Issues #1–#9 all closed
```

---

## PART 7 — Add Issues to the Project Board

### Step 18 — Add each issue to the Project
After creating each issue, on the right sidebar under **Projects** click the gear icon →
select **Soroban-geeks — Development Pipeline** → place it in the **Todo** column.

### Step 19 — Set issue order in Todo column
Drag issues into this order (top = highest priority):
1. Issue #1 — Foundation
2. Issue #2 — RPC Utilities
3. Issue #3 — getExpirationMap
4. Issue #4 — bumpEntry
5. Issue #5 — autoRestore
6. Issue #6 — ExpirationWatcher
7. Issue #7 — React Hooks
8. Issue #8 — Test Coverage
9. Issue #9 — Documentation
10. Issue #10 — Release Prep

### Step 20 — Create Labels (if they don't exist)
Go to **Issues** → **Labels** → **New label** for each:

| Label | Color |
|-------|-------|
| `foundation` | `#0075ca` |
| `core` | `#e4e669` |
| `react` | `#61dafb` |
| `utilities` | `#cfd3d7` |
| `testing` | `#d4c5f9` |
| `ci` | `#f9d0c4` |
| `documentation` | `#0075ca` |
| `release` | `#e11d48` |
| `feature` | `#a2eeef` |

---

## Summary Checklist

- [ ] GitHub Organisation created: `Soroban-geeks`
- [ ] Repository created: `Soroban-geeks/Soroban-geeks` (public)
- [ ] Code pushed to `main`
- [ ] `develop` branch created and pushed
- [ ] Repository topics added (soroban, stellar, typescript, etc.)
- [ ] Branch protection enabled on `main`
- [ ] GitHub Project board created with 4 columns
- [ ] All 10 issues created with correct labels and assigned to project
- [ ] Issues ordered in Todo column
- [ ] Custom labels created
