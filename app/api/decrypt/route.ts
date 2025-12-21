import { NextRequest, NextResponse } from "next/server";
import {
  decryptContent,
  extractEncryptionComponents,
  deriveKeyFromAddress,
} from "@/lib/encryption";
import axios from "axios";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ipfsCid, userAddress } = body;

    if (!ipfsCid || !userAddress) {
      return NextResponse.json(
        { error: "IPFS CID and user address are required" },
        { status: 400 }
      );
    }

    const normalizedAddress = userAddress.toLowerCase().trim();

    console.log("fetching encrypted content from ipfs:", ipfsCid);

    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCid}`;
    const response = await axios.get(ipfsUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
    });

    const encryptedPayload = Buffer.from(response.data);
    console.log("fetched encrypted payload, size:", encryptedPayload.length);

    const { keyHash, iv, tag, encrypted } =
      extractEncryptionComponents(encryptedPayload);

    console.log("attempting decryption for address:", normalizedAddress);
    console.log("key hash from payload:", keyHash);

    const expectedKey = deriveKeyFromAddress(normalizedAddress);
    const expectedKeyHash = crypto
      .createHash("sha256")
      .update(expectedKey)
      .digest("hex");

    if (keyHash !== expectedKeyHash) {
      console.error(
        "key hash mismatch - wallet address does not match creator"
      );
      console.error("expected key hash:", expectedKeyHash);
      console.error("received key hash:", keyHash);
      return NextResponse.json(
        {
          error:
            "Access denied. Your wallet address does not match the creator of this content. Only the creator can decrypt this encrypted content.",
        },
        { status: 403 }
      );
    }

    console.log("key hash verified - wallet address matches creator");

    try {
      const decrypted = decryptContent(encrypted, iv, tag, normalizedAddress);
      console.log("content decrypted successfully - wallet address verified");

      return NextResponse.json({
        success: true,
        decryptedContent: decrypted.toString("base64"),
      });
    } catch (decryptError: any) {
      console.error("decryption failed:", decryptError.message);

      return NextResponse.json(
        {
          error:
            "Decryption failed. This means you are not the creator of this content. Only the wallet address that created the content can decrypt it.",
        },
        { status: 403 }
      );
    }
  } catch (error: any) {
    console.error("decrypt api error:", error);

    if (error.response?.status === 404) {
      return NextResponse.json(
        {
          error:
            "Content not found on IPFS. The CID may be incorrect or the content may have been removed.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: `Failed to decrypt content: ${error.message || "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
