"use client";

import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  sender: "user" | "agent";
  text: string;
}

interface ChatTabProps {
  messages: Message[];
  input: string;
  isThinking: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  // Endpoint testing props
  isConnected?: boolean;
  isOnCorrectChain?: boolean;
  chainName?: string;
  walletClient?: unknown;
  isSwitchingChain?: boolean;
  isTestingEndpoint?: boolean;
  endpointError?: string | null;
  premiumResponse?: string | null;
  lastPaymentTxHash?: string | null;
  onTestFreeEndpoint?: () => void;
  onTestPremiumInfo?: () => void;
  onTestPremiumWithPayment?: () => void;
  onSwitchChain?: () => void;
}

export function ChatTab({
  messages,
  input,
  isThinking,
  onInputChange,
  onSendMessage,
  // Endpoint testing props with defaults
  isConnected = false,
  isOnCorrectChain = false,
  chainName = "",
  walletClient,
  isSwitchingChain = false,
  isTestingEndpoint = false,
  endpointError,
  premiumResponse,
  lastPaymentTxHash,
  onTestFreeEndpoint,
  onTestPremiumInfo,
  onTestPremiumWithPayment,
  onSwitchChain,
}: ChatTabProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isEndpointsExpanded, setIsEndpointsExpanded] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSendMessage();
    }
  };

  // Check if endpoint testing is available
  const hasEndpointTesting = onTestFreeEndpoint || onTestPremiumInfo || onTestPremiumWithPayment;

  return (
    <div className="flex flex-col">
      {/* Collapsible Endpoint Testing Section */}
      {hasEndpointTesting && (
        <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <button
            onClick={() => setIsEndpointsExpanded(!isEndpointsExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="font-medium">Test Endpoints</span>
            <svg
              className={`w-5 h-5 transition-transform ${isEndpointsExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isEndpointsExpanded && (
            <div className="p-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
              {/* Wallet Status for Payments */}
              {!isConnected && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Connect your wallet above to test premium endpoints with x402 payment.
                  </p>
                </div>
              )}

              {/* Chain Warning with Switch Button */}
              {isConnected && !isOnCorrectChain && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Please switch to {chainName} to use x402 payments.
                  </p>
                  {onSwitchChain && (
                    <button
                      onClick={onSwitchChain}
                      disabled={isSwitchingChain}
                      className="px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                    >
                      {isSwitchingChain ? "Switching..." : `Switch to ${chainName}`}
                    </button>
                  )}
                </div>
              )}

              {/* Test Buttons */}
              <div className="flex gap-2 flex-wrap">
                {onTestFreeEndpoint && (
                  <button
                    onClick={onTestFreeEndpoint}
                    disabled={isTestingEndpoint}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {isTestingEndpoint ? "Testing..." : "Test Free Endpoint"}
                  </button>
                )}
                {onTestPremiumInfo && (
                  <button
                    onClick={onTestPremiumInfo}
                    disabled={isTestingEndpoint}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {isTestingEndpoint ? "Testing..." : "Premium Info (GET)"}
                  </button>
                )}
                {onTestPremiumWithPayment && (
                  <button
                    onClick={onTestPremiumWithPayment}
                    disabled={isTestingEndpoint || !isConnected || !isOnCorrectChain || !walletClient}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    title={!isConnected ? "Connect wallet first" : !isOnCorrectChain ? `Switch to ${chainName} first` : "Test premium endpoint with x402 payment"}
                  >
                    {isTestingEndpoint ? "Processing..." : "Premium with Payment (POST)"}
                  </button>
                )}
              </div>

              {/* Error Display */}
              {endpointError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">Error:</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{endpointError}</p>
                </div>
              )}

              {/* Response Display */}
              {premiumResponse && (
                <div className="p-4 bg-gray-900 rounded-lg overflow-auto max-h-60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 font-medium">Response</span>
                    {lastPaymentTxHash && (
                      <span className="text-xs text-green-400">
                        Payment TX: {lastPaymentTxHash.slice(0, 10)}...
                      </span>
                    )}
                  </div>
                  <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                    {premiumResponse}
                  </pre>
                </div>
              )}

              {/* Endpoint Documentation */}
              <div className="mt-2 space-y-1 text-sm">
                <h4 className="font-medium text-gray-600 dark:text-gray-400">Available Endpoints:</h4>
                <ul className="space-y-1 text-gray-500 dark:text-gray-500 text-xs">
                  <li>
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/api/agent</code> - Free agent interaction
                  </li>
                  <li>
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/api/agent/premium</code> - x402 paid endpoint
                  </li>
                  <li>
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/api/agent/identity</code> - Agent identity info
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Messages */}
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
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
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
    </div>
  );
}
