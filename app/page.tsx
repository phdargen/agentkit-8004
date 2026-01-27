"use client";

import { useState, useEffect, useRef } from "react";
import { useAgent } from "./hooks/useAgent";
import ReactMarkdown from "react-markdown";
import { WalletConnect } from "./components/WalletConnect";
import { FeedbackForm } from "./components/FeedbackForm";

type AgentIdentity = {
  identity: {
    agentId: string | null;
    isRegistered: boolean;
  };
  registries: {
    chainId: number;
    network: string;
  };
};

/**
 * Home page for the ERC-8004 Agent Demo
 */
export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isThinking } = useAgent();
  const [activeTab, setActiveTab] = useState<"chat" | "endpoints" | "feedback">("chat");
  const [agentIdentity, setAgentIdentity] = useState<AgentIdentity | null>(null);
  const [premiumResponse, setPremiumResponse] = useState<string | null>(null);
  const [lastEndpoint, setLastEndpoint] = useState<string | null>(null);
  const [lastPaymentTxHash, setLastPaymentTxHash] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch agent identity on mount
  useEffect(() => {
    fetch("/api/agent/identity")
      .then(res => res.json())
      .then(data => setAgentIdentity(data))
      .catch(console.error);
  }, []);

  const onSendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const message = input;
    setInput("");
    await sendMessage(message);
  };

  // Test free endpoint
  const testFreeEndpoint = async () => {
    try {
      const res = await fetch("/api/agent");
      const data = await res.json();
      setPremiumResponse(JSON.stringify(data, null, 2));
      setLastEndpoint("/api/agent");
      setLastPaymentTxHash(null);
    } catch (error) {
      setPremiumResponse(`Error: ${error}`);
    }
  };

  // Test premium endpoint info (GET - no payment)
  const testPremiumInfo = async () => {
    try {
      const res = await fetch("/api/agent/premium");
      const data = await res.json();
      setPremiumResponse(JSON.stringify(data, null, 2));
      setLastEndpoint("/api/agent/premium");
      setLastPaymentTxHash(null);
    } catch (error) {
      setPremiumResponse(`Error: ${error}`);
    }
  };

  return (
    <div className="flex flex-col flex-grow items-center justify-center text-black dark:text-white w-full h-full p-4">
      {/* Wallet Connect Section */}
      <div className="w-full max-w-4xl mb-4">
        <WalletConnect />
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b dark:border-gray-700">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === "chat"
                ? "bg-[#0052FF] text-white"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Chat with Agent
          </button>
          <button
            onClick={() => setActiveTab("endpoints")}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === "endpoints"
                ? "bg-[#0052FF] text-white"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Test Endpoints
          </button>
          <button
            onClick={() => setActiveTab("feedback")}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === "feedback"
                ? "bg-[#0052FF] text-white"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Give Feedback
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* Chat Tab */}
          {activeTab === "chat" && (
            <div className="h-[50vh] flex flex-col">
              <div className="flex-grow overflow-y-auto space-y-3 p-2">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500">
                    Start chatting with the ERC-8004 Agent...
                  </p>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-2xl shadow ${
                        msg.sender === "user"
                          ? "bg-[#0052FF] text-white self-end"
                          : "bg-gray-100 dark:bg-gray-700 self-start"
                      }`}
                    >
                      <ReactMarkdown
                        components={{
                          a: props => (
                            <a
                              {...props}
                              className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          ),
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  ))
                )}
                {isThinking && (
                  <div className="text-right mr-2 text-gray-500 italic">Thinking...</div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="text"
                  className="flex-grow p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Type a message (try: 'get my agent identity' or 'register agent')..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && onSendMessage()}
                  disabled={isThinking}
                />
                <button
                  onClick={onSendMessage}
                  className={`px-6 py-2 rounded-full font-semibold transition-all ${
                    isThinking
                      ? "bg-gray-300 cursor-not-allowed text-gray-500"
                      : "bg-[#0052FF] hover:bg-[#003ECF] text-white shadow-md"
                  }`}
                  disabled={isThinking}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Endpoints Tab */}
          {activeTab === "endpoints" && (
            <div className="space-y-4">
              {/* Agent Identity Info */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h3 className="font-semibold mb-2">Agent Identity</h3>
                {agentIdentity ? (
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-gray-500">Agent ID:</span>{" "}
                      {agentIdentity.identity.agentId || "Not registered"}
                    </p>
                    <p>
                      <span className="text-gray-500">Registered:</span>{" "}
                      {agentIdentity.identity.isRegistered ? "Yes" : "No"}
                    </p>
                    <p>
                      <span className="text-gray-500">Network:</span>{" "}
                      {agentIdentity.registries.network}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">Loading...</p>
                )}
              </div>

              {/* Test Buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={testFreeEndpoint}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Test Free Endpoint
                </button>
                <button
                  onClick={testPremiumInfo}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Premium Endpoint Info
                </button>
                <a
                  href="/.well-known/agent-card.json"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  View AgentCard
                </a>
              </div>

              {/* Response Display */}
              {premiumResponse && (
                <div className="p-4 bg-gray-900 rounded-lg overflow-auto max-h-64">
                  <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                    {premiumResponse}
                  </pre>
                </div>
              )}

              {/* Endpoint Documentation */}
              <div className="mt-4 space-y-2 text-sm">
                <h4 className="font-semibold">Available Endpoints:</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li>
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/api/agent</code> -
                    Free agent interaction
                  </li>
                  <li>
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                      /api/agent/premium
                    </code>{" "}
                    - x402 paid endpoint
                  </li>
                  <li>
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                      /api/agent/identity
                    </code>{" "}
                    - Agent identity info
                  </li>
                  <li>
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                      /.well-known/agent-card.json
                    </code>{" "}
                    - A2A AgentCard
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Feedback Tab */}
          {activeTab === "feedback" && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  ERC-8004 Reputation Feedback
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Submit on-chain feedback for the agent. Your feedback is recorded on the ERC-8004
                  Reputation Registry and helps build the agent&apos;s reputation score.
                </p>
              </div>

              <FeedbackForm
                agentId={agentIdentity?.identity.agentId || null}
                endpoint={lastEndpoint || undefined}
                paymentTxHash={lastPaymentTxHash || undefined}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-4xl mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          ERC-8004 Demo Agent | Chain:{" "}
          {agentIdentity?.registries.network || "Loading..."} | x402 Payments Enabled
        </p>
      </div>
    </div>
  );
}
