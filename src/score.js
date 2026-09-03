export function waterPoints(water) {
  const n = Number(water) || 0;
  if (n >= 5) return 2;
  if (n >= 3) return 1;
  return 0;
}

export function dayScore(row = {}) {
  return (
    waterPoints(row.water) +
    (row.sleep ? 1 : 0) +
    (row.workout ? 1 : 0) +
    (row.study ? 1 : 0)
  );
}

export function emptyDay(date) {
  return { date, water: 0, sleep: 0, workout: 0, study: 0 };
}

export function localISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return localISODate(d);
}

export function weekdayMon0(iso) {
  const d = parseISODate(iso);
  return (d.getDay() + 6) % 7;
}

export const EMPTY = '#161b22';

export const GREEN = ['#161b22', '#0e4429', '#006d32', '#26a641', '#3fb950', '#56d364'];
export const BLUE = ['#161b22', '#0c2d6b', '#0d419d', '#1158c7', '#1f6feb', '#58a6ff'];
export const YELLOW = ['#161b22', '#3d2f00', '#6e4b00', '#9e6a00', '#d29922', '#e3b341'];
export const RED = ['#161b22', '#4c1115', '#6e1520', '#a40e26', '#da3633', '#f85149'];
export const ORANGE = ['#161b22', '#3d1f00', '#6e3200', '#9e4c00', '#db6d28', '#f0883e'];

export const PALETTES = {
  overview: GREEN,
  water: BLUE,
  sleep: YELLOW,
  workout: RED,
  study: ORANGE
};

export function cellColor(tab, row) {
  if (!row) return EMPTY;
  if (tab === 'overview') return GREEN[dayScore(row)] || GREEN[0];
  if (tab === 'water') return BLUE[row.water] || BLUE[0];
  if (tab === 'sleep') return row.sleep ? YELLOW[4] : EMPTY;
  if (tab === 'workout') return row.workout ? RED[4] : EMPTY;
  if (tab === 'study') return row.study ? ORANGE[4] : EMPTY;
  return EMPTY;
}

export function cellValue(tab, row) {
  if (!row) return 0;
  if (tab === 'overview') return dayScore(row);
  if (tab === 'water') return row.water || 0;
  return row[tab] ? 1 : 0;
}

export function streakFrom(map, today, tab) {
  const ok = (iso) => {
    const row = map[iso];
    if (!row) return false;
    if (tab === 'overview') return dayScore(row) >= 1;
    if (tab === 'water') return (row.water || 0) >= 3;
    return Boolean(row[tab]);
  };
  let n = 0;
  let cursor = today;
  if (!ok(cursor)) cursor = addDays(today, -1);
  while (ok(cursor)) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}
