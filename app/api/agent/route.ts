import { AgentRequest, AgentResponse } from "@/app/types/api";
import { NextResponse } from "next/server";
import { createAgent } from "./create-agent";

// Prevent static prerendering - agentkit requires runtime
export const dynamic = "force-dynamic";

/**
 * Free echo/agent endpoint
 *
 * GET - Simple ping/echo endpoint for testing
 * POST - Full agent interaction with AgentKit
 */

/**
 * GET handler - Free ping endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: "ERC-8004 Agent - Free Endpoint",
    timestamp: new Date().toISOString(),
    endpoints: {
      free: "/api/agent",
      premium: "/api/agent/premium",
      image: "/api/agent/image",
      identity: "/api/agent/identity",
    },
  });
}

/**
 * Handles incoming POST requests to interact with the AgentKit-powered AI agent.
 * This function processes user messages and streams responses from the agent.
 *
 * @function POST
 * @param {Request & { json: () => Promise<AgentRequest> }} req - The incoming request object containing the user message.
 * @returns {Promise<NextResponse<AgentResponse>>} JSON response containing the AI-generated reply or an error message.
 *
 * @description Sends a single message to the agent and returns the agents' final response.
 *
 * @example
 * const response = await fetch("/api/agent", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ userMessage: input }),
 * });
 */
export async function POST(
  req: Request & { json: () => Promise<AgentRequest> },
): Promise<NextResponse<AgentResponse>> {
  try {
    // 1️. Extract user message from the request body
    const { userMessage } = await req.json();

    // 2. Get the agent
    const agent = await createAgent();

    // 3.Start streaming the agent's response
    const stream = await agent.stream(
      { messages: [{ content: userMessage, role: "user" }] }, // The new message to send to the agent
      { configurable: { thread_id: "AgentKit Discussion" } }, // Customizable thread ID for tracking conversations
    );

    // 4️. Process the streamed response chunks into a single message
    let agentResponse = "";
    let generateImageRequest: { prompt: string } | null = null;

    for await (const chunk of stream) {
      console.log("chunk", chunk);
      if ("tools" in chunk) {
        // Check for generateImg flag in tool results
        const toolMessages = chunk.tools?.messages;
        if (Array.isArray(toolMessages)) {
          for (const msg of toolMessages) {
            const content = msg?.content;
            if (typeof content === "string") {
              try {
                const parsed = JSON.parse(content);
                if (parsed.generateImg && parsed.prompt) {
                  generateImageRequest = { prompt: parsed.prompt };
                  console.log("Image generation request detected:", generateImageRequest);
                }
              } catch {
                // Not JSON, ignore
              }
            }
          }
        }
      }
      if ("agent" in chunk) {
        agentResponse += chunk.agent.messages[0].content;
      }
    }

    // 5️. Return the final response with optional generateImage flag
    // If image generation was requested, return a fixed confirmation message instead of the agent's response
    if (generateImageRequest) {
      return NextResponse.json({
        response: "🎨 Image generation is a paid service. Please confirm payment to proceed.",
        generateImage: generateImageRequest,
      } as AgentResponse);
    }
    return NextResponse.json({ response: agentResponse } as AgentResponse);
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({
      error:
        error instanceof Error
          ? error.message
          : "I'm sorry, I encountered an issue processing your message. Please try again later.",
    });
  }
}
