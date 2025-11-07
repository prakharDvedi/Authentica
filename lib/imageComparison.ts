/**
 * Client-Side Image Comparison Library
 * Provides visual similarity detection using canvas pixel analysis
 * More accurate than byte comparison for edited images (crop, filter, color adjustments)
 * Used as fallback when Python CLIP service is not available
 */

export interface ImageComparisonResult {
  similarity: number;
  method: string;
}

/**
 * Compare two images using canvas-based analysis
 * This is more accurate than byte comparison for edited images
 */
export async function compareImagesClient(
  image1Url: string,
  image2Url: string
): Promise<ImageComparisonResult> {
  try {
    // Load images
    const img1 = await loadImage(image1Url);
    const img2 = await loadImage(image2Url);

    // Create canvas for comparison
    const canvas1 = document.createElement('canvas');
    const canvas2 = document.createElement('canvas');
    const ctx1 = canvas1.getContext('2d', { willReadFrequently: true });
    const ctx2 = canvas2.getContext('2d', { willReadFrequently: true });

    if (!ctx1 || !ctx2) {
      throw new Error('Failed to get canvas context');
    }

    // Set canvas dimensions (resize to same size for comparison)
    const maxWidth = Math.max(img1.width, img2.width);
    const maxHeight = Math.max(img1.height, img2.height);
    const compareWidth = Math.min(200, maxWidth); // Resize to 200px for faster comparison
    const compareHeight = Math.min(200, maxHeight);

    canvas1.width = compareWidth;
    canvas1.height = compareHeight;
    canvas2.width = compareWidth;
    canvas2.height = compareHeight;

    // Draw images to canvas
    ctx1.drawImage(img1, 0, 0, compareWidth, compareHeight);
    ctx2.drawImage(img2, 0, 0, compareWidth, compareHeight);

    // Get image data
    const data1 = ctx1.getImageData(0, 0, compareWidth, compareHeight);
    const data2 = ctx2.getImageData(0, 0, compareWidth, compareHeight);

    // Compare pixels - use more accurate comparison for identical images
    let exactMatches = 0;
    let nearMatches = 0;
    let totalPixels = 0;

    // Compare every pixel (not just sampling) for better accuracy
    for (let i = 0; i < data1.data.length; i += 4) { // Every pixel (RGBA = 4 bytes)
      const r1 = data1.data[i];
      const g1 = data1.data[i + 1];
      const b1 = data1.data[i + 2];
      const a1 = data1.data[i + 3];
      
      const r2 = data2.data[i];
      const g2 = data2.data[i + 1];
      const b2 = data2.data[i + 2];
      const a2 = data2.data[i + 3];

      // Exact match (identical pixel)
      if (r1 === r2 && g1 === g2 && b1 === b2 && a1 === a2) {
        exactMatches++;
      } else {
        // Calculate color distance (Euclidean distance in RGB space)
        const colorDistance = Math.sqrt(
          Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
        );
        
        // For identical images, pixels should be very close (within 5 units)
        // For edited images, allow more variation (30 units)
        if (colorDistance < 5) {
          nearMatches += 0.95; // Very close, almost identical
        } else if (colorDistance < 15) {
          nearMatches += 0.8; // Close
        } else if (colorDistance < 30) {
          nearMatches += 0.5; // Somewhat similar
        }
      }
      totalPixels++;
    }

    // Calculate pixel similarity (exact matches count as 1.0, near matches as partial)
    const pixelSimilarity = (exactMatches + nearMatches) / totalPixels;

    // Calculate histogram similarity
    const hist1 = calculateHistogram(data1);
    const hist2 = calculateHistogram(data2);
    const histogramSimilarity = compareHistograms(hist1, hist2);

    // Combine metrics (weighted average)
    const similarity = (pixelSimilarity * 0.6) + (histogramSimilarity * 0.4);

    // For identical images, allow 100% similarity (don't cap at 95%)
    // If pixel similarity is very high (>95%), it's likely identical
    let finalSimilarity = similarity;
    if (pixelSimilarity > 0.95 && histogramSimilarity > 0.95) {
      // Identical or near-identical image
      finalSimilarity = Math.min(1.0, similarity * 1.02); // Boost slightly, cap at 100%
    }

    return {
      similarity: Math.min(1.0, Math.max(0.0, finalSimilarity)),
      method: 'canvas',
    };
  } catch (error) {
    console.error('Client-side comparison error:', error);
    return {
      similarity: 0.5,
      method: 'error',
    };
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function calculateHistogram(imageData: ImageData): number[] {
  const histogram = new Array(256).fill(0);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Calculate grayscale value
    const gray = Math.round(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    );
    histogram[gray]++;
  }

  // Normalize histogram
  const total = histogram.reduce((sum, val) => sum + val, 0);
  return histogram.map((val) => val / total);
}

function compareHistograms(hist1: number[], hist2: number[]): number {
  let similarity = 0;
  for (let i = 0; i < hist1.length; i++) {
    similarity += Math.min(hist1[i], hist2[i]);
  }
  return similarity;
}

