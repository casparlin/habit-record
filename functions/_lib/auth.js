const COOKIE = 'habit_auth';
const MAX_AGE = 30 * 24 * 60 * 60;
const MAX_USERS = 10;

function bytesEq(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}

async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((n) => n.toString(16).padStart(2, '0')).join('');
}

export function parseCookie(header, name) {
  if (!header) return '';
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

export async function tokenMatches(provided, secret) {
  if (!provided || !secret) return false;
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(secret);
  return bytesEq(a, b);
}

export async function resolveUserId(token, env) {
  if (!token || !env) return null;
  for (let i = 1; i <= MAX_USERS; i++) {
    const secret = env[`SECRET_ACCESS_TOKEN_${i}`];
    if (secret && (await tokenMatches(token, secret))) return String(i);
  }
  return null;
}

export async function issueSession(secret, userId) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${userId}.${exp}`;
  const sig = await hmacHex(secret, `habit-session:${payload}`);
  return `${payload}.${sig}`;
}

export async function getAuthUserId(context) {
  const { request, env } = context;
  const raw = parseCookie(request.headers.get('Cookie') || '', COOKIE);
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const [userId, expRaw, sig] = parts;
  const userNum = Number(userId);
  if (!Number.isInteger(userNum) || userNum < 1 || userNum > MAX_USERS) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const secret = env[`SECRET_ACCESS_TOKEN_${userId}`];
  if (!secret) return null;
  const expected = await hmacHex(secret, `habit-session:${userId}.${expRaw}`);
  const a = new TextEncoder().encode(sig);
  const b = new TextEncoder().encode(expected);
  if (!bytesEq(a, b)) return null;
  return String(userNum);
}

export function sessionCookieHeader(value, requestUrl) {
  const https = requestUrl.startsWith('https:');
  const parts = [
    `${COOKIE}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${MAX_AGE}`
  ];
  if (https) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookieHeader(requestUrl) {
  const https = requestUrl.startsWith('https:');
  const parts = [
    `${COOKIE}=`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=0'
  ];
  if (https) parts.push('Secure');
  return parts.join('; ');
}

export async function requireAuth(context) {
  const userId = await getAuthUserId(context);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return userId;
}
