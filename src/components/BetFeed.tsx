import { useBetFeed } from "../hooks/useBetFeed.js";

const GAME_LABELS: Record<string, string> = {
  DICE: "🎲 Dice",
  COIN_FLIP: "🪙 Coin",
  SLOTS: "🎰 Slots",
};

const STATUS_STYLES: Record<string, string> = {
  WON: "bg-green-500/20 text-green-400",
  LOST: "bg-red-500/20 text-red-400",
  PENDING: "bg-yellow-500/20 text-yellow-400",
  WITHDRAWN: "bg-gray-500/20 text-gray-400",
  EXPIRED: "bg-gray-500/20 text-gray-400",
};

function truncateKey(key: string): string {
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-800/60 animate-pulse">
      <div className="h-5 w-16 bg-gray-700 rounded" />
      <div className="h-4 w-20 bg-gray-700 rounded flex-1" />
      <div className="h-4 w-12 bg-gray-700 rounded" />
      <div className="h-5 w-14 bg-gray-700 rounded" />
      <div className="h-4 w-10 bg-gray-700 rounded" />
    </div>
  );
}

export default function BetFeed() {
  const { bets, isLoading, error, timeAgo } = useBetFeed();

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Live Bets</h2>
        <span className="text-xs text-gray-500">Updates every 10s</span>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {isLoading && !bets.length && (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {!isLoading && !error && bets.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">No bets yet — be the first to play!</p>
      )}

      {bets.length > 0 && (
        <div>
          {bets.map((bet) => (
            <div
              key={bet.id}
              className="flex items-center gap-3 py-3 border-b border-gray-800/60 last:border-0 transition-all duration-300 text-sm"
            >
              {/* Game badge */}
              <span className="shrink-0 text-xs font-medium text-gray-300 w-16">
                {GAME_LABELS[bet.game_type] ?? bet.game_type}
              </span>

              {/* Player */}
              <span className="text-gray-500 font-mono text-xs flex-1">
                {truncateKey(bet.player_public_key)}
              </span>

              {/* Amount */}
              <span className="text-gray-300 tabular-nums shrink-0">
                {parseFloat(bet.amount_xlm).toFixed(2)} XLM
              </span>

              {/* Status */}
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                  STATUS_STYLES[bet.status] ?? "bg-gray-700 text-gray-400"
                }`}
              >
                {bet.status}
              </span>

              {/* Time */}
              <span className="text-gray-600 text-xs shrink-0 w-12 text-right">
                {timeAgo(bet.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
