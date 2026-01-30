"use client";

import { useState } from "react";
import { useAccount, useWalletClient, useSwitchChain } from "wagmi";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { useAgent } from "./hooks/useAgent";
import { useAgentIdentity } from "./hooks/useAgentIdentity";
import { useAgentReputation } from "./hooks/useAgentReputation";
import { WalletConnect } from "./components/WalletConnect";
import { ChatTab, ReputationTab, FeedbackTab } from "./components/tabs";
import { 
  PAYMENT_CHAIN_ID, 
  PAYMENT_CHAIN_NAME, 
  IDENTITY_CHAIN_ID,
  IDENTITY_CHAIN_NAME,
  wagmiToClientSigner 
} from "./lib/wagmi-config";

// Proof of payment info extracted from x402 payment response
export interface ProofOfPayment {
  fromAddress: string;
  toAddress: string;
  chainId: string;
  txHash: string;
}

// Generated image info
export interface GeneratedImage {
  ipfsHash: string;
  ipfsUri: string;
  httpUrl: string;
  prompt: string;
}

/**
 * Home page for the ERC-8004 Agent Demo
 */
export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isThinking } = useAgent();
  const [activeTab, setActiveTab] = useState<"chat" | "reputation" | "feedback">("chat");
  const [premiumResponse, setPremiumResponse] = useState<string | null>(null);
  const [lastEndpoint, setLastEndpoint] = useState<string | null>(null);
  const [lastPaymentTxHash, setLastPaymentTxHash] = useState<string | null>(null);
  const [lastProofOfPayment, setLastProofOfPayment] = useState<ProofOfPayment | null>(null);
  const [isTestingEndpoint, setIsTestingEndpoint] = useState(false);
  const [endpointError, setEndpointError] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [lastGeneratedImage, setLastGeneratedImage] = useState<GeneratedImage | null>(null);

  // Use SWR hooks for agent identity and reputation
  const { agentId, isRegistered, network, rawMetadata, explorerUrl, isLoading: identityLoading, error: identityError } = useAgentIdentity();
  const { summary, feedback, isLoading: reputationLoading, error: reputationError, refresh: refreshReputation } = useAgentReputation(agentId);
  
  // Wagmi hooks for wallet connection and signing
  const { isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  
  // Check if wallet is on the correct chain for payments (Base Sepolia)
  const isOnPaymentChain = chain?.id === PAYMENT_CHAIN_ID;
  // Check if wallet is on the correct chain for identity/reputation (Sepolia)
  const isOnIdentityChain = chain?.id === IDENTITY_CHAIN_ID;

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
      // Don't clear proof of payment for free endpoint - keep last payment info
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
      // Don't clear proof of payment for GET - keep last payment info
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setEndpointError(errorMessage);
      setPremiumResponse(null);
    } finally {
      setIsTestingEndpoint(false);
    }
  };

  // Handle chain switching for payments (to Base Sepolia)
  const handleSwitchToPaymentChain = async () => {
    try {
      switchChain({ chainId: PAYMENT_CHAIN_ID });
    } catch (err) {
      console.error("Failed to switch chain:", err);
      setEndpointError(`Failed to switch to ${PAYMENT_CHAIN_NAME}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Handle chain switching for identity/reputation (to Sepolia)
  const handleSwitchToIdentityChain = async () => {
    try {
      switchChain({ chainId: IDENTITY_CHAIN_ID });
    } catch (err) {
      console.error("Failed to switch chain:", err);
    }
  };

  // Test premium endpoint with x402 payment (POST - requires payment)
  const testPremiumWithPayment = async () => {
    if (!isConnected) {
      setEndpointError("Please connect your wallet first");
      return;
    }
    
    if (!isOnPaymentChain) {
      setEndpointError(`Please switch to ${PAYMENT_CHAIN_NAME} network for payments`);
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
      
      // Extract payment response using x402HTTPClient
      const httpClient = new x402HTTPClient(client);
      const paymentResponse = httpClient.getPaymentSettleResponse(
        (name: string) => response.headers.get(name)
      );

      const fullResponse = {
        endpoint: "/api/agent/premium (POST with x402)",
        response: data,
        ...(paymentResponse && { paymentResponse }),
      };

      setPremiumResponse(JSON.stringify(fullResponse, null, 2));
      setLastEndpoint("/api/agent/premium");
      
      // Extract full proof of payment from payment response if available
      if (paymentResponse?.transaction) {
        setLastPaymentTxHash(paymentResponse.transaction);
        
        // Build proof of payment from decoded payment response
        // SettleResponse contains: transaction, network, payer (sender)
        // Note: payee (receiver) is not in the response - it's the configured agent wallet
        const proofOfPayment: ProofOfPayment = {
          fromAddress: paymentResponse.payer || "",
          toAddress: process.env.NEXT_PUBLIC_AGENT_WALLET_ADDRESS || "(agent wallet)",
          chainId: paymentResponse.network ? paymentResponse.network.split(":")[1] || String(PAYMENT_CHAIN_ID) : String(PAYMENT_CHAIN_ID),
          txHash: paymentResponse.transaction,
        };
        setLastProofOfPayment(proofOfPayment);
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

  // Generate image with x402 payment
  const generateImageWithPayment = async (imagePrompt: string) => {
    if (!isConnected) {
      setEndpointError("Please connect your wallet first");
      return;
    }
    
    if (!isOnPaymentChain) {
      setEndpointError(`Please switch to ${PAYMENT_CHAIN_NAME} network for payments`);
      return;
    }
    
    if (!walletClient) {
      setEndpointError("Wallet client not available. Please ensure your wallet supports signing.");
      return;
    }

    if (!imagePrompt.trim()) {
      setEndpointError("Please enter a prompt for image generation");
      return;
    }

    setIsGeneratingImage(true);
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

      const response = await fetchWithPayment("/api/agent/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: imagePrompt,
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
      
      // Extract payment response using x402HTTPClient
      const httpClient = new x402HTTPClient(client);
      const paymentResponse = httpClient.getPaymentSettleResponse(
        (name: string) => response.headers.get(name)
      );

      // Store generated image info
      if (data.image) {
        setLastGeneratedImage({
          ipfsHash: data.image.ipfsHash,
          ipfsUri: data.image.ipfsUri,
          httpUrl: data.image.httpUrl,
          prompt: imagePrompt,
        });
      }

      const fullResponse = {
        endpoint: "/api/agent/image (POST with x402)",
        response: data,
        ...(paymentResponse && { paymentResponse }),
      };

      setPremiumResponse(JSON.stringify(fullResponse, null, 2));
      setLastEndpoint("/api/agent/image");
      
      // Extract full proof of payment from payment response if available
      if (paymentResponse?.transaction) {
        setLastPaymentTxHash(paymentResponse.transaction);
        
        const proofOfPayment: ProofOfPayment = {
          fromAddress: paymentResponse.payer || "",
          toAddress: process.env.NEXT_PUBLIC_AGENT_WALLET_ADDRESS || "(agent wallet)",
          chainId: paymentResponse.network ? paymentResponse.network.split(":")[1] || String(PAYMENT_CHAIN_ID) : String(PAYMENT_CHAIN_ID),
          txHash: paymentResponse.transaction,
        };
        setLastProofOfPayment(proofOfPayment);
      }
    } catch (error) {
      console.error("Image generation request failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setEndpointError(errorMessage);
      setPremiumResponse(null);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Handler for feedback submission - refreshes reputation data
  const handleFeedbackSuccess = () => {
    // Refresh reputation data after feedback is submitted
    refreshReputation();
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
            onClick={() => setActiveTab("reputation")}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === "reputation"
                ? "bg-[#0052FF] text-white"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Reputation
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
              isConnected={isConnected}
              isOnCorrectChain={isOnPaymentChain}
              chainName={PAYMENT_CHAIN_NAME}
              walletClient={walletClient}
              isSwitchingChain={isSwitchingChain}
              isTestingEndpoint={isTestingEndpoint}
              endpointError={endpointError}
              premiumResponse={premiumResponse}
              lastPaymentTxHash={lastPaymentTxHash}
              onTestFreeEndpoint={testFreeEndpoint}
              onTestPremiumInfo={testPremiumInfo}
              onTestPremiumWithPayment={testPremiumWithPayment}
              onSwitchChain={handleSwitchToPaymentChain}
              isGeneratingImage={isGeneratingImage}
              lastGeneratedImage={lastGeneratedImage}
              onGenerateImage={generateImageWithPayment}
            />
          )}

          {activeTab === "reputation" && (
            <ReputationTab
              agentId={agentId}
              isRegistered={isRegistered}
              network={network}
              identityLoading={identityLoading}
              identityError={identityError}
              rawMetadata={rawMetadata}
              explorerUrl={explorerUrl}
              summary={summary}
              feedback={feedback}
              reputationLoading={reputationLoading}
              reputationError={reputationError}
            />
          )}

          {activeTab === "feedback" && (
            <FeedbackTab
              agentId={agentId}
              lastEndpoint={lastEndpoint}
              lastPaymentTxHash={lastPaymentTxHash}
              proofOfPayment={lastProofOfPayment}
              generatedImage={lastGeneratedImage}
              onFeedbackSuccess={handleFeedbackSuccess}
              isConnected={isConnected}
              isOnIdentityChain={isOnIdentityChain}
              identityChainName={IDENTITY_CHAIN_NAME}
              isSwitchingChain={isSwitchingChain}
              onSwitchToIdentityChain={handleSwitchToIdentityChain}
            />
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-4xl mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          ERC-8004 Demo Agent | Identity: {IDENTITY_CHAIN_NAME} | Payments: {PAYMENT_CHAIN_NAME}
        </p>
      </div>
    </div>
  );
}
