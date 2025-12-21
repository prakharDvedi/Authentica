import { NextRequest, NextResponse } from "next/server";
import { verifyProofOnChain, getProvider } from "@/lib/blockchain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hash = searchParams.get("hash");

    if (!hash) {
      return NextResponse.json(
        { error: "Hash parameter is required" },
        { status: 400 }
      );
    }

    const provider = getProvider();
    const result = await verifyProofOnChain(provider, hash);

    if (!result.exists) {
      return NextResponse.json(
        { error: "Proof not found on blockchain" },
        { status: 404 }
      );
    }

    try {
      const metadataUrl = `https://gateway.pinata.cloud/ipfs/${result.ipfsLink.replace(
        "ipfs://",
        ""
      )}/metadata.json`;

      const response = await fetch(metadataUrl);
      if (response.ok) {
        const metadata = await response.json();
        return NextResponse.json({
          success: true,
          metadata,
        });
      }
    } catch (error) {
      console.error("failed to fetch metadata from ipfs:", error);
    }

    return NextResponse.json({
      success: true,
      metadata: {
        creator: result.creator,
        timestamp: result.timestamp,
        ipfsLink: result.ipfsLink,
      },
      message: "Metadata not fully available. Only blockchain data returned.",
    });
  } catch (error: any) {
    console.error("metadata fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}
