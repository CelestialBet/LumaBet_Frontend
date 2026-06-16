import WalletConnect from "../components/WalletConnect/WalletConnect.js";
import CoinFlipGame from "../components/CoinFlip/CoinFlipGame.js";
import CoinFlipHistory from "../components/CoinFlip/CoinFlipHistory.js";
import { useState } from "react";

export default function Game() {
  const [lastResult, setLastResult] = useState<boolean | null>(null);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">🪙 Coin Flip</h1>
          <p className="text-gray-400 text-sm mt-1">
            50 / 50 · 2× payout · Provably fair commit-reveal
          </p>
        </div>
        <WalletConnect />
      </div>

      {/* Win / loss flash banner */}
      {lastResult !== null && (
        <div
          className={`text-center py-3 rounded-xl text-sm font-semibold ${
            lastResult
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {lastResult ? "Congratulations — you won!" : "Better luck next time."}
        </div>
      )}

      {/* Game */}
      <CoinFlipGame onResult={setLastResult} />

      {/* History */}
      <div className="card">
        <CoinFlipHistory />
      </div>
    </div>
  );
}
