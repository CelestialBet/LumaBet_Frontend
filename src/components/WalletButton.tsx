import { useWallet } from "../hooks/useWallet.js";

export default function WalletButton() {
  const { isConnected, publicKey, balance, isLoading, error, connect, disconnect } = useWallet();

  const shortKey = publicKey
    ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
    : null;

  if (isConnected && publicKey) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <p className="text-xs text-gray-400 font-mono">{shortKey}</p>
          {balance && (
            <p className="text-xs text-gold-400 font-semibold">{parseFloat(balance).toFixed(2)} XLM</p>
          )}
        </div>
        <button
          onClick={disconnect}
          className="btn-secondary text-sm px-4 py-2"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={isLoading}
        className="btn-primary text-sm px-4 py-2"
      >
        {isLoading ? "Connecting…" : "Connect Freighter"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
