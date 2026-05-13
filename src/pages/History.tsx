import { useState, useEffect, useCallback } from "react";
import { useWallet } from "../hooks/useWallet.js";
import { Bet, BetStatus, GameType } from "../types/index.js";

const API_URL = import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:3001";
const STATUS_COLORS: Record<BetStatus, string> = {
  [BetStatus.PENDING]: "text-yellow-400 bg-yellow-400/10",
  [BetStatus.WON]: "text-green-400 bg-green-400/10",
  [BetStatus.LOST]: "text-red-400 bg-red-400/10",
  [BetStatus.WITHDRAWN]: "text-gray-400 bg-gray-400/10",
  [BetStatus.EXPIRED]: "text-gray-500 bg-gray-500/10",
};

export default function History() {
  const { isConnected, publicKey, connect } = useWallet();
  const [bets, setBets] = useState<Bet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const LIMIT = 10;

  const fetchHistory = useCallback(async () => {
    if (!publicKey) return;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        playerPublicKey: publicKey,
        limit: String(LIMIT),
        offset: String(page * LIMIT),
      });
      const res = await fetch(`${API_URL}/game/history?${params}`);
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json() as { data: Bet[]; total: number };
      setBets(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading history");
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, page]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <p className="text-4xl">📜</p>
        <h2 className="text-2xl font-bold">Bet History</h2>
        <p className="text-gray-400">Connect your wallet to view your bet history.</p>
        <button onClick={connect} className="btn-primary">Connect Freighter</button>
      </div>
    );
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">📜 Bet History</h1>
        <button onClick={fetchHistory} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      {error && (
        <div className="card bg-red-500/10 border-red-500/30 text-red-400">{error}</div>
      )}

      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : bets.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">🎲</p>
          <p>No bets placed yet. Start playing!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet) => (
            <div key={bet.id} className="card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {bet.gameType === GameType.DICE ? "🎲" : "🎮"}
                </span>
                <div>
                  <p className="font-semibold capitalize">{bet.gameType.toLowerCase()}</p>
                  <p className="text-xs text-gray-400">
                    Predicted {bet.prediction}
                    {bet.outcome !== undefined && ` → Rolled ${bet.outcome}`}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-semibold text-gold-400">{bet.amountXlm} XLM</p>
                {bet.payoutXlm && (
                  <p className="text-xs text-green-400">+{bet.payoutXlm} XLM</p>
                )}
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[bet.status]}`}
              >
                {bet.status}
              </span>

              <p className="text-xs text-gray-500 hidden md:block">
                {new Date(bet.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn-secondary text-sm px-4 py-2"
          >
            Previous
          </button>
          <span className="text-gray-400 text-sm">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="btn-secondary text-sm px-4 py-2"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
