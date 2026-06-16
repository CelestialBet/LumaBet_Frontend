/**
 * CoinFlipGame.test.tsx — Component tests for CoinFlipGame.
 *
 * Mocks:
 *  - ../hooks/useFreighter.js   (wallet state + signTransaction)
 *  - ../hooks/useWallet.js      (connect function)
 *  - global.fetch               (API responses)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock("../hooks/useFreighter.js", () => ({
  useFreighter: vi.fn(),
}));

vi.mock("../hooks/useWallet.js", () => ({
  useWallet: vi.fn(),
}));

// ── Deferred imports ───────────────────────────────────────────────────────────

import { useFreighter } from "../hooks/useFreighter.js";
import { useWallet } from "../hooks/useWallet.js";
import CoinFlipGame from "../components/CoinFlip/CoinFlipGame.js";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const PLAYER = "G" + "A".repeat(54) + "B"; // 56 chars

function makeConnectedFreighter(overrides: Partial<ReturnType<typeof useFreighter>> = {}) {
  const mockSignTransaction = vi.fn().mockResolvedValue("signed-xdr");
  const mockGetBalance = vi.fn().mockResolvedValue("100.0000000");
  return {
    isConnected: true,
    publicKey: PLAYER,
    balance: "100.0000000",
    isLoading: false,
    error: null,
    connectWallet: vi.fn(),
    signTransaction: mockSignTransaction,
    getBalance: mockGetBalance,
    ...overrides,
  };
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(body),
  } as Response);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Completes the commit phase (fetch commit + sign + fetch reveal) and returns the mocked signing fn. */
