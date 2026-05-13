# LumaBet Frontend — Developer Guide

## Stack
- React 18 + TypeScript + Vite
- Tailwind CSS
- Freighter wallet integration (`@stellar/freighter-api`)
- Stellar SDK (`@stellar/stellar-sdk`)

## Project Structure

```
src/
├── components/
│   ├── Layout.tsx          # App shell — nav bar, footer
│   └── WalletButton.tsx    # Freighter connect/disconnect button
├── hooks/
│   └── useWallet.ts        # Freighter state: connect, sign, balance
├── lib/
│   ├── config.ts           # Network constants, DICE_CONFIG
│   └── stellar-client/     # Stellar SDK helpers
│       ├── wallet.ts       # getBalance, xlmToStroops, fundTestnet
│       └── transactions.ts # submitTransaction, buildPaymentTx
├── pages/
│   ├── Home.tsx            # Landing page with game cards
│   ├── Dice.tsx            # Dice game — predict, bet, result
│   ├── Wallet.tsx          # Balance, explorer link, Friendbot
│   └── History.tsx         # Paginated bet history table
├── types/
│   └── index.ts            # Shared TypeScript interfaces & enums
├── App.tsx                 # Router + WalletProvider
├── main.tsx                # React entry point
└── index.css               # Tailwind base + component classes
```

## Key Hook: `useWallet`

```ts
const {
  isConnected,   // boolean
  publicKey,     // string | null
  network,       // NetworkType | null
  balance,       // string | null (XLM)
  isLoading,     // boolean
  error,         // string | null
  connect,       // () => Promise<void>
  disconnect,    // () => void
  refreshBalance,// () => Promise<void>
  signTx,        // (xdr: string) => Promise<string>
} = useWallet();
```

## Running Locally

```bash
pnpm install
cp .env.example .env    # fill in VITE_API_BASE_URL
pnpm dev                # http://localhost:5173
```

## Building

```bash
pnpm build    # outputs to dist/
pnpm preview  # serve dist/ locally
```
