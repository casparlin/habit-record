import { requireAuth } from '../_lib/auth.js';
import { ensureSchema, getDisplayName, normalizeRow, validDate } from '../_lib/db.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestGet(context) {
  try {
    const auth = await requireAuth(context);
    if (auth instanceof Response) return auth;
    const userId = auth;
    const { request, env } = context;
    if (!env.DB) return json({ error: 'db_unbound' }, 500);
    await ensureSchema(env.DB);
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    let sql =
      'SELECT date, water, sleep, workout, study, updated_at FROM checkins WHERE user_id = ?';
    const binds = [userId];
    if (validDate(from) && validDate(to)) {
      sql += ' AND date >= ? AND date <= ?';
      binds.push(from, to);
    }
    sql += ' ORDER BY date ASC';
    const { results } = await env.DB.prepare(sql)
      .bind(...binds)
      .all();
    const displayName = await getDisplayName(env.DB, userId);
    return json({ userId, displayName, checkins: results || [] });
  } catch (err) {
    return json({ error: 'checkins_get_failed', detail: String(err) }, 500);
  }
}

export async function onRequestPut(context) {
  try {
    const auth = await requireAuth(context);
    if (auth instanceof Response) return auth;
    const userId = auth;
    const { request, env } = context;
    if (!env.DB) return json({ error: 'db_unbound' }, 500);
    let body = {};
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }
    const row = normalizeRow(body);
    if (!validDate(row.date)) return json({ error: 'invalid_date' }, 400);
    await ensureSchema(env.DB);
    await env.DB.prepare(
      `INSERT INTO checkins (user_id, date, water, sleep, workout, study, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, date) DO UPDATE SET
         water = excluded.water,
         sleep = excluded.sleep,
         workout = excluded.workout,
         study = excluded.study,
         updated_at = datetime('now')`
    )
      .bind(userId, row.date, row.water, row.sleep, row.workout, row.study)
      .run();
    return json({ ok: true, userId, checkin: row });
  } catch (err) {
    return json({ error: 'checkins_put_failed', detail: String(err) }, 500);
  }
}
