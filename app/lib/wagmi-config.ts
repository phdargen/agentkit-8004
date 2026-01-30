/**
 * wagmi Configuration
 *
 * Basic wagmi setup for user wallet connectivity.
 * Configured for Base Sepolia testnet.
 */

import { http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import type { WalletClient, Account } from "viem";
import { getAddress } from "viem";
import type { ClientEvmSigner } from "@x402/evm";

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

/**
 * Converts a wagmi/viem WalletClient to a ClientEvmSigner for x402Client
 */
export function wagmiToClientSigner(walletClient: WalletClient): ClientEvmSigner {
  if (!walletClient.account) {
    throw new Error("Wallet client must have an account");
  }

  return {
    address: getAddress(walletClient.account.address),
    signTypedData: async (message) => {
      const signature = await walletClient.signTypedData({
        account: walletClient.account as Account,
        domain: message.domain,
        types: message.types,
        primaryType: message.primaryType,
        message: message.message,
      });
      return signature;
    },
  };
}
