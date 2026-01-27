/**
 * AgentCard Endpoint
 *
 * Serves the agent's A2A-compatible AgentCard at /.well-known/agent-card.json
 * This follows the Agent-to-Agent (A2A) protocol specification.
 *
 * Note: Identity is bootstrapped and registered (if REGISTER_IDENTITY=true)
 * in prepare-agentkit.ts during agent initialization.
 */

import { NextResponse } from "next/server";
import { generateAgentCard } from "@/lib/erc8004";

export async function GET(): Promise<NextResponse> {
  try {
    // Generate the AgentCard (uses cached state from prepare-agentkit.ts)
    const agentCard = generateAgentCard();

    return NextResponse.json(agentCard, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error("AgentCard endpoint error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate AgentCard",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
