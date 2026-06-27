import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { getDefaultOutputRoot } from '../src/config/runtime.js';
import { isSupabaseStorageEnabled, persistOutputToSupabase } from '../src/storage/supabase.js';

test('getDefaultOutputRoot uses /tmp on Vercel and local outputs otherwise', () => {
  assert.match(getDefaultOutputRoot({ VERCEL: '1' }), /takpet-outputs$/);
  assert.match(getDefaultOutputRoot({}), /outputs$/);
});

test('Supabase Storage is disabled until all required server env vars exist', () => {
  assert.equal(isSupabaseStorageEnabled({}), false);
  assert.equal(isSupabaseStorageEnabled({
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    SUPABASE_STORAGE_BUCKET: 'takpet-posters'
  }), true);
});

test('persistOutputToSupabase uploads JSON, HTML, and PNG outputs', async () => {
  const outputRoot = await mkdtemp(path.join(tmpdir(), 'takpet-storage-'));
  const outputDir = path.join(outputRoot, 'westie');
  await writeFile(path.join(outputRoot, 'content.json'), '{"ok":true}', 'utf8');
  await writeFile(path.join(outputRoot, 'poster.html'), '<html></html>', 'utf8');
  await writeFile(path.join(outputRoot, 'poster.png'), 'png', 'utf8');

  const uploads = [];
  const client = {
    storage: {
      async createBucket(bucket, options) {
        assert.equal(bucket, 'takpet-posters');
        assert.equal(options.public, true);
        return { data: { name: bucket }, error: null };
      },
      from(bucket) {
        return {
          async upload(objectPath, body, options) {
            uploads.push({ bucket, objectPath, body: body.toString(), contentType: options.contentType });
            return { data: { path: objectPath }, error: null };
          },
          getPublicUrl(objectPath) {
            return { data: { publicUrl: `https://cdn.example/${bucket}/${objectPath}` } };
          }
        };
      }
    }
  };

  const result = await persistOutputToSupabase({
    slug: 'westie',
    dir: outputDir,
    files: {
      json: path.join(outputRoot, 'content.json'),
      html: path.join(outputRoot, 'poster.html'),
      png: path.join(outputRoot, 'poster.png')
    }
  }, {
    client,
    runId: 'westie-test',
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      SUPABASE_STORAGE_BUCKET: 'takpet-posters',
      SUPABASE_STORAGE_PUBLIC: 'true'
    }
  });

  assert.equal(result.bucket, 'takpet-posters');
  assert.equal(result.path, 'posters/westie-test');
  assert.equal(uploads.length, 3);
  assert.deepEqual(uploads.map((item) => item.objectPath), [
    'posters/westie-test/content.json',
    'posters/westie-test/poster.html',
    'posters/westie-test/poster.png'
  ]);
  assert.match(result.files.png.url, /poster\.png$/);
  assert.match(result.files.png.downloadUrl, /download=poster\.png$/);
  await rm(outputRoot, { recursive: true, force: true });
});
