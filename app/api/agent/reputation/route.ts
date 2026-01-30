/**
 * Agent Reputation Endpoint
 *
 * Returns the agent's ERC-8004 reputation information:
 * 1. Gets reputation summary (count, averageValue) using agent0-sdk
 * 2. Fetches feedback list using agent0-sdk searchFeedback
 *
 * Query params:
 * - agentId: Optional agent ID (uses server's agent if not provided)
 */

import { NextRequest, NextResponse } from "next/server";
import { SDK } from "agent0-sdk";
import { getCachedIdentity, loadAgentIdentity } from "@/lib/erc8004";
import { sepolia } from "viem/chains"

// Initialize SDK for read-only operations
function getSDK(chainId: number): SDK {

  const rpcUrl = process.env.RPC_URL || sepolia.rpcUrls.default.http[0] ;
  if (!rpcUrl) {
    throw new Error("RPC_URL environment variable is required");
  }

  return new SDK({
    chainId,
    rpcUrl,
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get agent identity to determine chainId and agentId
    let state = getCachedIdentity();
    if (!state) {
      state = await loadAgentIdentity();
    }

    // Use query param agentId if provided, otherwise use server's agent
    const searchParams = request.nextUrl.searchParams;
    const queryAgentId = searchParams.get("agentId");
    
    const agentId = queryAgentId || state.agentId;
    if (!agentId) {
      return NextResponse.json(
        { error: "Agent not registered", message: "No agent ID available" },
        { status: 404 }
      );
    }

    // Format agentId with chainId prefix if not already present
    const fullAgentId = agentId.includes(":") 
      ? agentId 
      : `${state.chainId}:${agentId}`;

    const sdk = getSDK(state.chainId);

    // Fetch reputation summary and feedback in parallel
    const [summary, feedback] = await Promise.all([
      sdk.getReputationSummary(fullAgentId).catch((err) => {
        console.warn("Failed to fetch reputation summary:", err);
        return { count: 0, averageValue: 0 };
      }),
      sdk.searchFeedback({ agentId: fullAgentId }).catch((err) => {
        console.warn("Failed to fetch feedback:", err);
        return [];
      }),
    ]);

    // Transform feedback to a simpler format for the frontend
    const transformedFeedback = feedback.map((f) => {
      // Extract generatedImage from context if it exists there
      const context = f.context as Record<string, unknown> | undefined;
      const generatedImage = context?.generatedImage as Record<string, unknown> | undefined;
      
      return {
        id: f.id ? `${f.id[0]}:${f.id[1]}:${f.id[2]}` : `${f.agentId}:${f.reviewer}:0`,
        reviewer: f.reviewer,
        value: f.value ?? 0,
        tags: f.tags || [],
        text: f.text,
        createdAt: f.createdAt,
        endpoint: f.endpoint,
        isRevoked: f.isRevoked,
        // Include rich metadata for display
        proofOfPayment: f.proofOfPayment,
        generatedImage,
        context: f.context,
        fileURI: f.fileURI,
      };
    });

    const response = {
      summary: {
        count: summary.count ?? 0,
        averageValue: summary.averageValue ?? 0,
      },
      feedback: transformedFeedback,
      agentId: fullAgentId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Reputation endpoint error:", error);
    return NextResponse.json(
      {
        error: "Failed to get agent reputation",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
