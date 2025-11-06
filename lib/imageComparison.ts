// Client-side image comparison utilities
// This provides better visual similarity detection than server-side byte comparison

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

    // Compare pixels
    let matchingPixels = 0;
    let totalPixels = 0;

    for (let i = 0; i < data1.data.length; i += 16) { // Sample every 4th pixel (RGBA = 4 bytes)
      const r1 = data1.data[i];
      const g1 = data1.data[i + 1];
      const b1 = data1.data[i + 2];
      const r2 = data2.data[i];
      const g2 = data2.data[i + 1];
      const b2 = data2.data[i + 2];

      // Calculate color distance (Euclidean distance in RGB space)
      const colorDistance = Math.sqrt(
        Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
      );

      // If colors are similar (within threshold), count as match
      // Threshold of 30 allows for minor color variations
      if (colorDistance < 30) {
        matchingPixels++;
      }
      totalPixels++;
    }

    const pixelSimilarity = matchingPixels / totalPixels;

    // Calculate histogram similarity
    const hist1 = calculateHistogram(data1);
    const hist2 = calculateHistogram(data2);
    const histogramSimilarity = compareHistograms(hist1, hist2);

    // Combine metrics (weighted average)
    const similarity = (pixelSimilarity * 0.6) + (histogramSimilarity * 0.4);

    return {
      similarity: Math.min(0.95, Math.max(0.0, similarity)),
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

