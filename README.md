# LumaBet Frontend

React + Vite + TypeScript web UI for the CelestialBet decentralized casino on Stellar XLM.

## Stack

- **React 18** + TypeScript
- **Vite 5** — dev server & bundler
- **Tailwind CSS** — styling
- **Freighter** wallet integration (`@stellar/freighter-api`)
- **Stellar SDK** — on-chain reads via Horizon
- **@noble/hashes** — client-side SHA-256 for commit-reveal

## Getting Started

```bash
pnpm install
cp .env.example .env   # set VITE_API_BASE_URL=http://localhost:3001
pnpm dev               # http://localhost:5173
```

## Scripts

| Command           | Description                          |
|-------------------|--------------------------------------|
| `pnpm dev`        | Start Vite dev server                |
| `pnpm build`      | TypeScript + Vite production build   |
| `pnpm preview`    | Preview production build             |
| `pnpm lint`       | ESLint                               |
| `pnpm type-check` | TypeScript strict check              |
| `pnpm test`       | Vitest with coverage report          |
| `pnpm test:watch` | Vitest in watch mode                 |

## Pages & Routes

| Route    | Component         | Description                                  |
|----------|-------------------|----------------------------------------------|
| `/`      | Home              | Landing page with game cards                 |
| `/game`  | CoinFlipGame      | Provably-fair coin flip (commit-reveal VRF)  |
| `/wallet`| Wallet            | Balance, explorer link, Friendbot faucet     |
| `/history`| CoinFlipHistory  | Paginated bet history for connected wallet   |

## Coin Flip — How It Works

The game uses a **commit-reveal** scheme so neither the player nor the house can predict or manipulate the outcome:

1. **Commit** — browser generates a 32-byte secret, hashes it (`sha256(secret)`), and submits the hash on-chain alongside the bet amount.
2. **Reveal** — player signs the reveal transaction. The contract computes `outcome = sha256(secret ∥ contract_seed) % 2`. The secret is immediately zeroed from memory after signing.
3. **Settle** — payout is credited on-chain if the player guessed correctly.

## Security Model

- **Secret zeroing**: `secret.fill(0)` is called on the `Uint8Array` immediately after `signTransaction` returns — the secret never persists beyond the reveal phase.
- **Transaction preview**: a modal summarizes the transaction (type, amount, choice) before Freighter is invoked.
- **No `console.log` in production**: ESLint enforces `no-console: error` in production builds.

## Docs

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and test conventions.
