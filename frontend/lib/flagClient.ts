import { initDemo } from '@/actions/auth';
import {
  listFlags as listFlagsAction,
  createFlag as createFlagAction,
  toggleFlag as toggleFlagAction,
  updateRollout as updateRolloutAction,
  evaluate as evaluateAction,
} from '@/actions/flags';

export interface Flag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
}

export interface EvalResult {
  enabled: boolean;
  reason: string;
}

let tokens: { jwt: string; sdkKey: string } | null = null;

async function ensureTokens() {
  if (!tokens) {
    tokens = await initDemo();
  }
  return tokens;
}

export const flagClient = {
  async listFlags(): Promise<Flag[]> {
    const { jwt } = await ensureTokens();
    return listFlagsAction(jwt);
  },

  async createFlag(name: string, description: string): Promise<Flag> {
    const { jwt } = await ensureTokens();
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const key = slug || `flag-${Date.now()}`;
    return createFlagAction(jwt, key, description);
  },

  async toggleFlag(key: string, enabled: boolean): Promise<Flag> {
    const { jwt } = await ensureTokens();
    return toggleFlagAction(jwt, key, enabled);
  },

  async updateRollout(key: string, percentage: number): Promise<Flag> {
    const { jwt } = await ensureTokens();
    return updateRolloutAction(jwt, key, Math.max(0, Math.min(100, percentage)));
  },

  async evaluate(key: string, contextKey: string): Promise<EvalResult> {
    const { sdkKey } = await ensureTokens();
    return evaluateAction(sdkKey, key, contextKey);
  },
};

export function generateUserId(index: number): string {
  return `user_${(index + 1).toString().padStart(3, '0')}`;
}

export async function getBucket(flagKey: string, contextKey: string): Promise<number> {
  const data = new TextEncoder().encode(flagKey + ':' + contextKey);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const view = new DataView(hash);
  const u32 = view.getUint32(0);
  return u32 % 100;
}
