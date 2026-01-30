"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { REPUTATION_REGISTRY_ABI } from "@/lib/erc8004/abi";
import { getRegistryAddress } from "@/actions/erc8004/constants";
import { IDENTITY_CHAIN_ID, IDENTITY_CHAIN_NAME } from "../lib/wagmi-config";
import type { ProofOfPayment } from "../page";

type FeedbackFormProps = {
  agentId: string | null;
  endpoint?: string;
  paymentTxHash?: string;
  proofOfPayment?: ProofOfPayment;
  onSuccess?: () => void;
  isOnCorrectChain?: boolean;
};

/**
 * FeedbackForm component for submitting reputation feedback
 * Users can rate agents on a 0-100 scale with optional tags
 * Note: Feedback is submitted on Sepolia (identity chain), not Base Sepolia (payment chain)
 */
export function FeedbackForm({ agentId, endpoint, paymentTxHash, proofOfPayment, onSuccess, isOnCorrectChain = true }: FeedbackFormProps) {
  const { isConnected } = useAccount();
  const [score, setScore] = useState(80);
  const [tag1, setTag1] = useState("");
  const [tag2, setTag2] = useState("");
  const [comment, setComment] = useState("");
  const [hasNotifiedSuccess, setHasNotifiedSuccess] = useState(false);
  const [isPreparingFeedback, setIsPreparingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [ipfsEnabled, setIpfsEnabled] = useState<boolean | null>(null);

  // Use Sepolia (identity chain) for the reputation registry
  const reputationRegistry = getRegistryAddress("reputation", IDENTITY_CHAIN_ID);

  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    // Ensure we actively poll for the receipt
    query: {
      enabled: !!hash,
      refetchInterval: 1000,
    },
  });

  // Check if IPFS upload is enabled on mount
  useEffect(() => {
    async function checkIpfsStatus() {
      try {
        const response = await fetch("/api/feedback");
        if (response.ok) {
          const data = await response.json();
          setIpfsEnabled(data.ipfsEnabled);
        }
      } catch {
        // Silently fail - IPFS status is informational only
        setIpfsEnabled(false);
      }
    }
    checkIpfsStatus();
  }, []);

  // Call onSuccess callback when feedback is successfully submitted
  useEffect(() => {
    if (isSuccess && hash && !hasNotifiedSuccess) {
      setHasNotifiedSuccess(true);
      onSuccess?.();
      // Reset form state after successful submission
      setScore(80);
      setTag1("");
      setTag2("");
      setComment("");
    }
  }, [isSuccess, hash, hasNotifiedSuccess, onSuccess]);

  // Reset notification flag when starting a new transaction
  useEffect(() => {
    if (isPending) {
      setHasNotifiedSuccess(false);
    }
  }, [isPending]);

  /**
   * Generates feedback URI and hash via the API
   * The API will upload to IPFS if UPLOAD_FEEDBACK_TO_IPFS=true, otherwise returns a data URI
   */
  const generateFeedbackData = async (): Promise<{ uri: string; hash: `0x${string}`; uploadedToIpfs: boolean }> => {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: comment || "",
        score,
        tag1: tag1 || "",
        tag2: tag2 || "",
        endpoint,
        paymentTxHash,
        proofOfPayment,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate feedback data");
    }

    const data = await response.json();
    return {
      uri: data.uri,
      hash: data.hash as `0x${string}`,
      uploadedToIpfs: data.uploadedToIpfs,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agentId || !isConnected) {
      return;
    }

    setIsPreparingFeedback(true);
    setFeedbackError(null);

    try {
      const { uri: feedbackURI, hash: feedbackHash } = await generateFeedbackData();

      writeContract({
        address: reputationRegistry,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "giveFeedback",
        args: [
          BigInt(agentId),
          BigInt(score),  // value (int128)
          0,              // valueDecimals (uint8)
          tag1 || "",
          tag2 || "",
          endpoint || "",
          feedbackURI,
          feedbackHash,
        ],
      });
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : "Failed to prepare feedback");
    } finally {
      setIsPreparingFeedback(false);
    }
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

      {/* Optional comment */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Comment (optional) <span className="text-gray-400 font-normal">{comment.length}/200</span>
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Add a comment about your experience..."
          rows={3}
          maxLength={200}
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 resize-none"
        />
      </div>

      {/* Proof of Payment info (non-editable) */}
      {proofOfPayment && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 space-y-2">
          <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
            Proof of Payment (included in feedback)
          </h4>
          <div className="grid grid-cols-1 gap-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400 w-16 flex-shrink-0">From:</span>
              <code className="font-mono text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800/30 px-1 rounded truncate">
                {proofOfPayment.fromAddress || "N/A"}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400 w-16 flex-shrink-0">To:</span>
              <code className="font-mono text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800/30 px-1 rounded truncate">
                {proofOfPayment.toAddress || "N/A"}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400 w-16 flex-shrink-0">Chain ID:</span>
              <code className="font-mono text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800/30 px-1 rounded">
                {proofOfPayment.chainId}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400 w-16 flex-shrink-0">Tx Hash:</span>
              <code className="font-mono text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800/30 px-1 rounded truncate">
                {proofOfPayment.txHash.slice(0, 16)}...{proofOfPayment.txHash.slice(-8)}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Endpoint info */}
      {endpoint && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Feedback for endpoint: <code className="font-mono">{endpoint}</code>
        </div>
      )}

      {/* IPFS status indicator */}
      {ipfsEnabled !== null && (
        <div className={`flex items-center gap-2 text-xs ${ipfsEnabled ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
          <span className={`w-2 h-2 rounded-full ${ipfsEnabled ? "bg-green-500" : "bg-gray-400"}`}></span>
          {ipfsEnabled ? "Feedback will be stored on IPFS" : "Feedback stored as data URI"}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isPending || isConfirming || isPreparingFeedback || !isOnCorrectChain}
        className="w-full px-4 py-2 text-white bg-[#0052FF] hover:bg-[#003ECF] rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {!isOnCorrectChain
          ? `Switch to ${IDENTITY_CHAIN_NAME} to submit`
          : isPreparingFeedback
            ? "Preparing feedback..."
            : isPending
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

      {feedbackError && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">Error: {feedbackError}</p>
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
