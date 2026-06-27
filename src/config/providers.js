export function isPaidApiEnabled(env = process.env) {
  return String(env.PAID_API_ENABLED || '').toLowerCase() === 'true';
}

export function chooseTextProvider(env = process.env) {
  if (env.TAKPET_FORCE_LOCAL === '1') return 'local';
  const provider = String(env.AI_PROVIDER || env.TEXT_PROVIDER || 'free-first').toLowerCase();

  if ((provider === 'free-first' || provider === 'gemini') && env.GEMINI_API_KEY) {
    return 'gemini';
  }
  if ((provider === 'openai' || provider === 'free-first') && env.OPENAI_API_KEY && isPaidApiEnabled(env)) {
    return 'openai';
  }
  return 'local';
}

export function chooseImageProvider(env = process.env) {
  if (env.TAKPET_FORCE_LOCAL === '1') return 'none';
  const provider = String(env.IMAGE_PROVIDER || 'free-first').toLowerCase();

  if ((provider === 'free-first' || provider === 'none') && !isPaidApiEnabled(env)) {
    return 'none';
  }
  if ((provider === 'free-first' || provider === 'gemini') && env.GEMINI_API_KEY && isPaidApiEnabled(env)) {
    return 'gemini';
  }
  if ((provider === 'openai' || provider === 'free-first') && env.OPENAI_API_KEY && isPaidApiEnabled(env)) {
    return 'openai';
  }
  return 'none';
}
