"use client";

interface EndpointsTabProps {
  agentId: string | null;
  isRegistered: boolean;
  network: string | null;
  identityLoading: boolean;
  identityError: Error | undefined;
  isConnected: boolean;
  isOnCorrectChain: boolean;
  chainName: string;
  walletClient: any;
  isSwitchingChain: boolean;
  isTestingEndpoint: boolean;
  endpointError: string | null;
  premiumResponse: string | null;
  lastPaymentTxHash: string | null;
  onTestFreeEndpoint: () => void;
  onTestPremiumInfo: () => void;
  onTestPremiumWithPayment: () => void;
  onSwitchChain: () => void;
}

export function EndpointsTab({
  agentId,
  isRegistered,
  network,
  identityLoading,
  identityError,
  isConnected,
  isOnCorrectChain,
  chainName,
  walletClient,
  isSwitchingChain,
  isTestingEndpoint,
  endpointError,
  premiumResponse,
  lastPaymentTxHash,
  onTestFreeEndpoint,
  onTestPremiumInfo,
  onTestPremiumWithPayment,
  onSwitchChain,
}: EndpointsTabProps) {
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
              <span className="text-gray-500">Registered:</span>{" "}
              {isRegistered ? "Yes" : "No"}
            </p>
            <p>
              <span className="text-gray-500">Network:</span>{" "}
              {network || "Unknown"}
            </p>
          </div>
        )}
      </div>

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
          <button
            onClick={onSwitchChain}
            disabled={isSwitchingChain}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
          >
            {isSwitchingChain ? "Switching..." : `Switch to ${chainName}`}
          </button>
        </div>
      )}

      {/* Test Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onTestFreeEndpoint}
          disabled={isTestingEndpoint}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {isTestingEndpoint ? "Testing..." : "Test Free Endpoint"}
        </button>
        <button
          onClick={onTestPremiumInfo}
          disabled={isTestingEndpoint}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {isTestingEndpoint ? "Testing..." : "Premium Info (GET)"}
        </button>
        <button
          onClick={onTestPremiumWithPayment}
          disabled={isTestingEndpoint || !isConnected || !isOnCorrectChain || !walletClient}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          title={!isConnected ? "Connect wallet first" : !isOnCorrectChain ? `Switch to ${chainName} first` : "Test premium endpoint with x402 payment"}
        >
          {isTestingEndpoint ? "Processing..." : "Premium with Payment (POST)"}
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

      {/* Error Display */}
      {endpointError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">Error:</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{endpointError}</p>
        </div>
      )}

      {/* Response Display */}
      {premiumResponse && (
        <div className="p-4 bg-gray-900 rounded-lg overflow-auto max-h-96">
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
  );
}
