import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { generateBreedImage } from '../src/content/image.js';

test('generateBreedImage writes GPT image output into the poster assets folder', async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), 'takpet-image-'));
  const originalKey = process.env.OPENAI_API_KEY;
  const originalForceLocal = process.env.TAKPET_FORCE_LOCAL;
  const originalProvider = process.env.IMAGE_PROVIDER;
  const originalPaid = process.env.PAID_API_ENABLED;
  let requestBody;

  process.env.OPENAI_API_KEY = 'sk-test';
  process.env.IMAGE_PROVIDER = 'openai';
  process.env.PAID_API_ENABLED = 'true';
  delete process.env.TAKPET_FORCE_LOCAL;
  const result = await generateBreedImage({
    breed: '西高地白梗',
    outputDir,
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        async json() {
          return { data: [{ b64_json: Buffer.from('fake-png').toString('base64') }] };
        }
      };
    }
  });

  process.env.OPENAI_API_KEY = originalKey;
  process.env.TAKPET_FORCE_LOCAL = originalForceLocal;
  process.env.IMAGE_PROVIDER = originalProvider;
  process.env.PAID_API_ENABLED = originalPaid;
  assert.equal(result.relativePath, 'assets/breed.png');
  assert.equal(requestBody.model, process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2');
  assert.match(requestBody.prompt, /西高地白梗/);
  assert.equal((await readFile(result.absolutePath, 'utf8')), 'fake-png');
  await rm(outputDir, { recursive: true, force: true });
});
