/**
 * useFreighter.test.ts — Integration tests for useFreighter through WalletProvider.
 *
 * Mocks:
 *  - @stellar/freighter-api  (all exported functions)
 *  - ../lib/stellar-client/index.js  (getBalance, freighterNetworkToType)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import React from "react";

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getPublicKey: vi.fn(),
  getNetworkDetails: vi.fn(),
  signTransaction: vi.fn(),
}));

vi.mock("../lib/stellar-client/index.js", () => ({
  getBalance: vi.fn(),
  freighterNetworkToType: vi.fn(),
  isValidPublicKey: vi.fn().mockReturnValue(true),
  xlmToStroops: vi.fn(),
  stroopsToXlm: vi.fn(),
  fundTestnetAccount: vi.fn(),
}));

// ── Deferred imports ───────────────────────────────────────────────────────────

import {
  isConnected as freighterIsConnected,
  requestAccess,
  getPublicKey,
  getNetworkDetails,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";
import {
  getBalance as getHorizonBalance,
  freighterNetworkToType,
} from "../lib/stellar-client/index.js";
import { WalletProvider } from "../hooks/useWallet.js";
import { useFreighter } from "../hooks/useFreighter.js";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const PLAYER = "G" + "A".repeat(54) + "B"; // 56 chars
const TESTNET_DETAILS = {
  network: "TESTNET",
  networkPassphrase: "Test SDF Network ; September 2015",
};

function wrapper({ children }: { children: ReactNode }) {
  return React.createElement(WalletProvider, null, children);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("useFreighter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default: Freighter is not yet connected on mount
    vi.mocked(freighterIsConnected).mockResolvedValue(false);
    vi.mocked(requestAccess).mockResolvedValue(undefined as never);
    vi.mocked(getPublicKey).mockResolvedValue(PLAYER);
    vi.mocked(getNetworkDetails).mockResolvedValue(TESTNET_DETAILS as never);
    vi.mocked(freighterNetworkToType).mockReturnValue("testnet" as never);
    vi.mocked(getHorizonBalance).mockResolvedValue({ xlmBalance: "99.5000000" } as never);
  });

  // 1. connectWallet calls Freighter getPublicKey()
  it("connectWallet calls Freighter getPublicKey()", async () => {
    const { result } = renderHook(() => useFreighter(), { wrapper });

    await act(async () => {
      await result.current.connectWallet();
    });

    expect(getPublicKey).toHaveBeenCalledOnce();
    expect(result.current.isConnected).toBe(true);
    expect(result.current.publicKey).toBe(PLAYER);
  });

  // 2. signTransaction calls Freighter signTransaction()
  it("signTransaction calls Freighter signTransaction()", async () => {
    vi.mocked(freighterSignTransaction).mockResolvedValue("signed-xdr" as never);

    const { result } = renderHook(() => useFreighter(), { wrapper });

    // Connect first so publicKey is set
    await act(async () => {
      await result.current.connectWallet();
    });

    let signed: string | undefined;
    await act(async () => {
      signed = await result.current.signTransaction("unsigned-xdr");
    });

    expect(freighterSignTransaction).toHaveBeenCalledWith(
      "unsigned-xdr",
      expect.objectContaining({ networkPassphrase: expect.any(String) })
    );
    expect(signed).toBe("signed-xdr");
  });

  // 3. getBalance fetches balance from Horizon
  it("getBalance fetches balance from Horizon", async () => {
    const { result } = renderHook(() => useFreighter(), { wrapper });

    await act(async () => {
      await result.current.connectWallet();
    });

    // Reset call count after connect (which fetches balance internally)
    vi.mocked(getHorizonBalance).mockClear();
    vi.mocked(getHorizonBalance).mockResolvedValue({ xlmBalance: "42.0000000" } as never);

    await act(async () => {
      await result.current.getBalance();
    });

    expect(getHorizonBalance).toHaveBeenCalledOnce();
    // refreshBalance dispatches SET_BALANCE — the context state should update
    await waitFor(() => {
      expect(result.current.balance).toBe("42.0000000");
    });
  });

  // 4. Returns isConnected: false when Freighter is not installed
  it("returns isConnected: false when Freighter is not installed", async () => {
    // isConnected() on mount returns false — Freighter not available
    vi.mocked(freighterIsConnected).mockResolvedValue(false);

    const { result } = renderHook(() => useFreighter(), { wrapper });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });

    expect(result.current.publicKey).toBeNull();
    expect(result.current.balance).toBeNull();
  });

  // 5. Auto-reconnects on mount if previously connected
  it("auto-reconnects on mount if previously connected", async () => {
    // Simulate Freighter already authorized (no popup needed)
    vi.mocked(freighterIsConnected).mockResolvedValue(true);

    const { result } = renderHook(() => useFreighter(), { wrapper });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(getPublicKey).toHaveBeenCalledOnce();
    // requestAccess should NOT have been called — silent re-connect
    expect(requestAccess).not.toHaveBeenCalled();
    expect(result.current.publicKey).toBe(PLAYER);
    expect(result.current.balance).toBe("99.5000000");
  });
});
