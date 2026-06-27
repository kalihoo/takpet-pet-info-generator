import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chooseImageProvider } from '../config/providers.js';
import { generateGeminiBreedImage } from './gemini-image.js';

const DEFAULT_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

export async function generateBreedImage({ breed, outputDir, fetchImpl = fetch }) {
  const provider = chooseImageProvider();
  if (provider === 'none') {
    return null;
  }
  if (provider === 'gemini') {
    return generateGeminiBreedImage({ breed, outputDir, fetchImpl });
  }

  const assetsDir = path.join(outputDir, 'assets');
  const absolutePath = path.join(assetsDir, 'breed.png');
  await mkdir(assetsDir, { recursive: true });

  const payload = await requestImageWithFallback({ breed, fetchImpl });
  const imageBase64 = payload.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error('OpenAI image response did not include b64_json');
  }

  await writeFile(absolutePath, Buffer.from(imageBase64, 'base64'));
  return { relativePath: 'assets/breed.png', absolutePath };
}

async function requestImageWithFallback({ breed, fetchImpl }) {
  const models = [...new Set([DEFAULT_IMAGE_MODEL, 'gpt-image-1'])];
  let lastError;

  for (const model of models) {
    const response = await fetchImpl('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt: `A realistic, high-quality studio photo of a ${breed} dog, clean bright background, friendly expression, full body or seated pose, suitable for a Chinese pet science infographic. No text, no logo, no watermark.`,
        size: process.env.OPENAI_IMAGE_SIZE || '1024x1024',
        quality: process.env.OPENAI_IMAGE_QUALITY || 'medium',
        output_format: 'png'
      })
    });

    if (response.ok) {
      return response.json();
    }
    lastError = new Error(`OpenAI image request failed with ${response.status} using ${model}: ${await readOpenAIError(response)}`);
  }

  throw lastError;
}

async function readOpenAIError(response) {
  try {
    const payload = await response.json();
    return payload.error?.message || JSON.stringify(payload);
  } catch {
    return response.statusText || 'unknown error';
  }
}
