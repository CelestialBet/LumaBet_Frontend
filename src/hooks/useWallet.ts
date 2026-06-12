import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  ReactNode,
  createElement,
  Dispatch,
} from "react";
import {
  getPublicKey,
  isConnected,
  getNetworkDetails,
  signTransaction,
  requestAccess,
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

  // Re-connect if Freighter was previously connected (no popup needed)
  useEffect(() => {
    void (async () => {
      try {
        const connected = await isConnected();
        if (connected) {
          await connectWallet(dispatch, false);
        }
      } catch {
        // Freighter not installed — silently ignore
      }
    })();
  }, []);

  const connect = useCallback(async () => {
    await connectWallet(dispatch, true);
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
      // freighter-api v2: signTransaction returns the signed XDR string directly
      const signedXdr = await signTransaction(xdr, {
        networkPassphrase:
          state.network === NetworkType.MAINNET
            ? "Public Global Stellar Network ; September 2015"
            : "Test SDF Network ; September 2015",
      });
      return signedXdr;
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

// requestAccess=true opens the Freighter popup; false silently reads existing permission
async function connectWallet(dispatch: Dispatch<WalletAction>, requestPermission: boolean) {
  dispatch({ type: "SET_LOADING", payload: true });
  try {
    if (requestPermission) {
      await requestAccess();
    }

    // freighter-api v2: getPublicKey() returns a string directly
    const publicKey = await getPublicKey();
    if (!publicKey) throw new Error("Could not get address from Freighter");

    // freighter-api v2: getNetworkDetails() returns the full network object
    const details = await getNetworkDetails();
    const network = freighterNetworkToType({
      network: details.network,
      networkPassphrase: details.networkPassphrase,
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
