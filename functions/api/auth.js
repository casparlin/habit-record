import {
  resolveUserId,
  issueSession,
  sessionCookieHeader,
  clearCookieHeader
} from '../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const userId = await resolveUserId(token, env);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const secret = env[`SECRET_ACCESS_TOKEN_${userId}`];
  const session = await issueSession(secret, userId);
  return new Response(JSON.stringify({ ok: true, userId, expiresInDays: 30 }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': sessionCookieHeader(session, request.url)
    }
  });
}

export async function onRequestDelete(context) {
  const { request } = context;
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearCookieHeader(request.url)
    }
  });
}
