import { NextRequest, NextResponse } from 'next/server';
import { verifyProofOnChain, getProvider } from '@/lib/blockchain';
import { hashBuffer } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const { file, combinedHash } = await request.json();

    if (!file && !combinedHash) {
      return NextResponse.json(
        { error: 'File or combined hash is required' },
        { status: 400 }
      );
    }

    const provider = getProvider();

    if (combinedHash) {
      const result = await verifyProofOnChain(provider, combinedHash);
      return NextResponse.json({
        success: true,
        verified: result.exists,
        proof: result,
      });
    }

    if (file) {
      const fileBuffer = Buffer.from(file, 'base64');
      const outputHash = hashBuffer(fileBuffer);
      
      return NextResponse.json({
        success: true,
        outputHash,
        message: 'Upload file with combined hash for full verification',
      });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify proof' },
      { status: 500 }
    );
  }
}
