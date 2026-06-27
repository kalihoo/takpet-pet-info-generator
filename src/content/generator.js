import { generateContentPack, legacyContentFromContentPack } from './pack-generator.js';

export async function generatePetContent(input = {}) {
  const name = String(input.name || input.breed || '').trim();
  if (!name) {
    throw new Error('breed is required');
  }

  const contentPack = await generateContentPack({
    name,
    breed: input.breed,
    species: input.species || 'dog',
    contentTypes: input.contentTypes
  });

  return legacyContentFromContentPack(contentPack);
}
