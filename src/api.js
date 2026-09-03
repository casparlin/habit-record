const LOCAL_KEY = 'habit-checkins-v1';
const LOCAL_AUTH_KEY = 'habit-local-auth';
const LOCAL_NAME_KEY = 'habit-display-name';

function useLocal() {
  return import.meta.env.DEV || import.meta.env.VITE_LOCAL === '1';
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeLocal(map) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
}

async function readError(res, fallback) {
  let code = fallback;
  let extra = {};
  try {
    const data = await res.json();
    extra = data || {};
    if (data?.error) code = data.error;
  } catch {
    /* ignore */
  }
  const err = new Error(code);
  err.status = res.status;
  err.code = code;
  err.extra = extra;
  throw err;
}

export const demoMode = useLocal();

export async function login(token, name = '') {
  if (demoMode) {
    if (!token) {
      const err = new Error('unauthorized');
      err.status = 401;
      throw err;
    }
    localStorage.setItem(LOCAL_AUTH_KEY, '1');
    const trimmed = String(name || '').trim().slice(0, 16);
    if (trimmed) localStorage.setItem(LOCAL_NAME_KEY, trimmed);
    return { ok: true, demo: true, displayName: localStorage.getItem(LOCAL_NAME_KEY) || '本地用户' };
  }
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token, name })
  });
  if (!res.ok) await readError(res, 'unauthorized');
  return res.json();
}

export async function logout() {
  if (demoMode) {
    localStorage.removeItem(LOCAL_AUTH_KEY);
    return;
  }
  await fetch('/api/auth', { method: 'DELETE', credentials: 'include' });
}

export function locallyAuthed() {
  return demoMode && localStorage.getItem(LOCAL_AUTH_KEY) === '1';
}

export async function fetchCheckins(from, to) {
  if (demoMode) {
    const map = readLocal();
    const rows = Object.values(map)
      .filter((r) => r.date >= from && r.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      checkins: rows,
      displayName: localStorage.getItem(LOCAL_NAME_KEY) || '本地用户'
    };
  }
  const res = await fetch(`/api/checkins?from=${from}&to=${to}`, {
    credentials: 'include'
  });
  if (!res.ok) await readError(res, 'fetch_failed');
  const data = await res.json();
  return {
    checkins: data.checkins || [],
    displayName: data.displayName || `用户${data.userId || ''}`,
    userId: data.userId
  };
}

export async function saveCheckin(row) {
  if (demoMode) {
    const map = readLocal();
    map[row.date] = { ...row, updated_at: new Date().toISOString() };
    writeLocal(map);
    return row;
  }
  const res = await fetch('/api/checkins', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(row)
  });
  if (!res.ok) await readError(res, 'save_failed');
  return (await res.json()).checkin;
}

export async function saveDisplayName(name) {
  const trimmed = String(name || '').trim().slice(0, 16);
  if (!trimmed) {
    const err = new Error('invalid_name');
    err.status = 400;
    err.code = 'invalid_name';
    throw err;
  }
  if (demoMode) {
    localStorage.setItem(LOCAL_NAME_KEY, trimmed);
    return trimmed;
  }
  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name: trimmed })
  });
  if (!res.ok) await readError(res, 'save_name_failed');
  const data = await res.json();
  return data.displayName || trimmed;
}
