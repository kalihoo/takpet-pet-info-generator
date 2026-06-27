import { normalizeGeneratedContent, parseJsonText } from './normalizer.js';

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';

export async function generateWithGemini({ breed, species, apiKey = process.env.GEMINI_API_KEY, fetchImpl = fetch }) {
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
      input: buildPrompt(breed),
      tools: [{ type: 'google_search' }]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}: ${await readGeminiError(response)}`);
  }

  const payload = await response.json();
  const text = extractGeminiText(payload);
  return normalizeGeneratedContent(parseJsonText(text), { breed, species, source: 'gemini-google-search' });
}

function buildPrompt(breed) {
  return [
    `联网检索犬种「${breed}」的可靠资料，生成严格 JSON 对象。`,
    '不要 Markdown，不要代码围栏，不要脚注，不要引用编号，不要在任何字段里写 [1]、[2, 3] 这类来源标记。',
    '字段必须包含：breed, species, title, subtitle, summary, timeline(5项，每项label/period/text), keyPoints(5项), traits(5项), careTips(4项), suitableFor(3项), featureCards(4项，每项label/text), fact, aliases(2-4项), disclaimer。',
    '所有数组元素必须是合法 JSON 字符串或对象，不能出现尾随逗号。中文必须清晰、准确、适合信息图海报。'
  ].join('\n');
}

function extractGeminiText(payload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const chunks = [];
  for (const step of payload.steps || []) {
    if (step.type === 'model_output') {
      for (const block of step.content || []) {
        if ((block.type === 'text' || block.type === 'output_text') && block.text) {
          chunks.push(block.text);
        }
      }
    }
  }
  if (!chunks.length) {
    throw new Error('Gemini response did not include output text');
  }
  return chunks.join('\n').trim();
}

async function readGeminiError(response) {
  try {
    const payload = await response.json();
    return payload.error?.message || JSON.stringify(payload);
  } catch {
    return response.statusText || 'unknown error';
  }
}
