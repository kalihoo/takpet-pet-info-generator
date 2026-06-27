import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

import { generateBreedImage } from '../content/image.js';
import { renderPosterHtml } from './poster.js';

export async function exportPoster(content, options = {}) {
  const outputRoot = options.outputRoot || path.resolve('outputs');
  const slug = options.slug || createSlug(content.breed);
  const outputDir = path.join(outputRoot, slug);

  await mkdir(outputDir, { recursive: true });
  const logoPath = await copyLogoAsset(outputDir);
  let breedImage = null;
  try {
    breedImage = await generateBreedImage({ breed: content.breed, outputDir });
  } catch (error) {
    content.imageGenerationError = error.message;
  }

  const html = renderPosterHtml(content, {
    logoPath,
    breedImagePath: breedImage?.relativePath || null
  });
  const htmlPath = path.join(outputDir, 'poster.html');
  await writeFile(path.join(outputDir, 'content.json'), `${JSON.stringify(content, null, 2)}\n`, 'utf8');
  await writeFile(htmlPath, html, 'utf8');
  await writeScreenshot(path.join(outputDir, 'poster.png'), htmlPath);

  return {
    slug,
    dir: outputDir,
    files: {
      json: path.join(outputDir, 'content.json'),
      html: path.join(outputDir, 'poster.html'),
      png: path.join(outputDir, 'poster.png')
    }
  };
}

export function createSlug(value) {
  const normalized = String(value || 'pet')
    .trim()
    .normalize('NFKC')
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || 'pet';
}

async function copyLogoAsset(outputDir) {
  const assetsDir = path.join(outputDir, 'assets');
  await mkdir(assetsDir, { recursive: true });
  const target = path.join(assetsDir, 'logo.png');
  await copyFile(path.resolve('assets/logo.png'), target);
  return 'assets/logo.png';
}

async function writeScreenshot(target, htmlPath) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1440 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
    await page.screenshot({ path: target, type: 'png', fullPage: false });
  } finally {
    await browser.close();
  }
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    if (!String(error.message).includes("Executable doesn't exist")) {
      throw error;
    }
    return chromium.launch({ channel: 'chrome', headless: true });
  }
}
