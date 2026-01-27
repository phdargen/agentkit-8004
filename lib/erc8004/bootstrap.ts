/**
 * Agent Identity Bootstrap
 *
 * Handles agent identity setup:
 * 1. Check for existing AGENT_ID in env
 * 2. If exists, load identity from registry
 * 3. Initialize state for registration (done in prepare-agentkit.ts)
 *
 * Registration is handled separately in prepare-agentkit.ts by calling
 * the registerAgent action directly after wallet setup.
 */

import type { Hex } from "viem";
import {
  getRegistryAddress,
  getChainIdFromNetworkId,
  DEFAULT_NETWORK_ID,
} from "@/actions/erc8004/constants";
import { createIdentityClient, getAgentIdentity } from "./identity";
import type { AgentIdentityState, AgentCard } from "./types";

// Singleton state for agent identity
let agentState: AgentIdentityState | null = null;

/**
 * Bootstrap agent identity state.
 *
 * This initializes the agent state and loads existing identity if AGENT_ID is set.
 * Registration is handled separately in prepare-agentkit.ts.
 *
 * @param agentAddress - Optional wallet address to use (from wallet provider)
 */
export async function bootstrapAgentIdentity(
  agentAddress?: string,
): Promise<AgentIdentityState> {
  // Return cached state if already bootstrapped
  if (agentState) {
    // Update agent address if provided and not set
    if (agentAddress && !agentState.agentAddress) {
      agentState.agentAddress = agentAddress;
    }
    return agentState;
  }

  // Derive chainId from NETWORK_ID (same env var used by wallet provider)
  const networkId = process.env.NETWORK_ID || DEFAULT_NETWORK_ID;
  const chainId = getChainIdFromNetworkId(networkId);
  const rpcUrl = process.env.RPC_URL;

  const identityRegistry = getRegistryAddress("identity", chainId);
  const reputationRegistry = getRegistryAddress("reputation", chainId);

  // Check for existing agent ID
  const existingAgentId = process.env.AGENT_ID;
  const resolvedAddress = agentAddress || process.env.AGENT_WALLET_ADDRESS || "";

  if (existingAgentId) {
    console.log(`[ERC-8004] Loading existing agent identity: ${existingAgentId}`);

    const client = createIdentityClient({ chainId, rpcUrl });
    const identity = await getAgentIdentity(client, chainId, BigInt(existingAgentId));

    if (identity) {
      agentState = {
        agentId: existingAgentId,
        agentAddress: identity.owner,
        agentURI: identity.agentURI,
        isRegistered: true,
        chainId,
        identityRegistry,
        reputationRegistry,
      };

      console.log(`[ERC-8004] Loaded agent identity: ${agentState.agentId}, Owner: ${agentState.agentAddress}`);
      return agentState;
    }

    console.warn(`[ERC-8004] Agent ID ${existingAgentId} not found in registry`);
  }

  // Initialize state (registration will be handled in prepare-agentkit.ts)
  agentState = {
    agentId: null,
    agentAddress: resolvedAddress,
    agentURI: null,
    isRegistered: false,
    chainId,
    identityRegistry,
    reputationRegistry,
  };

  return agentState;
}

/**
 * Update agent state after registration
 */
export function setAgentIdentity(agentId: string, agentAddress: string, agentURI: string): void {
  if (!agentState) {
    throw new Error("Agent state not initialized. Call bootstrapAgentIdentity() first.");
  }

  agentState = {
    ...agentState,
    agentId,
    agentAddress,
    agentURI,
    isRegistered: true,
  };

  console.log(`[ERC-8004] Agent identity updated: ${agentId}`);
}

/**
 * Get current agent identity state
 */
export function getAgentState(): AgentIdentityState | null {
  return agentState;
}

/**
 * Generate AgentCard from current state
 */
export function generateAgentCard(): AgentCard {
  const name = process.env.AGENT_NAME || "ERC-8004 Demo Agent";
  const description = process.env.AGENT_DESCRIPTION || "Demo agent with x402 paid endpoints";
  const domain = process.env.AGENT_DOMAIN || "localhost:3000";
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  const networkId = process.env.NETWORK_ID || DEFAULT_NETWORK_ID;
  const chainId = getChainIdFromNetworkId(networkId);
  const caipNetwork = `eip155:${chainId}`;

  const agentCard: AgentCard = {
    protocolVersion: "1.0",
    name,
    description,
    url,
    version: "1.0.0",
    capabilities: {
      streaming: false,
    },
    skills: [
      { id: "echo", name: "Echo", description: "Free echo endpoint" },
      { id: "premium", name: "Premium", description: "Paid premium endpoint" },
    ],
    trustModels: ["feedback"],
    entrypoints: {
      echo: { description: "Free echo", streaming: false },
      premium: {
        description: "Paid premium",
        streaming: false,
        pricing: { invoke: "$0.001" },
      },
    },
  };

  // Add payment info if agent wallet is configured
  const agentWalletAddress = process.env.AGENT_WALLET_ADDRESS;
  if (agentWalletAddress) {
    agentCard.payments = [
      {
        method: "x402",
        payee: agentWalletAddress,
        network: caipNetwork,
      },
    ];
  }

  // Add registration info if agent is registered
  if (agentState?.isRegistered && agentState.agentId) {
    agentCard.registrations = [
      {
        agentId: agentState.agentId,
        agentAddress: `${caipNetwork}:${agentState.agentAddress}`,
        agentRegistry: agentState.identityRegistry,
      },
    ];
  }

  return agentCard;
}

/**
 * Build agent metadata URI from domain
 */
export function buildMetadataURI(domain: string): string {
  const origin = domain.startsWith("http") ? domain : `https://${domain}`;
  return `${origin}/.well-known/agent-metadata.json`;
}
