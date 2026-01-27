/**
 * Identity Registry client for reading agent identity information
 */

import { createPublicClient, http, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { IDENTITY_REGISTRY_ABI } from "@/actions/erc8004/abis";
import { getRegistryAddress } from "@/actions/erc8004/constants";
import type { IdentityRecord } from "./types";

export type IdentityClientOptions = {
  chainId: number;
  rpcUrl?: string;
};

// Use a simple client interface to avoid viem version conflicts
interface SimplePublicClient {
  readContract: (args: {
    address: Hex;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<unknown>;
}

/**
 * Creates a public client for the identity registry
 */
export function createIdentityClient(options: IdentityClientOptions): SimplePublicClient {
  const chain = options.chainId === 84532 ? baseSepolia : baseSepolia; // Add more chains as needed

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createPublicClient({
    chain,
    transport: http(options.rpcUrl),
  }) as any;
}

/**
 * Get identity record for an agent
 */
export async function getAgentIdentity(
  client: SimplePublicClient,
  chainId: number,
  agentId: bigint,
): Promise<IdentityRecord | null> {
  const identityRegistry = getRegistryAddress("identity", chainId);

  try {
    const owner = (await client.readContract({
      address: identityRegistry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "ownerOf",
      args: [agentId],
    })) as Hex;

    const uri = (await client.readContract({
      address: identityRegistry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "tokenURI",
      args: [agentId],
    })) as string;

    return {
      agentId,
      owner,
      agentURI: uri,
    };
  } catch {
    return null;
  }
}

/**
 * Check if an address owns any agent identities
 */
export async function getAgentBalance(
  client: SimplePublicClient,
  chainId: number,
  ownerAddress: Hex,
): Promise<bigint> {
  const identityRegistry = getRegistryAddress("identity", chainId);

  try {
    const balance = (await client.readContract({
      address: identityRegistry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "balanceOf",
      args: [ownerAddress],
    })) as bigint;

    return balance;
  } catch {
    return 0n;
  }
}
