import { configuredTokenCount, getUserSecret } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  const slots = [];
  for (let i = 1; i <= 10; i++) {
    if (getUserSecret(env, String(i))) slots.push(i);
  }
  return new Response(
    JSON.stringify({
      ok: true,
      hasDB: Boolean(env.DB),
      tokenSlots: slots,
      configuredTokens: configuredTokenCount(env)
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
