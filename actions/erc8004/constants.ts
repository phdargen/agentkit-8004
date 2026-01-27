/**
 * ERC-8004 Registry Constants
 * Contract addresses for agent identity and reputation registries
 *
 * Based on Jan 2026 spec update deployments.
 * Reference: https://github.com/erc-8004/erc-8004-contracts
 */

import type { Hex } from "viem";
import type { Network } from "@coinbase/agentkit";

/**
 * Registry addresses by chain ID
 */
export type RegistryAddresses = {
  IDENTITY_REGISTRY: Hex;
  REPUTATION_REGISTRY: Hex;
  VALIDATION_REGISTRY: Hex;
};

const CHAIN_ADDRESSES: Record<number, RegistryAddresses> = {
  // ETH Sepolia (11155111)
  11155111: {
    IDENTITY_REGISTRY: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    REPUTATION_REGISTRY: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
    VALIDATION_REGISTRY: "0x8004CB39f29c09145F24Ad9dDe2A108C1A2cdfC5",
  },
  // Base Sepolia (84532)
  84532: {
    IDENTITY_REGISTRY: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    REPUTATION_REGISTRY: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
    VALIDATION_REGISTRY: "0x8004CB39f29c09145F24Ad9dDe2A108C1A2cdfC5",
  },
};

/**
 * Mapping from AgentKit network IDs to chain IDs
 */
export const NETWORK_ID_TO_CHAIN_ID: Record<string, number> = {
  "base-sepolia": 84532,
  "ethereum-sepolia": 11155111,
};

/**
 * Supported network IDs (matching AgentKit's naming convention)
 */
export const SUPPORTED_NETWORK_IDS = ["base-sepolia", "ethereum-sepolia"] as const;

/**
 * Supported chain IDs for ERC-8004 registries
 */
export const SUPPORTED_CHAINS = {
  BASE_SEPOLIA: 84532,
  ETHEREUM_SEPOLIA: 11155111,
} as const;

export type SupportedChainId = (typeof SUPPORTED_CHAINS)[keyof typeof SUPPORTED_CHAINS];
export type SupportedNetworkId = (typeof SUPPORTED_NETWORK_IDS)[number];

/**
 * Get chain ID from network (supports both chainId and networkId)
 */
export function getChainIdFromNetwork(network: Network): number | undefined {
  if (network.chainId) {
    const chainId = parseInt(network.chainId, 10);
    if (chainId in CHAIN_ADDRESSES) {
      return chainId;
    }
  }

  if (network.networkId && network.networkId in NETWORK_ID_TO_CHAIN_ID) {
    return NETWORK_ID_TO_CHAIN_ID[network.networkId];
  }

  return undefined;
}

/**
 * Check if network is supported for ERC-8004 operations
 */
export function isNetworkSupported(network: Network): boolean {
  if (network.protocolFamily !== "evm") {
    return false;
  }

  return getChainIdFromNetwork(network) !== undefined;
}

/**
 * Get all registry addresses for a specific chain
 */
export function getRegistryAddresses(chainId: number): RegistryAddresses {
  const addresses = CHAIN_ADDRESSES[chainId];
  if (!addresses) {
    const supportedChains = Object.keys(CHAIN_ADDRESSES).join(", ");
    throw new Error(
      `Chain ID ${chainId} is not supported. Supported chains: ${supportedChains}`,
    );
  }
  return addresses;
}

/**
 * Get a specific registry address for a chain
 */
export function getRegistryAddress(
  registry: "identity" | "reputation" | "validation",
  chainId: number,
): Hex {
  const addresses = getRegistryAddresses(chainId);

  switch (registry) {
    case "identity":
      return addresses.IDENTITY_REGISTRY;
    case "reputation":
      return addresses.REPUTATION_REGISTRY;
    case "validation":
      return addresses.VALIDATION_REGISTRY;
  }
}

/**
 * Check if a chain ID is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in CHAIN_ADDRESSES;
}

/**
 * Default chain ID for the agent (Base Sepolia)
 */
export const DEFAULT_CHAIN_ID = SUPPORTED_CHAINS.BASE_SEPOLIA;

/**
 * Default network ID for the agent (Base Sepolia)
 */
export const DEFAULT_NETWORK_ID = "base-sepolia";

/**
 * Get chain ID from network ID string (e.g., "base-sepolia" -> 84532)
 * Falls back to DEFAULT_CHAIN_ID if network ID is not recognized
 */
export function getChainIdFromNetworkId(networkId: string): number {
  return NETWORK_ID_TO_CHAIN_ID[networkId] ?? DEFAULT_CHAIN_ID;
}
