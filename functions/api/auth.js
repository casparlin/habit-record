import {
  resolveUserId,
  issueSession,
  sessionCookieHeader,
  clearCookieHeader,
  getAuthUserId,
  getUserSecret,
  configuredTokenCount
} from '../_lib/auth.js';
import { ensureSchema, getDisplayName, normalizeName, setDisplayName } from '../_lib/db.js';

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
}

export async function onRequestGet(context) {
  const userId = await getAuthUserId(context);
  if (!userId) return json({ error: 'unauthorized' }, { status: 401 });
  if (!context.env.DB) return json({ error: 'db_unbound', userId }, { status: 500 });
  await ensureSchema(context.env.DB);
  const displayName = await getDisplayName(context.env.DB, userId);
  return json({ ok: true, userId, displayName });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const raw =
    typeof body.token === 'string'
      ? body.token
      : typeof body.password === 'string'
        ? body.password
        : '';
  const token = raw.trim();
  const userId = await resolveUserId(token, env);
  if (!userId) {
    const configured = configuredTokenCount(env);
    return json(
      {
        error: configured ? 'unauthorized' : 'no_tokens_configured',
        configuredTokens: configured,
        providedLength: token.length,
        secretLengths: {
          1: getUserSecret(env, '1').length,
          2: getUserSecret(env, '2').length
        }
      },
      { status: 401 }
    );
  }
  let displayName = `用户${userId}`;
  let dbError = null;
  if (!env.DB) {
    dbError = 'db_unbound';
  } else {
    await ensureSchema(env.DB);
    const incoming = normalizeName(body.name);
    if (incoming) await setDisplayName(env.DB, userId, incoming);
    displayName = await getDisplayName(env.DB, userId);
  }
  const secret = getUserSecret(env, userId);
  const session = await issueSession(secret, userId);
  return json(
    { ok: true, userId, displayName, expiresInDays: 30, dbError },
    { headers: { 'Set-Cookie': sessionCookieHeader(session, request.url) } }
  );
}

export async function onRequestDelete(context) {
  const { request } = context;
  return json(
    { ok: true },
    { headers: { 'Set-Cookie': clearCookieHeader(request.url) } }
  );
}
