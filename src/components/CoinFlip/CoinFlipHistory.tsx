import { useState, useEffect, useCallback } from "react";
import { useFreighter } from "../../hooks/useFreighter.js";

const API = import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:3001";
const STELLAR_EXPERT = "https://stellar.expert/explorer/testnet/tx";

interface BetRow {
  id: string;
  player_address: string;
  game_type: string;
  bet_amount: string;
  player_choice: number | null;
  outcome: number | null;
  payout_amount: string | null;
  status: string;
  commit_tx_hash: string | null;
  reveal_tx_hash: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface ApiResponse {
  data: BetRow[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    won: "bg-green-500/20 text-green-400",
    lost: "bg-red-500/20 text-red-400",
    committed: "bg-yellow-500/20 text-yellow-400",
    building: "bg-gray-700 text-gray-400",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? "bg-gray-700 text-gray-400"}`}>
      {status}
    </span>
  );
}

function stroopsToXlm(stroops: string | null): string {
  if (!stroops) return "—";
  return (Number(BigInt(stroops)) / 10_000_000).toFixed(4);
}

function shortHash(hash: string | null): string {
  if (!hash) return "—";
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export default function CoinFlipHistory() {
  const { publicKey, isConnected } = useFreighter();
  const [rows, setRows] = useState<BetRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (p: number) => {
      if (!publicKey) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          playerAddress: publicKey,
          limit: String(PAGE_SIZE),
          offset: String(p * PAGE_SIZE),
        });
        const res = await fetch(`${API}/api/games/coinflip/history?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ApiResponse;
        setRows(json.data);
        setTotal(json.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    },
    [publicKey]
  );

  useEffect(() => {
    if (isConnected && publicKey) {
      void fetchPage(page);
    }
  }, [isConnected, publicKey, page, fetchPage]);

  if (!isConnected) return null;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">My Bet History</h3>
        <button
          onClick={() => fetchPage(page)}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {error}
        </p>
      )}

      {rows.length === 0 && !loading ? (
        <p className="text-gray-500 text-sm text-center py-8">No bets yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Pick</th>
                <th className="text-right px-4 py-3">Bet (XLM)</th>
                <th className="text-right px-4 py-3">Payout (XLM)</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">Tx</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-800/50 hover:bg-gray-900/40 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(row.created_at).toLocaleDateString()}{" "}
                    {new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    {row.player_choice === 0 ? "🟡 HEADS" : row.player_choice === 1 ? "⚫ TAILS" : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {stroopsToXlm(row.bet_amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gold-400">
                    {row.status === "won" ? stroopsToXlm(row.payout_amount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.reveal_tx_hash ? (
                      <a
                        href={`${STELLAR_EXPERT}/${row.reveal_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-luma-400 hover:text-luma-300 font-mono text-xs"
                      >
                        {shortHash(row.reveal_tx_hash)}
                      </a>
                    ) : row.commit_tx_hash ? (
                      <a
                        href={`${STELLAR_EXPERT}/${row.commit_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-gray-300 font-mono text-xs"
                      >
                        {shortHash(row.commit_tx_hash)}
                      </a>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-gray-500">
            Page {page + 1} of {totalPages} &nbsp;·&nbsp; {total} bets
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1 || loading}
            className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
