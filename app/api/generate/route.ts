import { NextRequest, NextResponse } from "next/server";
import { generateImage, generateMusic } from "@/lib/ai";
import { generateProof, hashBuffer } from "@/lib/crypto";
import { encryptContent, createEncryptedPayload } from "@/lib/encryption";
let uploadToIpfs: any;
let uploadMetadataToIpfs: any;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!uploadToIpfs || !uploadMetadataToIpfs) {
      try {
        const ipfsModule = await import("@/lib/ipfs");
        uploadToIpfs = ipfsModule.uploadToIpfs;
        uploadMetadataToIpfs = ipfsModule.uploadMetadataToIpfs;
        console.log("ipfs module loaded successfully");
        console.log(
          "ipfs_api_url:",
          process.env.IPFS_API_URL ? "set" : "not set"
        );
        console.log(
          "ipfs_auth:",
          process.env.IPFS_AUTH
            ? "set (length: " + process.env.IPFS_AUTH.length + ")"
            : "not set"
        );
      } catch (error: any) {
        console.error("failed to import ipfs module:", error);
      }
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const {
      prompt,
      userAddress,
      type = "image",
      faceHash,
      faceTimestamp,
    } = body;

    if (!prompt || !userAddress) {
      return NextResponse.json(
        { error: "Prompt and user address are required" },
        { status: 400 }
      );
    }

    let outputBuffer: Buffer;
    let transparencyData: any = null;
    let contentType = "image/png";
    let fileExtension = ".png";

    if (type === "image") {
      const stabilityKey = process.env.STABILITY_API_KEY?.trim();
      const hasStabilityKey =
        stabilityKey &&
        stabilityKey !== "your-stability-api-key-here" &&
        stabilityKey !== "" &&
        stabilityKey.length > 10;

      if (!hasStabilityKey) {
        return NextResponse.json(
          {
            error:
              "No image generation API key found. Please set STABILITY_API_KEY in your .env file.",
            debug: {
              stabilityKeySet: !!stabilityKey,
              stabilityKeyLength: stabilityKey?.length || 0,
              stabilityKeyPrefix: stabilityKey
                ? stabilityKey.substring(0, 5) + "..."
                : "not set",
            },
          },
          { status: 500 }
        );
      }

      try {
        const result = await generateImage(prompt);
        outputBuffer = result.image;
        transparencyData = result.transparency;
        contentType = "image/png";
        fileExtension = ".png";
      } catch (error: any) {
        console.error("image generation error:", error);
        return NextResponse.json(
          {
            error: `Image generation failed: ${
              error.message || "Unknown error"
            }`,
          },
          { status: 500 }
        );
      }
    } else if (type === "music") {
      const rapidApiKey = process.env.RAPIDAPI_KEY?.trim();

      if (!rapidApiKey) {
        return NextResponse.json(
          {
            error:
              "No music generation API key found. Please set RAPIDAPI_KEY in your .env.local file.",
          },
          { status: 500 }
        );
      }

      try {
        const result = await generateMusic(prompt);
        outputBuffer = result.audio;
        transparencyData = result.transparency;
        contentType =
          result.transparency.provider === "beatoven"
            ? "audio/mpeg"
            : "audio/wav";
        fileExtension =
          result.transparency.provider === "beatoven" ? ".mp3" : ".wav";
      } catch (error: any) {
        console.error("music generation error:", error);
        return NextResponse.json(
          {
            error: `Music generation failed: ${
              error.message || "Unknown error"
            }`,
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported type. Supported types: image, music" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const proof = generateProof(prompt, outputBuffer, userAddress, timestamp);

    console.log("encrypting content for ipfs storage...");
    const encrypted = encryptContent(outputBuffer, userAddress);
    const encryptedPayload = createEncryptedPayload(
      encrypted.encrypted,
      encrypted.iv,
      encrypted.tag,
      encrypted.keyHash
    );

    let outputCid: string;
    if (uploadToIpfs) {
      try {
        console.log("uploading encrypted content to ipfs...");
        const fileName =
          type === "image"
            ? `output-${timestamp}.encrypted`
            : `output-${timestamp}.encrypted`;
        outputCid = await uploadToIpfs(encryptedPayload, fileName);
        console.log("ipfs upload successful (encrypted):", outputCid);
      } catch (error: any) {
        console.error("ipfs upload error:", error);
        console.error("error details:", error.message, error.response?.data);
        outputCid = "ipfs-upload-failed";
      }
    } else {
      console.warn("ipfs upload function not available");
      outputCid = "ipfs-not-available";
    }
    const outputHash = hashBuffer(outputBuffer);

    const metadata = {
      prompt,
      promptHash: proof.promptHash,
      outputHash: proof.outputHash,
      combinedHash: proof.combinedHash,
      creator: userAddress,
      timestamp,
      ipfsLink: outputCid,
      type,
      encrypted: true,
      keyHash: encrypted.keyHash,
      ...(faceHash && { faceHash, faceTimestamp }),
      ...(transparencyData && { transparency: transparencyData }),
    };

    let metadataCid: string;
    if (uploadMetadataToIpfs) {
      try {
        console.log("uploading metadata to ipfs...");
        metadataCid = await uploadMetadataToIpfs(metadata);
        console.log("ipfs metadata upload successful:", metadataCid);
      } catch (error: any) {
        console.error("ipfs metadata upload error:", error);
        console.error("error details:", error.message, error.response?.data);
        metadataCid = "ipfs-upload-failed";
      }
    } else {
      console.warn("ipfs metadata upload function not available");
      metadataCid = "ipfs-not-available";
    }

    return NextResponse.json({
      success: true,
      proof: {
        ...proof,
        outputCid,
        metadataCid,
        outputBuffer: outputBuffer.toString("base64"),
        ...(faceHash && { faceHash, faceTimestamp }),
        ...(transparencyData && { transparency: transparencyData }),
      },
    });
  } catch (error: any) {
    console.error("generation error:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : "Failed to generate content";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
