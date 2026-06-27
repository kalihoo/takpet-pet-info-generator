import { chooseTextProvider } from '../config/providers.js';
import { generateWithGemini } from './gemini.js';
import { normalizeGeneratedContent, parseJsonText } from './normalizer.js';

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

export async function generatePetContent(input = {}) {
  const breed = String(input.breed || '').trim();
  const species = String(input.species || 'dog').trim().toLowerCase();

  if (!breed) {
    throw new Error('breed is required');
  }
  if (species !== 'dog') {
    throw new Error('TakPet MVP only supports dog species');
  }

  const provider = chooseTextProvider();
  if (provider === 'gemini') {
    try {
      return await generateWithGemini({ breed, species });
    } catch (error) {
      return buildLocalFallback({ breed, species, fallbackReason: error.message });
    }
  }

  if (provider === 'openai') {
    try {
      return await generateWithOpenAI({ breed, species });
    } catch (error) {
      return buildLocalFallback({ breed, species, fallbackReason: error.message });
    }
  }

  return buildLocalFallback({ breed, species });
}

async function generateWithOpenAI({ breed, species }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: '你是 TakPet 宠物科普信息编辑。只输出严格 JSON，不输出 Markdown。内容要适合中文宠物科普海报，避免绝对化医疗建议。'
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `联网检索犬种「${breed}」的可靠资料，生成严格 JSON：breed, species, title, subtitle, summary, timeline(5项，每项label/period/text), keyPoints(5项), traits(5项), careTips(4项), suitableFor(3项), featureCards(4项，每项label/text), fact, aliases(2-4项), disclaimer。中文必须清晰、准确、适合信息图海报。`
            }
          ]
        }
      ],
      tools: [{ type: 'web_search', search_context_size: 'low' }],
      include: ['web_search_call.results']
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}: ${await readOpenAIError(response)}`);
  }

  const payload = await response.json();
  const text = extractResponseText(payload);
  const parsed = parseJsonText(text);
  return normalizeGeneratedContent(parsed, { breed, species, source: 'openai-web-search' });
}

async function readOpenAIError(response) {
  try {
    const payload = await response.json();
    return payload.error?.message || JSON.stringify(payload);
  } catch {
    return response.statusText || 'unknown error';
  }
}

function extractResponseText(payload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const texts = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) {
        texts.push(content.text);
      }
    }
  }
  if (!texts.length) {
    throw new Error('OpenAI response did not include output text');
  }
  return texts.join('\n').trim();
}

function buildLocalFallback({ breed, species, fallbackReason }) {
  const content = normalizeGeneratedContent({
    title: `${breed}的演化史`,
    subtitle: '从工作伙伴到家庭伴侣的百年历程',
    summary: `${breed}的历史是一段从实用工作犬走向现代家庭伴侣的演变过程，外观、性格与用途都在长期繁育中逐渐稳定。`,
    timeline: [
      { label: '实用工作阶段', period: '19世纪中期', text: `${breed}的早期角色多与地域环境、工作需求和人类生活方式有关。` },
      { label: '早期发展阶段', period: '1870-1890年代', text: '随着繁育目标稳定，体型、被毛、性格等特征逐步被筛选和强化。' },
      { label: '品种分化阶段', period: '1900-1910年代', text: '外观与性格特征逐渐清晰，开始区别于相近犬种。' },
      { label: '正式认可阶段', period: '1920-1960年代', text: '进入现代犬种体系后，品种标准和展示传播更加稳定。' },
      { label: '现代伴侣阶段', period: '1970年代至今', text: '今天更多以家庭陪伴犬身份出现，也保留了鲜明的品种个性。' }
    ],
    keyPoints: ['工作用途', '被毛选择', '品种独立', '标准认可', '家庭伴侣'],
    traits: ['亲人', '警觉', '聪明', '活泼', '适应力强'],
    careTips: ['保持规律运动', '定期梳理被毛', '重视社会化训练', '按兽医建议体检'],
    suitableFor: ['愿意长期陪伴的家庭', '接受日常训练的人', '能提供稳定作息的人'],
    featureCards: [
      { label: '体型', text: `${breed}通常体型紧凑，适合家庭空间。` },
      { label: '被毛', text: '被毛状态需要定期清洁、梳理和护理。' },
      { label: '性格', text: '常见特点是活泼、警觉、亲人且有互动需求。' },
      { label: '用途', text: '从工作用途逐步发展为家庭陪伴与展示犬。' }
    ],
    fact: `${breed}的品种故事适合用时间线方式做科普表达。`,
    aliases: [breed, `${breed}犬`],
    disclaimer: '内容仅作宠物科普参考，具体健康问题请咨询专业兽医。'
  }, { breed, species, source: 'local-fallback' });

  if (fallbackReason) {
    content.fallbackReason = fallbackReason;
  }
  return content;
}
