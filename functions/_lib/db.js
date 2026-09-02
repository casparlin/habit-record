export const SCHEMA = `
CREATE TABLE IF NOT EXISTS checkins (
  date TEXT PRIMARY KEY,
  water INTEGER NOT NULL DEFAULT 0,
  sleep INTEGER NOT NULL DEFAULT 0,
  workout INTEGER NOT NULL DEFAULT 0,
  study INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

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
