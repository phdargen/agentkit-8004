/**
 * Agent Identity Endpoint
 *
 * Returns the agent's ERC-8004 identity information including:
 * - Agent ID (from AGENT_ID env var)
 * - Agent wallet address (verified against on-chain registry)
 * - Registry addresses
 *
 * This endpoint reads AGENT_ID from env and verifies the on-chain owner
 * matches AGENT_WALLET_ADDRESS. Registration should be done separately
 * before running the agent.
 */

import { NextResponse } from "next/server";
import { getAgentState, bootstrapAgentIdentity } from "@/lib/erc8004";
import { getRegistryAddress } from "@/actions/erc8004/constants";

export async function GET(): Promise<NextResponse> {
  try {
    // Bootstrap agent state if not already initialized
    // This loads from env + verifies on-chain ownership
    let state = getAgentState();
    if (!state) {
      state = await bootstrapAgentIdentity();
    }

    const caipNetwork = `eip155:${state.chainId}`;

    const response = {
      identity: {
        agentId: state.agentId,
        agentAddress: state.agentAddress
          ? `${caipNetwork}:${state.agentAddress}`
          : null,
        agentURI: state.agentURI,
        isRegistered: state.isRegistered,
      },
      registries: {
        identity: getRegistryAddress("identity", state.chainId),
        reputation: getRegistryAddress("reputation", state.chainId),
        chainId: state.chainId,
        network: caipNetwork,
      },
      config: {
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
