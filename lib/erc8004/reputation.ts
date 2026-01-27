/**
 * Reputation Registry client for reading agent reputation information
 */

import type { Hex } from "viem";
import { REPUTATION_REGISTRY_ABI } from "@/actions/erc8004/abis";
import { getRegistryAddress } from "@/actions/erc8004/constants";
import type { FeedbackEntry, ReputationSummary } from "./types";

// Use a simple client type to match identity.ts
type SimplePublicClient = {
  readContract: (args: {
    address: Hex;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<unknown>;
};

/**
 * Get reputation summary for an agent
 */
export async function getReputationSummary(
  client: SimplePublicClient,
  chainId: number,
  agentId: bigint,
  options?: { tag1?: string; tag2?: string },
): Promise<ReputationSummary> {
  const reputationRegistry = getRegistryAddress("reputation", chainId);

  const [count, averageScore] = (await client.readContract({
    address: reputationRegistry,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "getSummary",
    args: [agentId, [], options?.tag1 || "", options?.tag2 || ""],
  })) as [bigint, number];

  return {
    count,
    averageScore,
  };
}

/**
 * Get feedback for a specific client interaction
 */
export async function getFeedback(
  client: SimplePublicClient,
  chainId: number,
  agentId: bigint,
  clientAddress: Hex,
  feedbackIndex: bigint,
): Promise<FeedbackEntry | null> {
  const reputationRegistry = getRegistryAddress("reputation", chainId);

  try {
    const [score, tag1, tag2, isRevoked] = (await client.readContract({
      address: reputationRegistry,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "readFeedback",
      args: [agentId, clientAddress, feedbackIndex],
    })) as [number, string, string, boolean];

    return {
      agentId,
      clientAddress,
      feedbackIndex,
      score,
      tag1,
      tag2,
      isRevoked,
    };
  } catch {
    return null;
  }
}

/**
 * Get all clients who have given feedback to an agent
 */
export async function getClients(
  client: SimplePublicClient,
  chainId: number,
  agentId: bigint,
): Promise<Hex[]> {
  const reputationRegistry = getRegistryAddress("reputation", chainId);

  try {
    const clients = (await client.readContract({
      address: reputationRegistry,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getClients",
      args: [agentId],
    })) as Hex[];

    return clients;
  } catch {
    return [];
  }
}

/**
 * Get last feedback index for a client
 */
export async function getLastFeedbackIndex(
  client: SimplePublicClient,
  chainId: number,
  agentId: bigint,
  clientAddress: Hex,
): Promise<bigint> {
  const reputationRegistry = getRegistryAddress("reputation", chainId);

  try {
    const lastIndex = (await client.readContract({
      address: reputationRegistry,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getLastIndex",
      args: [agentId, clientAddress],
    })) as bigint;

    return lastIndex;
  } catch {
    return 0n;
  }
}
