"use client";

import { useState } from "react";
import { useAccount, useWalletClient, useSwitchChain } from "wagmi";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { useAgent } from "./hooks/useAgent";
import { useAgentIdentity } from "./hooks/useAgentIdentity";
import { WalletConnect } from "./components/WalletConnect";
import { ChatTab, EndpointsTab, FeedbackTab } from "./components/tabs";
import { CHAIN_ID, CHAIN_NAME, wagmiToClientSigner } from "./lib/wagmi-config";

/**
 * Home page for the ERC-8004 Agent Demo
 */
export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isThinking } = useAgent();
  const [activeTab, setActiveTab] = useState<"chat" | "endpoints" | "feedback">("chat");
  const [premiumResponse, setPremiumResponse] = useState<string | null>(null);
  const [lastEndpoint, setLastEndpoint] = useState<string | null>(null);
  const [lastPaymentTxHash, setLastPaymentTxHash] = useState<string | null>(null);
  const [isTestingEndpoint, setIsTestingEndpoint] = useState(false);
  const [endpointError, setEndpointError] = useState<string | null>(null);

  // Use SWR hook for agent identity
  const { agentId, isRegistered, network, isLoading: identityLoading, error: identityError } = useAgentIdentity();
  
  // Wagmi hooks for wallet connection and signing
  const { isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  
  // Check if wallet is on the correct chain
  const isOnCorrectChain = chain?.id === CHAIN_ID;

  const onSendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const message = input;
    setInput("");
    await sendMessage(message);
  };

  // Test free endpoint
  const testFreeEndpoint = async () => {
    setIsTestingEndpoint(true);
    setEndpointError(null);
    setPremiumResponse(null);
    
    try {
      const res = await fetch("/api/agent");
      const data = await res.json();
      setPremiumResponse(JSON.stringify(data, null, 2));
      setLastEndpoint("/api/agent");
      setLastPaymentTxHash(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setEndpointError(errorMessage);
      setPremiumResponse(null);
    } finally {
      setIsTestingEndpoint(false);
    }
  };

  // Test premium endpoint info (GET - no payment)
  const testPremiumInfo = async () => {
    setIsTestingEndpoint(true);
    setEndpointError(null);
    setPremiumResponse(null);
    
    try {
      const res = await fetch("/api/agent/premium");
      const data = await res.json();
      setPremiumResponse(JSON.stringify(data, null, 2));
      setLastEndpoint("/api/agent/premium (GET)");
      setLastPaymentTxHash(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setEndpointError(errorMessage);
      setPremiumResponse(null);
    } finally {
      setIsTestingEndpoint(false);
    }
  };

  // Handle chain switching
  const handleSwitchChain = async () => {
    try {
      switchChain({ chainId: CHAIN_ID });
    } catch (err) {
      console.error("Failed to switch chain:", err);
      setEndpointError(`Failed to switch to ${CHAIN_NAME}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Test premium endpoint with x402 payment (POST - requires payment)
  const testPremiumWithPayment = async () => {
    if (!isConnected) {
      setEndpointError("Please connect your wallet first");
      return;
    }
    
    if (!isOnCorrectChain) {
      setEndpointError(`Please switch to ${CHAIN_NAME} network`);
      return;
    }
    
    if (!walletClient) {
      setEndpointError("Wallet client not available. Please ensure your wallet supports signing.");
      return;
    }

    setIsTestingEndpoint(true);
    setEndpointError(null);
    setPremiumResponse(null);

    try {
      // Create x402 client and register EVM scheme with wagmi signer
      const signer = wagmiToClientSigner(walletClient);
      const client = new x402Client()
        .onPaymentCreationFailure(async context => {
          console.error("[x402] Payment creation failed:", context.error);
        });
      
      registerExactEvmScheme(client, { signer });

      // Wrap fetch with payment handling
      const fetchWithPayment = wrapFetchWithPayment(fetch, client);

      const response = await fetchWithPayment("/api/agent/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          input: "Test message from x402 payment flow",
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed (${response.status}): ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text();
        throw new Error(`Expected JSON response but got: ${responseText.substring(0, 100)}...`);
      }

      const data = await response.json();
      
      // Extract payment response header if present
      const paymentResponseHeader = response.headers.get("x-payment-response");
      let paymentInfo = null;
      
      if (paymentResponseHeader) {
        try {
          if (paymentResponseHeader.startsWith("{") && paymentResponseHeader.endsWith("}")) {
            paymentInfo = JSON.parse(paymentResponseHeader);
          } else {
            // Try base64 decode
            const decoded = atob(paymentResponseHeader);
            paymentInfo = JSON.parse(decoded);
          }
        } catch (decodeError) {
          console.warn("Failed to decode payment response header:", decodeError);
          paymentInfo = { raw: paymentResponseHeader };
        }
      }

      const fullResponse = {
        endpoint: "/api/agent/premium (POST with x402)",
        response: data,
        ...(paymentInfo && { paymentResponse: paymentInfo }),
      };

      setPremiumResponse(JSON.stringify(fullResponse, null, 2));
      setLastEndpoint("/api/agent/premium");
      
      // Extract transaction hash from payment response if available
      if (paymentInfo?.transaction) {
        setLastPaymentTxHash(paymentInfo.transaction);
      }
    } catch (error) {
      console.error("Premium endpoint request failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setEndpointError(errorMessage);
      setPremiumResponse(null);
    } finally {
      setIsTestingEndpoint(false);
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
          {activeTab === "chat" && (
            <ChatTab
              messages={messages}
              input={input}
              isThinking={isThinking}
              onInputChange={setInput}
              onSendMessage={onSendMessage}
            />
          )}

          {activeTab === "endpoints" && (
            <EndpointsTab
              agentId={agentId}
              isRegistered={isRegistered}
              network={network}
              identityLoading={identityLoading}
              identityError={identityError}
              isConnected={isConnected}
              isOnCorrectChain={isOnCorrectChain}
              chainName={CHAIN_NAME}
              walletClient={walletClient}
              isSwitchingChain={isSwitchingChain}
              isTestingEndpoint={isTestingEndpoint}
              endpointError={endpointError}
              premiumResponse={premiumResponse}
              lastPaymentTxHash={lastPaymentTxHash}
              onTestFreeEndpoint={testFreeEndpoint}
              onTestPremiumInfo={testPremiumInfo}
              onTestPremiumWithPayment={testPremiumWithPayment}
              onSwitchChain={handleSwitchChain}
            />
          )}

          {activeTab === "feedback" && (
            <FeedbackTab
              agentId={agentId}
              lastEndpoint={lastEndpoint}
              lastPaymentTxHash={lastPaymentTxHash}
            />
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-4xl mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          ERC-8004 Demo Agent | Chain:{" "}
          {network || "Loading..."} | x402 Payments Enabled
        </p>
      </div>
    </div>
  );
}
