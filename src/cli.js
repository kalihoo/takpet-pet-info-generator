#!/usr/bin/env node
import './config/env.js';
import path from 'node:path';

import { generatePetContent } from './content/generator.js';
import { exportPoster } from './render/exporter.js';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const content = await generatePetContent({
    name: args.name || args.breed,
    breed: args.breed || args.name,
    species: args.species || 'dog',
    contentTypes: args.contentTypes
  });
  const output = await exportPoster(content, { outputRoot: path.resolve(args.output || 'outputs') });

  process.stdout.write(`${JSON.stringify({ content, contentPack: content.contentPack, output }, null, 2)}\n`);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--breed') {
      result.breed = argv[index + 1];
      index += 1;
    } else if (arg === '--name') {
      result.name = argv[index + 1];
      index += 1;
    } else if (arg === '--species') {
      result.species = argv[index + 1];
      index += 1;
    } else if (arg === '--content-types') {
      result.contentTypes = argv[index + 1].split(',').map((item) => item.trim()).filter(Boolean);
      index += 1;
    } else if (arg === '--output') {
      result.output = argv[index + 1];
      index += 1;
    }
  }
  if (!result.breed && !result.name) {
    throw new Error('Usage: npm run generate -- --name 英短 --species cat [--output outputs]');
  }
  return result;
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
