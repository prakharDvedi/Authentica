/**
 * AI Image Generation Library
 * Handles image generation using OpenAI DALL-E 3 and Stability AI
 * Also captures transparency metadata for AI-generated content
 */

import OpenAI from 'openai';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Initialize Google Gemini for text generation (optional)
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

/**
 * Transparency metadata interface
 * Captures all parameters used during AI image generation for transparency
 */
export interface TransparencyData {
  model: string;
  provider: 'stability' | 'openai';
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
 * Tries Stability AI first, falls back to OpenAI DALL-E 3
 * Returns image buffer and transparency metadata
 */
export async function generateImage(prompt: string): Promise<ImageGenerationResult> {
  // Try Stability AI first (preferred for more transparency data)
  if (process.env.STABILITY_API_KEY) {
    try {
      return await generateImageStability(prompt);
    } catch (error) {
      console.error('Stability AI failed, trying OpenAI...', error);
    }
  }

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-key-here') {
    throw new Error(
      'No image generation API key found. Please set either STABILITY_API_KEY or OPENAI_API_KEY in your .env file.'
    );
  }

  try {
    const timestamp = Date.now();
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    });

    if (!response.data || !response.data[0]) {
      throw new Error('No image data returned from OpenAI');
    }

    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error('No image URL returned');
    }

    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });

    const imageBuffer = Buffer.from(imageResponse.data);

    // Extract transparency metadata from OpenAI response
    const transparency: TransparencyData = {
      model: 'dall-e-3',
      provider: 'openai',
      width: 1024,
      height: 1024,
      prompt: prompt,
      timestamp: timestamp,
      // OpenAI doesn't expose seed, steps, sampler, cfg_scale
    };

    return {
      image: imageBuffer,
      transparency,
    };
  } catch (error) {
    console.error('Image generation error:', error);
    throw new Error('Failed to generate image');
  }
}

/**
 * Text generation function
 * Uses Gemini if available, otherwise falls back to OpenAI GPT-4
 */
export async function generateText(prompt: string): Promise<string> {
  // Try Gemini first (if API key is available)
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini text generation error:', error);
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('Failed to generate text with Gemini');
      }
    }
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Text generation error:', error);
    throw new Error('Failed to generate text');
  }
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
