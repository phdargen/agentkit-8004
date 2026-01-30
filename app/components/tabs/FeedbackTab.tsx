"use client";

import { FeedbackForm } from "../FeedbackForm";

interface FeedbackTabProps {
  agentId: string | null;
  lastEndpoint: string | null;
  lastPaymentTxHash: string | null;
}

export function FeedbackTab({
  agentId,
  lastEndpoint,
  lastPaymentTxHash,
}: FeedbackTabProps) {
  return (
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
        agentId={agentId}
        endpoint={lastEndpoint || undefined}
        paymentTxHash={lastPaymentTxHash || undefined}
      />
    </div>
  );
}
