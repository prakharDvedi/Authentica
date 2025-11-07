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
    const img1 = await loadImage(image1Url);
    const img2 = await loadImage(image2Url);

    const canvas1 = document.createElement('canvas');
    const canvas2 = document.createElement('canvas');
    const ctx1 = canvas1.getContext('2d', { willReadFrequently: true });
    const ctx2 = canvas2.getContext('2d', { willReadFrequently: true });

    if (!ctx1 || !ctx2) {
      throw new Error('Failed to get canvas context');
    }

    const maxWidth = Math.max(img1.width, img2.width);
    const maxHeight = Math.max(img1.height, img2.height);
    const compareWidth = Math.min(200, maxWidth);
    const compareHeight = Math.min(200, maxHeight);

    canvas1.width = compareWidth;
    canvas1.height = compareHeight;
    canvas2.width = compareWidth;
    canvas2.height = compareHeight;

    ctx1.drawImage(img1, 0, 0, compareWidth, compareHeight);
    ctx2.drawImage(img2, 0, 0, compareWidth, compareHeight);

    const data1 = ctx1.getImageData(0, 0, compareWidth, compareHeight);
    const data2 = ctx2.getImageData(0, 0, compareWidth, compareHeight);

    let exactMatches = 0;
    let nearMatches = 0;
    let totalPixels = 0;

    for (let i = 0; i < data1.data.length; i += 4) {
      const r1 = data1.data[i];
      const g1 = data1.data[i + 1];
      const b1 = data1.data[i + 2];
      const a1 = data1.data[i + 3];
      
      const r2 = data2.data[i];
      const g2 = data2.data[i + 1];
      const b2 = data2.data[i + 2];
      const a2 = data2.data[i + 3];

      if (r1 === r2 && g1 === g2 && b1 === b2 && a1 === a2) {
        exactMatches++;
      } else {
        const colorDistance = Math.sqrt(
          Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
        );
        
        if (colorDistance < 5) {
          nearMatches += 0.95;
        } else if (colorDistance < 15) {
          nearMatches += 0.8;
        } else if (colorDistance < 30) {
          nearMatches += 0.5;
        }
      }
      totalPixels++;
    }

    const pixelSimilarity = (exactMatches + nearMatches) / totalPixels;

    const hist1 = calculateHistogram(data1);
    const hist2 = calculateHistogram(data2);
    const histogramSimilarity = compareHistograms(hist1, hist2);

    const similarity = (pixelSimilarity * 0.6) + (histogramSimilarity * 0.4);

    let finalSimilarity = similarity;
    if (pixelSimilarity > 0.95 && histogramSimilarity > 0.95) {
      finalSimilarity = Math.min(1.0, similarity * 1.02);
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
    const gray = Math.round(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    );
    histogram[gray]++;
  }

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

