import OpenAI from 'openai';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export async function generateImage(prompt: string): Promise<Buffer> {
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

    return Buffer.from(imageResponse.data);
  } catch (error) {
    console.error('Image generation error:', error);
    throw new Error('Failed to generate image');
  }
}

export async function generateText(prompt: string): Promise<string> {
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

export async function generateImageStability(prompt: string): Promise<Buffer> {
  try {
    const response = await axios.post(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        text_prompts: [{ text: prompt }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        steps: 30,
        samples: 1,
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

    const base64Image = data.artifacts[0].base64;
    return Buffer.from(base64Image, 'base64');
  } catch (error: any) {
    console.error('Stability AI generation error:', error);
    if (error.response) {
      console.error('Stability AI response:', error.response.data);
      throw new Error(`Stability AI error: ${error.response.data?.message || error.message}`);
    }
    throw new Error(`Failed to generate image with Stability AI: ${error.message}`);
  }
}
