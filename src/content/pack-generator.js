import { chooseTextProvider } from '../config/providers.js';
import { parseJsonText } from './normalizer.js';
import { legacyContentFromPack, normalizeContentPack, normalizeSpecies } from './pack-normalizer.js';

const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';

export async function generateContentPack(input = {}) {
  const name = String(input.name || input.breed || '').trim();
  const species = normalizeSpecies(input.species || 'dog');
  const contentTypes = input.contentTypes;

  if (!name) {
    throw new Error('name is required');
  }

  const provider = chooseTextProvider();
  if (provider === 'gemini') {
    try {
      return await generatePackWithGemini({ name, species, contentTypes });
    } catch (error) {
      return buildLocalContentPack({ name, species, contentTypes, fallbackReason: error.message });
    }
  }

  if (provider === 'openai') {
    try {
      return await generatePackWithOpenAI({ name, species, contentTypes });
    } catch (error) {
      return buildLocalContentPack({ name, species, contentTypes, fallbackReason: error.message });
    }
  }

  return buildLocalContentPack({ name, species, contentTypes });
}

export function buildLocalContentPack({ name, species, contentTypes, fallbackReason }) {
  return normalizeContentPack(
    fallbackReason ? { fallbackReason } : {},
    { name, species, contentTypes, source: 'local-fallback', fallbackReason }
  );
}

export function legacyContentFromContentPack(contentPack) {
  return legacyContentFromPack(contentPack);
}

async function generatePackWithGemini({ name, species, contentTypes, apiKey = process.env.GEMINI_API_KEY, fetchImpl = fetch }) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for Gemini text generation');
  }

  const response = await fetchImpl('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: DEFAULT_GEMINI_MODEL,
      input: buildContentPackPrompt({ name, species, contentTypes }),
      tools: [{ type: 'google_search' }]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}: ${await readProviderError(response)}`);
  }

  const payload = await response.json();
  const parsed = parseJsonText(extractResponseText(payload, 'Gemini'));
  return normalizeContentPack(parsed, { name, species, contentTypes, source: 'gemini-google-search' });
}

async function generatePackWithOpenAI({ name, species, contentTypes, fetchImpl = fetch }) {
  const response = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_MODEL,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: '你是 TakPet 小红书宠物内容策划。只输出严格 JSON，不输出 Markdown。避免绝对化医疗建议，避免虚构具体商品疗效。'
            }
          ]
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: buildContentPackPrompt({ name, species, contentTypes }) }]
        }
      ],
      tools: [{ type: 'web_search', search_context_size: 'low' }],
      include: ['web_search_call.results']
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}: ${await readProviderError(response)}`);
  }

  const payload = await response.json();
  const parsed = parseJsonText(extractResponseText(payload, 'OpenAI'));
  return normalizeContentPack(parsed, { name, species, contentTypes, source: 'openai-web-search' });
}

function buildContentPackPrompt({ name, species, contentTypes }) {
  const speciesLabel = { dog: '犬种', cat: '猫种', exotic: '异宠' }[species];
  return [
    `联网检索「${name}」这个${speciesLabel}的可靠资料，生成适合小红书宠物内容博主使用的严格 JSON 对象。`,
    '不要 Markdown，不要代码围栏，不要脚注，不要引用编号，不要在任何字段里写 [1]、[2, 3] 这类来源标记。',
    `优先生成这些栏目：${Array.isArray(contentTypes) && contentTypes.length ? contentTypes.join(', ') : 'storyline, careGuide, shoppingGuide, habitat, mediaRecommendations, xiaohongshuCopy'}。`,
    '字段必须包含：name, species, profile, storyline, careGuide, shoppingGuide, habitat, mediaRecommendations, xiaohongshuCopy, posterSections, disclaimer。',
    'profile 包含 title, subtitle, summary, aliases, suitableFor, notSuitableFor, personality, riskNotes。',
    'storyline 输出 4 项，每项 label/period/text。',
    'careGuide 包含 title, beginnerMistakes(4), budgetLevels(3), dailyCare(4), cautions(4)。',
    'shoppingGuide 包含 title, mustHave(4), optional(3), avoid(3), selectionRules(4)，不要编造具体品牌背书。',
    'habitat 对犬猫写家庭环境布置；对异宠写栖息地、温湿度、垫材、躲避空间、光照等通用提示。',
    'mediaRecommendations 输出 5 项，每项 title/type/reason/noteAngle；推荐是选题灵感，不要保证影片直接出现该品种。',
    'xiaohongshuCopy 包含 titles(10), bodies(3), hashtags(10), commentPrompt, collectionName。',
    'posterSections 包含 keyPoints(5), storyline(4), highlights(3), fact。',
    '所有内容中文清晰，适合收藏型小红书笔记；不要给诊断、用药剂量或危险操作建议。'
  ].join('\n');
}

function extractResponseText(payload, providerName) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const texts = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if ((content.type === 'output_text' || content.type === 'text') && content.text) {
        texts.push(content.text);
      }
    }
  }
  for (const step of payload.steps || []) {
    if (step.type === 'model_output') {
      for (const block of step.content || []) {
        if ((block.type === 'text' || block.type === 'output_text') && block.text) {
          texts.push(block.text);
        }
      }
    }
  }
  if (!texts.length) {
    throw new Error(`${providerName} response did not include output text`);
  }
  return texts.join('\n').trim();
}

async function readProviderError(response) {
  try {
    const payload = await response.json();
    return payload.error?.message || JSON.stringify(payload);
  } catch {
    return response.statusText || 'unknown error';
  }
}
