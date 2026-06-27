export function renderCopyMarkdown(content) {
  const pack = content.contentPack || content;
  const copy = pack.xiaohongshuCopy || {};
  const lines = [
    `# ${pack.name || content.breed} 小红书内容包`,
    '',
    '## 标题备选',
    ...asList(copy.titles),
    '',
    '## 正文版本',
    ...asNumbered(copy.bodies),
    '',
    '## 话题标签',
    (copy.hashtags || []).join(' '),
    '',
    '## 评论区引导',
    copy.commentPrompt || '',
    '',
    '## 故事线',
    ...asList((pack.storyline || []).map((item) => `${item.label}：${item.text}`)),
    '',
    '## 用品推荐',
    ...asList(pack.shoppingGuide?.mustHave || []),
    '',
    '## 环境/栖息地',
    ...asList(pack.habitat?.setup || []),
    '',
    '## 影视/片单灵感',
    ...asList((pack.mediaRecommendations || []).map((item) => `${item.title}｜${item.noteAngle}`)),
    '',
    '## 免责声明',
    pack.disclaimer || content.disclaimer || ''
  ];
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function asList(items = []) {
  return items.map((item) => `- ${item}`);
}

function asNumbered(items = []) {
  return items.map((item, index) => `${index + 1}. ${item}`);
}
