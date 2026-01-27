import { z } from "zod";

/**
 * Input schema for Erc8004ActionProviderAction's erc8004action_provider_action action.
 */
export const Erc8004ActionProviderActionSchema = z
  .object({
    payload: z.string().describe("The payload to send to the action provider"),
  })
  .strip()
  .describe("Instructions for erc8004action_provider_action");
