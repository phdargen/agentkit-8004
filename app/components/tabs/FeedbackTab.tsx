"use client";

import { FeedbackForm } from "../FeedbackForm";
import type { ProofOfPayment, GeneratedImage } from "../../page";

interface FeedbackTabProps {
  agentId: string | null;
  lastEndpoint: string | null;
  lastPaymentTxHash: string | null;
  proofOfPayment?: ProofOfPayment | null;
  generatedImage?: GeneratedImage | null;
  onFeedbackSuccess?: () => void;
  // Chain props for identity network
  isConnected?: boolean;
  isOnIdentityChain?: boolean;
  identityChainName?: string;
  isSwitchingChain?: boolean;
  onSwitchToIdentityChain?: () => void;
}

export function FeedbackTab({
  agentId,
  lastEndpoint,
  lastPaymentTxHash,
  proofOfPayment,
  generatedImage,
  onFeedbackSuccess,
  isConnected = false,
  isOnIdentityChain = false,
  identityChainName = "Sepolia",
  isSwitchingChain = false,
  onSwitchToIdentityChain,
}: FeedbackTabProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
          ERC-8004 Reputation Feedback
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Submit on-chain feedback for the agent. Your feedback is recorded on the ERC-8004
          Reputation Registry on {identityChainName} and helps build the agent&apos;s reputation score.
        </p>
      </div>

      {/* Chain Warning - need to be on Sepolia for reputation */}
      {isConnected && !isOnIdentityChain && (
        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center justify-between">
          <p className="text-sm text-orange-700 dark:text-orange-300">
            Please switch to {identityChainName} to submit feedback.
          </p>
          {onSwitchToIdentityChain && (
            <button
              onClick={onSwitchToIdentityChain}
              disabled={isSwitchingChain}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
            >
              {isSwitchingChain ? "Switching..." : `Switch to ${identityChainName}`}
            </button>
          )}
        </div>
      )}

      <FeedbackForm
        agentId={agentId}
        endpoint={lastEndpoint || undefined}
        paymentTxHash={lastPaymentTxHash || undefined}
        proofOfPayment={proofOfPayment || undefined}
        generatedImage={generatedImage || undefined}
        onSuccess={onFeedbackSuccess}
        isOnCorrectChain={isOnIdentityChain}
      />
    </div>
  );
}
