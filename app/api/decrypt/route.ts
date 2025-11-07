/**
 * API Route: Decrypt IPFS Content
 * Decrypts encrypted content from IPFS if user is the creator
 * Only works if the user's wallet address matches the creator's address
 */

import { NextRequest, NextResponse } from 'next/server';
import { decryptContent, extractEncryptionComponents } from '@/lib/encryption';
import axios from 'axios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/decrypt
 * Decrypts encrypted content from IPFS
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ipfsCid, userAddress } = body;

    if (!ipfsCid || !userAddress) {
      return NextResponse.json(
        { error: 'IPFS CID and user address are required' },
        { status: 400 }
      );
    }

    // Fetch encrypted content from IPFS
    console.log('📥 Fetching encrypted content from IPFS:', ipfsCid);
    
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCid}`;
    const response = await axios.get(ipfsUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    const encryptedPayload = Buffer.from(response.data);
    console.log('✅ Fetched encrypted payload, size:', encryptedPayload.length);

    // Extract encryption components
    const { iv, tag, encrypted } = extractEncryptionComponents(encryptedPayload);

    // Decrypt using user's address (only works if user is creator)
    console.log('🔓 Decrypting content for address:', userAddress);
    
    try {
      const decrypted = decryptContent(encrypted, iv, tag, userAddress);
      console.log('✅ Content decrypted successfully');

      // Return decrypted content as base64
      return NextResponse.json({
        success: true,
        decryptedContent: decrypted.toString('base64'),
      });
    } catch (decryptError: any) {
      console.error('❌ Decryption failed:', decryptError.message);
      
      // If decryption fails, it means the user is not the creator
      return NextResponse.json(
        {
          error: 'Decryption failed. This could mean: 1. You are not the creator of this content 2. The content was encrypted with a different method 3. The content might not be encrypted. If you are the creator, ensure you are using the same wallet address that created the content.',
        },
        { status: 403 }
      );
    }
  } catch (error: any) {
    console.error('Decrypt API error:', error);
    
    if (error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Content not found on IPFS. The CID may be incorrect or the content may have been removed.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to decrypt content: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

