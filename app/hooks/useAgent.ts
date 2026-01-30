import { useState, useCallback } from "react";
import { AgentRequest, AgentResponse } from "../types/api";

/**
 * Pending image request awaiting user confirmation
 */
export interface PendingImageRequest {
  prompt: string;
}

/**
 * Sends a user message to the AgentKit backend API and retrieves the agent's response.
 *
 * @async
 * @function messageAgent
 * @param {string} userMessage - The message sent by the user.
 * @returns {Promise<AgentResponse | null>} The full agent response or `null` if an error occurs.
 *
 * @throws {Error} Logs an error if the request fails.
 */
async function messageAgent(userMessage: string): Promise<AgentResponse | null> {
  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage } as AgentRequest),
    });

    const data = (await response.json()) as AgentResponse;
    return data;
  } catch (error) {
    console.error("Error communicating with agent:", error);
    return null;
  }
}

/**
 *
 * This hook manages interactions with the AI agent by making REST calls to the backend.
 * It also stores the local conversation state, tracking messages sent by the user and
 * responses from the agent.
 *
 * #### How It Works
 * - `sendMessage(input)` sends a message to `/api/agent` and updates state.
 * - `messages` stores the chat history.
 * - `isThinking` tracks whether the agent is processing a response.
 * - If the agent returns a `generateImage` flag, it stores the pending prompt for user confirmation.
 * - `confirmPendingImage()` triggers the payment flow, `cancelPendingImage()` dismisses it.
 *
 * #### See Also
 * - The API logic in `/api/agent.ts`
 *
 * @returns {object} An object containing:
 * - `messages`: The conversation history.
 * - `sendMessage`: A function to send a new message.
 * - `isThinking`: Boolean indicating if the agent is processing a response.
 * - `pendingImageRequest`: The pending image generation request awaiting confirmation, or null.
 * - `confirmPendingImage`: Callback to confirm the pending image request (returns the prompt).
 * - `cancelPendingImage`: Callback to cancel the pending image request.
 */
export function useAgent() {
  const [messages, setMessages] = useState<{ text: string; sender: "user" | "agent" }[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingImageRequest, setPendingImageRequest] = useState<PendingImageRequest | null>(null);

  /**
   * Sends a user message, updates local state, and retrieves the agent's response.
   *
   * @param {string} input - The message from the user.
   */
  const sendMessage = async (input: string) => {
    if (!input.trim()) return;

    setMessages(prev => [...prev, { text: input, sender: "user" }]);
    setIsThinking(true);

    const data = await messageAgent(input);

    if (data) {
      const responseMessage = data.response ?? data.error ?? null;
      if (responseMessage) {
        setMessages(prev => [...prev, { text: responseMessage, sender: "agent" }]);
      }

      // Check for image generation request - store it for user confirmation
      if (data.generateImage?.prompt) {
        console.log("[useAgent] Image generation request detected, awaiting confirmation:", data.generateImage.prompt);
        setPendingImageRequest({ prompt: data.generateImage.prompt });
      }
    }

    setIsThinking(false);
  };

  /**
   * Confirms the pending image request and returns the prompt.
   * The caller should use the returned prompt to trigger the payment flow.
   */
  const confirmPendingImage = useCallback((): string | null => {
    if (!pendingImageRequest) return null;
    const prompt = pendingImageRequest.prompt;
    setPendingImageRequest(null);
    return prompt;
  }, [pendingImageRequest]);

  /**
   * Cancels the pending image request.
   */
  const cancelPendingImage = useCallback(() => {
    if (pendingImageRequest) {
      setMessages(prev => [...prev, { text: "Image generation cancelled.", sender: "agent" }]);
    }
    setPendingImageRequest(null);
  }, [pendingImageRequest]);

  /**
   * Adds a message to the chat from the agent.
   * Useful for external components to add status messages.
   */
  const addAgentMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { text, sender: "agent" }]);
  }, []);

  return { 
    messages, 
    sendMessage, 
    isThinking, 
    pendingImageRequest, 
    confirmPendingImage, 
    cancelPendingImage,
    addAgentMessage
  };
}
