"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { REPUTATION_REGISTRY_ABI } from "@/actions/erc8004/abis";
import { getRegistryAddress } from "@/actions/erc8004/constants";
import { CHAIN_ID } from "../lib/wagmi-config";

type FeedbackFormProps = {
  agentId: string | null;
  endpoint?: string;
  paymentTxHash?: string;
};

/**
 * FeedbackForm component for submitting reputation feedback
 * Users can rate agents on a 0-100 scale with optional tags
 */
export function FeedbackForm({ agentId, endpoint, paymentTxHash }: FeedbackFormProps) {
  const { address, isConnected } = useAccount();
  const [score, setScore] = useState(80);
  const [tag1, setTag1] = useState("");
  const [tag2, setTag2] = useState("");
  const [feedbackURI, setFeedbackURI] = useState("");

  const reputationRegistry = getRegistryAddress("reputation", CHAIN_ID);

  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agentId || !isConnected) {
      return;
    }

    const feedbackHash = "0x0000000000000000000000000000000000000000000000000000000000000000";

    writeContract({
      address: reputationRegistry,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "giveFeedback",
      args: [
        BigInt(agentId),
        score,
        tag1 || "",
        tag2 || "",
        endpoint || "",
        feedbackURI || "",
        feedbackHash as `0x${string}`,
      ],
    });
  };

  if (!isConnected) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-yellow-700 dark:text-yellow-300">Connect your wallet to submit feedback</p>
      </div>
    );
  }

  if (!agentId) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">Agent not registered. Feedback unavailable.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-y-4">
      <h3 className="font-semibold text-lg">Submit Feedback</h3>

      {/* Score slider */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Score: <span className="font-bold">{score}/100</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={score}
          onChange={e => setScore(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
      </div>

      {/* Tags */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tag 1 (optional)</label>
          <select
            value={tag1}
            onChange={e => setTag1(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">None</option>
            <option value="quality">Quality</option>
            <option value="speed">Speed</option>
            <option value="accuracy">Accuracy</option>
            <option value="helpfulness">Helpfulness</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tag 2 (optional)</label>
          <select
            value={tag2}
            onChange={e => setTag2(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">None</option>
            <option value="premium">Premium</option>
            <option value="free">Free</option>
            <option value="echo">Echo</option>
          </select>
        </div>
      </div>

      {/* Optional feedback URI */}
      <div>
        <label className="block text-sm font-medium mb-1">Feedback URI (optional)</label>
        <input
          type="text"
          value={feedbackURI}
          onChange={e => setFeedbackURI(e.target.value)}
          placeholder="ipfs://... or https://..."
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      {/* Payment proof info */}
      {paymentTxHash && (
        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300">
            Payment proof: <code className="font-mono text-xs">{paymentTxHash.slice(0, 16)}...</code>
          </p>
        </div>
      )}

      {/* Endpoint info */}
      {endpoint && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Feedback for endpoint: <code className="font-mono">{endpoint}</code>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isPending || isConfirming}
        className="w-full px-4 py-2 text-white bg-[#0052FF] hover:bg-[#003ECF] rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isPending
          ? "Confirm in wallet..."
          : isConfirming
            ? "Submitting..."
            : "Submit Feedback"}
      </button>

      {/* Status messages */}
      {isSuccess && hash && (
        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300">
            Feedback submitted! Tx: <code className="font-mono text-xs">{hash.slice(0, 16)}...</code>
          </p>
        </div>
      )}

      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">Error: {error.message.slice(0, 100)}</p>
        </div>
      )}
    </form>
  );
}
