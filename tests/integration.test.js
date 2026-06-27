import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { createApp } from '../src/server.js';

test('GET / serves a lightweight content workbench page', async () => {
  const app = createApp({ outputRoot: await mkdtemp(path.join(tmpdir(), 'takpet-web-')) });
  const server = app.listen(0);
  const port = server.address().port;

  const response = await fetch(`http://127.0.0.1:${port}/`);
  const html = await response.text();

  server.close();
  assert.equal(response.status, 200);
  assert.match(html, /TakPet/);
  assert.match(html, /name="name"/);
  assert.match(html, /name="species"/);
});

test('POST /api/generate creates content pack, html, png, json, and markdown outputs', async () => {
  const outputRoot = await mkdtemp(path.join(tmpdir(), 'takpet-api-'));
  const app = createApp({ outputRoot });
  const server = app.listen(0);
  const port = server.address().port;

  const response = await fetch(`http://127.0.0.1:${port}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ breed: '雪纳瑞', species: 'dog' })
  });
  const body = await response.json();

  server.close();
  assert.equal(response.status, 200);
  assert.equal(body.contentPack.name, '雪纳瑞');
  assert.equal(body.contentPack.species, 'dog');
  assert.equal(body.content.breed, '雪纳瑞');
  assert.equal(body.output.urls.markdown.includes('copy.md'), true);
  await access(path.join(outputRoot, body.output.slug, 'content.json'));
  await access(path.join(outputRoot, body.output.slug, 'poster.html'));
  await access(path.join(outputRoot, body.output.slug, 'poster.png'));
  await access(path.join(outputRoot, body.output.slug, 'copy.md'));
  await rm(outputRoot, { recursive: true, force: true });
});

test('POST /api/generate supports cat and exotic content packs', async () => {
  const outputRoot = await mkdtemp(path.join(tmpdir(), 'takpet-api-species-'));
  const app = createApp({ outputRoot });
  const server = app.listen(0);
  const port = server.address().port;

  const catResponse = await fetch(`http://127.0.0.1:${port}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: '英短', species: 'cat' })
  });
  const exoticResponse = await fetch(`http://127.0.0.1:${port}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: '豹纹守宫', species: 'exotic' })
  });

  const catBody = await catResponse.json();
  const exoticBody = await exoticResponse.json();
  server.close();

  assert.equal(catResponse.status, 200);
  assert.equal(catBody.contentPack.species, 'cat');
  assert.equal(exoticResponse.status, 200);
  assert.equal(exoticBody.contentPack.species, 'exotic');
  assert.match(exoticBody.contentPack.habitat.title, /栖息|环境|温湿度/);
  await rm(outputRoot, { recursive: true, force: true });
});

test('CLI generates JSON, HTML, PNG, and Markdown files for a named cat', async () => {
  const outputRoot = await mkdtemp(path.join(tmpdir(), 'takpet-cli-'));

  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, ['src/cli.js', '--name', '英短', '--species', 'cat', '--output', outputRoot], {
      cwd: process.cwd(),
      env: { ...process.env, OPENAI_API_KEY: '' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });

  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.contentPack.name, '英短');
  assert.equal(payload.contentPack.species, 'cat');
  await access(path.join(outputRoot, payload.output.slug, 'content.json'));
  await access(path.join(outputRoot, payload.output.slug, 'poster.html'));
  await access(path.join(outputRoot, payload.output.slug, 'poster.png'));
  await access(path.join(outputRoot, payload.output.slug, 'copy.md'));
  await rm(outputRoot, { recursive: true, force: true });
});
