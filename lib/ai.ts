/**
 * AI Generation Library
 * Handles image and music generation with transparency metadata
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
 */
export interface ImageGenerationResult {
  image: Buffer;
  transparency: TransparencyData;
}

/**
 * Main image generation function
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
 * Generate image using Stability AI
 */
export async function generateImageStability(prompt: string): Promise<ImageGenerationResult> {
  try {
    const timestamp = Date.now();
    const cfgScale = 7;
    const height = 1024;
    const width = 1024;
    const steps = 30;
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

    const transparency: TransparencyData = {
      model: 'stable-diffusion-xl-1024-v1-0',
      provider: 'stability',
      steps: steps,
      seed: artifact.seed || undefined,
      sampler: 'Euler a',
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
 */
export interface MusicGenerationResult {
  audio: Buffer;
  transparency: MusicTransparencyData;
}

/**
 * Main music generation function
 */
export async function generateMusic(prompt: string): Promise<MusicGenerationResult> {
  const rapidApiKey = process.env.RAPIDAPI_KEY?.trim();
  
  if (rapidApiKey) {
    try {
      return await generateMusicBeatOven(prompt, rapidApiKey);
    } catch (error: any) {
      console.warn('BeatOven API failed, falling back to dummy audio:', error.message);
    }
  }
  
  console.log('Using dummy audio generation (BeatOven API not available or failed)');
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
  
  console.log('Generating music with BeatOven API...');
  
  const genre = extractGenreFromPrompt(prompt) || 'pop';
  const mood = extractMoodFromPrompt(prompt) || 'happy';
  const duration = 30;
  
  try {
    const composeUrl = 'https://beatoven-ai-music-generation-api.p.rapidapi.com/api/v1/tracks/compose';
    
    const promptText = `${duration} seconds ${mood} ${genre} track`;
    
    console.log('Requesting music generation from BeatOven...');
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
    console.log('Request successful! Response:', JSON.stringify(composeData, null, 2));
    
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
    
    const statusUrl = `https://beatoven-ai-music-generation-api.p.rapidapi.com/api/v1/tasks/${taskId}`;
    
    const maxAttempts = 60;
    const pollInterval = 5000;
    
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
        
        if (statusData?.status === 'completed' || statusData?.status === 'success') {
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
            console.log('Music generation completed! URL:', audioUrl);
            break;
          }
        } else if (statusData?.status === 'failed' || statusData?.status === 'error') {
          throw new Error(
            `BeatOven music generation failed. Status: ${statusData.status}. ` +
            `Message: ${statusData.message || statusData.error || 'Unknown error'}`
          );
        }
      } catch (pollError: any) {
        if (pollError.response?.status === 404) {
          console.warn(`Poll attempt ${attempt + 1}: Task not found (404), continuing...`);
          continue;
        }
        console.warn(`Poll attempt ${attempt + 1} error:`, pollError.message);
      }
    }
    
    if (!audioUrl) {
      throw new Error(
        `BeatOven music generation timed out after ${maxAttempts} attempts. ` +
        `Task ID: ${taskId}. Please check the task status manually.`
      );
    }
    
    console.log('Downloading audio from:', audioUrl);
    
    const audioResponse = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });
    
    const audioBuffer = Buffer.from(audioResponse.data);
    
    const transparency: MusicTransparencyData = {
      model: 'beatoven-ai',
      provider: 'beatoven',
      duration: duration,
      prompt: prompt,
      timestamp: timestamp,
    };
    
    console.log('Music generated successfully with BeatOven');
    
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
  
  return null;
}

/**
 * Extract mood from prompt
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
  
  return null;
}

/**
 * Generate dummy audio for demonstration/fallback
 */
async function generateDummyAudio(prompt: string): Promise<MusicGenerationResult> {
  const timestamp = Date.now();
  
  const sampleRate = 44100;
  const duration = 10;
  const samples = sampleRate * duration;
  
  const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
  const noteDuration = duration / 8;
  
  const buffer = Buffer.alloc(44 + samples * 2);
  
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40);
  
  for (let i = 0; i < samples; i++) {
    const time = i / sampleRate;
    const noteIndex = Math.floor(time / noteDuration) % notes.length;
    const frequency = notes[noteIndex];
    
    const t = 2 * Math.PI * frequency * time;
    let sample = Math.sin(t);
    
    sample += 0.3 * Math.sin(2 * t);
    sample += 0.1 * Math.sin(3 * t);
    
    const noteTime = time % noteDuration;
    const envelope = Math.min(1, noteTime * 2) * Math.min(1, (noteDuration - noteTime) * 2);
    sample *= envelope;
    
    const bassFreq = frequency / 2;
    const bassT = 2 * Math.PI * bassFreq * time;
    sample += 0.2 * Math.sin(bassT) * envelope;
    
    sample = Math.max(-1, Math.min(1, sample));
    const intSample = Math.floor(sample * 16383);
    
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }
  
  const transparency: MusicTransparencyData = {
    model: 'dummy-audio-generator',
    provider: 'dummy',
    duration: duration,
    prompt: prompt,
    timestamp: timestamp,
  };
  
  console.log('Dummy audio generated (10 seconds with melody) for demonstration');
  
  return {
    audio: buffer,
    transparency,
  };
}

