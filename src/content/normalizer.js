export function normalizeGeneratedContent(value, defaults) {
  return {
    breed: defaults.breed,
    species: defaults.species,
    title: asText(value.title, `${defaults.breed}的演化史`),
    subtitle: asText(value.subtitle, '从工作伙伴到家庭伴侣的百年历程'),
    summary: asText(value.summary, `${defaults.breed}的历史是一段从实用工作犬走向现代家庭伴侣的演变过程。`),
    timeline: normalizeList(value.timeline, 5, (index) => ({
      label: ['实用工作阶段', '早期发展阶段', '品种分化阶段', '正式认可阶段', '现代伴侣阶段'][index],
      period: ['19世纪中期', '1870-1890年代', '1900-1910年代', '1920-1960年代', '1970年代至今'][index],
      text: `${defaults.breed}在不同阶段逐步形成今天稳定的品种特征。`
    })),
    keyPoints: normalizeStringList(value.keyPoints, 5, ['工作用途', '被毛选择', '品种独立', '标准认可', '家庭伴侣']),
    traits: normalizeStringList(value.traits, 5, ['亲人', '警觉', '聪明', '活泼', '适应力强']),
    careTips: normalizeStringList(value.careTips, 4, ['保持规律运动', '定期梳理被毛', '重视社会化训练', '按兽医建议体检']),
    suitableFor: normalizeStringList(value.suitableFor, 3, ['愿意长期陪伴的家庭', '接受日常训练的人', '能提供稳定作息的人']),
    featureCards: normalizeList(value.featureCards, 4, (index) => ({
      label: ['体型', '被毛', '性格', '用途'][index],
      text: [`${defaults.breed}体型结构紧凑。`, '被毛护理需要稳定频率。', '性格通常活泼、警觉且亲人。', '从工作用途逐步进入家庭陪伴。'][index]
    })),
    fact: asText(value.fact, `${defaults.breed}的现代形象与家庭陪伴、科普传播密切相关。`),
    aliases: normalizeStringList(value.aliases, 3, [defaults.breed, defaults.breed.replace(/\s+/g, '')]),
    disclaimer: asText(value.disclaimer, '内容仅作宠物科普参考，具体健康问题请咨询专业兽医。'),
    source: defaults.source
  };
}

export function parseJsonText(text) {
  const trimmed = String(text || '').trim();
  const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(withoutFence);
  } catch (error) {
    const objectText = extractJsonObject(withoutFence);
    if (!objectText || objectText === withoutFence) {
      throw error;
    }
    return JSON.parse(objectText);
  }
}

function asText(value, fallback) {
  const text = typeof value === 'string' && value.trim() ? value : fallback;
  return cleanText(text);
}

function normalizeStringList(value, size, fallback) {
  const items = Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).map(cleanText) : [];
  return [...items, ...fallback].slice(0, size);
}

function normalizeList(value, size, fallbackFactory) {
  const items = Array.isArray(value) ? value : [];
  return Array.from({ length: size }, (_, index) => {
    const item = items[index];
    if (item && typeof item === 'object') {
      const fallback = fallbackFactory(index);
      return {
        label: asText(item.label, fallback.label),
        period: asText(item.period, fallback.period || ''),
        text: asText(item.text, fallback.text)
      };
    }
    return fallbackFactory(index);
  });
}

function cleanText(value) {
  return String(value || '')
    .replace(/\s*\[[\d,\s-]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractJsonObject(value) {
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return value.slice(start, end + 1);
}
