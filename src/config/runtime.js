import { tmpdir } from 'node:os';
import path from 'node:path';

export function getDefaultOutputRoot(env = process.env) {
  if (env.TAKPET_OUTPUT_ROOT) {
    return path.resolve(env.TAKPET_OUTPUT_ROOT);
  }
  if (env.VERCEL) {
    return path.join(tmpdir(), 'takpet-outputs');
  }
  return path.resolve('outputs');
}
