/**
 * Agent Identity Endpoint
 *
 * Returns the agent's ERC-8004 identity information including:
 * - Agent ID (if registered)
 * - Agent wallet address
 * - Registry addresses
 * - Reputation summary
 *
 * Note: Identity is bootstrapped and registered (if REGISTER_IDENTITY=true)
 * in prepare-agentkit.ts during agent initialization.
 */

import { NextResponse } from "next/server";
import { getAgentState } from "@/lib/erc8004";
import {
  getRegistryAddress,
  getChainIdFromNetworkId,
  DEFAULT_NETWORK_ID,
} from "@/actions/erc8004/constants";

export async function GET(): Promise<NextResponse> {
  try {
    // Get the cached agent state (bootstrapped in prepare-agentkit.ts)
    const state = getAgentState();
    // Derive chainId from NETWORK_ID (same env var used by wallet provider)
    const networkId = process.env.NETWORK_ID || DEFAULT_NETWORK_ID;
    const chainId = getChainIdFromNetworkId(networkId);
    const caipNetwork = `eip155:${chainId}`;

    const response = {
      identity: {
        agentId: state?.agentId || null,
        agentAddress: state?.agentAddress
          ? `${caipNetwork}:${state.agentAddress}`
          : null,
        agentURI: state?.agentURI || null,
        isRegistered: state?.isRegistered || false,
      },
      registries: {
        identity: getRegistryAddress("identity", chainId),
        reputation: getRegistryAddress("reputation", chainId),
        chainId,
        network: caipNetwork,
      },
      config: {
        autoRegister: process.env.REGISTER_IDENTITY === "true",
        agentName: process.env.AGENT_NAME || "ERC-8004 Demo Agent",
        agentDomain: process.env.AGENT_DOMAIN || "localhost:3000",
      },
      endpoints: {
        free: "/api/agent",
        premium: "/api/agent/premium",
        identity: "/api/agent/identity",
        agentCard: "/.well-known/agent-card.json",
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
