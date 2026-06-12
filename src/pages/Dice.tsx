import { useState } from "react";
import { useWallet } from "../hooks/useWallet.js";
import { DICE_CONFIG } from "../lib/config.js";

const DICE_FACES = [1, 2, 3, 4, 5, 6] as const;
const API_URL = import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:3001";

type GamePhase = "idle" | "signing" | "submitting" | "resolved";

interface RollResult {
  won: boolean;
  outcome: number;
  payout: string;
  betId: string;
}

export default function DiceGame() {
  const { isConnected, publicKey, connect, refreshBalance, signTx } = useWallet();
  const [prediction, setPrediction] = useState<number | null>(null);
  const [betAmountXlm, setBetAmountXlm] = useState("1");
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [result, setResult] = useState<RollResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canBet =
    isConnected &&
    prediction !== null &&
    parseFloat(betAmountXlm) >= parseFloat(DICE_CONFIG.minBetXlm) &&
    parseFloat(betAmountXlm) <= parseFloat(DICE_CONFIG.maxBetXlm);

  async function placeBet() {
    if (!canBet || !publicKey) return;
    setError(null);
    setResult(null);

    try {
      setPhase("signing");

      // 1. Fetch an unsigned transaction XDR from the API
      const prepRes = await fetch(`${API_URL}/game/dice/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerPublicKey: publicKey, amountXlm: betAmountXlm, prediction }),
      });

      if (!prepRes.ok) {
        const body = await prepRes.json() as { error?: string };
        throw new Error(body.error ?? "Failed to prepare transaction");
      }

      const { xdr: unsignedXdr } = await prepRes.json() as { xdr: string };

      // 2. Ask Freighter to sign via the wallet context
      const signedXdr = await signTx(unsignedXdr);

      setPhase("submitting");

      // 3. Submit signed XDR to our API
      const betRes = await fetch(`${API_URL}/game/dice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerPublicKey: publicKey, amountXlm: betAmountXlm, prediction, signedXdr }),
      });

      if (!betRes.ok) {
        const body = await betRes.json() as { error?: string };
        throw new Error(body.error ?? "Bet failed");
      }

      const betData = await betRes.json() as { betId: string; outcome: number; won: boolean; payoutXlm: string };

      setResult({
        won: betData.won,
        outcome: betData.outcome,
        payout: betData.payoutXlm,
        betId: betData.betId,
      });
      setPhase("resolved");
      await refreshBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("idle");
    }
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setPrediction(null);
    setBetAmountXlm("1");
  }

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <p className="text-4xl">🎲</p>
        <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
        <p className="text-gray-400">You need a Freighter wallet to play.</p>
        <button onClick={connect} className="btn-primary">Connect Freighter</button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black">🎲 Dice Roll</h1>
        <p className="text-gray-400 mt-2">
          Pick a number. Win <span className="text-gold-400 font-bold">5×</span> your bet.
        </p>
      </div>

      {/* Result overlay */}
      {phase === "resolved" && result && (
        <div className={`card text-center space-y-4 border-2 ${result.won ? "border-green-500" : "border-red-500"}`}>
          <p className="text-6xl">{result.won ? "🎉" : "😞"}</p>
          <h2 className={`text-3xl font-black ${result.won ? "text-green-400" : "text-red-400"}`}>
            {result.won ? "You Won!" : "You Lost"}
          </h2>
          <p className="text-gray-400">
            The dice rolled <span className="text-white font-bold text-xl">{result.outcome}</span>
          </p>
          {result.won && (
            <p className="text-gold-400 font-bold text-xl">+{result.payout} XLM</p>
          )}
          <button onClick={reset} className="btn-primary w-full">Play Again</button>
        </div>
      )}

      {/* Bet form */}
      {phase !== "resolved" && (
        <div className="card space-y-6">
          {/* Number selection */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Your Prediction
            </label>
            <div className="grid grid-cols-6 gap-2">
              {DICE_FACES.map((face) => (
                <button
                  key={face}
                  onClick={() => setPrediction(face)}
                  className={`h-14 rounded-xl text-2xl font-bold transition-all ${
                    prediction === face
                      ? "bg-luma-600 text-white scale-110 shadow-lg shadow-luma-700/50"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {face}
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
                value={betAmountXlm}
                onChange={(e) => setBetAmountXlm(e.target.value)}
                min={DICE_CONFIG.minBetXlm}
                max={DICE_CONFIG.maxBetXlm}
                step="0.1"
                placeholder={`${DICE_CONFIG.minBetXlm}–${DICE_CONFIG.maxBetXlm} XLM`}
              />
              {["1", "5", "10", "50"].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setBetAmountXlm(preset)}
                  className="btn-secondary text-sm px-3 py-2 shrink-0"
                >
                  {preset}
                </button>
              ))}
            </div>
            {betAmountXlm && (
              <p className="text-xs text-gray-500 mt-1">
                Potential win:{" "}
                <span className="text-gold-400">
                  {(parseFloat(betAmountXlm) * 5 * 0.98).toFixed(4)} XLM
                </span>{" "}
                (5× minus 2% house edge)
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={placeBet}
            disabled={!canBet || phase !== "idle"}
            className="btn-primary w-full text-lg py-4"
          >
            {phase === "signing" && "Waiting for Freighter…"}
            {phase === "submitting" && "Submitting to Stellar…"}
            {phase === "idle" && (prediction ? `Roll Dice — Bet ${betAmountXlm} XLM` : "Select a number")}
          </button>
        </div>
      )}

      {/* Odds info */}
      <div className="card bg-gray-900/50 space-y-2 text-sm text-gray-400">
        <p className="font-semibold text-gray-300">Game Info</p>
        <div className="grid grid-cols-2 gap-2">
          <span>Win Probability</span><span className="text-right text-gray-300">1 in 6 (16.67%)</span>
          <span>Payout</span><span className="text-right text-gold-400">5× your bet</span>
          <span>House Edge</span><span className="text-right text-gray-300">2%</span>
          <span>Min / Max Bet</span>
          <span className="text-right text-gray-300">
            {DICE_CONFIG.minBetXlm} / {DICE_CONFIG.maxBetXlm} XLM
          </span>
        </div>
      </div>
    </div>
  );
}
