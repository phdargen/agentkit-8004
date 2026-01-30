"use client";

import { useState } from "react";
import type { FeedbackItem, ReputationSummary } from "../../hooks/useAgentReputation";

interface ReputationTabProps {
  agentId: string | null;
  isRegistered: boolean;
  network: string | null;
  identityLoading: boolean;
  identityError: Error | undefined;
  rawMetadata: Record<string, unknown> | null;
  explorerUrl: string | null;
  summary: ReputationSummary;
  feedback: FeedbackItem[];
  reputationLoading: boolean;
  reputationError: Error | undefined;
}

/**
 * Get Tailwind color classes based on score (0-100)
 * Red (0-33) -> Yellow/Orange (34-66) -> Green (67-100)
 */
function getScoreColor(score: number): string {
  if (score <= 33) {
    return "text-red-600 dark:text-red-400";
  }
  if (score <= 66) {
    return "text-yellow-600 dark:text-yellow-400";
  }
  return "text-green-600 dark:text-green-400";
}

/**
 * Get background color classes for score badges
 */
function getScoreBgColor(score: number): string {
  if (score <= 33) {
    return "bg-red-100 dark:bg-red-900/30";
  }
  if (score <= 66) {
    return "bg-yellow-100 dark:bg-yellow-900/30";
  }
  return "bg-green-100 dark:bg-green-900/30";
}

/**
 * Format a timestamp to relative time (e.g., "8 hours ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000; // Convert seconds to milliseconds
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  
  if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

/**
 * Truncate an address for display (0x1234...5678)
 */
function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get explorer URL for a reviewer address
 */
function getReviewerExplorerUrl(address: string, chainId: number = 84532): string {
  // Default to Base Sepolia basescan
  const explorerBaseUrls: Record<number, string> = {
    1: "https://etherscan.io",
    11155111: "https://sepolia.etherscan.io",
    84532: "https://sepolia.basescan.org",
    80002: "https://amoy.polygonscan.com",
  };
  const baseUrl = explorerBaseUrls[chainId] || "https://sepolia.basescan.org";
  return `${baseUrl}/address/${address}`;
}

export function ReputationTab({
  agentId,
  isRegistered,
  network,
  identityLoading,
  identityError,
  rawMetadata,
  explorerUrl,
  summary,
  feedback,
  reputationLoading,
  reputationError,
}: ReputationTabProps) {
  const [showRawMetadata, setShowRawMetadata] = useState(false);

  // Extract chainId from network string (e.g., "eip155:84532" -> 84532)
  const chainId = network ? parseInt(network.split(":")[1] || "84532") : 84532;

  return (
    <div className="space-y-4">
      {/* Agent Identity Info */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h3 className="font-semibold mb-2">Agent Identity</h3>
        {identityError ? (
          <div className="text-sm text-red-600 dark:text-red-400">
            <p>Error: {identityError.message}</p>
          </div>
        ) : identityLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="text-sm space-y-1">
            <p>
              <span className="text-gray-500">Agent ID:</span>{" "}
              {agentId || "Not registered"}
            </p>
            <p>
              <span className="text-gray-500">Network:</span>{" "}
              {network || "Unknown"}
            </p>
            {explorerUrl && (
              <p>
                <span className="text-gray-500">Explorer:</span>{" "}
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 hover:underline"
                >
                  View on 8004scan
                </a>
              </p>
            )}
          </div>
        )}
        
        {/* View Registration Metadata Button */}
        {isRegistered && !identityLoading && (
          <button
            onClick={() => setShowRawMetadata(!showRawMetadata)}
            className="mt-3 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            {showRawMetadata ? "Hide IPFS Metadata" : "View IPFS Metadata"}
          </button>
        )}
        
        {/* Raw Metadata Display */}
        {showRawMetadata && rawMetadata && (
          <div className="mt-3 p-3 bg-gray-900 rounded-lg overflow-auto max-h-96">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium">
                Raw IPFS Metadata
              </span>
            </div>
            <pre className="text-sm text-cyan-400 font-mono whitespace-pre-wrap">
              {JSON.stringify(rawMetadata, null, 2)}
            </pre>
          </div>
        )}
        
        {showRawMetadata && !rawMetadata && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              No metadata available. The agent may not have metadata stored on IPFS.
            </p>
          </div>
        )}
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-3 gap-4">
        {/* Average Score Card */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Average Score</h4>
          {reputationLoading ? (
            <p className="text-2xl font-bold text-gray-400">...</p>
          ) : (
            <p className={`text-2xl font-bold ${getScoreColor(summary.averageValue)}`}>
              {summary.averageValue.toFixed(1)}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">out of 100</p>
        </div>

        {/* Total Feedback Card */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Total Feedback</h4>
          {reputationLoading ? (
            <p className="text-2xl font-bold text-gray-400">...</p>
          ) : (
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {summary.count}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">reviews received</p>
        </div>

        {/* Overall Score Card */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Overall Score</h4>
          {reputationLoading ? (
            <p className="text-2xl font-bold text-gray-400">...</p>
          ) : (
            <p className={`text-2xl font-bold ${getScoreColor(summary.averageValue)}`}>
              {summary.averageValue.toFixed(1)}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">reputation score</p>
        </div>
      </div>

      {/* Reputation Error */}
      {reputationError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">
            Failed to load reputation: {reputationError.message}
          </p>
        </div>
      )}

      {/* Feedback List */}
      <div className="space-y-3">
        <h3 className="font-semibold">Received Feedback</h3>
        
        {reputationLoading ? (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
            <p className="text-gray-500">Loading feedback...</p>
          </div>
        ) : feedback.length === 0 ? (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
            <p className="text-gray-500">No feedback received yet.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {feedback
              .filter((f) => !f.isRevoked)
              .map((f) => (
                <div
                  key={f.id}
                  className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    {/* Reviewer Address */}
                    <div className="flex items-center gap-2 mb-1">
                      <a
                        href={getReviewerExplorerUrl(f.reviewer, chainId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-blue-500 hover:text-blue-600 hover:underline"
                      >
                        {truncateAddress(f.reviewer)}
                      </a>
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(f.createdAt)}
                      </span>
                    </div>

                    {/* Tags */}
                    {f.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {f.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Feedback Text */}
                    {f.text && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {f.text}
                      </p>
                    )}

                    {/* Endpoint */}
                    {f.endpoint && (
                      <p className="text-xs text-gray-400 mt-1">
                        Endpoint: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{f.endpoint}</code>
                      </p>
                    )}
                  </div>

                  {/* Score Badge */}
                  <div
                    className={`px-3 py-1.5 rounded-lg text-center ${getScoreBgColor(f.value)}`}
                  >
                    <span className={`text-lg font-bold ${getScoreColor(f.value)}`}>
                      {f.value}
                    </span>
                    <p className="text-xs text-gray-500">/100</p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
