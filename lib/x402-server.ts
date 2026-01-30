/**
 * x402 Server Setup
 *
 * Shared x402 resource server configuration for paid endpoints.
 * Uses @x402/core/server with EVM exact payment scheme.
 */

import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";

// Initialize the facilitator client
const facilitatorUrl = process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";
const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });

// Create the x402 resource server with hooks
export const server = new x402ResourceServer(facilitatorClient)
  .onAfterVerify(async (context) => {
    if (!context.result.isValid) {
      console.log(`[x402] Payment verification failed: ${context.result.invalidReason} (payer: ${context.result.payer})`);
    }
  })
  .onVerifyFailure(async (context) => {
    console.error("[x402] Verify error:", context.error);
  })
  .onAfterSettle(async (context) => {
    console.log(`[x402] Payment settled: ${context.result.transaction}`);
  })
  .onSettleFailure(async (context) => {
    console.error("[x402] Settle error:", context.error);
  });

// Register the exact EVM payment scheme
registerExactEvmScheme(server);

/**
 * Get the default x402 payment config for this agent
 */
export function getDefaultPaymentConfig() {
  const chainId = parseInt(process.env.CHAIN_ID || "84532", 10);
  let price = process.env.X402_PRICE || "$0.001";
  const payTo = process.env.AGENT_WALLET_ADDRESS || "";

  return {
    scheme: "exact" as const,
    price,
    network: `eip155:${chainId}` as `${string}:${string}`, // CAIP-2 format
    payTo,
  };
}
