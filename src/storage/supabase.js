import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_BUCKET = 'takpet-posters';
const DEFAULT_PREFIX = 'posters';
const ALLOWED_MIME_TYPES = [
  'application/json',
  'application/json; charset=utf-8',
  'text/html',
  'text/html; charset=utf-8',
  'image/png',
  'text/plain',
  'text/plain; charset=utf-8',
  'text/markdown',
  'text/markdown; charset=utf-8'
];

export function isSupabaseStorageEnabled(env = process.env) {
  return Boolean(env.SUPABASE_URL && getSupabaseServerKey(env) && env.SUPABASE_STORAGE_BUCKET);
}

export function createSupabaseStorageClient(env = process.env) {
  const key = getSupabaseServerKey(env);
  if (!env.SUPABASE_URL || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Supabase Storage');
  }
  return createClient(env.SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function persistOutputToSupabase(output, options = {}) {
  const env = options.env || process.env;
  if (!isSupabaseStorageEnabled(env)) {
    return null;
  }

  const client = options.client || createSupabaseStorageClient(env);
  const bucket = env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
  const prefix = trimSlashes(env.SUPABASE_STORAGE_PREFIX || DEFAULT_PREFIX);
  const publicBucket = String(env.SUPABASE_STORAGE_PUBLIC || 'true').toLowerCase() !== 'false';
  const runId = options.runId || createRunId(output.slug);
  const basePath = [prefix, runId].filter(Boolean).join('/');

  await ensureBucket(client, bucket, publicBucket, env);

  const files = [
    { key: 'json', filePath: output.files.json, fileName: 'content.json', contentType: 'application/json; charset=utf-8' },
    { key: 'html', filePath: output.files.html, fileName: 'poster.html', contentType: 'text/html; charset=utf-8' },
    { key: 'png', filePath: output.files.png, fileName: 'poster.png', contentType: 'image/png' },
    { key: 'markdown', filePath: output.files.markdown, fileName: 'copy.md', contentType: 'text/markdown; charset=utf-8' }
  ].filter((file) => file.filePath);

  const uploaded = {};
  for (const file of files) {
    const objectPath = `${basePath}/${file.fileName}`;
    const body = await readFile(file.filePath);
    const { error } = await client.storage.from(bucket).upload(objectPath, body, {
      contentType: file.contentType,
      upsert: true
    });
    if (error) {
      throw new Error(`Supabase upload failed for ${file.fileName}: ${error.message}`);
    }
    uploaded[file.key] = await buildFileUrl(client, bucket, objectPath, file.fileName, publicBucket, env);
  }

  return {
    bucket,
    path: basePath,
    public: publicBucket,
    files: uploaded
  };
}

async function ensureBucket(client, bucket, publicBucket, env) {
  if (String(env.SUPABASE_STORAGE_ENSURE_BUCKET || 'true').toLowerCase() === 'false') {
    return;
  }

  const bucketOptions = {
    public: publicBucket,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    fileSizeLimit: '10MB'
  };
  const { error } = await client.storage.createBucket(bucket, bucketOptions);

  if (!error) {
    return;
  }
  if (!isBucketAlreadyExistsError(error)) {
    throw new Error(`Supabase bucket setup failed: ${error.message}`);
  }
  if (typeof client.storage.updateBucket === 'function') {
    const { error: updateError } = await client.storage.updateBucket(bucket, bucketOptions);
    if (updateError) {
      throw new Error(`Supabase bucket update failed: ${updateError.message}`);
    }
  }
}

export async function downloadSupabaseObject(objectPath, options = {}) {
  const env = options.env || process.env;
  const client = options.client || createSupabaseStorageClient(env);
  const bucket = env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
  const { data, error } = await client.storage.from(bucket).download(objectPath);
  if (error) {
    throw new Error(`Supabase download failed for ${objectPath}: ${error.message}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function buildFileUrl(client, bucket, objectPath, fileName, publicBucket, env) {
  if (publicBucket) {
    const { data } = client.storage.from(bucket).getPublicUrl(objectPath);
    return {
      path: objectPath,
      url: data.publicUrl,
      downloadUrl: `${data.publicUrl}?download=${encodeURIComponent(fileName)}`
    };
  }

  const expiresIn = Number(env.SUPABASE_SIGNED_URL_EXPIRES || 60 * 60 * 24 * 365);
  const { data, error } = await client.storage.from(bucket).createSignedUrl(objectPath, expiresIn, {
    download: fileName
  });
  if (error) {
    throw new Error(`Supabase signed URL failed for ${fileName}: ${error.message}`);
  }
  return {
    path: objectPath,
    url: data.signedUrl,
    downloadUrl: data.signedUrl,
    expiresIn
  };
}

function getSupabaseServerKey(env) {
  return env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
}

function createRunId(slug) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `${safeObjectSegment(slug || 'pet')}-${timestamp}`;
}

function safeObjectSegment(value) {
  const original = String(value || 'pet');
  const ascii = original
    .trim()
    .normalize('NFKC')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (ascii) {
    return ascii;
  }
  return `pet-${createHash('sha1').update(original).digest('hex').slice(0, 8)}`;
}

function trimSlashes(value) {
  return String(value || '').replace(/^\/+|\/+$/g, '');
}

function isBucketAlreadyExistsError(error) {
  const message = String(error.message || '').toLowerCase();
  const status = String(error.statusCode || error.status || '');
  return status === '409' || message.includes('already exists') || message.includes('already exist');
}
