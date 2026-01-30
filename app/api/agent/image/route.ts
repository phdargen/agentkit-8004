/**
 * x402 Paid Image Generation Endpoint
 *
 * This endpoint requires payment via x402 protocol.
 * Uses OpenAI's gpt-image-1 model to generate images and uploads them to IPFS.
 */

import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { server, getDefaultPaymentConfig } from "@/lib/x402-server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI();

/**
 * Uploads a base64 image to IPFS using Pinata
 */
async function uploadImageToIPFS(
  pinataJwt: string,
  imageBase64: string,
  name: string
): Promise<string> {
  // Convert base64 to Buffer
  const imageBuffer = Buffer.from(imageBase64, "base64");

  // Create form data for Pinata file upload
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: "image/png" });
  formData.append("file", blob, `${name}.png`);
  formData.append(
    "pinataMetadata",
    JSON.stringify({
      name: `${name}.png`,
    })
  );
  formData.append(
    "pinataOptions",
    JSON.stringify({
      cidVersion: 1,
    })
  );

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Failed to upload image to IPFS: ${error.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.IpfsHash;
}

/**
 * Image generation handler
 * Generates an image using OpenAI's gpt-image-1 and uploads to IPFS
 */
const handler = async (req: NextRequest): Promise<NextResponse> => {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = body.prompt || body.input || "A beautiful abstract image";

    // Validate prompt
    if (typeof prompt !== "string" || prompt.length < 3) {
      return NextResponse.json(
        { error: "Invalid prompt. Must be a string with at least 3 characters." },
        { status: 400 }
      );
    }

    if (prompt.length > 4000) {
      return NextResponse.json(
        { error: "Prompt too long. Maximum 4000 characters." },
        { status: 400 }
      );
    }

    // Check for PINATA_JWT
    const pinataJwt = process.env.PINATA_JWT;
    if (!pinataJwt) {
      return NextResponse.json(
        { error: "IPFS upload not configured. Missing PINATA_JWT." },
        { status: 500 }
      );
    }

    // Generate image with OpenAI
    console.log(`[ImageGen] Generating image for prompt: "${prompt.substring(0, 50)}..."`);
    
    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });

    console.log(`[ImageGen] Response received, extracting image data...`);

    // gpt-image-1 returns base64 data by default
    const imageData = result.data?.[0];
    let imageBase64: string;

    if (imageData?.b64_json) {
      // gpt-image-1 returns b64_json by default
      imageBase64 = imageData.b64_json;
    } else if (imageData?.url) {
      // Fallback: fetch from URL if provided
      console.log(`[ImageGen] Fetching image from URL...`);
      const imageResponse = await fetch(imageData.url);
      if (!imageResponse.ok) {
        return NextResponse.json(
          { error: "Failed to fetch generated image from URL." },
          { status: 500 }
        );
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      imageBase64 = Buffer.from(imageBuffer).toString("base64");
    } else {
      console.error("[ImageGen] Unexpected response format:", JSON.stringify(result, null, 2));
      return NextResponse.json(
        { error: "Image generation failed. Unexpected response format." },
        { status: 500 }
      );
    }

    // Upload to IPFS
    const timestamp = Date.now();
    const imageName = `generated-image-${timestamp}`;
    console.log(`[ImageGen] Uploading image to IPFS...`);
    
    const ipfsHash = await uploadImageToIPFS(pinataJwt, imageBase64, imageName);
    const ipfsUri = `ipfs://${ipfsHash}`;
    
    // Use Pinata gateway for faster access (with fallback to public gateway)
    const pinataGateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
    const httpUrl = `https://${pinataGateway}/ipfs/${ipfsHash}`;

    console.log(`[ImageGen] Image uploaded to IPFS: ${ipfsHash}`);

    return NextResponse.json({
      success: true,
      message: "Image generated and uploaded to IPFS",
      prompt,
      image: {
        ipfsHash,
        ipfsUri,
        httpUrl,
      },
      timestamp: new Date().toISOString(),
      metadata: {
        endpoint: "/api/agent/image",
        paymentMethod: "x402",
        tier: "premium",
      },
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate image",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};

// Get payment configuration - image generation is more expensive
const paymentConfig = getDefaultPaymentConfig();
// Override price for image generation (higher cost)
const imagePaymentConfig = {
  ...paymentConfig,
  price: process.env.X402_IMAGE_PRICE || "$0.01", // 10x the default price
};

/**
 * POST handler with x402 payment requirement
 *
 * The withX402 wrapper ensures:
 * 1. Request includes valid x402 payment header
 * 2. Payment is verified before handler execution
 * 3. Payment is settled only after successful response (status < 400)
 */
export const POST = withX402(
  handler,
  {
    accepts: [imagePaymentConfig],
    description: "AI image generation with IPFS upload",
    mimeType: "application/json",
  },
  server
);

/**
 * GET handler - Returns endpoint info (no payment required for info)
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: "/api/agent/image",
    description: "AI image generation endpoint with x402 payment",
    payment: {
      method: "x402",
      scheme: imagePaymentConfig.scheme,
      price: imagePaymentConfig.price,
      network: imagePaymentConfig.network,
      payTo: imagePaymentConfig.payTo,
    },
    usage: {
      method: "POST",
      body: {
        prompt: "A description of the image to generate (required, 3-4000 chars)",
      },
    },
    instructions: "Send POST request with PAYMENT-SIGNATURE header and prompt in body",
  });
}
