'use server';

import { auth } from './client';

// The raw SDK key is only ever returned at signup (the server stores just its
// hash). For a returning/seeded demo user, LogIn returns an empty SdkKey, so we
// fall back to the known demo key — which must match scripts/seed.sh.
const DEMO_SDK_KEY = process.env.DEMO_SDK_KEY || 'demo-sdk-key';

export async function initDemo() {
  const client = auth();
  try {
    const res = await client.signUp({ email: 'demo@feather.dev', password: 'demo-pass' });
    return { jwt: res.accessToken, sdkKey: res.sdkKey || DEMO_SDK_KEY };
  } catch {
    const res = await client.logIn({ email: 'demo@feather.dev', password: 'demo-pass' });
    return { jwt: res.accessToken, sdkKey: res.sdkKey || DEMO_SDK_KEY };
  }
}
