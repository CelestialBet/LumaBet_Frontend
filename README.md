# LumaBet Frontend

React + Vite + TypeScript web UI for the CelestialBet decentralized casino on Stellar XLM.

## Stack
- **React 18** + TypeScript
- **Vite 5** — dev server & bundler
- **Tailwind CSS** — styling
- **Freighter** wallet integration
- **Stellar SDK** — on-chain reads

## Getting Started

```bash
pnpm install
cp .env.example .env   # set VITE_API_BASE_URL and contract IDs
pnpm dev               # http://localhost:5173
```

## Scripts

| Command          | Description              |
|------------------|--------------------------|
| `pnpm dev`       | Start Vite dev server    |
| `pnpm build`     | TypeScript + Vite build  |
| `pnpm preview`   | Preview production build |
| `pnpm lint`      | ESLint                   |
| `pnpm type-check`| TypeScript strict check  |

## Pages

| Route          | Page       | Description                        |
|----------------|------------|------------------------------------|
| `/`            | Home       | Landing page with game cards       |
| `/game/dice`   | Dice       | Dice game — predict 1–6, win 5×    |
| `/wallet`      | Wallet     | Balance, explorer link, Friendbot  |
| `/history`     | History    | Paginated bet history              |

## Docs

See [docs/frontend.md](docs/frontend.md) for component structure and hook API.
