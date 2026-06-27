import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';

export async function generateGeminiBreedImage({ breed, outputDir, apiKey = process.env.GEMINI_API_KEY, fetchImpl = fetch }) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for Gemini image generation');
  }

  const assetsDir = path.join(outputDir, 'assets');
  const absolutePath = path.join(assetsDir, 'breed.png');
  await mkdir(assetsDir, { recursive: true });

  const response = await fetchImpl('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: DEFAULT_GEMINI_IMAGE_MODEL,
      input: [
        {
          type: 'text',
          text: `Create a realistic high-quality studio photo of a ${breed} dog for a Chinese pet science infographic. Clean bright background, friendly expression, full body or seated pose. No text, no logo, no watermark.`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini image request failed with ${response.status}: ${await readGeminiError(response)}`);
  }

  const payload = await response.json();
  const imageData = extractGeminiImage(payload);
  await writeFile(absolutePath, Buffer.from(imageData, 'base64'));
  return { relativePath: 'assets/breed.png', absolutePath };
}

function extractGeminiImage(payload) {
  if (payload.output_image?.data) {
    return payload.output_image.data;
  }
  for (const step of payload.steps || []) {
    if (step.type === 'model_output') {
      for (const block of step.content || []) {
        if ((block.type === 'image' || block.type === 'output_image') && block.data) {
          return block.data;
        }
      }
    }
  }
  throw new Error('Gemini image response did not include output_image data');
}

async function readGeminiError(response) {
  try {
    const payload = await response.json();
    return payload.error?.message || JSON.stringify(payload);
  } catch {
    return response.statusText || 'unknown error';
  }
}
