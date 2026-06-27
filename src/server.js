import './config/env.js';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generatePetContent } from './content/generator.js';
import { exportPoster } from './render/exporter.js';

export function createApp(options = {}) {
  const app = express();
  const outputRoot = options.outputRoot || path.resolve('outputs');

  app.use(express.json({ limit: '1mb' }));
  app.use('/assets', express.static(path.resolve('assets')));
  app.use('/outputs', express.static(outputRoot));

  app.get('/', (_request, response) => {
    response.type('html').send(renderHomePage());
  });

  app.post('/api/generate', async (request, response) => {
    try {
      const content = await generatePetContent({
        breed: request.body?.breed,
        species: request.body?.species || 'dog'
      });
      const output = await exportPoster(content, { outputRoot });
      response.json({
        content,
        output: {
          slug: output.slug,
          dir: output.dir,
          files: output.files,
          urls: {
            html: `/outputs/${encodeURIComponent(output.slug)}/poster.html`,
            png: `/outputs/${encodeURIComponent(output.slug)}/poster.png`,
            json: `/outputs/${encodeURIComponent(output.slug)}/content.json`
          }
        }
      });
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });

  return app;
}

function renderHomePage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TakPet 宠物信息生成器</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
      color: #17211c;
      background: #f2f5f0;
    }
    main {
      max-width: 920px;
      margin: 0 auto;
      padding: 48px 28px;
    }
    h1 { margin: 0 0 24px; font-size: 38px; letter-spacing: 0; }
    form {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      margin-bottom: 24px;
    }
    input, button {
      min-height: 48px;
      border-radius: 8px;
      border: 1px solid #c8d5cc;
      font-size: 18px;
      padding: 0 16px;
    }
    button {
      border-color: #2d5b45;
      background: #2d5b45;
      color: #fff;
      cursor: pointer;
      font-weight: 800;
    }
    pre {
      min-height: 180px;
      white-space: pre-wrap;
      word-break: break-word;
      background: #fff;
      border-radius: 8px;
      padding: 18px;
      border: 1px solid #dce6df;
    }
    a { color: #2d5b45; font-weight: 800; }
  </style>
</head>
<body>
  <main>
    <h1>TakPet 宠物信息自动化生成</h1>
    <form id="generate-form">
      <input name="breed" placeholder="输入犬种，例如：西高地白梗" required>
      <button type="submit">生成</button>
    </form>
    <pre id="result">等待生成...</pre>
  </main>
  <script>
    const form = document.querySelector('#generate-form');
    const result = document.querySelector('#result');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      result.textContent = '生成中...';
      const breed = new FormData(form).get('breed');
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ breed, species: 'dog' })
      });
      const data = await response.json();
      if (!response.ok) {
        result.textContent = data.error || '生成失败';
        return;
      }
      result.innerHTML = '已生成：\\n'
        + '<a href="' + data.output.urls.png + '" target="_blank">poster.png</a>\\n'
        + '<a href="' + data.output.urls.html + '" target="_blank">poster.html</a>\\n'
        + '<a href="' + data.output.urls.json + '" target="_blank">content.json</a>\\n\\n'
        + JSON.stringify(data.content, null, 2);
    });
  </script>
</body>
</html>`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, () => {
    console.log(`TakPet generator listening on http://0.0.0.0:${port}`);
  });
}
