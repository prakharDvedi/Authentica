/**
 * AI Generation Library
 * Handles image generation using Stability AI
 * Handles music generation using BeatOven API (with dummy audio fallback)
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

/**
 * Music transparency metadata interface
 * Captures all parameters used during AI music generation for transparency
 */
export interface MusicTransparencyData {
  model: string;
  provider: 'beatoven' | 'dummy';
  duration?: number;
  prompt: string;
  timestamp: number;
}

/**
 * Result of music generation
 * Contains both the audio buffer and transparency metadata
 */
export interface MusicGenerationResult {
  audio: Buffer;
  transparency: MusicTransparencyData;
}

/**
 * Main music generation function
 * Tries BeatOven API first, falls back to dummy audio if it fails
 * Returns audio buffer and transparency metadata
 */
export async function generateMusic(prompt: string): Promise<MusicGenerationResult> {
  const rapidApiKey = process.env.RAPIDAPI_KEY?.trim();
  
  // Try BeatOven API if key is available
  if (rapidApiKey) {
    try {
      return await generateMusicBeatOven(prompt, rapidApiKey);
    } catch (error: any) {
      console.warn('⚠️ BeatOven API failed, falling back to dummy audio:', error.message);
      // Fall through to dummy audio generation
    }
  }
  
  // Fallback to dummy audio
  console.log('🎵 Using dummy audio generation (BeatOven API not available or failed)');
  return await generateDummyAudio(prompt);
}

/**
 * Generate music using BeatOven API via RapidAPI
 * Uses compose_track_api to create music and polls for completion
 */
async function generateMusicBeatOven(
  prompt: string,
  rapidApiKey: string
): Promise<MusicGenerationResult> {
  const timestamp = Date.now();
  
  console.log('🎵 Generating music with BeatOven API...');
  
  // Extract genre and mood from prompt (simple parsing)
  // You can enhance this with better prompt parsing
  const genre = extractGenreFromPrompt(prompt) || 'pop';
  const mood = extractMoodFromPrompt(prompt) || 'happy';
  const duration = 30; // 30 seconds default
  
  try {
    // Step 1: Create music generation task
    // Correct endpoint: /api/v1/tracks/compose
    const composeUrl = 'https://beatoven-ai-music-generation-api.p.rapidapi.com/api/v1/tracks/compose';
    
    // Build prompt text from genre, mood, and duration
    const promptText = `${duration} seconds ${mood} ${genre} track`;
    
    console.log('📤 Requesting music generation from BeatOven...');
    console.log('Prompt:', promptText);
    console.log('RapidAPI Key (first 10 chars):', rapidApiKey?.substring(0, 10) + '...');
    console.log('RapidAPI Key length:', rapidApiKey?.length);
    
    const composeResponse = await axios.post(
      composeUrl,
      {
        prompt: {
          text: promptText,
        },
      },
      {
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'beatoven-ai-music-generation-api.p.rapidapi.com',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
        responseType: 'json',
      }
    );
    
    const composeData = composeResponse.data;
    console.log('✅ Request successful! Response:', JSON.stringify(composeData, null, 2));
    
    // Extract task ID
    let taskId: string | null = null;
    if (composeData?.task_id) {
      taskId = composeData.task_id;
    } else if (composeData?.data?.task_id) {
      taskId = composeData.data.task_id;
    } else if (composeData?.id) {
      taskId = composeData.id;
    }
    
    if (!taskId) {
      throw new Error(
        `BeatOven API did not return a task ID. Response: ${JSON.stringify(composeData)}`
      );
    }
    
    console.log('🔄 Task ID received:', taskId);
    console.log('⏳ Polling for music generation status...');
    
    // Step 2: Poll for completion
    // Correct endpoint: /api/v1/tasks/{task_id}
    const statusUrl = `https://beatoven-ai-music-generation-api.p.rapidapi.com/api/v1/tasks/${taskId}`;
    
    const maxAttempts = 60; // 5 minutes max (5 seconds per attempt)
    const pollInterval = 5000; // 5 seconds
    
    let audioUrl: string | null = null;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      try {
        const statusResponse = await axios.get(statusUrl, {
          headers: {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host': 'beatoven-ai-music-generation-api.p.rapidapi.com',
          },
          timeout: 30000,
          responseType: 'json',
        });
        
        const statusData = statusResponse.data;
        console.log(`📊 Poll attempt ${attempt + 1}:`, statusData?.status || 'unknown');
        
        // Check if completed
        if (statusData?.status === 'completed' || statusData?.status === 'success') {
          // Extract audio URL
          if (statusData?.url) {
            audioUrl = statusData.url;
          } else if (statusData?.data?.url) {
            audioUrl = statusData.data.url;
          } else if (statusData?.result?.url) {
            audioUrl = statusData.result.url;
          } else if (statusData?.track?.url) {
            audioUrl = statusData.track.url;
          } else if (statusData?.audio_url) {
            audioUrl = statusData.audio_url;
          }
          
          if (audioUrl) {
            console.log('✅ Music generation completed! URL:', audioUrl);
            break;
          }
        } else if (statusData?.status === 'failed' || statusData?.status === 'error') {
          throw new Error(
            `BeatOven music generation failed. Status: ${statusData.status}. ` +
            `Message: ${statusData.message || statusData.error || 'Unknown error'}`
          );
        }
        // If status is 'pending' or 'processing', continue polling
      } catch (pollError: any) {
        if (pollError.response?.status === 404) {
          // Task not found yet, continue polling
          console.warn(`Poll attempt ${attempt + 1}: Task not found (404), continuing...`);
          continue;
        }
        console.warn(`Poll attempt ${attempt + 1} error:`, pollError.message);
        // Continue polling
      }
    }
    
    if (!audioUrl) {
      throw new Error(
        `BeatOven music generation timed out after ${maxAttempts} attempts. ` +
        `Task ID: ${taskId}. Please check the task status manually.`
      );
    }
    
    // Step 3: Download the audio file
    console.log('📥 Downloading audio from:', audioUrl);
    
    const audioResponse = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 60000, // 60 seconds for download
    });
    
    const audioBuffer = Buffer.from(audioResponse.data);
    
    const transparency: MusicTransparencyData = {
      model: 'beatoven-ai',
      provider: 'beatoven',
      duration: duration,
      prompt: prompt,
      timestamp: timestamp,
    };
    
    console.log('✅ Music generated successfully with BeatOven');
    
    return {
      audio: audioBuffer,
      transparency,
    };
  } catch (error: any) {
    console.error('BeatOven API error:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    console.error('Error headers:', error.response?.headers);
    
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 401) {
        const errorMsg = data?.message || data?.error || 'Unauthorized';
        throw new Error(
          `Invalid RapidAPI key (401). Please verify your RAPIDAPI_KEY in .env.local file. ` +
          `Error: ${errorMsg}. ` +
          `Make sure the key is correct and your RapidAPI subscription is active.`
        );
      } else if (status === 402 || status === 403) {
        throw new Error('BeatOven API access denied. Please check your RapidAPI subscription or API limits.');
      } else if (status === 404) {
        throw new Error('BeatOven API endpoint not found. Please check the API documentation.');
      } else {
        throw new Error(
          `BeatOven API error (${status}): ${data?.message || data?.error || error.message}. ` +
          `Response: ${JSON.stringify(data)}`
        );
      }
    }
    
    throw new Error(`Failed to generate music with BeatOven: ${error.message}`);
  }
}

