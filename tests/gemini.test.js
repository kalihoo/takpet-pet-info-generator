import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { generateWithGemini } from '../src/content/gemini.js';
import { generateGeminiBreedImage } from '../src/content/gemini-image.js';

test('generateWithGemini calls Interactions API with google_search grounding', async () => {
  let request;
  const content = await generateWithGemini({
    breed: '西高地白梗',
    species: 'dog',
    apiKey: 'gemini-test',
    fetchImpl: async (url, options) => {
      request = { url, body: JSON.parse(options.body), key: options.headers['x-goog-api-key'] };
      return {
        ok: true,
        async json() {
          return {
            output_text: JSON.stringify({
              title: '西高地白梗的演化史',
              subtitle: '从苏格兰猎犬到家庭伴侣',
              summary: '西高地白梗是起源于苏格兰的白色小型梗犬。',
              timeline: [
                { label: '实用猎犬阶段', period: '19世纪', text: '用于小型猎物狩猎。' },
                { label: '白色筛选阶段', period: '19世纪末', text: '白色被毛逐渐稳定。' },
                { label: '品种分化阶段', period: '20世纪初', text: '逐渐成为独立品种。' },
                { label: '正式认可阶段', period: '1908年后', text: '进入犬种注册体系。' },
                { label: '现代伴侣阶段', period: '现代', text: '成为家庭伴侣犬。' }
              ],
              keyPoints: ['猎犬', '白色', '独立', '认可', '伴侣'],
              traits: ['活泼', '自信', '警觉', '亲人', '独立'],
              careTips: ['梳毛', '运动', '训练', '体检'],
              suitableFor: ['家庭', '训练者', '陪伴者'],
              featureCards: [
                { label: '体型', text: '小型。' },
                { label: '被毛', text: '白色双层毛。' },
                { label: '性格', text: '活泼自信。' },
                { label: '用途', text: '伴侣犬。' }
              ],
              fact: 'Westie 是常见简称。',
              aliases: ['西高地白梗', 'Westie'],
              disclaimer: '内容仅作科普。'
            })
          };
        }
      };
    }
  });

  assert.match(request.url, /generativelanguage\.googleapis\.com\/v1beta\/interactions/);
  assert.equal(request.key, 'gemini-test');
  assert.deepEqual(request.body.tools, [{ type: 'google_search' }]);
  assert.equal(content.source, 'gemini-google-search');
});

test('generateGeminiBreedImage writes Nano Banana image output', async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), 'takpet-gemini-image-'));
  let request;
  const result = await generateGeminiBreedImage({
    breed: '西高地白梗',
    outputDir,
    apiKey: 'gemini-test',
    fetchImpl: async (url, options) => {
      request = { url, body: JSON.parse(options.body), key: options.headers['x-goog-api-key'] };
      return {
        ok: true,
        async json() {
          return { output_image: { data: Buffer.from('gemini-png').toString('base64') } };
        }
      };
    }
  });

  assert.match(request.url, /generativelanguage\.googleapis\.com\/v1beta\/interactions/);
  assert.equal(request.body.model, process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image');
  assert.equal(result.relativePath, 'assets/breed.png');
  assert.equal(await readFile(result.absolutePath, 'utf8'), 'gemini-png');
  await rm(outputDir, { recursive: true, force: true });
});
