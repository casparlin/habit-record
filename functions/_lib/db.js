export const CHECKINS_SCHEMA = `
CREATE TABLE IF NOT EXISTS checkins (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  water INTEGER NOT NULL DEFAULT 0,
  sleep INTEGER NOT NULL DEFAULT 0,
  workout INTEGER NOT NULL DEFAULT 0,
  study INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, date)
);
`;

export const PROFILES_SCHEMA = `
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const SCHEMA = `${CHECKINS_SCHEMA}
${PROFILES_SCHEMA}`;

export function clampInt(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function normalizeRow(input = {}) {
  return {
    date: String(input.date || ''),
    water: clampInt(input.water, 0, 5),
    sleep: clampInt(input.sleep, 0, 1),
    workout: clampInt(input.workout, 0, 1),
    study: clampInt(input.study, 0, 1)
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function validDate(date) {
  return DATE_RE.test(date);
}

export function normalizeName(input) {
  const name = String(input || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
  return name;
}

export function fallbackName(userId) {
  return `用户${userId}`;
}

async function tableColumns(db, table) {
  try {
    const { results } = await db.prepare(`PRAGMA table_info(${table})`).all();
    return (results || []).map((row) => String(row.name || ''));
  } catch {
    return [];
  }
}

export async function ensureSchema(db) {
  await db.exec(PROFILES_SCHEMA);
  await db.exec(CHECKINS_SCHEMA);
  const cols = await tableColumns(db, 'checkins');
  if (cols.length && !cols.includes('user_id')) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS checkins_v2 (
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        water INTEGER NOT NULL DEFAULT 0,
        sleep INTEGER NOT NULL DEFAULT 0,
        workout INTEGER NOT NULL DEFAULT 0,
        study INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, date)
      );
      INSERT OR IGNORE INTO checkins_v2 (user_id, date, water, sleep, workout, study, updated_at)
      SELECT '1', date, water, sleep, workout, study, COALESCE(updated_at, datetime('now')) FROM checkins;
      DROP TABLE checkins;
      ALTER TABLE checkins_v2 RENAME TO checkins;
    `);
  }
}

export async function getDisplayName(db, userId) {
  try {
    const row = await db.prepare('SELECT display_name FROM profiles WHERE user_id = ?').bind(userId).first();
    const name = row?.display_name ? String(row.display_name).trim() : '';
    return name || fallbackName(userId);
  } catch {
    return fallbackName(userId);
  }
}

export async function setDisplayName(db, userId, name) {
  const displayName = normalizeName(name);
  if (!displayName) return getDisplayName(db, userId);
  await db.prepare(
    `INSERT INTO profiles (user_id, display_name, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       display_name = excluded.display_name,
       updated_at = datetime('now')`
  )
    .bind(userId, displayName)
    .run();
  return displayName;
}
