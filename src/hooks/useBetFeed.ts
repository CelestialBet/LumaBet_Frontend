import { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:3001";
const POLL_INTERVAL_MS = 10_000;

export interface BetFeedItem {
  id: string;
  player_public_key: string;
  game_type: "DICE" | "COIN_FLIP" | "SLOTS";
  prediction: number;
  amount_xlm: string;
  outcome: number | null;
  status: "PENDING" | "WON" | "LOST" | "WITHDRAWN" | "EXPIRED";
  payout_xlm: string | null;
  created_at: string;
}

interface UseBetFeedReturn {
  bets: BetFeedItem[];
  isLoading: boolean;
  error: string | null;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function useBetFeed(): UseBetFeedReturn & { timeAgo: typeof timeAgo } {
  const [bets, setBets] = useState<BetFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchBets() {
    try {
      const res = await fetch(`${API_URL}/game/history?limit=10&offset=0`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { data: BetFeedItem[] };
      setBets(data.data ?? []);
      setError(null);
    } catch {
      setError("Could not load recent bets");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchBets();
    intervalRef.current = setInterval(() => void fetchBets(), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  return { bets, isLoading, error, timeAgo };
}
