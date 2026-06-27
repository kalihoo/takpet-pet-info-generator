const SUPPORTED_SPECIES = ['dog', 'cat', 'exotic'];

export function normalizeSpecies(value = 'dog') {
  const species = String(value || 'dog').trim().toLowerCase();
  if (!SUPPORTED_SPECIES.includes(species)) {
    throw new Error('species must be one of dog, cat, exotic');
  }
  return species;
}

export function normalizeContentPack(value = {}, defaults = {}) {
  const name = cleanText(defaults.name || value.name || value.breed || '宠物');
  const species = normalizeSpecies(defaults.species || value.species || 'dog');
  const source = defaults.source || value.source || 'local-fallback';
  const fallback = buildFallbackPack(name, species);

  const profile = normalizeObject(value.profile, fallback.profile);
  const storyline = normalizeList(value.storyline, 4, fallback.storyline, normalizeTimelineItem);
  const careGuide = {
    title: asText(value.careGuide?.title, fallback.careGuide.title),
    beginnerMistakes: normalizeStringList(value.careGuide?.beginnerMistakes, 4, fallback.careGuide.beginnerMistakes),
    budgetLevels: normalizeStringList(value.careGuide?.budgetLevels, 3, fallback.careGuide.budgetLevels),
    dailyCare: normalizeStringList(value.careGuide?.dailyCare, 4, fallback.careGuide.dailyCare),
    cautions: normalizeStringList(value.careGuide?.cautions, 4, fallback.careGuide.cautions)
  };
  const shoppingGuide = {
    title: asText(value.shoppingGuide?.title, fallback.shoppingGuide.title),
    mustHave: normalizeStringList(value.shoppingGuide?.mustHave, 4, fallback.shoppingGuide.mustHave),
    optional: normalizeStringList(value.shoppingGuide?.optional, 3, fallback.shoppingGuide.optional),
    avoid: normalizeStringList(value.shoppingGuide?.avoid, 3, fallback.shoppingGuide.avoid),
    selectionRules: normalizeStringList(value.shoppingGuide?.selectionRules, 4, fallback.shoppingGuide.selectionRules)
  };
  const habitat = {
    title: asText(value.habitat?.title, fallback.habitat.title),
    setup: normalizeStringList(value.habitat?.setup, 4, fallback.habitat.setup),
    environment: normalizeStringList(value.habitat?.environment, 4, fallback.habitat.environment),
    warnings: normalizeStringList(value.habitat?.warnings, 3, fallback.habitat.warnings)
  };
  const mediaRecommendations = normalizeList(value.mediaRecommendations, 5, fallback.mediaRecommendations, normalizeMediaItem);
  const xiaohongshuCopy = {
    titles: normalizeStringList(value.xiaohongshuCopy?.titles, 10, fallback.xiaohongshuCopy.titles),
    bodies: normalizeStringList(value.xiaohongshuCopy?.bodies, 3, fallback.xiaohongshuCopy.bodies),
    hashtags: normalizeStringList(value.xiaohongshuCopy?.hashtags, 10, fallback.xiaohongshuCopy.hashtags),
    commentPrompt: asText(value.xiaohongshuCopy?.commentPrompt, fallback.xiaohongshuCopy.commentPrompt),
    collectionName: asText(value.xiaohongshuCopy?.collectionName, fallback.xiaohongshuCopy.collectionName)
  };

  return {
    name,
    breed: name,
    species,
    contentTypes: normalizeContentTypes(value.contentTypes || defaults.contentTypes),
    profile,
    storyline,
    careGuide,
    shoppingGuide,
    habitat,
    mediaRecommendations,
    xiaohongshuCopy,
    posterSections: normalizePosterSections(value.posterSections, { storyline, shoppingGuide, habitat, mediaRecommendations }),
    disclaimer: asText(value.disclaimer, fallback.disclaimer),
    source,
    fallbackReason: value.fallbackReason || defaults.fallbackReason
  };
}

export function legacyContentFromPack(pack) {
  const timeline = [
    ...pack.storyline,
    {
      label: '发布转化',
      period: '小红书',
      text: pack.xiaohongshuCopy.titles[0] || '整理成搜索型标题、收藏型清单和评论区互动问题。'
    }
  ].slice(0, 5).map((item) => ({
    label: item.label,
    period: item.period,
    text: item.text
  }));
  const featureCards = pack.posterSections.highlights.map((item) => ({
    label: item.label,
    text: item.text
  }));

  return {
    breed: pack.name,
    species: pack.species,
    title: pack.profile.title,
    subtitle: pack.profile.subtitle,
    summary: pack.profile.summary,
    timeline,
    keyPoints: pack.posterSections.keyPoints,
    traits: pack.profile.personality,
    careTips: pack.careGuide.dailyCare,
    suitableFor: pack.profile.suitableFor,
    featureCards,
    fact: pack.posterSections.fact,
    aliases: pack.profile.aliases,
    disclaimer: pack.disclaimer,
    source: pack.source,
    contentPack: pack,
    fallbackReason: pack.fallbackReason
  };
}

