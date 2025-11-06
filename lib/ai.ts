/**
 * AI Image Generation Library
 * Handles image generation using Stability AI
 * Also captures transparency metadata for AI-generated content
 */

import axios from 'axios';

/**
 * Transparency metadata interface
 * Captures all parameters used during AI image generation for transparency
 */
export interface TransparencyData {
  model: string;
  provider: 'stability';
  steps?: number;
  seed?: number;
  sampler?: string;
  cfgScale?: number;
  width: number;
  height: number;
  prompt: string;
  timestamp: number;
}

/**
 * Result of image generation
 * Contains both the image buffer and transparency metadata
 */
export interface ImageGenerationResult {
  image: Buffer;
  transparency: TransparencyData;
}

/**
 * Main image generation function
 * Uses Stability AI for image generation
 * Returns image buffer and transparency metadata
 */
export async function generateImage(prompt: string): Promise<ImageGenerationResult> {
  if (!process.env.STABILITY_API_KEY) {
    throw new Error(
      'No image generation API key found. Please set STABILITY_API_KEY in your .env file.'
    );
  }

  return await generateImageStability(prompt);
}


/**
 * Generate image using Stability AI (Stable Diffusion XL)
 * Provides full transparency metadata including seed, steps, sampler, etc.
 */
export async function generateImageStability(prompt: string): Promise<ImageGenerationResult> {
  try {
    const timestamp = Date.now();
    // Generation parameters - these are captured for transparency
    const cfgScale = 7; // Classifier-free guidance scale
    const height = 1024;
    const width = 1024;
    const steps = 30; // Number of denoising steps
    const samples = 1;

    const response = await axios.post(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        text_prompts: [{ text: prompt }],
        cfg_scale: cfgScale,
        height: height,
        width: width,
        steps: steps,
        samples: samples,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        },
        responseType: 'json',
      }
    );

    const data = response.data;
    
    if (!data.artifacts || !data.artifacts[0] || !data.artifacts[0].base64) {
      throw new Error('No image returned from Stability AI');
    }

    const artifact = data.artifacts[0];
    const base64Image = artifact.base64;
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // Extract transparency metadata from Stability AI response
    const transparency: TransparencyData = {
      model: 'stable-diffusion-xl-1024-v1-0',
      provider: 'stability',
      steps: steps,
      seed: artifact.seed || undefined,
      sampler: 'Euler a', // Default sampler for Stability AI
      cfgScale: cfgScale,
      width: width,
      height: height,
      prompt: prompt,
      timestamp: timestamp,
    };

    return {
      image: imageBuffer,
      transparency,
    };
  } catch (error: any) {
    console.error('Stability AI generation error:', error);
    if (error.response) {
      console.error('Stability AI response:', error.response.data);
      throw new Error(`Stability AI error: ${error.response.data?.message || error.message}`);
    }
    throw new Error(`Failed to generate image with Stability AI: ${error.message}`);
  }
}
