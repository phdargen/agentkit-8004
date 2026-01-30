import { useState } from "react";
import { AgentRequest, AgentResponse } from "../types/api";

/**
 * Options for the useAgent hook
 */
interface UseAgentOptions {
  /** Callback triggered when the agent requests image generation */
  onGenerateImage?: (prompt: string) => void;
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
 * - If the agent returns a `generateImage` flag, the `onGenerateImage` callback is triggered.
 *
 * #### See Also
 * - The API logic in `/api/agent.ts`
 *
 * @param {UseAgentOptions} options - Optional configuration for the hook.
 * @returns {object} An object containing:
 * - `messages`: The conversation history.
 * - `sendMessage`: A function to send a new message.
 * - `isThinking`: Boolean indicating if the agent is processing a response.
 */
export function useAgent(options?: UseAgentOptions) {
  const [messages, setMessages] = useState<{ text: string; sender: "user" | "agent" }[]>([]);
  const [isThinking, setIsThinking] = useState(false);

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

      // Check for image generation request and trigger callback
      if (data.generateImage?.prompt) {
        console.log("[useAgent] Image generation request detected:", data.generateImage.prompt);
        if (options?.onGenerateImage) {
          console.log("[useAgent] Calling onGenerateImage callback");
          options.onGenerateImage(data.generateImage.prompt);
        } else {
          console.warn("[useAgent] No onGenerateImage callback provided");
        }
      }
    }

    setIsThinking(false);
  };

  return { messages, sendMessage, isThinking };
}
