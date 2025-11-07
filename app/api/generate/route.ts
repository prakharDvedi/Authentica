/**
 * API Route: Generate AI Artwork
 * Handles AI image generation, proof creation, and IPFS storage
 * Returns proof data including transparency metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateImage, generateMusic } from '@/lib/ai';
import { generateProof, hashBuffer } from '@/lib/crypto';
import { encryptContent, createEncryptedPayload } from '@/lib/encryption';
let uploadToIpfs: any;
let uploadMetadataToIpfs: any;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/generate
 * Generates AI artwork, creates cryptographic proof, and stores on IPFS
 */
export async function POST(request: NextRequest) {
  try {
    // Lazy load IPFS functions (only if needed)
    if (!uploadToIpfs || !uploadMetadataToIpfs) {
      try {
        const ipfsModule = await import('@/lib/ipfs');
        uploadToIpfs = ipfsModule.uploadToIpfs;
        uploadMetadataToIpfs = ipfsModule.uploadMetadataToIpfs;
        console.log('✅ IPFS module loaded successfully');
        console.log('IPFS_API_URL:', process.env.IPFS_API_URL ? 'Set' : 'Not set');
        console.log('IPFS_AUTH:', process.env.IPFS_AUTH ? 'Set (length: ' + process.env.IPFS_AUTH.length + ')' : 'Not set');
      } catch (error: any) {
        console.error('❌ Failed to import IPFS module:', error);
      }
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { prompt, userAddress, type = 'image', faceHash, faceTimestamp } = body;

    if (!prompt || !userAddress) {
      return NextResponse.json(
        { error: 'Prompt and user address are required' },
        { status: 400 }
      );
    }

    let outputBuffer: Buffer;
    let transparencyData: any = null;
    let contentType = 'image/png';
    let fileExtension = '.png';
    
    if (type === 'image') {
      const stabilityKey = process.env.STABILITY_API_KEY?.trim();
      const hasStabilityKey = stabilityKey && 
        stabilityKey !== 'your-stability-api-key-here' && 
        stabilityKey !== '' &&
        stabilityKey.length > 10;
      
      if (!hasStabilityKey) {
        return NextResponse.json(
          { 
            error: 'No image generation API key found. Please set STABILITY_API_KEY in your .env file.',
            debug: {
              stabilityKeySet: !!stabilityKey,
              stabilityKeyLength: stabilityKey?.length || 0,
              stabilityKeyPrefix: stabilityKey ? stabilityKey.substring(0, 5) + '...' : 'not set',
            }
          },
          { status: 500 }
        );
      }
      
      try {
        const result = await generateImage(prompt);
        outputBuffer = result.image;
        transparencyData = result.transparency;
        contentType = 'image/png';
        fileExtension = '.png';
      } catch (error: any) {
        console.error('Image generation error:', error);
        return NextResponse.json(
          { error: `Image generation failed: ${error.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    } else if (type === 'music') {
      const rapidApiKey = process.env.RAPIDAPI_KEY?.trim();
      
      if (!rapidApiKey) {
        return NextResponse.json(
          { 
            error: 'No music generation API key found. Please set RAPIDAPI_KEY in your .env.local file.',
          },
          { status: 500 }
        );
      }
      
      try {
        const result = await generateMusic(prompt);
        outputBuffer = result.audio;
        transparencyData = result.transparency;
        // BeatOven returns MP3, dummy audio returns WAV
        contentType = result.transparency.provider === 'beatoven' ? 'audio/mpeg' : 'audio/wav';
        fileExtension = result.transparency.provider === 'beatoven' ? '.mp3' : '.wav';
      } catch (error: any) {
        console.error('Music generation error:', error);
        return NextResponse.json(
          { error: `Music generation failed: ${error.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported type. Supported types: image, music' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const proof = generateProof(prompt, outputBuffer, userAddress, timestamp);

    // Encrypt content before uploading to IPFS (creator-only access)
    console.log('🔐 Encrypting content for IPFS storage...');
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
        console.log('📤 Uploading encrypted content to IPFS...');
        const fileName = type === 'image' ? `output-${timestamp}.encrypted` : `output-${timestamp}.encrypted`;
        // Upload encrypted payload instead of original content
        outputCid = await uploadToIpfs(encryptedPayload, fileName);
        console.log('✅ IPFS upload successful (encrypted):', outputCid);
      } catch (error: any) {
        console.error('❌ IPFS upload error:', error);
        console.error('Error details:', error.message, error.response?.data);
        outputCid = 'ipfs-upload-failed';
      }
    } else {
      console.warn('⚠️ IPFS upload function not available');
      outputCid = 'ipfs-not-available';
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
      encrypted: true, // Mark as encrypted
      keyHash: encrypted.keyHash, // Store key hash for verification
      ...(faceHash && { faceHash, faceTimestamp }),
      ...(transparencyData && { transparency: transparencyData }),
    };

    let metadataCid: string;
    if (uploadMetadataToIpfs) {
      try {
        console.log('📤 Uploading metadata to IPFS...');
        metadataCid = await uploadMetadataToIpfs(metadata);
        console.log('✅ IPFS metadata upload successful:', metadataCid);
      } catch (error: any) {
        console.error('❌ IPFS metadata upload error:', error);
        console.error('Error details:', error.message, error.response?.data);
        metadataCid = 'ipfs-upload-failed';
      }
    } else {
      console.warn('⚠️ IPFS metadata upload function not available');
      metadataCid = 'ipfs-not-available';
    }

    return NextResponse.json({
      success: true,
      proof: {
        ...proof,
        outputCid,
        metadataCid,
        outputBuffer: outputBuffer.toString('base64'),
        ...(faceHash && { faceHash, faceTimestamp }),
        ...(transparencyData && { transparency: transparencyData }),
      },
    });
  } catch (error: any) {
    console.error('Generation error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'Failed to generate content';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