function buildFallbackPack(name, species) {
  const speciesLabel = species === 'dog' ? '犬' : species === 'cat' ? '猫' : '异宠';
  const habitatTitle = species === 'exotic' ? `${name}的栖息环境布置` : `${name}的家庭生活环境`;
  const habitatSetup = species === 'exotic'
    ? ['确认适宜温湿度区间', '准备稳定躲避空间', '选择安全垫材和饮水方式', '保持环境清洁并记录状态']
    : ['设置安静休息区', '准备饮水和进食动线', '留出互动与活动空间', '把清洁用品放在固定位置'];

  return {
    profile: {
      title: `${name}内容灵感包`,
      subtitle: `${speciesLabel}类新手科普与小红书选题`,
      summary: `${name}适合拆成故事、避坑、用品、环境和陪伴关系来做系列内容，既能满足搜索需求，也方便收藏转发。`,
      aliases: [name, `${name}${speciesLabel}`],
      suitableFor: ['正在做养宠功课的人', '喜欢收藏清单的人', '想判断是否适合自己的人'],
      notSuitableFor: ['期待零成本零维护的人', '无法长期稳定照料的人'],
      personality: ['有辨识度', '需要稳定照料', '适合做系列科普', '能带出生活方式内容', '适合新手决策对比'],
      riskNotes: ['具体健康问题请咨询专业兽医', '不要只凭颜值决定饲养', '预算和时间成本要提前评估']
    },
    storyline: [
      { label: '起源线索', period: '背景', text: `${name}的流行可以从来源、用途和人类生活方式变化讲起。` },
      { label: '进入家庭', period: '陪伴阶段', text: '从功能性角色进入家庭陪伴后，内容重点变成性格、照料和生活场景。' },
      { label: '走红原因', period: '社媒阶段', text: '外观辨识度、陪伴感和新手问题，都是小红书容易被搜索和收藏的切角。' },
      { label: '现代角色', period: '今天', text: '今天更适合用清单、避坑和真实生活场景来帮助用户做养宠判断。' }
    ],
    careGuide: {
      title: `${name}新手避坑`,
      beginnerMistakes: ['只看颜值不看照料成本', '忽略日常清洁和陪伴时间', '用品一次买太多但不匹配需求', '把网络经验当成医疗建议'],
      budgetLevels: ['入门预算：基础用品和日常消耗', '稳定预算：护理、体检和环境优化', '进阶预算：训练、保险或专业服务'],
      dailyCare: ['保持稳定饮食和饮水', '固定清洁与观察状态', '安排互动和环境丰富化', '异常情况及时咨询专业人士'],
      cautions: ['不要使用绝对化偏方', '不要冲动购买活体或高价用品', '不要忽略长期陪伴责任', '不要把内容当作诊疗结论']
    },
    shoppingGuide: {
      title: `${name}用品清单`,
      mustHave: ['主食与饮水用品', '清洁与收纳用品', '休息或躲避空间', '基础安全防护'],
      optional: ['互动玩具', '外出或展示用品', '环境美化配件'],
      avoid: ['无明确需求的高价套装', '夸大疗效的保健用品', '不适配体型或习性的用品'],
      selectionRules: ['先看安全和适配', '再看清洁便利度', '按消耗频率分预算', '优先选择可长期复购的基础品']
    },
    habitat: {
      title: habitatTitle,
      setup: habitatSetup,
      environment: species === 'exotic'
        ? ['温湿度要可监测', '避免频繁惊扰', '保持通风与安全', '按物种习性布置空间']
        : ['避免过度嘈杂', '清洁区和休息区分开', '给足活动和互动空间', '保留安全边界'],
      warnings: ['环境不稳定会影响状态', '新手先做功课再入手', '异常情况不要拖延']
    },
    mediaRecommendations: [
      { title: '忠犬八公的故事', type: '电影', reason: '适合延展陪伴关系选题', noteAngle: '从陪伴感切入讨论养宠责任' },
      { title: '萌宠成长记', type: '纪录片', reason: '适合做新手观察视角', noteAngle: '用成长过程讲照料变化' },
      { title: '爱宠大机密', type: '动画', reason: '适合轻松娱乐型选题', noteAngle: '从拟人化反差引出真实需求' },
      { title: '犬之岛', type: '动画电影', reason: '适合视觉风格和情绪表达', noteAngle: '讨论宠物与人的信任关系' },
      { title: '宠物相关纪录片清单', type: '片单', reason: '适合作为收藏型笔记', noteAngle: '养之前先看这些主题内容' }
    ],
    xiaohongshuCopy: {
      titles: [
        `${name}适合新手吗？先看这份清单`,
        `想养${name}，这几个坑别踩`,
        `${name}用品怎么选？别先买贵的`,
        `${name}的生活环境这样布置更稳`,
        `${name}为什么这么容易被种草`,
        `养${name}前建议先看完这一篇`,
        `${name}新手预算怎么拆`,
        `${name}不是只看颜值就能养`,
        `${name}内容选题：故事线这样讲`,
        `${name}小红书笔记素材包`
      ],
      bodies: [
        `${name}不要只看颜值，先从照料时间、预算、环境和长期责任判断是否适合自己。`,
        `这篇把${name}拆成故事线、用品清单、环境布置和新手避坑，适合收藏后慢慢做功课。`,
        `如果你正在考虑${name}，建议先买基础用品，再根据真实习惯慢慢补齐，不要一次性冲动囤货。`
      ],
      hashtags: ['#TakPet科普', '#宠物科普', '#新手养宠', '#养宠避坑', '#宠物用品', '#小红书宠物', '#科学养宠', '#宠物清单', '#养宠功课', `#${name}`],
      commentPrompt: `你会因为什么原因想了解${name}？评论区可以留你的预算和居住环境。`,
      collectionName: 'TakPet养宠功课'
    },
    disclaimer: '内容仅作宠物科普和选题参考，不替代专业兽医、繁育者或物种饲养专家建议。'
  };
}

