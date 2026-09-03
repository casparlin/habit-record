import { requireAuth } from '../_lib/auth.js';
import { ensureSchema, getDisplayName, normalizeName, setDisplayName } from '../_lib/db.js';

export async function onRequestGet(context) {
  const auth = await requireAuth(context);
  if (auth instanceof Response) return auth;
  const userId = auth;
  const { env } = context;
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'db_unbound' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  await ensureSchema(env.DB);
  const displayName = await getDisplayName(env.DB, userId);
  return new Response(JSON.stringify({ userId, displayName }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPut(context) {
  const auth = await requireAuth(context);
  if (auth instanceof Response) return auth;
  const userId = auth;
  const { request, env } = context;
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'db_unbound' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const name = normalizeName(body.name);
  if (!name) {
    return new Response(JSON.stringify({ error: 'invalid_name' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  await ensureSchema(env.DB);
  const displayName = await setDisplayName(env.DB, userId, name);
  return new Response(JSON.stringify({ ok: true, userId, displayName }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
