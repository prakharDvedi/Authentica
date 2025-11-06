import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/ai';
import { generateProof, hashBuffer } from '@/lib/crypto';
let uploadToIpfs: any;
let uploadMetadataToIpfs: any;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (!uploadToIpfs || !uploadMetadataToIpfs) {
      try {
        const ipfsModule = await import('@/lib/ipfs');
        uploadToIpfs = ipfsModule.uploadToIpfs;
        uploadMetadataToIpfs = ipfsModule.uploadMetadataToIpfs;
      } catch (error: any) {
        console.error('Failed to import IPFS module:', error);
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

    const { prompt, userAddress, type = 'image' } = body;

    if (!prompt || !userAddress) {
      return NextResponse.json(
        { error: 'Prompt and user address are required' },
        { status: 400 }
      );
    }

    const stabilityKey = process.env.STABILITY_API_KEY?.trim();
    const openAIKey = process.env.OPENAI_API_KEY?.trim();
    const hasStabilityKey = stabilityKey && 
      stabilityKey !== 'your-stability-api-key-here' && 
      stabilityKey !== '' &&
      stabilityKey.length > 10;
    const hasOpenAIKey = openAIKey && 
      openAIKey !== 'sk-your-key-here' && 
      openAIKey !== 'sk-your-ke...' && 
      openAIKey !== '' &&
      openAIKey.length > 10;
    
    if (!hasStabilityKey && !hasOpenAIKey) {
      return NextResponse.json(
        { 
          error: 'No image generation API key found. Please set either STABILITY_API_KEY or OPENAI_API_KEY in your .env file. Note: Gemini API key is for text generation only, not images.',
          debug: {
            stabilityKeySet: !!stabilityKey,
            stabilityKeyLength: stabilityKey?.length || 0,
            stabilityKeyPrefix: stabilityKey ? stabilityKey.substring(0, 5) + '...' : 'not set',
            openAIKeySet: !!openAIKey,
            openAIKeyLength: openAIKey?.length || 0,
            allEnvKeys: Object.keys(process.env).filter(k => k.includes('API') || k.includes('KEY')).join(', ')
          }
        },
        { status: 500 }
      );
    }

    let outputBuffer: Buffer;
    if (type === 'image') {
      try {
        outputBuffer = await generateImage(prompt);
      } catch (error: any) {
        console.error('Image generation error:', error);
        return NextResponse.json(
          { error: `Image generation failed: ${error.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported type' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const proof = generateProof(prompt, outputBuffer, userAddress, timestamp);

    let outputCid: string;
    if (uploadToIpfs) {
      try {
        outputCid = await uploadToIpfs(outputBuffer, `output-${timestamp}.png`);
      } catch (error: any) {
        console.error('IPFS upload error:', error);
        outputCid = 'ipfs-upload-failed';
      }
    } else {
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
    };

    let metadataCid: string;
    if (uploadMetadataToIpfs) {
      try {
        metadataCid = await uploadMetadataToIpfs(metadata);
      } catch (error: any) {
        console.error('IPFS metadata upload error:', error);
        metadataCid = 'ipfs-upload-failed';
      }
    } else {
      metadataCid = 'ipfs-not-available';
    }

    return NextResponse.json({
      success: true,
      proof: {
        ...proof,
        outputCid,
        metadataCid,
        outputBuffer: outputBuffer.toString('base64'),
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
