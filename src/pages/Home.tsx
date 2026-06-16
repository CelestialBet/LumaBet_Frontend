import { Link } from "react-router-dom";
import { useWallet } from "../hooks/useWallet.js";
import BetFeed from "../components/BetFeed.js";

const GAMES = [
  {
    to: "/game/dice",
    emoji: "🎲",
    title: "Dice Roll",
    description: "Pick a number 1–6. Win 5x your bet.",
    badge: "Live",
    color: "from-luma-700 to-luma-900",
  },
  {
    to: "/game/coinflip",
    emoji: "🪙",
    title: "Coin Flip",
    description: "50/50 chance. Win 2× your bet. Provably fair.",
    badge: "Live",
    color: "from-yellow-900 to-gray-900",
  },
  {
    to: "#",
    emoji: "🎰",
    title: "Slots",
    description: "Spin the reels. Progressive jackpot.",
    badge: "Soon",
    color: "from-gray-800 to-gray-900",
    disabled: true,
  },
];

const STATS = [
  { label: "Total Bets", value: "—" },
  { label: "Total Volume", value: "— XLM" },
  { label: "Biggest Win", value: "— XLM" },
  { label: "Active Players", value: "—" },
];

export default function Home() {
  const { isConnected, connect } = useWallet();

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center space-y-6 py-12">
        <div className="text-6xl">🎲</div>
        <h1 className="text-5xl font-black text-white">
          Decentralized Casino
          <br />
          <span className="text-luma-400">on Stellar XLM</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Provably fair games powered by Soroban smart contracts. Your funds stay in
          escrow on-chain — we never hold your keys.
        </p>
        {!isConnected ? (
          <button onClick={connect} className="btn-primary text-lg px-8 py-4">
            Connect Wallet to Play
          </button>
        ) : (
          <Link to="/game/dice" className="btn-primary text-lg px-8 py-4 inline-block">
            Play Now
          </Link>
        )}
      </section>

      {/* Stats bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map(({ label, value }) => (
          <div key={label} className="card text-center">
            <p className="text-2xl font-bold text-luma-400">{value}</p>
            <p className="text-sm text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </section>

      {/* Games grid */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Games</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {GAMES.map(({ to, emoji, title, description, badge, color, disabled }) => (
            <Link
              key={title}
              to={disabled ? "#" : to}
              className={`card bg-gradient-to-br ${color} hover:scale-105 transition-transform duration-200 ${
                disabled ? "opacity-60 cursor-not-allowed" : ""
              } block`}
              onClick={(e) => disabled && e.preventDefault()}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl">{emoji}</span>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    badge === "Live"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {badge}
                </span>
              </div>
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="text-gray-400 mt-2 text-sm">{description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Live bet feed */}
      <BetFeed />

      {/* How it works */}
      <section className="card space-y-6">
        <h2 className="text-2xl font-bold">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: "1", title: "Connect Wallet", body: "Link your Freighter wallet — no signup required." },
            { step: "2", title: "Place a Bet", body: "Choose your game, pick your prediction, and submit a signed transaction." },
            { step: "3", title: "Collect Winnings", body: "Smart contracts resolve the outcome and pay you automatically." },
          ].map(({ step, title, body }) => (
            <div key={step} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-luma-600 flex items-center justify-center text-sm font-bold shrink-0">
                {step}
              </div>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-gray-400 text-sm mt-1">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
