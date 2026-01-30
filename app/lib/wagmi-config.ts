/**
 * wagmi Configuration
 *
 * Basic wagmi setup for user wallet connectivity.
 * 
 * Two chains are used:
 * - Base Sepolia (84532): x402 payments
 * - Sepolia (11155111): Agent identity and reputation (ERC-8004)
 */

import { http, createConfig } from "wagmi";
import { sepolia, baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import type { WalletClient, Account } from "viem";
import { getAddress } from "viem";
import type { ClientEvmSigner } from "@x402/evm";

export const wagmiConfig = createConfig({
  chains: [sepolia, baseSepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
});

/**
 * Chain constants for PAYMENTS (x402) - Base Sepolia
 * The x402 server accepts payments on Base Sepolia
 */
export const PAYMENT_CHAIN_ID = baseSepolia.id;
export const PAYMENT_CHAIN_NAME = baseSepolia.name;

/**
 * Chain constants for AGENT IDENTITY/REPUTATION - Sepolia
 * ERC-8004 agent identity and reputation registries are on Sepolia
 */
export const IDENTITY_CHAIN_ID = sepolia.id;
export const IDENTITY_CHAIN_NAME = sepolia.name;

/**
 * @deprecated Use PAYMENT_CHAIN_ID or IDENTITY_CHAIN_ID instead
 */
export const CHAIN_ID = sepolia.id;
/**
 * @deprecated Use PAYMENT_CHAIN_NAME or IDENTITY_CHAIN_NAME instead
 */
export const CHAIN_NAME = sepolia.name;

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
