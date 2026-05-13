import { useEffect } from "react";
import { useWallet } from "../hooks/useWallet.js";
import { NETWORK_CONFIG } from "../lib/config.js";
import { NetworkType } from "../types/index.js";

export default function WalletPage() {
  const { isConnected, publicKey, balance, network, connect, disconnect, refreshBalance } =
    useWallet();

  useEffect(() => {
    if (isConnected) void refreshBalance();
  }, [isConnected, refreshBalance]);

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <p className="text-4xl">👛</p>
        <h2 className="text-2xl font-bold">No Wallet Connected</h2>
        <p className="text-gray-400">Connect Freighter to view your balance.</p>
        <button onClick={connect} className="btn-primary">Connect Freighter</button>
      </div>
    );
  }

  const explorerUrl = network
    ? NETWORK_CONFIG[network].explorerUrl
    : NETWORK_CONFIG[NetworkType.TESTNET].explorerUrl;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-3xl font-black">👛 Your Wallet</h1>

      <div className="card space-y-4">
        <div>
          <p className="text-sm text-gray-400">Public Key</p>
          <p className="font-mono text-sm break-all text-luma-400 mt-1">{publicKey}</p>
        </div>

        <div className="border-t border-gray-800 pt-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">XLM Balance</p>
            <p className="text-3xl font-black text-gold-400 mt-1">
              {balance ? parseFloat(balance).toFixed(4) : "…"} XLM
            </p>
          </div>
          <button onClick={refreshBalance} className="btn-secondary text-sm">
            Refresh
          </button>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <p className="text-sm text-gray-400">Network</p>
          <span className="inline-block mt-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
            {network ?? "Unknown"}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <a
          href={`${explorerUrl}/account/${publicKey}`}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary flex-1 text-center text-sm"
        >
          View on Explorer
        </a>
        <button onClick={disconnect} className="btn-secondary flex-1 text-sm text-red-400 border-red-900 hover:border-red-700">
          Disconnect
        </button>
      </div>

      {network === NetworkType.TESTNET && (
        <div className="card bg-blue-900/20 border-blue-800">
          <h3 className="font-semibold text-blue-300 mb-2">Testnet Faucet</h3>
          <p className="text-sm text-gray-400 mb-3">
            Need test XLM? Fund your account with Friendbot.
          </p>
          <a
            href={`https://friendbot.stellar.org/?addr=${publicKey}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-sm inline-block"
          >
            Fund with Friendbot
          </a>
        </div>
      )}
    </div>
  );
}
