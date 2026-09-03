import { requireAuth } from '../_lib/auth.js';
import { ensureSchema, getDisplayName, normalizeRow, validDate } from '../_lib/db.js';

export async function onRequestGet(context) {
  const auth = await requireAuth(context);
  if (auth instanceof Response) return auth;
  const userId = auth;
  const { request, env } = context;
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'db_unbound' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
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
  return new Response(JSON.stringify({ userId, displayName, checkins: results || [] }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPut(context) {
  const auth = await requireAuth(context);
  if (auth instanceof Response) return auth;
  const userId = auth;
  const { request, env } = context;
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'db_unbound' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  let body = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const row = normalizeRow(body);
  if (!validDate(row.date)) {
    return new Response(JSON.stringify({ error: 'invalid_date' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
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
  return new Response(JSON.stringify({ ok: true, userId, checkin: row }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
