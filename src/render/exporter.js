import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

import { generateBreedImage } from '../content/image.js';
import { renderCopyMarkdown } from './markdown.js';
import { renderPosterHtml } from './poster.js';

let serverlessExecutablePathPromise = null;

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
  const markdownPath = path.join(outputDir, 'copy.md');
  await writeFile(path.join(outputDir, 'content.json'), `${JSON.stringify(content, null, 2)}\n`, 'utf8');
  await writeFile(htmlPath, html, 'utf8');
  await writeFile(markdownPath, renderCopyMarkdown(content), 'utf8');
  await writeScreenshot(path.join(outputDir, 'poster.png'), htmlPath);

  return {
    slug,
    dir: outputDir,
    files: {
      json: path.join(outputDir, 'content.json'),
      html: path.join(outputDir, 'poster.html'),
      png: path.join(outputDir, 'poster.png'),
      markdown: markdownPath
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
    await page.evaluate(() => document.fonts.ready.then(() => true));
    await page.screenshot({ path: target, type: 'png', fullPage: false });
  } finally {
    await browser.close();
  }
}

async function launchBrowser() {
  if (process.env.VERCEL) {
    const serverlessChromium = (await import('@sparticuz/chromium')).default;
    return launchChromiumWithRetries({
      args: serverlessChromium.args,
      executablePath: await getServerlessExecutablePath(serverlessChromium),
      headless: true
    });
  }

  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    if (!String(error.message).includes("Executable doesn't exist")) {
      throw error;
    }
    return chromium.launch({ channel: 'chrome', headless: true });
  }
}

function getServerlessExecutablePath(serverlessChromium) {
  serverlessExecutablePathPromise ||= serverlessChromium.executablePath();
  return serverlessExecutablePathPromise;
}

async function launchChromiumWithRetries(options) {
  const attempts = 3;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await chromium.launch(options);
    } catch (error) {
      if (index === attempts - 1 || !isRetryableBrowserLaunchError(error)) {
        throw error;
      }
      await delay(600 * (index + 1));
    }
  }
  throw new Error('Chromium launch failed');
}

function isRetryableBrowserLaunchError(error) {
  const message = String(error?.message || error);
  return message.includes('ETXTBSY') || message.includes('EBUSY');
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
