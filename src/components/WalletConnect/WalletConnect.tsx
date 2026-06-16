import { useFreighter } from "../../hooks/useFreighter.js";
import { useWallet } from "../../hooks/useWallet.js";

interface WalletConnectProps {
  className?: string;
}

export default function WalletConnect({ className = "" }: WalletConnectProps) {
  const { isConnected, publicKey, balance, isLoading, error, connectWallet } = useFreighter();
  const { disconnect } = useWallet();

  const shortKey = publicKey
    ? `${publicKey.slice(0, 6)}…${publicKey.slice(-4)}`
    : null;

  if (isConnected && publicKey) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="text-right">
          <p className="text-xs font-mono text-gray-300">{shortKey}</p>
          {balance !== null && (
            <p className="text-xs text-gold-400 font-semibold">
              {parseFloat(balance).toFixed(2)} XLM
            </p>
          )}
        </div>
        <button onClick={disconnect} className="btn-secondary text-sm px-3 py-1.5">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      <button
        onClick={connectWallet}
        disabled={isLoading}
        className="btn-primary text-sm px-4 py-2"
      >
        {isLoading ? "Connecting…" : "Connect Freighter"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