async function completeCommitPhase(user: ReturnType<typeof userEvent.setup>, side: "HEADS" | "TAILS" = "HEADS") {
  await user.click(screen.getByRole("button", { name: new RegExp(side, "i") }));
  await user.click(
    screen.getByRole("button", {
      name: new RegExp(`commit.*(${side})`, "i"),
    })
  );
  await waitFor(() => {
    expect(screen.getByText(/Reveal Secret/i)).toBeInTheDocument();
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("CoinFlipGame", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockConnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockConnect = vi.fn();
    globalThis.fetch = mockFetch;

    vi.mocked(useWallet).mockReturnValue({
      isConnected: false,
      publicKey: null,
      balance: null,
      isLoading: false,
      error: null,
      network: null,
      connect: mockConnect,
      disconnect: vi.fn(),
      refreshBalance: vi.fn(),
      signTx: vi.fn(),
    });
  });

  // 1. Renders coin flip game correctly when wallet is connected
  it("renders the bet form when wallet is connected", () => {
    vi.mocked(useFreighter).mockReturnValue(makeConnectedFreighter());

    render(React.createElement(CoinFlipGame));

    expect(screen.getByText("Pick a Side")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /HEADS/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /TAILS/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/0\.1–500/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pick a side to play/i })).toBeInTheDocument();
  });

  // 2. Shows "connect wallet" prompt when wallet is not connected
  it("shows connect wallet prompt when wallet is not connected", () => {
    vi.mocked(useFreighter).mockReturnValue({
      ...makeConnectedFreighter(),
      isConnected: false,
      publicKey: null,
    });

    render(React.createElement(CoinFlipGame));

    expect(screen.getByText(/Connect Your Wallet to Play/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Connect Freighter/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /HEADS/i })).not.toBeInTheDocument();
  });

  // 3. HEADS button click updates selected choice
  it("HEADS button click selects heads", async () => {
    vi.mocked(useFreighter).mockReturnValue(makeConnectedFreighter());
    const user = userEvent.setup();

    render(React.createElement(CoinFlipGame));

    const headsBtn = screen.getByRole("button", { name: /HEADS/i });
    await user.click(headsBtn);

    // After selecting HEADS, submit button text changes
    expect(
      screen.getByRole("button", { name: /Commit.*HEADS/i })
    ).toBeInTheDocument();
  });

  // 4. TAILS button click updates selected choice
  it("TAILS button click selects tails", async () => {
    vi.mocked(useFreighter).mockReturnValue(makeConnectedFreighter());
    const user = userEvent.setup();

    render(React.createElement(CoinFlipGame));

    await user.click(screen.getByRole("button", { name: /TAILS/i }));

    expect(
      screen.getByRole("button", { name: /Commit.*TAILS/i })
    ).toBeInTheDocument();
  });

  // 5. Bet amount input validates minimum bet
  it("submit button is disabled when bet is below 0.1 XLM", async () => {
    vi.mocked(useFreighter).mockReturnValue(makeConnectedFreighter());
    const user = userEvent.setup();

    render(React.createElement(CoinFlipGame));

    await user.click(screen.getByRole("button", { name: /HEADS/i }));

    const input = screen.getByPlaceholderText(/0\.1–500/i);
    await user.clear(input);
    await user.type(input, "0.05");

    const submitBtn = screen.getByRole("button", { name: /Commit/i });
    expect(submitBtn).toBeDisabled();
  });

  // 6. Bet amount input validates maximum bet
  it("submit button is disabled when bet exceeds 500 XLM", async () => {
    vi.mocked(useFreighter).mockReturnValue(makeConnectedFreighter());
    const user = userEvent.setup();

    render(React.createElement(CoinFlipGame));

    await user.click(screen.getByRole("button", { name: /HEADS/i }));

    const input = screen.getByPlaceholderText(/0\.1–500/i);
    await user.clear(input);
    await user.type(input, "501");

    const submitBtn = screen.getByRole("button", { name: /Commit/i });
    expect(submitBtn).toBeDisabled();
  });

  // 7. Submit button is disabled when no choice is selected
  it("submit button is disabled when no side is selected", () => {
    vi.mocked(useFreighter).mockReturnValue(makeConnectedFreighter());

    render(React.createElement(CoinFlipGame));

    const submitBtn = screen.getByRole("button", { name: /Pick a side to play/i });
    expect(submitBtn).toBeDisabled();
  });

  // 8. Submit button is disabled when bet amount is empty
  it("submit button is disabled when bet amount is empty", async () => {
    vi.mocked(useFreighter).mockReturnValue(makeConnectedFreighter());
    const user = userEvent.setup();

    render(React.createElement(CoinFlipGame));

    await user.click(screen.getByRole("button", { name: /HEADS/i }));

    const input = screen.getByPlaceholderText(/0\.1–500/i);
    await user.clear(input);

    const submitBtn = screen.getByRole("button", { name: /Commit.*HEADS/i });
    expect(submitBtn).toBeDisabled();
  });

  // 9. Shows loading state during commit phase
  it("shows loading state during commit phase", async () => {
    const freighter = makeConnectedFreighter();
    vi.mocked(useFreighter).mockReturnValue(freighter);
    const user = userEvent.setup();

    // Pause at the commit API call — never resolves
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(React.createElement(CoinFlipGame));

    await user.click(screen.getByRole("button", { name: /HEADS/i }));
    await user.click(screen.getByRole("button", { name: /Commit.*HEADS/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Waiting for Freighter/i })
      ).toBeInTheDocument();
    });
  });

  // 10. Shows loading state during reveal phase
  it("shows loading state during reveal phase", async () => {
    const mockSignTx = vi.fn();
    vi.mocked(useFreighter).mockReturnValue(makeConnectedFreighter({ signTransaction: mockSignTx }));
    const user = userEvent.setup();

    // Commit phase succeeds quickly
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ commitXdr: "commit-xdr", betDbId: "bet-uuid" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ revealXdr: "reveal-xdr", commitTxHash: "hash" }),
      } as Response);

    mockSignTx.mockResolvedValueOnce("signed-commit-xdr");

    render(React.createElement(CoinFlipGame));

    await user.click(screen.getByRole("button", { name: /HEADS/i }));
    await user.click(screen.getByRole("button", { name: /Commit.*HEADS/i }));

    // Wait for committed phase (reveal button visible)
    await waitFor(() => {
      expect(screen.getByText(/Reveal Secret/i)).toBeInTheDocument();
    });

    // Pause at reveal sign — never resolves
    mockSignTx.mockReturnValue(new Promise(() => {}));

    await user.click(screen.getByRole("button", { name: /Reveal Secret/i }));

    await waitFor(() => {
      expect(screen.getByText(/Waiting for Freighter/i)).toBeInTheDocument();
    });
  });

  // 11. Displays win result correctly with correct payout amount
  it("displays win result with payout amount", async () => {
    const mockSignTx = vi.fn();
    vi.mocked(useFreighter).mockReturnValue(makeConnectedFreighter({ signTransaction: mockSignTx }));
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ commitXdr: "commit-xdr", betDbId: "bet-uuid" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ revealXdr: "reveal-xdr", commitTxHash: "hash" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            outcome: 0,
            outcomeName: "HEADS",
            won: true,
            payoutStroops: "19600000", // 1.96 XLM (1 XLM bet × 1.96)
          }),
      } as Response);

    mockSignTx
      .mockResolvedValueOnce("signed-commit-xdr")
      .mockResolvedValueOnce("signed-reveal-xdr");

    render(React.createElement(CoinFlipGame));

    await user.click(screen.getByRole("button", { name: /HEADS/i }));
    await user.click(screen.getByRole("button", { name: /Commit.*HEADS/i }));

    await waitFor(() => {
      expect(screen.getByText(/Reveal Secret/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Reveal Secret/i }));

    await waitFor(() => {
      expect(screen.getByText(/You Won!/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/\+1\.9600 XLM/)).toBeInTheDocument();
    expect(screen.getByText(/HEADS/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Play Again/i })).toBeInTheDocument();
  });

  // 12. Displays loss result correctly
  it("displays loss result correctly", async () => {
    const mockSignTx = vi.fn();
    vi.mocked(useFreighter).mockReturnValue(makeConnectedFreighter({ signTransaction: mockSignTx }));
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ commitXdr: "commit-xdr", betDbId: "bet-uuid" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ revealXdr: "reveal-xdr", commitTxHash: "hash" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            outcome: 1,
            outcomeName: "TAILS",
            won: false,
            payoutStroops: null,
          }),
      } as Response);

    mockSignTx
      .mockResolvedValueOnce("signed-commit-xdr")
      .mockResolvedValueOnce("signed-reveal-xdr");

    render(React.createElement(CoinFlipGame));

    await user.click(screen.getByRole("button", { name: /HEADS/i }));
    await user.click(screen.getByRole("button", { name: /Commit.*HEADS/i }));

    await waitFor(() => {
      expect(screen.getByText(/Reveal Secret/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Reveal Secret/i }));

    await waitFor(() => {
      expect(screen.getByText(/You Lost/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/XLM/)).not.toBeInTheDocument();
    expect(screen.getByText(/TAILS/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Play Again/i })).toBeInTheDocument();
  });
});
