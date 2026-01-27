/**
 * x402 Paid Premium Endpoint
 *
 * This endpoint requires payment via x402 protocol.
 * Uses withX402 wrapper to ensure payment is settled only after successful response.
 */

import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { server, getDefaultPaymentConfig } from "@/lib/x402-server";

/**
 * Premium echo handler
 * Returns enhanced response with metadata only after x402 payment
 */
const handler = async (req: NextRequest): Promise<NextResponse> => {
  try {
    const body = await req.json().catch(() => ({}));

    return NextResponse.json({
      message: "Premium response from ERC-8004 Agent",
      input: body.input || body.userMessage || "No input provided",
      timestamp: new Date().toISOString(),
      metadata: {
        endpoint: "/api/agent/premium",
        paymentMethod: "x402",
        tier: "premium",
      },
    });
  } catch (error) {
    console.error("Premium endpoint error:", error);
    return NextResponse.json(
      {
        error: "Failed to process premium request",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};

// Get payment configuration
const paymentConfig = getDefaultPaymentConfig();

/**
 * POST handler with x402 payment requirement
 *
 * The withX402 wrapper ensures:
 * 1. Request includes valid x402 payment header
 * 2. Payment is verified before handler execution
 * 3. Payment is settled only after successful response (status < 400)
 */
export const POST = withX402(
  handler,
  {
    accepts: [paymentConfig],
    description: "Premium agent endpoint with enhanced features",
    mimeType: "application/json",
  },
  server,
);

/**
 * GET handler - Returns endpoint info (no payment required for info)
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: "/api/agent/premium",
    description: "Premium agent endpoint with x402 payment",
    payment: {
      method: "x402",
      scheme: paymentConfig.scheme,
      price: paymentConfig.price,
      network: paymentConfig.network,
      payTo: paymentConfig.payTo,
    },
    instructions:
      "Send POST request with PAYMENT-SIGNATURE header",
  });
}
