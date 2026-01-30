import { z } from "zod";

/**
 * Schema for registering an agent on the Identity Registry
 */
export const RegisterAgentSchema = z
  .object({
    agentURI: z
      .string()
      .describe("The URI pointing to the agent's metadata (e.g., ipfs://QmXxx... or https://example.com/metadata.json)"),
  })
  .strip()
  .describe("Instructions for registering a new agent identity");

/**
 * Schema for updating an agent's URI
 */
export const UpdateAgentURISchema = z
  .object({
    agentId: z.string().describe("The agent's ID (token ID) on the Identity Registry"),
    newURI: z.string().describe("The new URI for the agent's metadata"),
  })
  .strip()
  .describe("Instructions for updating an agent's metadata URI");

/**
 * Schema for getting agent identity information
 */
export const GetAgentIdentitySchema = z
  .object({
    agentId: z.string().describe("The agent's ID to look up"),
  })
  .strip()
  .describe("Instructions for getting agent identity information");

/**
 * Schema for appending a response to user feedback
 */
export const AppendFeedbackResponseSchema = z
  .object({
    agentId: z.string().describe("The agent's ID that received the feedback"),
    clientAddress: z.string().describe("The address of the client who gave feedback"),
    feedbackIndex: z.string().describe("The index of the feedback to respond to"),
    responseUri: z.string().describe("URI pointing to the response content"),
    responseHash: z
      .string()
      .optional()
      .describe("Optional keccak256 hash of the response content for verification"),
  })
  .strip()
  .describe("Instructions for responding to user feedback");

/**
 * Schema for getting agent reputation summary
 */
export const GetReputationSummarySchema = z
  .object({
    agentId: z.string().describe("The agent's ID to get reputation for"),
    tag1: z.string().optional().describe("Optional tag to filter feedback (e.g., 'quality')"),
    tag2: z.string().optional().describe("Optional second tag to filter feedback"),
  })
  .strip()
  .describe("Instructions for getting agent reputation summary");

/**
 * Schema for generating an AI image
 */
export const GenerateImageSchema = z
  .object({
    prompt: z
      .string()
      .min(3)
      .max(4000)
      .describe("A detailed description of the image to generate"),
  })
  .strip()
  .describe("Instructions for generating an AI image");

/**
 * Legacy schema for backward compatibility
 * @deprecated Use specific schemas instead
 */
export const Erc8004ActionProviderActionSchema = z
  .object({
    payload: z.string().describe("The payload to send to the action provider"),
  })
  .strip()
  .describe("Instructions for erc8004action_provider_action");
