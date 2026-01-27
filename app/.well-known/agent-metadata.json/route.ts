/**
 * ERC-8004 Agent Metadata Endpoint
 *
 * Serves the agent's ERC-8004 compliant metadata at /.well-known/agent-metadata.json
 * This is the AgentURI that gets registered on-chain and indexed by 8004scan.
 *
 * Specification: https://best-practices.8004scan.io/docs/01-agent-metadata-standard.html
 */

import { NextResponse } from "next/server";
import { generateERC8004Metadata } from "@/lib/erc8004";

export async function GET(): Promise<NextResponse> {
  try {
    const metadata = generateERC8004Metadata();

    return NextResponse.json(metadata, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
        "Access-Control-Allow-Origin": "*", // Allow cross-origin requests (for indexers)
      },
    });
  } catch (error) {
    console.error("ERC-8004 metadata endpoint error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate agent metadata",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