function normalizePosterSections(value, source) {
  const highlights = [
    { label: '故事', text: source.storyline[0]?.text || '适合用故事线切入。' },
    { label: '用品', text: source.shoppingGuide.mustHave[0] || '先买基础用品。' },
    { label: '环境', text: source.habitat.setup[0] || '先布置稳定环境。' }
  ];
  return {
    keyPoints: normalizeStringList(value?.keyPoints, 5, [
      source.storyline[0]?.label || '故事线',
      source.careGuide?.beginnerMistakes?.[0] || '新手避坑',
      source.shoppingGuide?.mustHave?.[0] || '用品清单',
      source.habitat?.setup?.[0] || '环境布置',
      source.mediaRecommendations?.[0]?.title || '片单灵感'
    ]),
    storyline: normalizeList(value?.storyline, 4, source.storyline, normalizeTimelineItem),
    highlights: normalizeList(value?.highlights, 3, highlights, normalizeHighlightItem),
    fact: asText(value?.fact, '适合拆成系列内容持续发布，覆盖搜索、收藏和种草场景。')
  };
}

function normalizeObject(value, fallback) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    title: asText(source.title, fallback.title),
    subtitle: asText(source.subtitle, fallback.subtitle),
    summary: asText(source.summary, fallback.summary),
    aliases: normalizeStringList(source.aliases, 3, fallback.aliases),
    suitableFor: normalizeStringList(source.suitableFor, 3, fallback.suitableFor),
    notSuitableFor: normalizeStringList(source.notSuitableFor, 2, fallback.notSuitableFor),
    personality: normalizeStringList(source.personality, 5, fallback.personality),
    riskNotes: normalizeStringList(source.riskNotes, 3, fallback.riskNotes)
  };
}

function normalizeTimelineItem(item, fallback) {
  return {
    label: asText(item?.label, fallback.label),
    period: asText(item?.period, fallback.period),
    text: asText(item?.text, fallback.text)
  };
}

function normalizeMediaItem(item, fallback) {
  return {
    title: asText(item?.title, fallback.title),
    type: asText(item?.type, fallback.type),
    reason: asText(item?.reason, fallback.reason),
    noteAngle: asText(item?.noteAngle, fallback.noteAngle)
  };
}

function normalizeHighlightItem(item, fallback) {
  return {
    label: asText(item?.label, fallback.label),
    text: asText(item?.text, fallback.text)
  };
}

function normalizeList(value, size, fallback, mapper) {
  const items = Array.isArray(value) ? value : [];
  return Array.from({ length: size }, (_, index) => mapper(items[index], fallback[index] || fallback[0]));
}

function normalizeStringList(value, size, fallback) {
  const items = Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim()).map(cleanText)
    : [];
  return [...items, ...fallback.map(cleanText)].filter(Boolean).slice(0, size);
}

function normalizeContentTypes(value) {
  const fallback = ['storyline', 'careGuide', 'shoppingGuide', 'habitat', 'mediaRecommendations', 'xiaohongshuCopy'];
  if (!Array.isArray(value) || value.length === 0) {
    return fallback;
  }
  const allowed = new Set(fallback);
  return value.map((item) => String(item).trim()).filter((item) => allowed.has(item));
}

function asText(value, fallback) {
  return cleanText(typeof value === 'string' && value.trim() ? value : fallback);
}

function cleanText(value) {
  return String(value || '')
    .replace(/\s*\[[\d,\s-]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
