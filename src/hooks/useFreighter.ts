/**
 * useFreighter — lightweight wrapper around the WalletProvider context.
 *
 * Exposes a stable, minimal API surface used by the CoinFlip components:
 *   connectWallet(), signTransaction(xdr), getBalance()
 *
 * All state lives in WalletProvider; this hook is a convenience re-shape.
 */

import { useCallback } from "react";
import { useWallet } from "./useWallet.js";

export interface FreighterHook {
  publicKey: string | null;
  isConnected: boolean;
  balance: string | null;
  isLoading: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  signTransaction: (xdr: string) => Promise<string>;
  getBalance: () => Promise<string | null>;
}

export function useFreighter(): FreighterHook {
  const { publicKey, isConnected, balance, isLoading, error, connect, signTx, refreshBalance } =
    useWallet();

  const connectWallet = useCallback(() => connect(), [connect]);

  const signTransaction = useCallback((xdr: string) => signTx(xdr), [signTx]);

  const getBalance = useCallback(async () => {
    await refreshBalance();
    return balance;
  }, [refreshBalance, balance]);

  return {
    publicKey,
    isConnected,
    balance,
    isLoading,
    error,
    connectWallet,
    signTransaction,
    getBalance,
  };
}
