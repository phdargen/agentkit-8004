import { NextRequest, NextResponse } from "next/server";
import { keccak256, toHex } from "viem";

/**
 * Proof of payment info from x402 payment response
 */
interface ProofOfPayment {
  fromAddress: string;
  toAddress: string;
  chainId: string;
  txHash: string;
}

/**
 * Feedback metadata structure
 */
interface FeedbackMetadata {
  comment: string;
  score: number;
  tag1: string;
  tag2: string;
  timestamp: number;
  endpoint?: string;
  paymentTxHash?: string;
  proofOfPayment?: ProofOfPayment;
}

/**
 * Uploads JSON data to IPFS using Pinata
 */
async function uploadJsonToIPFS(
  pinataJwt: string,
  json: object,
  name: string
): Promise<string> {
  const requestBody = {
    pinataOptions: {
      cidVersion: 1,
    },
    pinataMetadata: {
      name: `${name}.json`,
    },
    pinataContent: json,
  };

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Failed to upload JSON to IPFS: ${error.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.IpfsHash;
}

/**
 * Generates a data URI from feedback data (fallback when IPFS is disabled)
 */
function generateDataUri(feedbackData: FeedbackMetadata): string {
  const jsonString = JSON.stringify(feedbackData);
  const base64 = Buffer.from(jsonString).toString("base64");
  return `data:application/json;base64,${base64}`;
}

/**
 * POST /api/feedback
 *
 * Generates feedback URI and hash for on-chain submission.
 * If UPLOAD_FEEDBACK_TO_IPFS=true and PINATA_JWT is set, uploads to IPFS.
 * Otherwise, returns a data URI.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { comment, score, tag1, tag2, endpoint, paymentTxHash, proofOfPayment } = body;

    // Validate required fields
    if (typeof score !== "number" || score < 0 || score > 100) {
      return NextResponse.json(
        { error: "Invalid score. Must be a number between 0 and 100." },
        { status: 400 }
      );
    }

    // Build feedback metadata
    const feedbackData: FeedbackMetadata = {
      comment: comment || "",
      score,
      tag1: tag1 || "",
      tag2: tag2 || "",
      timestamp: Date.now(),
    };

    // Include optional fields if provided
    if (endpoint) {
      feedbackData.endpoint = endpoint;
    }
    if (paymentTxHash) {
      feedbackData.paymentTxHash = paymentTxHash;
    }
    if (proofOfPayment) {
      feedbackData.proofOfPayment = proofOfPayment;
    }

    // Generate hash from the feedback data
    const jsonString = JSON.stringify(feedbackData);
    const feedbackHash = keccak256(toHex(jsonString));

    // Check if IPFS upload is enabled
    const uploadToIpfs = process.env.UPLOAD_FEEDBACK_TO_IPFS === "true";
    const pinataJwt = process.env.PINATA_JWT;

    let feedbackUri: string;

    if (uploadToIpfs && pinataJwt) {
      // Upload to IPFS
      const ipfsHash = await uploadJsonToIPFS(
        pinataJwt,
        feedbackData,
        `feedback-${feedbackData.timestamp}`
      );
      feedbackUri = `ipfs://${ipfsHash}`;
    } else {
      // Fall back to data URI
      feedbackUri = generateDataUri(feedbackData);
    }

    return NextResponse.json({
      uri: feedbackUri,
      hash: feedbackHash,
      uploadedToIpfs: uploadToIpfs && !!pinataJwt,
    });
  } catch (error) {
    console.error("Error processing feedback:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process feedback",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback
 *
 * Returns whether IPFS upload is enabled (for client-side visibility)
 */
export async function GET() {
  const uploadToIpfs = process.env.UPLOAD_FEEDBACK_TO_IPFS === "true";
  const hasValidConfig = uploadToIpfs && !!process.env.PINATA_JWT;

  return NextResponse.json({
    ipfsEnabled: hasValidConfig,
  });
}
