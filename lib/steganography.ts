/**
 * Enhanced Steganography Detection Library
 * Detects hidden data embedded in image pixels to prevent tamper detection bypass
 *
 * Methods:
 * 1. LSB (Least Significant Bit) Pattern Analysis
 * 2. Chi-Square Statistical Test
 * 3. Entropy Analysis
 * 4. RS (Regular-Singular) Analysis
 * 5. Sample Pair Analysis
 * 6. Statistical Anomaly Detection
 */

export interface SteganographyResult {
  suspicious: boolean;
  confidence: number; // 0-1, where 1 = very confident
  method: string; // Which method detected it
  details: string; // Human-readable explanation
  indicators: {
    lsbBias?: number;
    chiSquare?: number;
    entropy?: number;
    rsAnalysis?: number;
    samplePair?: number;
  };
}

/**
 * Main function to detect steganography in image buffer
 * Works on raw file bytes (doesn't require image decoding)
 */
export async function detectSteganography(
  buffer: Buffer
): Promise<SteganographyResult> {
  try {
    const headerSkip = Math.min(1000, Math.floor(buffer.length * 0.05));
    const imageDataStart = headerSkip;
    const imageDataEnd = buffer.length;

    if (imageDataEnd - imageDataStart < 1000) {
      return {
        suspicious: false,
        confidence: 0,
        method: "none",
        details: "Insufficient image data for steganography analysis",
        indicators: {},
      };
    }

    const imageData = buffer.slice(imageDataStart, imageDataEnd);

    const lsbResult = analyzeLSBPatterns(imageData);
    const chiSquareResult = chiSquareTest(imageData);
    const entropyResult = analyzeEntropy(imageData);
    const rsResult = rsAnalysis(imageData);
    const samplePairResult = samplePairAnalysis(imageData);

    const scores: { method: string; score: number; confidence: number }[] = [];

    if (lsbResult.suspicious) {
      scores.push({
        method: "LSB Pattern Analysis",
        score: lsbResult.confidence * 0.3,
        confidence: lsbResult.confidence,
      });
    }

    if (chiSquareResult.suspicious) {
      scores.push({
        method: "Chi-Square Test",
        score: chiSquareResult.confidence * 0.25,
        confidence: chiSquareResult.confidence,
      });
    }

    if (entropyResult.suspicious) {
      scores.push({
        method: "Entropy Analysis",
        score: entropyResult.confidence * 0.2,
        confidence: entropyResult.confidence,
      });
    }

    if (rsResult.suspicious) {
      scores.push({
        method: "RS Analysis",
        score: rsResult.confidence * 0.15,
        confidence: rsResult.confidence,
      });
    }

    if (samplePairResult.suspicious) {
      scores.push({
        method: "Sample Pair Analysis",
        score: samplePairResult.confidence * 0.1,
        confidence: samplePairResult.confidence,
      });
    }

    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const suspicious = totalScore > 0.25;
    const confidence = Math.min(1.0, totalScore * 1.5);

    let primaryMethod = "none";
    let details = "No steganography detected. Image appears clean.";

    if (suspicious) {
      const topMethod = scores.reduce(
        (max, s) => (s.confidence > max.confidence ? s : max),
        scores[0]
      );

      primaryMethod = topMethod.method;

      const indicators = [];
      if (lsbResult.suspicious) {
        indicators.push(`LSB bias: ${(lsbResult.bias * 100).toFixed(1)}%`);
      }
      if (chiSquareResult.suspicious) {
        indicators.push(`Chi-square: ${chiSquareResult.chiSquare.toFixed(2)}`);
      }
      if (entropyResult.suspicious) {
        indicators.push(
          `Entropy deviation: ${entropyResult.deviation.toFixed(2)} bits`
        );
      }

      details =
        `steganography detected: ${primaryMethod} found suspicious patterns (${(
          confidence * 100
        ).toFixed(1)}% confidence). ` +
        `Indicators: ${indicators.join(", ")}. ` +
        `This image may contain hidden data embedded in pixels.`;
    }

    return {
      suspicious,
      confidence,
      method: primaryMethod,
      details,
      indicators: {
        lsbBias: lsbResult.bias,
        chiSquare: chiSquareResult.chiSquare,
        entropy: entropyResult.entropy,
        rsAnalysis: rsResult.rsValue,
        samplePair: samplePairResult.correlation,
      },
    };
  } catch (error) {
    console.error("Steganography detection error:", error);
    return {
      suspicious: false,
      confidence: 0,
      method: "error",
      details: "Steganography detection failed due to error",
      indicators: {},
    };
  }
}

/**
 * Method 1: LSB Pattern Analysis
 * Detects bias in least significant bits (natural images should be ~50/50)
 */
