/**
 * Agent Identity Bootstrap
 *
 * Handles agent identity setup:
 * 1. Read AGENT_ID from env (required - registration is done separately)
 * 2. Load identity from on-chain registry
 * 3. Verify wallet ownership matches AGENT_WALLET_ADDRESS
 *
 * Registration should be done via a separate script before running the agent.
 */

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
 * Bootstrap agent identity state from on-chain registry.
 *
 * Requires AGENT_ID to be set in env. Verifies that the on-chain owner
 * matches AGENT_WALLET_ADDRESS to catch misconfiguration early.
 *
 * @throws Error if AGENT_ID is not set or wallet ownership doesn't match
 */
export async function bootstrapAgentIdentity(): Promise<AgentIdentityState> {
  // Return cached state if already bootstrapped
  if (agentState) {
    return agentState;
  }

  // Derive chainId from NETWORK_ID (same env var used by wallet provider)
  const networkId = process.env.NETWORK_ID || DEFAULT_NETWORK_ID;
  const chainId = getChainIdFromNetworkId(networkId);
  const rpcUrl = process.env.RPC_URL;

  const identityRegistry = getRegistryAddress("identity", chainId);
  const reputationRegistry = getRegistryAddress("reputation", chainId);

  const agentId = process.env.AGENT_ID;
  const expectedWallet = process.env.AGENT_WALLET_ADDRESS;

  // If no AGENT_ID, return unregistered state
  if (!agentId) {
    console.warn("[ERC-8004] AGENT_ID not set - agent is not registered");
    agentState = {
      agentId: null,
      agentAddress: expectedWallet || "",
      agentURI: null,
      isRegistered: false,
      chainId,
      identityRegistry,
      reputationRegistry,
    };
    return agentState;
  }

  console.log(`[ERC-8004] Loading agent identity: ${agentId}`);

  const client = createIdentityClient({ chainId, rpcUrl });
  const identity = await getAgentIdentity(client, chainId, BigInt(agentId));

  if (!identity) {
    throw new Error(
      `[ERC-8004] Agent ID ${agentId} not found in registry. ` +
      `Check that AGENT_ID is correct and the agent is registered on chain ${chainId}.`
    );
  }

  // Verify wallet ownership matches
  if (expectedWallet && identity.owner.toLowerCase() !== expectedWallet.toLowerCase()) {
    throw new Error(
      `[ERC-8004] Wallet mismatch! ` +
      `AGENT_WALLET_ADDRESS (${expectedWallet}) does not match on-chain owner (${identity.owner}). ` +
      `Either update AGENT_WALLET_ADDRESS or use the correct AGENT_ID.`
    );
  }

  agentState = {
    agentId,
    agentAddress: identity.owner,
    agentURI: identity.agentURI,
    isRegistered: true,
    chainId,
    identityRegistry,
    reputationRegistry,
  };

  console.log(`[ERC-8004] Verified agent identity: ${agentState.agentId}, Owner: ${agentState.agentAddress}`);
  return agentState;
}

/**
 * Get current agent identity state (returns null if not bootstrapped)
 */
export function getAgentState(): AgentIdentityState | null {
  return agentState;
}

/**
 * Reset agent state (for testing)
 */
export function resetAgentState(): void {
  agentState = null;
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

/**
 * ERC-8004 compliant agent metadata structure
 */
export interface ERC8004Metadata {
  type: string;
  name: string;
  description: string;
  image?: string;
  endpoints: Array<{
    name: string;
    endpoint: string;
    version?: string;
    description?: string;
    [key: string]: unknown;
  }>;
  registrations: Array<{
    agentId: number | null;
    agentRegistry: string;
  }>;
  active: boolean;
  x402Support: boolean;
  updatedAt?: number;
}

/**
 * Generate ERC-8004 compliant agent metadata
 *
 * This follows the Agent Metadata Profile specification:
 * https://best-practices.8004scan.io/docs/01-agent-metadata-standard.html
 */
export function generateERC8004Metadata(): ERC8004Metadata {
  const name = process.env.AGENT_NAME || "ERC-8004 Demo Agent";
  const description = process.env.AGENT_DESCRIPTION || "Demo agent with x402 paid endpoints";
  const image = process.env.AGENT_IMAGE; // Optional: https://, ipfs://, or data: URI
  const domain = process.env.AGENT_DOMAIN || "localhost:3000";
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  const networkId = process.env.NETWORK_ID || DEFAULT_NETWORK_ID;
  const chainId = getChainIdFromNetworkId(networkId);
  const agentWalletAddress = process.env.AGENT_WALLET_ADDRESS;

  // Build endpoints array
  const endpoints: ERC8004Metadata["endpoints"] = [];

  // Web endpoint (human-facing)
  endpoints.push({
    name: "web",
    endpoint: url,
  });

  // A2A endpoint
  endpoints.push({
    name: "A2A",
    endpoint: `${url}/.well-known/agent-card.json`,
    version: "0.3.0",
  });

  // Agent wallet endpoint (for x402 payments)
  if (agentWalletAddress) {
    endpoints.push({
      name: "agentWallet",
      endpoint: `eip155:${chainId}:${agentWalletAddress}`,
    });
  }

  // Build registrations array
  const registrations: ERC8004Metadata["registrations"] = [];
  const identityRegistry = getRegistryAddress("identity", chainId);

  // Include registration info - agentId can be null for first-time deployments
  const agentIdStr = process.env.AGENT_ID;
  const agentId = agentIdStr ? parseInt(agentIdStr, 10) : null;

  registrations.push({
    agentId,
    agentRegistry: `eip155:${chainId}:${identityRegistry}`,
  });

  const metadata: ERC8004Metadata = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name,
    description,
    endpoints,
    registrations,
    active: true,
    x402Support: Boolean(agentWalletAddress),
    updatedAt: Math.floor(Date.now() / 1000),
  };

  // Add optional image if configured
  if (image) {
    metadata.image = image;
  }

  return metadata;
}
