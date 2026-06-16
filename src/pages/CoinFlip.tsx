import { useState } from "react";
import { useWallet } from "../hooks/useWallet.js";

const API_URL = import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:3001";

type Side = 0 | 1; // 0=heads, 1=tails
type Phase = "idle" | "signing-commit" | "committed" | "signing-reveal" | "resolved";

interface RevealResult {
  outcome: number;
  outcomeName: "HEADS" | "TAILS";
  won: boolean;
  payoutXlm: string | null;
}

// ── Web Crypto helpers ────────────────────────────────────────────────────────

function generateSecret(): Uint8Array {
  const secret = new Uint8Array(32);
  window.crypto.getRandomValues(secret);
  return secret;
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const buf = await window.crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CoinFlip() {
  const { isConnected, publicKey, connect, signTx, refreshBalance } = useWallet();

  const [side, setSide] = useState<Side | null>(null);
  const [betAmount, setBetAmount] = useState("1");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<RevealResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Secret persists in state between commit and reveal
  const [pendingSecret, setPendingSecret] = useState<Uint8Array | null>(null);

  const canCommit =
    isConnected &&
    side !== null &&
    parseFloat(betAmount) >= 0.1 &&
    parseFloat(betAmount) <= 500;

  async function handleCommit() {
    if (!canCommit || !publicKey) return;
    setError(null);

    try {
      setPhase("signing-commit");

      // 1. Generate random secret and commitment client-side
      const secret = generateSecret();
      const commitmentHex = await sha256Hex(secret);

      // 2. Build commit transaction XDR via backend
      const prepRes = await fetch(`${API_URL}/game/coinflip/prepare-commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerPublicKey: publicKey,
          amountXlm: betAmount,
          commitmentHex,
          prediction: side,
        }),
      });

      if (!prepRes.ok) {
        const body = (await prepRes.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to prepare commit");
      }

      const { xdr } = (await prepRes.json()) as { xdr: string };

      // 3. Sign with Freighter
      const signedXdr = await signTx(xdr);

      // 4. Submit via backend — records pending bet in DB
      const commitRes = await fetch(`${API_URL}/game/coinflip/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerPublicKey: publicKey,
          amountXlm: betAmount,
          commitmentHex,
          prediction: side,
          signedXdr,
        }),
      });

      if (!commitRes.ok) {
        const body = (await commitRes.json()) as { error?: string };
        throw new Error(body.error ?? "Commit failed");
      }

      // 5. Store secret in component state — user must now reveal
      setPendingSecret(secret);
      setPhase("committed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("idle");
    }
  }

  async function handleReveal() {
    if (!publicKey || !pendingSecret) return;
    setError(null);

    try {
      setPhase("signing-reveal");

      const secretHex = toHex(pendingSecret);

      // 1. Build reveal transaction XDR
      const prepRes = await fetch(`${API_URL}/game/coinflip/prepare-reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerPublicKey: publicKey, secretHex }),
      });

      if (!prepRes.ok) {
        const body = (await prepRes.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to prepare reveal");
      }

      const { xdr } = (await prepRes.json()) as { xdr: string };

      // 2. Sign with Freighter
      const signedXdr = await signTx(xdr);

      // 3. Submit — contract verifies commitment and resolves payout
      const revealRes = await fetch(`${API_URL}/game/coinflip/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerPublicKey: publicKey, secretHex, signedXdr }),
      });

      if (!revealRes.ok) {
        const body = (await revealRes.json()) as { error?: string };
        throw new Error(body.error ?? "Reveal failed");
      }

      const data = (await revealRes.json()) as RevealResult;
      setResult(data);
      setPhase("resolved");
      setPendingSecret(null);
      await refreshBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("committed"); // Let user retry reveal
    }
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setSide(null);
    setBetAmount("1");
    setPendingSecret(null);
    setError(null);
  }

  // ── Not connected ────────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <p className="text-4xl">🪙</p>
        <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
        <p className="text-gray-400">You need a Freighter wallet to play.</p>
        <button onClick={connect} className="btn-primary">
          Connect Freighter
        </button>
      </div>
    );
  }

  // ── Result screen ────────────────────────────────────────────────────────────

  if (phase === "resolved" && result) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black">🪙 Coin Flip</h1>
        </div>
        <div
          className={`card text-center space-y-4 border-2 ${
            result.won ? "border-green-500" : "border-red-500"
          }`}
        >
          <p className="text-6xl">{result.outcome === 0 ? "🟡" : "⚫"}</p>
          <h2 className={`text-3xl font-black ${result.won ? "text-green-400" : "text-red-400"}`}>
            {result.won ? "You Won!" : "You Lost"}
          </h2>
          <p className="text-gray-400">
            The coin landed on{" "}
            <span className="text-white font-bold text-xl">{result.outcomeName}</span>
          </p>
          {result.won && result.payoutXlm && (
            <p className="text-gold-400 font-bold text-xl">+{result.payoutXlm} XLM</p>
          )}
          <button onClick={reset} className="btn-primary w-full">
            Play Again
          </button>
        </div>

        {/* Provably fair proof */}
        <div className="card bg-gray-900/50 text-sm text-gray-400 space-y-1">
          <p className="font-semibold text-gray-300">Provably Fair</p>
          <p>
            Outcome was derived from <code className="text-luma-400">sha256(your_secret || contract_seed)</code>.
            Neither you nor the contract knew the result before the reveal.
          </p>
        </div>
      </div>
    );
  }

  // ── Reveal pending ───────────────────────────────────────────────────────────

  if (phase === "committed" || phase === "signing-reveal") {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black">🪙 Coin Flip</h1>
          <p className="text-gray-400 mt-2">Step 2 of 2 — Reveal your secret</p>
        </div>

        <div className="card space-y-4 border border-luma-600/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">
              ✓
            </div>
            <div>
              <p className="font-semibold text-sm">Commitment recorded on-chain</p>
              <p className="text-xs text-gray-400">
                Your hashed secret is stored in the contract.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-luma-600 flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <p className="font-semibold text-sm">Reveal to resolve the outcome</p>
              <p className="text-xs text-gray-400">
                Send your original secret. The contract will verify it and pay out instantly.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleReveal}
          disabled={phase === "signing-reveal"}
          className="btn-primary w-full text-lg py-4"
        >
          {phase === "signing-reveal" ? "Waiting for Freighter…" : "Reveal Secret & Collect"}
        </button>

        <p className="text-center text-xs text-gray-500">
          Keep this tab open. Your secret is stored in memory and will be lost on refresh.
          If you refresh, you can still cancel after ~8 minutes.
        </p>
      </div>
    );
  }

  // ── Bet form ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black">🪙 Coin Flip</h1>
        <p className="text-gray-400 mt-2">
          50/50 chance. Win <span className="text-gold-400 font-bold">2×</span> your bet.
          Provably fair commit-reveal.
        </p>
      </div>

      <div className="card space-y-6">
        {/* Side selection */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-3">Your Pick</label>
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                { value: 0 as Side, label: "HEADS", emoji: "🟡" },
                { value: 1 as Side, label: "TAILS", emoji: "⚫" },
              ] as const
            ).map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setSide(value)}
                className={`h-24 rounded-xl text-center transition-all space-y-1 ${
                  side === value
                    ? "bg-luma-600 text-white scale-105 shadow-lg shadow-luma-700/50"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <p className="text-3xl">{emoji}</p>
                <p className="font-bold text-sm">{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Bet amount */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Bet Amount (XLM)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              className="input-field"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              min="0.1"
              max="500"
              step="0.1"
              placeholder="0.1–500 XLM"
            />
            {["1", "5", "10", "50"].map((preset) => (
              <button
                key={preset}
                onClick={() => setBetAmount(preset)}
                className="btn-secondary text-sm px-3 py-2 shrink-0"
              >
                {preset}
              </button>
            ))}
          </div>
          {betAmount && (
            <p className="text-xs text-gray-500 mt-1">
              Potential win:{" "}
              <span className="text-gold-400">
                {(parseFloat(betAmount || "0") * 2 * 0.98).toFixed(4)} XLM
              </span>{" "}
              (2× minus 2% house edge)
            </p>
          )}
        </div>

        {/* How commit-reveal works */}
        <div className="rounded-lg bg-gray-900/60 p-3 text-xs text-gray-400 space-y-1">
          <p className="font-semibold text-gray-300 text-sm">How it works (2 transactions)</p>
          <p>
            <span className="text-luma-400">①</span> You commit a hashed secret on-chain. The contract
            generates its own seed.
          </p>
          <p>
            <span className="text-luma-400">②</span> You reveal your secret. Outcome =
            sha256(secret + seed). Neither side can predict it alone.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleCommit}
          disabled={!canCommit || phase !== "idle"}
          className="btn-primary w-full text-lg py-4"
        >
          {phase === "signing-commit" ? "Waiting for Freighter…" : side !== null ? `Commit Bet — ${betAmount} XLM on ${side === 0 ? "HEADS" : "TAILS"}` : "Pick a side"}
        </button>
      </div>

      {/* Game info */}
      <div className="card bg-gray-900/50 space-y-2 text-sm text-gray-400">
        <p className="font-semibold text-gray-300">Game Info</p>
        <div className="grid grid-cols-2 gap-2">
          <span>Win Probability</span>
          <span className="text-right text-gray-300">1 in 2 (50%)</span>
          <span>Payout</span>
          <span className="text-right text-gold-400">2× your bet</span>
          <span>House Edge</span>
          <span className="text-right text-gray-300">2%</span>
          <span>Min / Max Bet</span>
          <span className="text-right text-gray-300">0.1 / 500 XLM</span>
          <span>Fairness</span>
          <span className="text-right text-gray-300">Commit-reveal VRF</span>
        </div>
      </div>
    </div>
  );
}
