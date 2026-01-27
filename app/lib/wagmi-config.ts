/**
 * wagmi Configuration
 *
 * Basic wagmi setup for user wallet connectivity.
 * Configured for Base Sepolia testnet.
 */

import { http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [baseSepolia.id]: http(),
  },
});

/**
 * Export chain constants for use in components
 */
export const CHAIN_ID = baseSepolia.id;
export const CHAIN_NAME = baseSepolia.name;
