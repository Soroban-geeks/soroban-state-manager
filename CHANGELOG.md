# Changelog

All notable changes to `Soroban-geeks` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- `StateManager` class with `getExpirationMap`, `bumpEntries`, `bumpEntry`, `autoRestore`
- `ExpirationWatcher` background poller with `expiringSoon`, `expired`, `autoBumped`, `error`, `poll` events
- `useEntryExpiration` React hook
- `useContractExpiration` React hook
- Utility helpers: `formatDuration`, `ledgersToMs`, `msToLedgers`
- Full TypeScript types and JSDoc
- CI via GitHub Actions (Node 18 + 20)
- Jest test suite with coverage thresholds

---

## [0.1.0] — TBD

Initial public release.