/**
 * Extract genre from prompt (simple keyword matching)
 */
function extractGenreFromPrompt(prompt: string): string | null {
  const promptLower = prompt.toLowerCase();
  const genres = [
    'pop', 'rock', 'jazz', 'classical', 'electronic', 'hip hop', 'hiphop',
    'country', 'blues', 'reggae', 'metal', 'folk', 'r&b', 'rnb',
    'dance', 'techno', 'house', 'ambient', 'lofi', 'lo-fi'
  ];
  
  for (const genre of genres) {
    if (promptLower.includes(genre)) {
      return genre.replace(' ', '-');
    }
  }
  
  return null; // Default will be used
}

/**
 * Extract mood from prompt (simple keyword matching)
 */
function extractMoodFromPrompt(prompt: string): string | null {
  const promptLower = prompt.toLowerCase();
  const moods = [
    'happy', 'sad', 'energetic', 'calm', 'relaxing', 'upbeat', 'melancholic',
    'peaceful', 'intense', 'dramatic', 'romantic', 'mysterious', 'cheerful',
    'dark', 'bright', 'emotional', 'uplifting', 'soothing'
  ];
  
  for (const mood of moods) {
    if (promptLower.includes(mood)) {
      return mood;
    }
  }
  
  return null; // Default will be used
}

/**
 * Generate dummy audio for demonstration/fallback
 * Creates a simple WAV audio file for testing when API is unavailable
 */
async function generateDummyAudio(prompt: string): Promise<MusicGenerationResult> {
  const timestamp = Date.now();
  
  // Generate a simple sine wave tone (440Hz for 2 seconds) as WAV format
  const sampleRate = 44100;
  const duration = 2; // 2 seconds for demo
  const frequency = 440; // A4 note
  const samples = sampleRate * duration;
  
  // Create WAV file buffer
  const buffer = Buffer.alloc(44 + samples * 2); // WAV header (44 bytes) + 16-bit samples
  
  // Write WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples * 2, 4); // File size - 8
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40); // Subchunk2Size
  
  // Generate sine wave samples
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }
  
  const transparency: MusicTransparencyData = {
    model: 'dummy-audio-generator',
    provider: 'dummy',
    duration: duration,
    prompt: prompt,
    timestamp: timestamp,
  };
  
  console.log('✅ Dummy audio generated for demonstration');
  
  return {
    audio: buffer,
    transparency,
  };
}

