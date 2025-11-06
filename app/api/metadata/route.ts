/**
 * API Route: Fetch Metadata
 * Retrieves artwork metadata from IPFS using proof hash
 * Returns transparency data, prompt, and other metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyProofOnChain, getProvider } from '@/lib/blockchain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/metadata?hash=<combinedHash>
 * Fetches metadata for a verified proof
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hash = searchParams.get('hash');

    if (!hash) {
      return NextResponse.json(
        { error: 'Hash parameter is required' },
        { status: 400 }
      );
    }

    // First verify the proof exists on-chain
    const provider = getProvider();
    const result = await verifyProofOnChain(provider, hash);

    if (!result.exists) {
      return NextResponse.json(
        { error: 'Proof not found on blockchain' },
        { status: 404 }
      );
    }

    // Try to fetch metadata from IPFS
    // The metadata CID should be stored somewhere, but for now we'll try to fetch it
    // from a known location or pattern
    // In a production system, you might store metadataCid on-chain or in a database
    
    // Try fetching from Pinata gateway using the metadata CID pattern
    // This is a fallback - ideally metadataCid should be stored on-chain
    try {
      // Try to fetch metadata from IPFS using the image CID as a base
      // The metadata might be stored at a different path
      const metadataUrl = `https://gateway.pinata.cloud/ipfs/${result.ipfsLink.replace('ipfs://', '')}/metadata.json`;
      
      const response = await fetch(metadataUrl);
      if (response.ok) {
        const metadata = await response.json();
        return NextResponse.json({
          success: true,
          metadata,
        });
      }
    } catch (error) {
      console.error('Failed to fetch metadata from IPFS:', error);
    }

    // If metadata not found, return what we have from blockchain
    return NextResponse.json({
      success: true,
      metadata: {
        creator: result.creator,
        timestamp: result.timestamp,
        ipfsLink: result.ipfsLink,
        // Note: Full metadata with transparency data might not be available
        // if metadataCid is not stored on-chain
      },
      message: 'Metadata not fully available. Only blockchain data returned.',
    });
  } catch (error: any) {
    console.error('Metadata fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}

