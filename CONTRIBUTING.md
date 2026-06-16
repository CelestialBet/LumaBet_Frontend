# Contributing to LumaBet Frontend

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Freighter browser extension (for manual testing)

## Setup

```bash
pnpm install
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:3001
pnpm dev
```

## Project layout

```
src/
  components/
    CoinFlip/
      CoinFlipGame.tsx    # commit-reveal game UI
      CoinFlipHistory.tsx # past bets table
    WalletConnect/
      WalletConnect.tsx   # connect button + balance display
  hooks/
    useFreighter.ts       # wallet connection and signing
    useWallet.ts          # WalletProvider context
  lib/
    stellar-client/       # Horizon helpers
  pages/
    Game.tsx              # /game route
    Home.tsx              # landing page
  __tests__/
    CoinFlipGame.test.tsx
    useFreighter.test.ts
    setup.ts              # global test setup
```

## Running tests

```bash
pnpm test               # run once with coverage
pnpm test:watch         # watch mode
```

Tests use Vitest + `@testing-library/react`. Mock Freighter and the stellar-client with `vi.mock()` — never let tests make real network calls.

## Key security rules

- **Secret zeroing**: the 32-byte game secret must be zeroed (`secret.fill(0)`) immediately after `signTransaction` returns in the reveal phase. Do not persist the secret anywhere beyond `useRef`.
- **Transaction preview**: always call `awaitConfirmation()` before `signTransaction()` to show the user a summary modal.
- **No `console.log` in production**: ESLint enforces `no-console: error` when `NODE_ENV=production`. Use `console.warn` or `console.error` only for genuine warnings.

## Adding a new game

1. Create `src/components/<GameName>/<GameName>Game.tsx`.
2. Add a route in `src/App.tsx`.
3. Write `src/__tests__/<GameName>Game.test.tsx` with at minimum: idle render, connected render, happy-path flow, error state.

## Pull requests

1. Branch from `main`.
2. `pnpm type-check`, `pnpm lint`, and `pnpm test` must all pass.
3. Test coverage must include the added component's happy path and at least one error case.
4. Never commit `.env` files or `node_modules/`.
