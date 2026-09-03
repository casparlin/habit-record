import { configuredTokenCount, getUserSecret } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  const slots = [];
  const secrets = {};
  for (let i = 1; i <= 10; i++) {
    const value = getUserSecret(env, String(i));
    if (value) {
      slots.push(i);
      secrets[String(i)] = value;
    }
  }
  return new Response(
    JSON.stringify({
      ok: true,
      debug: true,
      hasDB: Boolean(env.DB),
      tokenSlots: slots,
      configuredTokens: configuredTokenCount(env),
      secrets
    }),
    { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  );
}
