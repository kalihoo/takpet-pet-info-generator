import test from 'node:test';
import assert from 'node:assert/strict';

import { generatePetContent } from '../src/content/generator.js';
import { normalizeGeneratedContent, parseJsonText } from '../src/content/normalizer.js';

test('generatePetContent returns a complete local fallback structure without an API key', async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const content = await generatePetContent({ breed: '西高地白梗', species: 'dog' });

  process.env.OPENAI_API_KEY = originalKey;
  assert.equal(content.breed, '西高地白梗');
  assert.equal(content.species, 'dog');
  assert.match(content.title, /西高地白梗/);
  assert.ok(content.subtitle.length > 0);
  assert.equal(content.summary.length > 0, true);
  assert.equal(content.timeline.length, 5);
  assert.equal(content.keyPoints.length, 5);
  assert.equal(content.traits.length, 5);
  assert.equal(content.careTips.length, 4);
  assert.equal(content.suitableFor.length, 3);
  assert.match(content.disclaimer, /科普/);
  assert.equal(content.source, 'local-fallback');
});

test('generatePetContent requests OpenAI web search when API mode is enabled', async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalForceLocal = process.env.TAKPET_FORCE_LOCAL;
  const originalProvider = process.env.AI_PROVIDER;
  const originalPaid = process.env.PAID_API_ENABLED;
  const originalFetch = globalThis.fetch;
  let requestBody;

  process.env.OPENAI_API_KEY = 'sk-test';
  process.env.AI_PROVIDER = 'openai';
  process.env.PAID_API_ENABLED = 'true';
  delete process.env.TAKPET_FORCE_LOCAL;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      async json() {
        return {
          output_text: JSON.stringify({
            title: '西高地白梗的演化史',
            subtitle: '从苏格兰猎犬到家庭伴侣',
            summary: '西高地白梗起源于苏格兰高地，是小型梗犬中很有辨识度的白色犬种。',
            timeline: [
              { label: '实用猎犬阶段', period: '19世纪中期', text: '用于狩猎小型动物。' },
              { label: '白色筛选阶段', period: '1870-1890年代', text: '白色被毛逐渐受到偏好。' },
              { label: '品种分化阶段', period: '1900-1910年代', text: '逐渐形成独立品种。' },
              { label: '正式认可阶段', period: '20世纪初', text: '进入犬种注册体系。' },
              { label: '现代伴侣阶段', period: '现代', text: '成为受欢迎的家庭伴侣犬。' }
            ],
            keyPoints: ['实用猎犬阶段', '选择白色阶段', '品种独立阶段', '品种认可阶段', '现代伴侣阶段'],
            traits: ['自信', '活泼', '警觉', '友善', '独立'],
            careTips: ['规律运动', '梳理被毛', '社会化训练', '定期体检'],
            suitableFor: ['有陪伴时间的家庭', '接受日常训练的人', '能提供稳定作息的人'],
            featureCards: [
              { label: '体型', text: '小型犬。' },
              { label: '被毛', text: '白色双层被毛。' },
              { label: '性格', text: '自信活泼。' },
              { label: '用途', text: '从猎犬到伴侣犬。' }
            ],
            fact: '西高地白梗常简称 Westie。',
            aliases: ['西高地白梗', 'Westie'],
            disclaimer: '内容仅作宠物科普参考。'
          })
        };
      }
    };
  };

  const content = await generatePetContent({ breed: '西高地白梗', species: 'dog' });

  process.env.OPENAI_API_KEY = originalKey;
  process.env.TAKPET_FORCE_LOCAL = originalForceLocal;
  process.env.AI_PROVIDER = originalProvider;
  process.env.PAID_API_ENABLED = originalPaid;
  globalThis.fetch = originalFetch;
  assert.equal(content.source, 'openai-web-search');
  assert.deepEqual(requestBody.tools, [{ type: 'web_search', search_context_size: 'low' }]);
  assert.equal(requestBody.include[0], 'web_search_call.results');
});

test('generatePetContent rejects an empty breed name', async () => {
  await assert.rejects(
    () => generatePetContent({ breed: '   ', species: 'dog' }),
    /breed is required/
  );
});

test('generatePetContent rejects unsupported species in the MVP', async () => {
  await assert.rejects(
    () => generatePetContent({ breed: '英短', species: 'cat' }),
    /only supports dog/
  );
});

test('normalizer removes grounding citation markers from generated content', () => {
  const content = normalizeGeneratedContent({
    summary: '起源于苏格兰高地。 [2, 9]',
    timeline: [{ label: '起源 [1]', period: '19世纪 [3]', text: '用于狩猎。 [4, 5]' }],
    keyPoints: ['白色被毛 [1]']
  }, { breed: '西高地白梗', species: 'dog', source: 'test' });

  assert.equal(content.summary, '起源于苏格兰高地。');
  assert.equal(content.timeline[0].label, '起源');
  assert.equal(content.timeline[0].text, '用于狩猎。');
  assert.equal(content.keyPoints[0], '白色被毛');
});

test('parseJsonText extracts a JSON object from fenced output', () => {
  assert.deepEqual(parseJsonText('```json\n{"title":"西高地白梗"}\n```'), { title: '西高地白梗' });
  assert.deepEqual(parseJsonText('说明\n{"title":"雪纳瑞"}\n结束'), { title: '雪纳瑞' });
});
