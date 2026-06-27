export function renderPosterHtml(content, options = {}) {
  const safe = normalizeContent(content);
  const logoPath = options.logoPath || 'assets/logo.png';
  const breedImagePath = options.breedImagePath || null;
  const heroImage = breedImagePath
    ? `<img class="hero-photo" src="${escapeHtml(breedImagePath)}" alt="${escapeHtml(safe.breed)}">`
    : `<div class="hero-photo photo-placeholder"><strong>${escapeHtml(safe.breed)}</strong><span>犬种图片待生成</span></div>`;
  const featureImage = breedImagePath
    ? `<div class="feature-photo"><img src="${escapeHtml(breedImagePath)}" alt="${escapeHtml(safe.breed)}"></div>`
    : `<div class="feature-photo photo-placeholder"><strong>${escapeHtml(safe.breed)}</strong><span>可接入 Gemini / 图库素材</span></div>`;
  const timelineImage = breedImagePath
    ? `<img src="${escapeHtml(breedImagePath)}" alt="">`
    : `<span>${escapeHtml(safe.breed)}</span>`;
  const timeline = safe.timeline.map((item, index) => `
    <article class="timeline-card">
      <div class="timeline-index">${index + 1}</div>
      <h3>${escapeHtml(item.label)}</h3>
      <strong>${escapeHtml(item.period)}</strong>
      <p>${escapeHtml(item.text)}</p>
      <div class="timeline-photo${breedImagePath ? '' : ' photo-placeholder'}">${timelineImage}</div>
    </article>
  `).join('');
  const keyPoints = safe.keyPoints.map((item) => `<li><span>${escapeHtml(item)}</span></li>`).join('');
  const featureCards = safe.featureCards.slice(0, 3).map((item) => `
    <div class="feature-row">
      <div class="feature-icon">${escapeHtml(item.label.slice(0, 1))}</div>
      <div><h3>${escapeHtml(item.label)}</h3><p>${escapeHtml(item.text)}</p></div>
    </div>
  `).join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1080, initial-scale=1">
  <title>${escapeHtml(safe.title)} - TakPet</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: #f2f4ee;
      font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif;
      color: #17211c;
    }
    .poster {
      width: 1080px;
      height: 1440px;
      overflow: hidden;
      background: #fffef8;
      padding: 34px 34px 28px;
      display: grid;
      grid-template-rows: 368px 46px 408px 88px 270px 48px;
      gap: 12px;
    }
    .hero {
      display: grid;
      grid-template-columns: 150px 1fr 330px;
      gap: 28px;
      align-items: start;
    }
    .brand-logo {
      display: grid;
      justify-items: center;
      gap: 8px;
      color: #7b3f20;
      font-size: 24px;
      font-weight: 900;
      line-height: 1.1;
    }
    .brand-logo img {
      width: 112px;
      height: 112px;
      object-fit: contain;
      display: block;
    }
    .title-block h1 {
      margin: 0;
      color: #145226;
      font-size: 58px;
      line-height: 1.02;
      letter-spacing: 0;
      font-weight: 950;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .title-block h2 {
      margin: 12px 0 16px;
      color: #181e1a;
      font-size: 24px;
      line-height: 1.28;
      font-weight: 850;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .summary {
      display: grid;
      grid-template-columns: 42px 1fr;
      gap: 18px;
      color: #171c18;
      font-size: 18px;
      line-height: 1.36;
      font-weight: 650;
    }
    .summary p {
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .paw {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #79a95c;
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 24px;
      font-weight: 900;
    }
    .hero-photo {
      width: 330px;
      height: 280px;
      object-fit: contain;
      object-position: center bottom;
      display: grid;
      place-items: center;
    }
    .photo-placeholder {
      border: 1px solid #d8e2d3;
      background:
        linear-gradient(135deg, rgba(15, 108, 53, 0.08), rgba(246, 246, 238, 0.9)),
        #eef4ec;
      color: #145226;
      text-align: center;
      align-content: center;
      gap: 8px;
      padding: 16px;
    }
    .photo-placeholder strong {
      display: block;
      font-size: 30px;
      line-height: 1.1;
      font-weight: 950;
    }
    .photo-placeholder span {
      display: block;
      color: #637268;
      font-size: 16px;
      line-height: 1.25;
      font-weight: 800;
    }
    .section-rule {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 16px;
      align-items: center;
      color: #145226;
      font-size: 28px;
      font-weight: 950;
    }
    .section-rule::before,
    .section-rule::after {
      content: "";
      height: 2px;
      background: #dce4d8;
    }
    .timeline-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }
    .timeline-card {
      position: relative;
      min-width: 0;
      background: #fbf7ed;
      border: 1px solid #ece5d5;
      border-radius: 8px;
      padding: 20px 14px 12px;
      box-shadow: 0 6px 18px rgba(20, 82, 38, 0.08);
    }
    .timeline-index {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #0f6c35;
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 21px;
      font-weight: 950;
      margin-bottom: 8px;
    }
    .timeline-card h3 {
      margin: 0 0 8px;
      color: #141a16;
      font-size: 21px;
      line-height: 1.18;
      font-weight: 950;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .timeline-card strong {
      display: block;
      margin-bottom: 10px;
      color: #1d2a20;
      font-size: 17px;
      line-height: 1.2;
      font-weight: 850;
    }
    .timeline-card p {
      height: 126px;
      margin: 0 0 10px;
      color: #252b27;
      font-size: 16px;
      line-height: 1.45;
      font-weight: 650;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 5;
      -webkit-box-orient: vertical;
    }
    .timeline-photo {
      width: 100%;
      height: 112px;
      border-radius: 8px;
      overflow: hidden;
      background: #e9efe7;
    }
    .timeline-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .timeline-photo.photo-placeholder span {
      font-size: 18px;
      color: #145226;
      font-weight: 950;
    }
    .key-points {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      align-items: center;
    }
    .key-points li {
      display: grid;
      grid-template-columns: 42px 1fr;
      gap: 10px;
      align-items: center;
      color: #1b241e;
      font-size: 17px;
      line-height: 1.25;
      font-weight: 850;
    }
    .key-points li span {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .key-points li::before {
      content: "•";
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #0f6c35;
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 26px;
    }
    .bottom-grid {
      display: grid;
      grid-template-columns: 290px 1fr 360px;
      gap: 18px;
      min-height: 0;
      overflow: hidden;
    }
    .feature-photo {
      border-radius: 8px;
      overflow: hidden;
      background: #e8efe4;
    }
    .feature-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .feature-list {
      display: grid;
      gap: 10px;
      align-content: start;
      overflow: hidden;
    }
    .feature-row {
      display: grid;
      grid-template-columns: 46px 1fr;
      gap: 10px;
      align-items: start;
    }
    .feature-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #6e9f4c;
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 18px;
      font-weight: 950;
    }
    .feature-row h3 {
      margin: 0 0 3px;
      font-size: 20px;
      color: #111813;
      font-weight: 950;
    }
    .feature-row p {
      margin: 0;
      font-size: 15px;
      line-height: 1.3;
      color: #26312a;
      font-weight: 650;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .info-boxes {
      display: grid;
      gap: 14px;
      overflow: hidden;
    }
    .info-box {
      border: 1px solid #e0dfd2;
      background: #fbfaf1;
      border-radius: 8px;
      padding: 16px 20px;
      min-height: 0;
    }
    .info-box h3 {
      margin: 0 0 10px;
      color: #145226;
      font-size: 23px;
      font-weight: 950;
    }
    .info-box p {
      margin: 0;
      font-size: 16px;
      line-height: 1.38;
      color: #1f2822;
      font-weight: 650;
      display: -webkit-box;
      -webkit-line-clamp: 6;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .footer {
      background: #0f4c26;
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 22px;
      font-weight: 900;
      border-radius: 0 0 8px 8px;
    }
  </style>
</head>
<body>
  <main class="poster">
    <section class="hero">
      <div class="brand-logo">
        <img src="${escapeHtml(logoPath)}" alt="TakPet logo">
        <span>TakPet科普</span>
      </div>
      <div class="title-block">
        <h1>${escapeHtml(safe.title)}</h1>
        <h2>${escapeHtml(safe.subtitle)}</h2>
        <div class="summary"><div class="paw">爪</div><p>${escapeHtml(safe.summary)}</p></div>
      </div>
      ${heroImage}
    </section>

    <div class="section-rule">演化时间线</div>
    <section class="timeline-grid">${timeline}</section>
    <ul class="key-points">${keyPoints}</ul>

    <section class="bottom-grid">
      ${featureImage}
      <div class="feature-list">${featureCards}</div>
      <div class="info-boxes">
        <div class="info-box"><h3>小知识</h3><p>${escapeHtml(safe.fact)}</p></div>
        <div class="info-box"><h3>别名</h3><p>${escapeHtml(safe.aliases.join(' | '))}</p></div>
      </div>
    </section>

    <footer class="footer">TakPet科普 | 科学养宠 · 快乐陪伴</footer>
  </main>
</body>
</html>`;
}

function normalizeContent(content) {
  return {
    breed: content.breed || '犬种',
    title: content.title || `${content.breed || '犬种'}的演化史`,
    subtitle: content.subtitle || '从工作伙伴到家庭伴侣的百年历程',
    summary: content.summary || `${content.breed || '犬种'}的历史是一段从实用工作犬走向现代家庭伴侣的演变过程。`,
    timeline: content.timeline || [],
    keyPoints: content.keyPoints || [],
    featureCards: content.featureCards || [],
    fact: content.fact || '这个犬种的品种故事适合用时间线方式做科普表达。',
    aliases: content.aliases || [content.breed || '犬种'],
    disclaimer: content.disclaimer || '内容仅作宠物科普参考。'
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