function analyzeLSBPatterns(data: Buffer): {
  suspicious: boolean;
  confidence: number;
  bias: number;
} {
  let lsb0Count = 0;
  let lsb1Count = 0;
  let totalSamples = 0;

  for (let i = 0; i < data.length && totalSamples < 2000; i += 10) {
    const byte = data[i];
    const lsb = byte & 1;

    if (lsb === 0) lsb0Count++;
    else lsb1Count++;
    totalSamples++;
  }

  if (totalSamples < 100) {
    return { suspicious: false, confidence: 0, bias: 0 };
  }

  const lsb0Ratio = lsb0Count / totalSamples;
  const bias = Math.abs(lsb0Ratio - 0.5);

  const suspicious = bias > 0.08;
  const confidence = Math.min(1.0, (bias - 0.05) * 20);

  return { suspicious, confidence, bias };
}

/**
 * Method 2: Chi-Square Test
 * Statistical test for LSB steganography
 */
function chiSquareTest(data: Buffer): {
  suspicious: boolean;
  confidence: number;
  chiSquare: number;
} {
  const pairCounts = new Array(128).fill(0);
  let totalPairs = 0;

  for (let i = 0; i < data.length - 1 && totalPairs < 1000; i += 5) {
    const val = data[i];
    if (val < 254) {
      const pairIndex = Math.floor(val / 2);
      pairCounts[pairIndex]++;
      totalPairs++;
    }
  }

  if (totalPairs < 100) {
    return { suspicious: false, confidence: 0, chiSquare: 0 };
  }

  const expectedFreq = totalPairs / 128;

  let chiSquare = 0;
  for (const observed of pairCounts) {
    if (expectedFreq > 0) {
      const diff = observed - expectedFreq;
      chiSquare += (diff * diff) / expectedFreq;
    }
  }

  const suspicious = chiSquare > 159;
  const confidence = Math.min(1.0, (chiSquare - 100) / 100);

  return { suspicious, confidence, chiSquare };
}

/**
 * Method 3: Entropy Analysis
 * Steganography can reduce entropy (randomness) in image data
 */
function analyzeEntropy(data: Buffer): {
  suspicious: boolean;
  confidence: number;
  entropy: number;
  deviation: number;
} {
  const freq = new Array(256).fill(0);
  let totalBytes = 0;

  for (let i = 0; i < data.length && totalBytes < 2000; i += 5) {
    freq[data[i]]++;
    totalBytes++;
  }

  if (totalBytes < 100) {
    return { suspicious: false, confidence: 0, entropy: 0, deviation: 0 };
  }

  let entropy = 0;
  for (const count of freq) {
    if (count > 0) {
      const prob = count / totalBytes;
      entropy -= prob * Math.log2(prob);
    }
  }

  const expectedEntropy = 7.5;
  const deviation = expectedEntropy - entropy;
  const suspicious = entropy < 6.8;
  const confidence = Math.min(1.0, (6.8 - entropy) * 2.5);

  return { suspicious, confidence, entropy, deviation };
}

/**
 * Method 4: RS (Regular-Singular) Analysis
 * Detects patterns in pixel groups that indicate steganography
 */
function rsAnalysis(data: Buffer): {
  suspicious: boolean;
  confidence: number;
  rsValue: number;
} {
  let regularGroups = 0;
  let singularGroups = 0;
  let totalGroups = 0;

  for (let i = 0; i < data.length - 3 && totalGroups < 500; i += 20) {
    const b1 = data[i];
    const b2 = data[i + 1];
    const b3 = data[i + 2];
    const b4 = data[i + 3];

    const diff1 = Math.abs(b1 - b2);
    const diff2 = Math.abs(b3 - b4);

    if (Math.abs(diff1 - diff2) < 5) {
      regularGroups++;
    } else if (Math.abs(diff1 - diff2) > 20) {
      singularGroups++;
    }

    totalGroups++;
  }

  if (totalGroups < 50) {
    return { suspicious: false, confidence: 0, rsValue: 0 };
  }

  const regularRatio = regularGroups / totalGroups;
  const singularRatio = singularGroups / totalGroups;
  const rsValue = Math.abs(regularRatio - singularRatio);

  const suspicious = rsValue > 0.15;
  const confidence = Math.min(1.0, (rsValue - 0.1) * 10);

  return { suspicious, confidence, rsValue };
}

/**
 * Method 5: Sample Pair Analysis
 * Analyzes correlations between pixel pairs
 */
function samplePairAnalysis(data: Buffer): {
  suspicious: boolean;
  confidence: number;
  correlation: number;
} {
  let matchingPairs = 0;
  let totalPairs = 0;

  for (let i = 0; i < data.length - 1 && totalPairs < 1000; i += 10) {
    const b1 = data[i];
    const b2 = data[i + 1];

    if (Math.abs(b1 - b2) < 3) {
      matchingPairs++;
    }

    totalPairs++;
  }

  if (totalPairs < 100) {
    return { suspicious: false, confidence: 0, correlation: 0 };
  }

  const correlation = matchingPairs / totalPairs;

  const suspicious = correlation < 0.2 || correlation > 0.6;
  const confidence = suspicious
    ? Math.min(1.0, Math.abs(correlation - 0.4) * 2.5)
    : 0;

  return { suspicious, confidence, correlation };
}
