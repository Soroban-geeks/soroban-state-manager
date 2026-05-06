# Contributing to Soroban-geeks

Thank you for your interest in contributing! This document explains how to get started.

## Development Setup

```bash
git clone https://github.com/Soroban-geeks/Soroban-geeks.git
cd Soroban-geeks
npm install
```

## Development Workflow

| Command | What it does |
|---------|-------------|
| `npm run dev` | Watch mode — rebuilds on save |
| `npm test` | Run all tests |
| `npm run test:coverage` | Tests + coverage report |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run type-check` | TypeScript strict check |
| `npm run build` | Production build |

## Code Style

- TypeScript strict mode — no `any`
- ESLint enforced
- Tests required for all new public API surface
- JSDoc on all exported symbols

## Branch Strategy

- `main` — stable, tagged releases only
- `develop` — integration branch, PRs merge here
- `feat/<name>` — feature branches
- `fix/<name>` — bug-fix branches

## Pull Requests

1. Fork the repo
2. Branch off `develop`
3. Write tests for your change
4. Ensure `npm test` and `npm run build` pass
5. Open a PR against `develop`

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add bumpEntries bulk override support
fix: handle null expiresAtLedger in getExpirationMap
docs: add autoRestore example to README
test: cover ExpirationWatcher autoBump path
```

## Reporting Issues

Please use the GitHub issue templates in `.github/ISSUE_TEMPLATE/`.
