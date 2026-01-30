/**
 * Agent Identity Endpoint
 *
 * Returns the agent's ERC-8004 identity information:
 * 1. Loads on-chain data (agentId, owner, agentURI)
 * 2. Fetches metadata from IPFS (name, description, image, etc.)
 * 3. Returns combined response with all agent info
 *
 * Both on-chain data and IPFS metadata are cached for performance.
 */

import { NextResponse } from "next/server";
import { 
  getCachedIdentity, 
  loadAgentIdentity, 
  fetchAgentMetadata,
  getCachedMetadata,
} from "@/lib/erc8004";
import { getRegistryAddress, get8004ScanUrl } from "@/actions/erc8004/constants";

export async function GET(): Promise<NextResponse> {
  try {
    // 1. Load agent identity from on-chain (uses cache if available)
    let state = getCachedIdentity();
    if (!state) {
      state = await loadAgentIdentity();
    }

    // 2. Fetch metadata from IPFS if agent is registered (uses cache if available)
    let metadata = getCachedMetadata();
    if (!metadata && state.isRegistered && state.agentURI) {
      try {
        metadata = await fetchAgentMetadata(state.agentURI);
      } catch (err) {
        console.warn("Failed to fetch IPFS metadata:", err);
        // Continue without metadata - not a fatal error
      }
    }

    const caipNetwork = `eip155:${state.chainId}`;

    // Remove internal cache marker from raw metadata
    const rawMetadata = metadata ? (() => {
      const { _uri, ...rest } = metadata;
      return rest;
    })() : null;

    // Generate 8004scan URL if agent is registered
    const explorerUrl = state.isRegistered && state.agentId
      ? get8004ScanUrl(state.chainId, state.agentId)
      : null;

    const response = {
      identity: {
        agentId: state.agentId,
        agentAddress: state.agentAddress
          ? `${caipNetwork}:${state.agentAddress}`
          : null,
        agentURI: state.agentURI,
        isRegistered: state.isRegistered,
      },
      // Metadata from IPFS (null if not fetched or failed)
      metadata: metadata ? {
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
      } : null,
      // Full raw metadata as stored on IPFS
      rawMetadata,
      // 8004scan explorer URL
      explorerUrl,
      registries: {
        identity: getRegistryAddress("identity", state.chainId),
        reputation: getRegistryAddress("reputation", state.chainId),
        chainId: state.chainId,
        network: caipNetwork,
      },
      endpoints: {
        free: "/api/agent",
        premium: "/api/agent/premium",
        identity: "/api/agent/identity",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Identity endpoint error:", error);
    return NextResponse.json(
      {
        error: "Failed to get agent identity",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
