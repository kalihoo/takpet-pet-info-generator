import './config/env.js';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getDefaultOutputRoot } from './config/runtime.js';
import { generatePetContent } from './content/generator.js';
import { exportPoster } from './render/exporter.js';
import { persistOutputToSupabase } from './storage/supabase.js';

export function createApp(options = {}) {
  const app = express();
  const outputRoot = options.outputRoot || getDefaultOutputRoot();

  app.use(express.json({ limit: '1mb' }));
  app.use('/assets', express.static(path.resolve('assets')));
  app.use('/outputs', express.static(outputRoot));

  app.get('/', (_request, response) => {
    response.type('html').send(renderHomePage());
  });

  app.post('/api/generate', async (request, response) => {
    try {
      const content = await generatePetContent({
        name: request.body?.name,
        breed: request.body?.breed,
        species: request.body?.species || 'dog',
        contentTypes: request.body?.contentTypes
      });
      const output = await exportPoster(content, { outputRoot });
      const storage = await persistOutputToSupabase(output);
      const urls = buildOutputUrls(output, storage);
      response.json({
        content,
        contentPack: content.contentPack,
        output: {
          slug: output.slug,
          dir: output.dir,
          files: output.files,
          urls,
          storage
        }
      });
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });

  return app;
}

function buildOutputUrls(output, storage) {
  if (storage?.files) {
    return {
      html: storage.files.html?.url,
      png: storage.files.png?.url,
      json: storage.files.json?.url,
      markdown: storage.files.markdown?.url,
      downloads: {
        html: storage.files.html?.downloadUrl,
        png: storage.files.png?.downloadUrl,
        json: storage.files.json?.downloadUrl,
        markdown: storage.files.markdown?.downloadUrl
      }
    };
  }
  return {
    html: `/outputs/${encodeURIComponent(output.slug)}/poster.html`,
    png: `/outputs/${encodeURIComponent(output.slug)}/poster.png`,
    json: `/outputs/${encodeURIComponent(output.slug)}/content.json`,
    markdown: `/outputs/${encodeURIComponent(output.slug)}/copy.md`
  };
}

function renderHomePage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TakPet 内容包工作台</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
      color: #17211c;
      background:
        linear-gradient(135deg, rgba(121, 169, 92, 0.18), transparent 34%),
        linear-gradient(225deg, rgba(239, 138, 62, 0.16), transparent 28%),
        #f5f4ed;
    }
    main { max-width: 1180px; margin: 0 auto; padding: 34px 24px; }
    h1 { margin: 0; font-size: 38px; letter-spacing: 0; color: #145226; }
    .subhead { margin: 8px 0 22px; color: #536158; font-size: 17px; font-weight: 700; }
    .workbench { display: grid; grid-template-columns: 380px 1fr; gap: 18px; align-items: start; }
    form {
      display: grid;
      gap: 14px;
      background: #fffdf7;
      border: 1px solid #dfe7dc;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 12px 32px rgba(20, 82, 38, 0.08);
    }
    label { display: grid; gap: 6px; color: #253129; font-size: 14px; font-weight: 900; }
    input, select, button {
      min-height: 48px;
      border-radius: 8px;
      border: 1px solid #c8d5cc;
      font-size: 16px;
      padding: 0 16px;
      background: #fff;
    }
    button { border-color: #2d5b45; background: #2d5b45; color: #fff; cursor: pointer; font-weight: 800; }
    fieldset { margin: 0; border: 1px solid #dfe7dc; border-radius: 8px; padding: 12px; }
    legend { padding: 0 6px; color: #536158; font-size: 14px; font-weight: 900; }
    .checks { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .checks label { display: flex; align-items: center; gap: 8px; min-height: 34px; font-size: 14px; font-weight: 800; }
    .checks input { min-height: auto; width: 16px; height: 16px; padding: 0; }
    .result { background: #fff; border-radius: 8px; border: 1px solid #dce6df; min-height: 560px; overflow: hidden; }
    .status { padding: 20px; color: #536158; font-weight: 800; }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding: 16px 18px;
      background: #eef4ea;
      border-bottom: 1px solid #dce6df;
    }
    a { color: #2d5b45; font-weight: 900; }
    .links a {
      border: 1px solid #b9cdb8;
      border-radius: 999px;
      padding: 8px 12px;
      background: #fffdf7;
      text-decoration: none;
    }
    .copy-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 18px; }
    .panel { border: 1px solid #e5e2d7; border-radius: 8px; padding: 14px; background: #fffdf7; min-width: 0; }
    .panel h2 { margin: 0 0 10px; color: #145226; font-size: 20px; }
    .panel pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      color: #243029;
      font-size: 14px;
      line-height: 1.45;
      font-family: inherit;
    }
    @media (max-width: 860px) { .workbench, .copy-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <h1>TakPet 小红书内容包工厂</h1>
    <p class="subhead">输入犬、猫或异宠名称，生成故事线、避坑、用品、栖息地、片单和发布文案。</p>
    <section class="workbench">
      <form id="generate-form">
        <label>宠物名称
          <input name="name" placeholder="例如：西高地白梗、英短、豹纹守宫" required>
        </label>
        <label>物种类型
          <select name="species">
            <option value="dog">犬</option>
            <option value="cat">猫</option>
            <option value="exotic">异宠</option>
          </select>
        </label>
        <label>内容风格
          <select name="style">
            <option value="search">搜索收藏型</option>
            <option value="story">故事科普型</option>
            <option value="shopping">种草清单型</option>
          </select>
        </label>
        <fieldset>
          <legend>生成栏目</legend>
          <div class="checks">
            <label><input type="checkbox" name="contentTypes" value="storyline" checked>故事线</label>
            <label><input type="checkbox" name="contentTypes" value="careGuide" checked>新手避坑</label>
            <label><input type="checkbox" name="contentTypes" value="shoppingGuide" checked>用品推荐</label>
            <label><input type="checkbox" name="contentTypes" value="habitat" checked>环境/栖息地</label>
            <label><input type="checkbox" name="contentTypes" value="mediaRecommendations" checked>片单灵感</label>
            <label><input type="checkbox" name="contentTypes" value="xiaohongshuCopy" checked>发布文案</label>
          </div>
        </fieldset>
        <button type="submit">生成内容包</button>
      </form>
      <div id="result" class="result"><div class="status">等待生成...</div></div>
    </section>
  </main>
  <script>
    const form = document.querySelector('#generate-form');
    const result = document.querySelector('#result');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      result.innerHTML = '<div class="status">生成中，正在整理小红书内容包...</div>';
      const formData = new FormData(form);
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          breed: formData.get('name'),
          species: formData.get('species'),
          style: formData.get('style'),
          contentTypes: formData.getAll('contentTypes')
        })
      });
      const data = await response.json();
      if (!response.ok) {
        result.innerHTML = '<div class="status">' + escapeHtml(data.error || '生成失败') + '</div>';
        return;
      }
      const pack = data.contentPack;
      result.innerHTML =
        '<div class="links">'
        + link('海报 PNG', data.output.urls.png)
        + link('HTML', data.output.urls.html)
        + link('JSON', data.output.urls.json)
        + link('Markdown', data.output.urls.markdown)
        + '</div>'
        + '<div class="copy-grid">'
        + panel('标题备选', pack.xiaohongshuCopy.titles.slice(0, 6).join('\\n'))
        + panel('正文版本', pack.xiaohongshuCopy.bodies.join('\\n\\n'))
        + panel('话题标签', pack.xiaohongshuCopy.hashtags.join(' '))
        + panel('栏目摘要', JSON.stringify({
            profile: pack.profile.summary,
            shopping: pack.shoppingGuide.mustHave,
            habitat: pack.habitat.setup,
            media: pack.mediaRecommendations.map((item) => item.title)
          }, null, 2))
        + '</div>';
    });
    function link(label, url) {
      return url ? '<a href="' + url + '" target="_blank">' + label + '</a>' : '';
    }
    function panel(title, text) {
      return '<section class="panel"><h2>' + escapeHtml(title) + '</h2><pre>' + escapeHtml(text || '') + '</pre></section>';
    }
    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }
  </script>
</body>
</html>`;
}

const app = createApp();

export default app;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`TakPet generator listening on http://0.0.0.0:${port}`);
  });
}
