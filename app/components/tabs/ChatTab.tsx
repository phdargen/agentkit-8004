"use client";

import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  sender: "user" | "agent";
  text: string;
}

interface GeneratedImage {
  ipfsHash: string;
  ipfsUri: string;
  httpUrl: string;
  prompt: string;
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
  // Image generation props
  isGeneratingImage?: boolean;
  lastGeneratedImage?: GeneratedImage | null;
  onGenerateImage?: (prompt: string) => void;
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
  // Image generation props
  isGeneratingImage = false,
  lastGeneratedImage,
  onGenerateImage,
}: ChatTabProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isEndpointsExpanded, setIsEndpointsExpanded] = useState(false);
  const [isImageGenExpanded, setIsImageGenExpanded] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");

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
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/api/agent/image</code> - x402 paid image generation
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

      {/* Collapsible Image Generation Section */}
      {onGenerateImage && (
        <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <button
            onClick={() => setIsImageGenExpanded(!isImageGenExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 rounded-lg transition-colors"
          >
            <span className="font-medium flex items-center gap-2">
              <span className="text-lg">🎨</span>
              AI Image Generation (Premium)
            </span>
            <svg
              className={`w-5 h-5 transition-transform ${isImageGenExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isImageGenExpanded && (
            <div className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
              {/* Wallet Status for Payments */}
              {!isConnected && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Connect your wallet above to generate images with x402 payment.
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

              {/* Image Prompt Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Describe the image you want to generate
                </label>
                <textarea
                  value={imagePrompt}
                  onChange={e => setImagePrompt(e.target.value)}
                  placeholder="A beautiful sunset over mountains with a lake in the foreground..."
                  rows={3}
                  maxLength={4000}
                  className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 resize-none"
                  disabled={isGeneratingImage}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{imagePrompt.length}/4000</span>
                  <button
                    onClick={() => onGenerateImage(imagePrompt)}
                    disabled={isGeneratingImage || !isConnected || !isOnCorrectChain || !walletClient || !imagePrompt.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center gap-2"
                    title={!isConnected ? "Connect wallet first" : !isOnCorrectChain ? `Switch to ${chainName} first` : !imagePrompt.trim() ? "Enter a prompt" : "Generate image with x402 payment"}
                  >
                    {isGeneratingImage ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Generating...
                      </>
                    ) : (
                      <>
                        <span>🎨</span>
                        Generate Image
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Generated Image Display */}
              {lastGeneratedImage && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Generated Image
                  </h4>
                  <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden shadow-lg">
                    <img
                      src={lastGeneratedImage.httpUrl}
                      alt={lastGeneratedImage.prompt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">Prompt:</span>
                      <span className="text-gray-700 dark:text-gray-300 truncate">
                        {lastGeneratedImage.prompt}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">IPFS:</span>
                      <a
                        href={lastGeneratedImage.httpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 font-mono truncate"
                      >
                        {lastGeneratedImage.ipfsHash}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p>Images are generated using OpenAI&apos;s gpt-image-1 model and permanently stored on IPFS.</p>
                <p className="mt-1">Payment: x402 protocol on {chainName}</p>
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
