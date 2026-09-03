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
      'Cache-Control': 'no-store',
      ...(init.headers || {})
    }
  });
}

export async function onRequestGet(context) {
  try {
    const userId = await getAuthUserId(context);
    if (!userId) return json({ error: 'unauthorized' }, { status: 401 });
    if (!context.env.DB) return json({ ok: true, userId, displayName: `用户${userId}`, dbError: 'db_unbound' });
    await ensureSchema(context.env.DB);
    const displayName = await getDisplayName(context.env.DB, userId);
    return json({ ok: true, userId, displayName });
  } catch (err) {
    return json({ error: 'auth_get_failed', detail: String(err) }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const rawText = await request.text();
    let body = {};
    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch {
      body = {};
    }
    const raw =
      typeof body.token === 'string'
        ? body.token
        : typeof body.password === 'string'
          ? body.password
          : '';
    const token = String(raw).trim();
    const userId = await resolveUserId(token, env);
    if (!userId) {
      return json(
        {
          error: configuredTokenCount(env) ? 'unauthorized' : 'no_tokens_configured',
          configuredTokens: configuredTokenCount(env),
          receivedToken: token
        },
        { status: 401 }
      );
    }

    let displayName = `用户${userId}`;
    let dbError = null;
    if (!env.DB) {
      dbError = 'db_unbound';
    } else {
      try {
        await ensureSchema(env.DB);
        const incoming = normalizeName(body.name);
        if (incoming) await setDisplayName(env.DB, userId, incoming);
        displayName = await getDisplayName(env.DB, userId);
      } catch (err) {
        dbError = String(err);
      }
    }

    const secret = getUserSecret(env, userId);
    const session = await issueSession(secret, userId);
    return json(
      { ok: true, userId, displayName, expiresInDays: 30, dbError },
      { headers: { 'Set-Cookie': sessionCookieHeader(session, request.url) } }
    );
  } catch (err) {
    return json({ error: 'auth_post_failed', detail: String(err), stack: err?.stack || '' }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { request } = context;
  return json(
    { ok: true },
    { headers: { 'Set-Cookie': clearCookieHeader(request.url) } }
  );
}
