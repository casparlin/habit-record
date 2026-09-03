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

function cleanSecret(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getUserSecret(env, userId) {
  const direct = cleanSecret(env?.[`SECRET_ACCESS_TOKEN_${userId}`]);
  if (direct) return direct;
  if (String(userId) === '1') return cleanSecret(env?.SECRET_ACCESS_TOKEN);
  return '';
}

export function configuredTokenCount(env) {
  let n = 0;
  if (cleanSecret(env?.SECRET_ACCESS_TOKEN)) n += 1;
  for (let i = 1; i <= MAX_USERS; i++) {
    if (cleanSecret(env?.[`SECRET_ACCESS_TOKEN_${i}`])) n += 1;
  }
  return n;
}

export async function tokenMatches(provided, secret) {
  const aStr = cleanSecret(provided);
  const bStr = cleanSecret(secret);
  if (!aStr || !bStr) return false;
  const a = new TextEncoder().encode(aStr);
  const b = new TextEncoder().encode(bStr);
  return bytesEq(a, b);
}

export async function resolveUserId(token, env) {
  const provided = cleanSecret(token);
  if (!provided || !env) return null;
  for (let i = 1; i <= MAX_USERS; i++) {
    const secret = getUserSecret(env, String(i));
    if (secret && (await tokenMatches(provided, secret))) return String(i);
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
  const secret = getUserSecret(env, String(userNum));
  if (!secret) return null;
  const expected = await hmacHex(secret, `habit-session:${userId}.${expRaw}`);
  const a = new TextEncoder().encode(sig);
  const b = new TextEncoder().encode(expected);
  if (!bytesEq(a, b)) return null;
  return String(userNum);
}

function cookieFlags(requestUrl, maxAge) {
  const https = String(requestUrl || '').startsWith('https:');
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
  const parts = [
    'Path=/',
    `Max-Age=${maxAge}`,
    `Expires=${expires}`,
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (https) parts.push('Secure');
  return parts;
}

export function sessionCookieHeader(value, requestUrl) {
  return [`${COOKIE}=${encodeURIComponent(value)}`, ...cookieFlags(requestUrl, MAX_AGE)].join('; ');
}

export function clearCookieHeader(requestUrl) {
  return [`${COOKIE}=`, ...cookieFlags(requestUrl, 0)].join('; ');
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
