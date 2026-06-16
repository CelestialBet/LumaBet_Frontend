import { useState, useRef } from "react";
import { sha256 } from "@noble/hashes/sha2.js";
import { useFreighter } from "../../hooks/useFreighter.js";
import { useWallet } from "../../hooks/useWallet.js";

const API = import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:3001";

type Side = 0 | 1; // 0 = heads, 1 = tails
type Phase = "idle" | "signing-commit" | "committed" | "signing-reveal" | "settling" | "resolved";

interface SettleResult {
  outcome: number;
  outcomeName: "HEADS" | "TAILS";
  won: boolean;
  payoutStroops: string | null;
}

interface TxPreview {
  title: string;
  lines: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

function generateSecret(): Uint8Array {
  const buf = new Uint8Array(32);
  window.crypto.getRandomValues(buf);
  return buf;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function commitmentHex(secret: Uint8Array): string {
  return toHex(sha256(secret));
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}/api/games${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `API error ${res.status}`);
  return data;
}

// ── Animated coin ─────────────────────────────────────────────────────────────

function Coin({ outcome, spinning }: { outcome: number | null; spinning: boolean }) {
  return (
    <div
      className={`
        w-32 h-32 rounded-full mx-auto flex items-center justify-center text-5xl
        transition-all duration-700
        ${spinning ? "animate-spin" : ""}
        ${outcome === null ? "bg-gray-700" : outcome === 0 ? "bg-yellow-500 shadow-lg shadow-yellow-500/50" : "bg-gray-500 shadow-lg shadow-gray-400/30"}
      `}
    >
      {outcome === null ? "🪙" : outcome === 0 ? "🟡" : "⚫"}
    </div>
  );
}

// ── Transaction preview modal ─────────────────────────────────────────────────

function TxPreviewModal({ preview }: { preview: TxPreview }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
        <h3 className="text-lg font-bold text-white">{preview.title}</h3>
        <div className="bg-gray-800 rounded-lg p-4 space-y-2">
          {preview.lines.map((line, i) => (
            <p key={i} className="text-sm text-gray-300">
              {line}
            </p>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Review the details above before signing with Freighter.
        </p>
        <div className="flex gap-3">
          <button onClick={preview.onCancel} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={preview.onConfirm} className="btn-primary flex-1">
            Sign with Freighter
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onResult?: (won: boolean) => void;
}

export default function CoinFlipGame({ onResult }: Props) {
  const { isConnected, publicKey, signTransaction, getBalance } = useFreighter();
  const { connect } = useWallet();

  const [side, setSide] = useState<Side | null>(null);
  const [betAmount, setBetAmount] = useState("1");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<SettleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txPreview, setTxPreview] = useState<TxPreview | null>(null);

  // Persisted between commit and reveal — lost on hard refresh
  const secretRef = useRef<Uint8Array | null>(null);
  const betDbIdRef = useRef<string | null>(null);
  const secretHexRef = useRef<string | null>(null);
  const revealXdrRef = useRef<string | null>(null);

  const canBet =
    isConnected &&
    side !== null &&
    parseFloat(betAmount) >= 0.1 &&
    parseFloat(betAmount) <= 500;

  function awaitConfirmation(title: string, lines: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      setTxPreview({
        title,
        lines,
        onConfirm: () => {
          setTxPreview(null);
          resolve();
        },
        onCancel: () => {
          setTxPreview(null);
          reject(new Error("Transaction cancelled by user"));
        },
      });
    });
  }

  // ── Phase 1: commit ──────────────────────────────────────────────────────────

  async function handleCommit() {
    if (!canBet || !publicKey) return;
    setError(null);
    setPhase("signing-commit");

    try {
      const secret = generateSecret();
      const commitment = commitmentHex(secret);

      const { commitXdr, betDbId } = await apiPost<{ commitXdr: string; betDbId: string }>(
        "/coinflip/commit",
        {
          playerAddress: publicKey,
          commitmentHex: commitment,
          betAmountXlm: betAmount,
          playerChoice: side,
        }
      );

      await awaitConfirmation("Commit Bet — Review Transaction", [
        `Type: Coin Flip — Commit`,
        `Bet: ${betAmount} XLM`,
        `Side: ${side === 0 ? "HEADS" : "TAILS"}`,
        `Potential win: ${(parseFloat(betAmount) * 2 * 0.98).toFixed(4)} XLM`,
      ]);

      const signedXdr = await signTransaction(commitXdr);

      // Persist across reveal phase
      secretRef.current = secret;
      secretHexRef.current = toHex(secret);
      betDbIdRef.current = betDbId;

      // Phase 2: submit commit + get reveal XDR
      const { revealXdr } = await apiPost<{ revealXdr: string; commitTxHash: string }>(
        "/coinflip/reveal",
        {
          playerAddress: publicKey,
          secretHex: toHex(secret),
          signedCommitXdr: signedXdr,
          betDbId,
        }
      );

      revealXdrRef.current = revealXdr;
      setPhase("committed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commit failed");
      setPhase("idle");
    }
  }

  // ── Phase 2: reveal ──────────────────────────────────────────────────────────

  async function handleReveal() {
    if (!publicKey || !betDbIdRef.current) return;
    setError(null);
    setPhase("signing-reveal");

    try {
      const revealXdr = revealXdrRef.current;
      if (!revealXdr) throw new Error("Reveal data lost — please start over");

      await awaitConfirmation("Reveal Secret — Review Transaction", [
        `Type: Coin Flip — Reveal`,
        `Bet ID: ${betDbIdRef.current.slice(0, 8)}…`,
        `This signs your secret reveal to determine the outcome.`,
      ]);

      const signedRevealXdr = await signTransaction(revealXdr);

      // Zero secret bytes immediately after signing — cannot be recovered from memory
      if (secretRef.current) {
        secretRef.current.fill(0);
        secretRef.current = null;
      }
      secretHexRef.current = null;
      revealXdrRef.current = null;

      setPhase("settling");

      const data = await apiPost<SettleResult>("/coinflip/settle", {
        playerAddress: publicKey,
        signedRevealXdr,
        betDbId: betDbIdRef.current,
      });

      setResult(data);
      setPhase("resolved");
      betDbIdRef.current = null;
      onResult?.(data.won);
      await getBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reveal failed");
      setPhase("committed"); // let user retry
    }
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setSide(null);
    setBetAmount("1");
    setError(null);
    if (secretRef.current) secretRef.current.fill(0);
    secretRef.current = null;
    betDbIdRef.current = null;
    secretHexRef.current = null;
    revealXdrRef.current = null;
  }

  // ── Not connected ────────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div className="card text-center space-y-4 py-10">
        <Coin outcome={null} spinning={false} />
        <h2 className="text-xl font-bold mt-4">Connect Your Wallet to Play</h2>
        <p className="text-gray-400 text-sm">Freighter wallet required.</p>
        <button onClick={connect} className="btn-primary">
          Connect Freighter
        </button>
      </div>
    );
  }

  // ── Result ───────────────────────────────────────────────────────────────────

  if (phase === "resolved" && result) {
    const payoutXlm = result.payoutStroops
      ? (Number(BigInt(result.payoutStroops)) / 10_000_000).toFixed(4)
      : null;

    return (
      <div className="card space-y-6 text-center">
        <Coin outcome={result.outcome} spinning={false} />
        <div className="space-y-2">
          <h2
            className={`text-3xl font-black ${result.won ? "text-green-400" : "text-red-400"}`}
          >
            {result.won ? "You Won!" : "You Lost"}
          </h2>
          <p className="text-gray-400">
            Landed on <span className="text-white font-bold">{result.outcomeName}</span>
          </p>
          {result.won && payoutXlm && (
            <p className="text-gold-400 text-xl font-bold">+{payoutXlm} XLM</p>
          )}
        </div>
        <div className="text-xs text-gray-500 bg-gray-900/50 rounded-lg p-3">
          Provably fair · outcome = sha256(your_secret ∥ contract_seed) % 2
        </div>
        <button onClick={reset} className="btn-primary w-full">
          Play Again
        </button>
      </div>
    );
  }

  // ── Reveal step ───────────────────────────────────────────────────────────────

  if (phase === "committed" || phase === "signing-reveal" || phase === "settling") {
    return (
      <>
        {txPreview && <TxPreviewModal preview={txPreview} />}
        <div className="card space-y-6">
          <Coin outcome={null} spinning={phase === "settling"} />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">✓</span>
              <p className="text-sm text-gray-300">Commitment recorded on-chain</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-luma-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              <p className="text-sm text-gray-300">Reveal to resolve outcome</p>
            </div>
          </div>
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error}
            </p>
          )}
          <button
            onClick={handleReveal}
            disabled={phase !== "committed"}
            className="btn-primary w-full py-4"
          >
            {phase === "settling"
              ? "Settling on-chain…"
              : phase === "signing-reveal"
              ? "Waiting for Freighter…"
              : "Reveal Secret & Collect"}
          </button>
          <p className="text-xs text-gray-500 text-center">
            Keep this tab open — your secret is stored in memory.
          </p>
        </div>
      </>
    );
  }

  // ── Bet form ─────────────────────────────────────────────────────────────────

  return (
    <>
      {txPreview && <TxPreviewModal preview={txPreview} />}
      <div className="card space-y-6">
        <Coin outcome={null} spinning={phase === "signing-commit"} />

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-3">Pick a Side</label>
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: 0 as Side, label: "HEADS", emoji: "🟡" },
              { value: 1 as Side, label: "TAILS", emoji: "⚫" },
            ] as const).map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setSide(value)}
                className={`h-20 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                  side === value
                    ? "bg-luma-600 text-white scale-105 shadow-lg shadow-luma-600/30"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-sm font-bold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Bet Amount (XLM)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              min="0.1"
              max="500"
              step="0.1"
              className="input-field"
              placeholder="0.1–500"
            />
            {(["1", "5", "10", "50"] as const).map((p) => (
              <button key={p} onClick={() => setBetAmount(p)} className="btn-secondary text-sm px-3 shrink-0">
                {p}
              </button>
            ))}
          </div>
          {betAmount && !isNaN(parseFloat(betAmount)) && (
            <p className="text-xs text-gray-500 mt-1">
              Potential win:{" "}
              <span className="text-gold-400">
                {(parseFloat(betAmount) * 2 * 0.98).toFixed(4)} XLM
              </span>{" "}
              (2× minus 2% house)
            </p>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            {error}
          </p>
        )}

        <button
          onClick={handleCommit}
          disabled={!canBet || phase === "signing-commit"}
          className="btn-primary w-full py-4 text-base font-bold"
        >
          {phase === "signing-commit"
            ? "Waiting for Freighter…"
            : side !== null
            ? `Commit ${betAmount} XLM on ${side === 0 ? "HEADS" : "TAILS"}`
            : "Pick a side to play"}
        </button>

        <div className="text-xs text-gray-500 space-y-1 border-t border-gray-800 pt-4">
          <p className="text-gray-400 font-medium">How commit-reveal works</p>
          <p>① You commit sha256(secret) on-chain. Contract generates its own seed.</p>
          <p>② You reveal the secret. Outcome = sha256(secret ∥ seed) % 2. Neither side can predict it alone.</p>
        </div>
      </div>
    </>
  );
}
