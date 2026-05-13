import { NetworkType } from "../types/index.js";

export const STROOPS_PER_XLM = 10_000_000n;
export const STELLAR_TX_TIMEOUT_SECONDS = 30;

export const NETWORK_CONFIG = {
  [NetworkType.TESTNET]: {
    networkPassphrase: "Test SDF Network ; September 2015",
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    friendbotUrl: "https://friendbot.stellar.org",
    explorerUrl: "https://stellar.expert/explorer/testnet",
  },
  [NetworkType.MAINNET]: {
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    horizonUrl: "https://horizon.stellar.org",
    sorobanRpcUrl: "https://soroban-mainnet.stellar.org",
    friendbotUrl: null,
    explorerUrl: "https://stellar.expert/explorer/public",
  },
  [NetworkType.FUTURENET]: {
    networkPassphrase: "Test SDF Future Network ; October 2022",
    horizonUrl: "https://horizon-futurenet.stellar.org",
    sorobanRpcUrl: "https://rpc-futurenet.stellar.org",
    friendbotUrl: "https://friendbot-futurenet.stellar.org",
    explorerUrl: "https://stellar.expert/explorer/futurenet",
  },
} as const;

export const DICE_CONFIG = {
  minBetXlm: "1",
  maxBetXlm: "1000",
  faces: 6,
  payoutMultiplierBps: 50_000,
  houseEdgeBps: 200,
  validPredictions: [1, 2, 3, 4, 5, 6] as const,
};
