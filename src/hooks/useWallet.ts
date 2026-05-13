import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  ReactNode,
  createElement,
} from "react";
import {
  getAddress,
  isConnected,
  getNetwork,
  signTransaction,
} from "@stellar/freighter-api";
import { getBalance, freighterNetworkToType } from "../lib/stellar-client/index.js";
import { WalletState, NetworkType } from "../types/index.js";

// ── State ─────────────────────────────────────────────────────────────────────

type WalletAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CONNECT_SUCCESS"; payload: { publicKey: string; network: NetworkType; balance: string } }
  | { type: "DISCONNECT" }
  | { type: "SET_BALANCE"; payload: string };

const initialState: WalletState = {
  isConnected: false,
  publicKey: null,
  network: null,
  balance: null,
  isLoading: false,
  error: null,
};

function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, isLoading: false, error: action.payload };
    case "CONNECT_SUCCESS":
      return {
        ...state,
        isConnected: true,
        isLoading: false,
        error: null,
        publicKey: action.payload.publicKey,
        network: action.payload.network,
        balance: action.payload.balance,
      };
    case "DISCONNECT":
      return { ...initialState };
    case "SET_BALANCE":
      return { ...state, balance: action.payload };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  signTx: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(walletReducer, initialState);

  // Re-connect if Freighter was previously connected
  useEffect(() => {
    void (async () => {
      try {
        const connected = await isConnected();
        if (connected.isConnected) {
          await connectWallet(dispatch);
        }
      } catch {
        // Freighter not installed — silently ignore
      }
    })();
  }, []);

  const connect = useCallback(async () => {
    await connectWallet(dispatch);
  }, []);

  const disconnect = useCallback(() => {
    dispatch({ type: "DISCONNECT" });
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!state.publicKey || !state.network) return;
    try {
      const { xlmBalance } = await getBalance(state.publicKey, state.network);
      dispatch({ type: "SET_BALANCE", payload: xlmBalance });
    } catch {
      // Non-critical — don't surface
    }
  }, [state.publicKey, state.network]);

  const signTx = useCallback(
    async (xdr: string): Promise<string> => {
      if (!state.publicKey) throw new Error("Wallet not connected");
      const result = await signTransaction(xdr, {
        networkPassphrase:
          state.network === NetworkType.MAINNET
            ? "Public Global Stellar Network ; September 2015"
            : "Test SDF Network ; September 2015",
      });
      if ("error" in result) throw new Error(result.error);
      return result.signedTxXdr;
    },
    [state.publicKey, state.network]
  );

  return createElement(
    WalletContext.Provider,
    {
      value: { ...state, connect, disconnect, refreshBalance, signTx },
    },
    children
  );
}

async function connectWallet(dispatch: React.Dispatch<WalletAction>) {
  dispatch({ type: "SET_LOADING", payload: true });
  try {
    const addressResult = await getAddress();
    if ("error" in addressResult || !addressResult.address) {
      throw new Error("Could not get address from Freighter");
    }

    const networkResult = await getNetwork();
    if ("error" in networkResult) throw new Error("Could not get network");

    const publicKey = addressResult.address;
    const network = freighterNetworkToType({
      network: networkResult.network,
      networkPassphrase: networkResult.networkPassphrase,
    });

    const { xlmBalance } = await getBalance(publicKey, network);

    dispatch({
      type: "CONNECT_SUCCESS",
      payload: { publicKey, network, balance: xlmBalance },
    });
  } catch (err) {
    dispatch({
      type: "SET_ERROR",
      payload: err instanceof Error ? err.message : "Failed to connect wallet",
    });
  }
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
