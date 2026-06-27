import test from 'node:test';
import assert from 'node:assert/strict';

import { chooseTextProvider, chooseImageProvider, isPaidApiEnabled } from '../src/config/providers.js';

test('free-first text provider prefers Gemini when a Gemini key is available', () => {
  const provider = chooseTextProvider({
    AI_PROVIDER: 'free-first',
    GEMINI_API_KEY: 'gemini-test',
    OPENAI_API_KEY: 'openai-test',
    PAID_API_ENABLED: 'false'
  });

  assert.equal(provider, 'gemini');
});

test('paid OpenAI provider is disabled unless PAID_API_ENABLED is true', () => {
  assert.equal(isPaidApiEnabled({ PAID_API_ENABLED: 'false' }), false);
  assert.equal(chooseTextProvider({
    AI_PROVIDER: 'openai',
    OPENAI_API_KEY: 'openai-test',
    PAID_API_ENABLED: 'false'
  }), 'local');
});

test('image provider is disabled unless paid API usage is explicitly enabled', () => {
  assert.equal(chooseImageProvider({
    IMAGE_PROVIDER: 'free-first',
    GEMINI_API_KEY: 'gemini-test',
    OPENAI_API_KEY: 'openai-test',
    PAID_API_ENABLED: 'false'
  }), 'none');

  assert.equal(chooseImageProvider({
    IMAGE_PROVIDER: 'openai',
    OPENAI_API_KEY: 'openai-test',
    PAID_API_ENABLED: 'false'
  }), 'none');

  assert.equal(chooseImageProvider({
    IMAGE_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'gemini-test',
    PAID_API_ENABLED: 'true'
  }), 'gemini');
});
