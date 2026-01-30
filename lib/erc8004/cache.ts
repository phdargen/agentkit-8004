/**
 * Agent Identity Cache
 *
 * Simple cache for agent identity data loaded from on-chain registry.
 * Given an agent ID, fetches on-chain data (owner, agentURI) and optionally
 * fetches metadata from IPFS.
 */

import {
  getRegistryAddress,
  getChainIdFromNetworkId,
  DEFAULT_NETWORK_ID,
} from "@/actions/erc8004/constants";
import { createIdentityClient, getAgentIdentity } from "./identity";
import type { AgentIdentityState } from "./types";

// Cached agent identity state
let cachedIdentity: AgentIdentityState | null = null;
let cachedMetadata: any | null = null;

/**
 * Loads agent identity from on-chain registry and caches it.
 *
 * @param agentId - The agent ID to load (defaults to AGENT_ID env var)
 * @returns Agent identity state with on-chain data
 * @throws Error if agent not found on-chain
 */
export async function loadAgentIdentity(agentId?: string): Promise<AgentIdentityState> {
  // Use cached if available and same agent ID
  if (cachedIdentity && (!agentId || cachedIdentity.agentId === agentId)) {
    return cachedIdentity;
  }

  // Get agent ID from parameter or env
  const targetAgentId = agentId || process.env.AGENT_ID;
  const expectedWallet = process.env.AGENT_WALLET_ADDRESS;

  // Derive chainId from NETWORK_ID
  const networkId = process.env.NETWORK_ID || DEFAULT_NETWORK_ID;
  const chainId = getChainIdFromNetworkId(networkId);
  const rpcUrl = process.env.RPC_URL;

  const identityRegistry = getRegistryAddress("identity", chainId);
  const reputationRegistry = getRegistryAddress("reputation", chainId);

  // If no agent ID provided, return unregistered state
  if (!targetAgentId) {
    console.warn("[ERC-8004] No AGENT_ID provided - agent is not registered");
    cachedIdentity = {
      agentId: null,
      agentAddress: expectedWallet || "",
      agentURI: null,
      isRegistered: false,
      chainId,
      identityRegistry,
      reputationRegistry,
    };
    return cachedIdentity;
  }

  console.log(`[ERC-8004] Loading agent identity: ${targetAgentId}`);

  // Fetch on-chain data
  const client = createIdentityClient({ chainId, rpcUrl });
  const identity = await getAgentIdentity(client, chainId, BigInt(targetAgentId));

  if (!identity) {
    throw new Error(
      `[ERC-8004] Agent ID ${targetAgentId} not found in registry on chain ${chainId}.`
    );
  }

  // Verify wallet ownership if expected wallet is set
  if (expectedWallet && identity.owner.toLowerCase() !== expectedWallet.toLowerCase()) {
    throw new Error(
      `[ERC-8004] Wallet mismatch! ` +
      `AGENT_WALLET_ADDRESS (${expectedWallet}) does not match on-chain owner (${identity.owner}).`
    );
  }

  cachedIdentity = {
    agentId: targetAgentId,
    agentAddress: identity.owner,
    agentURI: identity.agentURI,
    isRegistered: true,
    chainId,
    identityRegistry,
    reputationRegistry,
  };

  console.log(`[ERC-8004] Loaded agent identity: ${cachedIdentity.agentId}, Owner: ${cachedIdentity.agentAddress}`);
  return cachedIdentity;
}

/**
 * Fetches agent metadata from IPFS (via the agentURI).
 * Results are cached.
 *
 * @param ipfsUri - The IPFS URI to fetch (defaults to cached agentURI)
 * @returns The metadata JSON object
 * @throws Error if fetch fails
 */
export async function fetchAgentMetadata(ipfsUri?: string): Promise<any> {
  const uri = ipfsUri || cachedIdentity?.agentURI;
  
  if (!uri) {
    throw new Error("No IPFS URI provided and no cached agentURI available");
  }

  // Return cached if same URI
  if (cachedMetadata && cachedMetadata._uri === uri) {
    return cachedMetadata;
  }

  console.log(`[ERC-8004] Fetching metadata from IPFS: ${uri}`);

  // Convert ipfs:// to HTTP gateway URL
  const httpUrl = uri.startsWith("ipfs://")
    ? `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`
    : uri;

  const response = await fetch(httpUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata from ${httpUrl}: ${response.statusText}`);
  }

  const metadata = await response.json();
  
  // Cache with URI marker
  cachedMetadata = { ...metadata, _uri: uri };
  
  console.log(`[ERC-8004] Metadata loaded: ${metadata.name || "Unnamed Agent"}`);
  return metadata;
}

/**
 * Get cached agent identity state (returns null if not loaded yet)
 */
export function getCachedIdentity(): AgentIdentityState | null {
  return cachedIdentity;
}

/**
 * Get cached metadata (returns null if not fetched yet)
 */
export function getCachedMetadata(): any | null {
  return cachedMetadata;
}

/**
 * Clear all cached data (useful for testing or forcing refresh)
 */
export function clearCache(): void {
  cachedIdentity = null;
  cachedMetadata = null;
}
