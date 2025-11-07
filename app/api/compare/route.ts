/**
 * API Route: Image Comparison / Tamper Detection
 * Compares uploaded image with original to detect tampering
 * Uses CLIP embeddings if Python service is available, otherwise falls back to basic comparison
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import axios from 'axios';
import { detectSteganography } from '@/lib/steganography';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function computePerceptualHash(imageBuffer: Buffer): string {
  const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
  return hash;
}

function computePerceptualHashSimple(buffer: Buffer): string {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  return hash;
}

function compareHistograms(buffer1: Buffer, buffer2: Buffer): number {
  try {
    const header1 = buffer1.slice(0, 100);
    const header2 = buffer2.slice(0, 100);
    
    let matchingBytes = 0;
    for (let i = 0; i < Math.min(header1.length, header2.length); i++) {
      if (header1[i] === header2[i]) matchingBytes++;
    }
    
    const headerSimilarity = matchingBytes / Math.min(header1.length, header2.length);
    
    const size1 = buffer1.length;
    const size2 = buffer2.length;
    const sizeRatio = Math.min(size1, size2) / Math.max(size1, size2);
    
    if (sizeRatio > 0.8 && headerSimilarity > 0.5) {
      return 0.85;
    }
    
    return (headerSimilarity * 0.4) + (sizeRatio * 0.6);
  } catch (error) {
    return 0.5;
  }
}

async function compareImagesSimple(buffer1: Buffer, buffer2: Buffer): Promise<number> {
  try {
    if (buffer1.equals(buffer2)) {
      console.log('Exact byte match - 100% identical');
      return 1.0;
    }
    
    const size1 = buffer1.length;
    const size2 = buffer2.length;
    const sizeRatio = Math.min(size1, size2) / Math.max(size1, size2);
    
    let structureSimilarity = 0;
    let pixelDataSimilarity = 0;
    
    const headerSize = Math.min(500, Math.min(buffer1.length, buffer2.length));
    const header1 = buffer1.slice(0, headerSize);
    const header2 = buffer2.slice(0, headerSize);
    
    let exactMatches = 0;
    let nearMatches = 0;
    for (let i = 0; i < headerSize; i++) {
      if (header1[i] === header2[i]) {
        exactMatches++;
      } else if (Math.abs(header1[i] - header2[i]) <= 2) {
        nearMatches++;
      }
    }
    
    structureSimilarity = (exactMatches + nearMatches * 0.5) / headerSize;
    
    const samplePoints = [
      { start: 0.05, end: 0.15 },
      { start: 0.15, end: 0.25 },
      { start: 0.30, end: 0.40 },
      { start: 0.45, end: 0.55 },
      { start: 0.60, end: 0.70 },
      { start: 0.75, end: 0.85 },
      { start: 0.85, end: 0.95 },
    ];
    
    let totalDataSimilarity = 0;
    for (const point of samplePoints) {
      const start1 = Math.floor(buffer1.length * point.start);
      const end1 = Math.floor(buffer1.length * point.end);
      const start2 = Math.floor(buffer2.length * point.start);
      const end2 = Math.floor(buffer2.length * point.end);
      
      const chunk1 = buffer1.slice(start1, end1);
      const chunk2 = buffer2.slice(start2, end2);
      const minChunkSize = Math.min(chunk1.length, chunk2.length);
      
      if (minChunkSize > 0) {
        let exactMatches = 0;
        let nearMatches = 0;
        let totalSamples = 0;
        
        for (let i = 0; i < minChunkSize; i += 3) {
          const diff = Math.abs(chunk1[i] - chunk2[i]);
          totalSamples++;
          
          if (diff === 0) {
            exactMatches++;
          } else if (diff <= 2) {
            nearMatches += 0.9;
          } else if (diff <= 5) {
            nearMatches += 0.6;
          } else if (diff <= 15) {
            nearMatches += 0.3;
          } else {
            nearMatches += 0.0;
          }
        }
        
        const chunkSimilarity = (exactMatches + nearMatches) / totalSamples;
        totalDataSimilarity += chunkSimilarity;
      }
    }
    pixelDataSimilarity = totalDataSimilarity / samplePoints.length;
    
    const histSimilarity = compareHistograms(buffer1, buffer2);
    
    let similarity = (
      structureSimilarity * 0.20 +
      pixelDataSimilarity * 0.50 +
      histSimilarity * 0.20 +
      sizeRatio * 0.10
    );
    
    const isLikelyIdentical = 
      structureSimilarity > 0.99 && 
      pixelDataSimilarity > 0.99 && 
      sizeRatio > 0.99 &&
      histSimilarity > 0.98;
    
    const isNearIdentical = 
      structureSimilarity > 0.97 && 
      pixelDataSimilarity > 0.97 && 
      sizeRatio > 0.98 &&
      histSimilarity > 0.95;
    
    const differenceScore = (
      (1 - structureSimilarity) * 0.20 +
      (1 - pixelDataSimilarity) * 0.50 +
      (1 - histSimilarity) * 0.20 +
      (1 - sizeRatio) * 0.10
    );
    
    if (isLikelyIdentical) {
      similarity = Math.max(similarity, 0.99);
      console.log('Identical image detected - 99-100% match');
    } else if (isNearIdentical && differenceScore < 0.02) {
      similarity = Math.min(0.99, Math.max(similarity, 0.97));
      console.log('Near-identical image detected - 97-99% match');
    } else {
      if (differenceScore > 0.01) {
        const penalty = Math.min(0.10, differenceScore * 5);
        similarity = Math.max(0.0, similarity - penalty);
        console.log(`Differences detected (${(differenceScore * 100).toFixed(2)}% diff) - similarity reduced to ${(similarity * 100).toFixed(2)}%`);
      }
      
      if (pixelDataSimilarity < 0.95 && similarity > 0.90) {
        similarity = Math.min(0.95, similarity * 0.95);
        console.log('Pixel data differences detected - likely tampered');
      }
    }
    
    return Math.min(1.0, Math.max(0.0, similarity));
  } catch (error) {
    console.error('Simple comparison error:', error);
    return 0.5;
  }
}

function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

async function getCLIPEmbedding(imageBuffer: Buffer, imageUrl?: string): Promise<number[] | null> {
  const pythonServiceUrl = process.env.CLIP_SERVICE_URL || 'http://localhost:5000';
  
  try {
    const response = await axios.post(
      `${pythonServiceUrl}/embed`,
      {
        image: imageBuffer.toString('base64'),
        imageUrl: imageUrl,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );
    
    if (response.data && response.data.embedding) {
      return response.data.embedding;
    }
  } catch (error) {
    console.log('Python CLIP service not available, using fallback method');
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const uploadedImage = formData.get('image') as File;
    const originalImageUrl = formData.get('originalImageUrl') as string;
    const originalEmbeddingHash = formData.get('originalEmbeddingHash') as string;

    if (!uploadedImage) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    if (!originalImageUrl && !originalEmbeddingHash) {
      return NextResponse.json(
        { error: 'Original image URL or embedding hash required' },
        { status: 400 }
      );
    }

    const arrayBuffer = await uploadedImage.arrayBuffer();
    const uploadedBuffer = Buffer.from(arrayBuffer);

    let steganographyResult = null;
    try {
      console.log('Running steganography detection...');
      console.log('Image size:', uploadedBuffer.length, 'bytes');
      const stegCheck = await detectSteganography(uploadedBuffer);
      
      console.log('Steganography check result:', {
        suspicious: stegCheck.suspicious,
        confidence: stegCheck.confidence,
        method: stegCheck.method,
        indicators: stegCheck.indicators,
      });
      
      if (stegCheck.suspicious) {
        steganographyResult = {
          suspicious: true,
          confidence: stegCheck.confidence,
          method: stegCheck.method,
          details: stegCheck.details,
          indicators: stegCheck.indicators,
        };
        console.warn('STEGANOGRAPHY DETECTED:', stegCheck);
      } else {
        console.log('No steganography detected');
        steganographyResult = {
          suspicious: false,
          confidence: 0,
          method: 'none',
          details: 'No steganography detected',
        };
      }
    } catch (error) {
      console.error('Steganography detection failed:', error);
    }

    let uploadedEmbedding: number[] | null = null;
    let originalEmbedding: number[] | null = null;

    uploadedEmbedding = await getCLIPEmbedding(uploadedBuffer);

    if (originalImageUrl) {
      try {
        const originalImageResponse = await axios.get(originalImageUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
        });
        const originalBuffer = Buffer.from(originalImageResponse.data);
        originalEmbedding = await getCLIPEmbedding(originalBuffer, originalImageUrl);
      } catch (error) {
        console.error('Failed to fetch original image:', error);
      }
    }

    let similarity = 0;
    let verdict = 'unknown';
    let method = 'fallback';

    if (uploadedEmbedding && originalEmbedding) {
      similarity = cosineSimilarity(uploadedEmbedding, originalEmbedding);
      method = 'clip';
    } else {
      if (originalImageUrl) {
        try {
          const originalImageResponse = await axios.get(originalImageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
          });
          const originalBuffer = Buffer.from(originalImageResponse.data);
          
          console.log('Comparing images:', {
            uploadedSize: uploadedBuffer.length,
            originalSize: originalBuffer.length,
            exactMatch: uploadedBuffer.equals(originalBuffer),
            sizeDiff: Math.abs(uploadedBuffer.length - originalBuffer.length),
          });
          similarity = await compareImagesSimple(uploadedBuffer, originalBuffer);
          console.log('Comparison result:', {
            similarity: (similarity * 100).toFixed(2) + '%',
            method: 'simple',
            verdict: similarity >= 0.99 ? 'IDENTICAL' : similarity >= 0.95 ? 'NEAR_IDENTICAL' : similarity >= 0.85 ? 'MINOR_EDITS' : 'TAMPERED',
          });
          method = 'simple';
        } catch (error) {
          console.error('Image comparison error:', error);
          const uploadedHash = computePerceptualHash(uploadedBuffer);
          if (originalEmbeddingHash) {
            similarity = uploadedHash === originalEmbeddingHash ? 1.0 : 0.0;
            method = 'hash';
          } else {
            similarity = 0.5;
            method = 'unknown';
          }
        }
      } else if (originalEmbeddingHash) {
        const uploadedHash = computePerceptualHash(uploadedBuffer);
        similarity = uploadedHash === originalEmbeddingHash ? 1.0 : 0.0;
        method = 'hash';
      } else {
        similarity = 0.5;
        method = 'unknown';
      }
    }

    const threshold = method === 'clip' ? 0.95 : 0.90;
    const minorThreshold = method === 'clip' ? 0.85 : 0.70;
    const modifiedThreshold = method === 'clip' ? 0.60 : 0.50;
    
    if (similarity >= threshold) {
      verdict = 'authentic';
    } else if (similarity >= minorThreshold) {
      verdict = 'minor_edits';
    } else if (similarity >= modifiedThreshold) {
      verdict = 'modified';
    } else {
      verdict = 'different';
    }
    
    if (method === 'unknown') {
      verdict = 'unknown';
    }

    let finalVerdict = verdict;
    let finalMessage = getVerdictMessage(verdict, similarity, method);
    let steganographyWarning = null;
    
    if (steganographyResult?.suspicious) {
      if (verdict === 'authentic') {
        finalVerdict = 'suspicious';
        finalMessage = `WARNING: Steganography detected! ${finalMessage} However, hidden data was found embedded in pixels. This image may have been tampered with to bypass detection.`;
      } else {
        finalMessage = `STEGANOGRAPHY DETECTED: ${steganographyResult.details}. ${finalMessage}`;
      }
      steganographyWarning = steganographyResult.details;
      
      similarity = Math.max(0, similarity - (steganographyResult.confidence * 0.1));
    }

    return NextResponse.json({
      success: true,
      similarity: Math.round(similarity * 10000) / 100,
      verdict: finalVerdict,
      method,
      message: finalMessage,
      warning: method === 'unknown' || method === 'simple' 
        ? 'Using basic comparison. Enable CLIP service for better accuracy.' 
        : undefined,
      steganography: steganographyResult ? {
        suspicious: steganographyResult.suspicious,
        confidence: Math.round(steganographyResult.confidence * 100),
        method: steganographyResult.method,
        details: steganographyResult.details,
      } : null,
    });
  } catch (error: any) {
    console.error('Comparison error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to compare images' },
      { status: 500 }
    );
  }
}

function getVerdictMessage(verdict: string, similarity: number, method?: string): string {
  const percentage = (similarity * 100).toFixed(1);
  const methodNote = method === 'unknown' ? ' (Limited accuracy - enable CLIP service for better results)' : '';
  
  switch (verdict) {
    case 'authentic':
      return `Authentic - Original artwork (${percentage}% match)${methodNote}`;
    case 'minor_edits':
      return `Minor edits detected - Cropped, filtered, or color adjusted (${percentage}% match)${methodNote}`;
    case 'modified':
      return `Modified - Significant changes detected (${percentage}% match)${methodNote}`;
    case 'different':
      return `Different artwork - Not the same image (${percentage}% match)${methodNote}`;
    case 'suspicious':
      return `SUSPICIOUS: Steganography detected! Image may contain hidden data (${percentage}% match)${methodNote}`;
    case 'unknown':
      return `Unable to determine similarity accurately. Please enable CLIP service for better results.`;
    default:
      return `Similarity: ${percentage}%${methodNote}`;
  }
}

