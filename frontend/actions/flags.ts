'use server';

import { flags } from './client';

interface FlagProto {
  key: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
}

function toFlag(f: FlagProto) {
  return {
    key: f.key,
    name: f.key
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase()),
    description: f.description,
    enabled: f.enabled,
    rolloutPercentage: f.rolloutPercentage,
  };
}

export async function listFlags(jwt: string) {
  const client = flags();
  const res = await client.listFlags(jwt);
  return (res.flags as FlagProto[]).map(toFlag);
}

export async function createFlag(
  jwt: string,
  key: string,
  description: string,
) {
  const client = flags();
  const res = await client.createFlag(
    {
      key,
      description: description || 'No description',
      enabled: true,
      rolloutPercentage: 0,
    },
    jwt,
  );
  return toFlag(res as FlagProto);
}

export async function toggleFlag(jwt: string, key: string, enabled: boolean) {
  const client = flags();
  const res = await client.toggleFlag({ key, enabled }, jwt);
  return toFlag(res as FlagProto);
}

export async function updateRollout(jwt: string, key: string, rolloutPercentage: number) {
  const client = flags();
  const res = await client.updateRollout(
    { key, rolloutPercentage },
    jwt,
  );
  return toFlag(res as FlagProto);
}

export async function evaluate(sdkKey: string, key: string, contextKey: string) {
  const client = flags();
  const res = await client.evaluate({ key, contextKey }, sdkKey);
  return res as { enabled: boolean; reason: string };
}
