/* 豬豬夢工場：排行榜 API（Cloudflare Worker + D1）
 *   GET  /api/scores?limit=50   取得前 N 名（預設 50，最多 100）
 *   POST /api/scores            上傳成績
 *   GET  /api/daily-challenge    取得 UTC 每日挑戰種子
 *   GET  /api/daily-scores      取得每日排行榜
 *   POST /api/daily-scores     上傳每日挑戰成績
 * 結局與分數一律由伺服器用共用規則（game-core.js）重新計算；只驗證最終數值合理性，不能據此防止作弊。 */
import '../../game-core.js';

const { validateSubmission, cleanName, ENDINGS } = globalThis.PigCore;
const MIN_INTERVAL_MS = 20 * 1000;   // 同一裝置兩次上傳至少間隔 20 秒
const MAX_BODY = 2048;
const DAILY_RULES_VERSION = 1;

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : (allowed[0] || 'null'),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
  });
}

function utcToday() {
  return new Date().toISOString().slice(0, 10);
}
function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function shiftIsoDate(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function checkChallengeDate(value, today = utcToday()) {
  if (!isIsoDate(value)) return '日期必須是有效的 YYYY-MM-DD';
  if (value > today) return '日期不可為未來';
  if (value < shiftIsoDate(today, -6)) return '日期必須在最近 7 日內';
  return null;
}

async function listScores(env, limit) {
  const { results } = await env.DB.prepare(
    'SELECT name, score, ending_id, int, str, cha, weight, gold, runs, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT ?'
  ).bind(limit).all();
  return results.map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, endingId: r.ending_id,
    int: r.int, str: r.str, cha: r.cha, weight: r.weight, gold: r.gold, runs: r.runs, at: r.created_at }));
}

async function submit(request, env, cors) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > MAX_BODY) return json({ error: '資料太大' }, 413, cors);
  let body;
  try { body = JSON.parse((await request.text()).slice(0, MAX_BODY)); } catch (e) { return json({ error: '不是有效的 JSON' }, 400, cors); }

  const deviceId = typeof body.deviceId === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(body.deviceId) ? body.deviceId : null;
  if (!deviceId) return json({ error: '缺少裝置代碼' }, 400, cors);
  const name = cleanName(body.name);
  if (!name) return json({ error: '請輸入暱稱' }, 400, cors);
  const v = validateSubmission(body.stats);
  if (v.error) return json({ error: v.error }, 400, cors);

  const now = Date.now();
  const prev = await env.DB.prepare('SELECT score, runs, updated_at FROM scores WHERE device_id = ?').bind(deviceId).first();
  if (prev && now - prev.updated_at < MIN_INTERVAL_MS) return json({ error: '上傳太頻繁，請稍後再試' }, 429, cors);

  const s = v.stats, score = v.score.total;
  if (!prev) {
    await env.DB.prepare('INSERT INTO scores (device_id,name,score,ending_id,int,str,cha,weight,gold,runs,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,1,?,?)')
      .bind(deviceId, name, score, v.ending.id, s.int, s.str, s.cha, s.weight, s.gold, now, now).run();
  } else if (score > prev.score) {
    await env.DB.prepare('UPDATE scores SET name=?,score=?,ending_id=?,int=?,str=?,cha=?,weight=?,gold=?,runs=runs+1,created_at=?,updated_at=? WHERE device_id=?')
      .bind(name, score, v.ending.id, s.int, s.str, s.cha, s.weight, s.gold, now, now, deviceId).run();
  } else {
    // 沒破紀錄：只更新暱稱、次數與上傳時間
    await env.DB.prepare('UPDATE scores SET name=?,runs=runs+1,updated_at=? WHERE device_id=?').bind(name, now, deviceId).run();
  }

  const me = await env.DB.prepare('SELECT score FROM scores WHERE device_id = ?').bind(deviceId).first();
  const better = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE score > ?').bind(me.score).first();
  return json({ ok: true, score, best: me.score, rank: better.n + 1, newRecord: !prev || score > prev.score, ending: v.ending.id }, 200, cors);
}

async function listDailyScores(env, date, limit) {
  const { results } = await env.DB.prepare(
    'SELECT name, score, ending_id, int, str, cha, weight, gold, runs, created_at FROM daily_scores WHERE challenge_date = ? ORDER BY score DESC, created_at ASC, device_id ASC LIMIT ?'
  ).bind(date, limit).all();
  return results.map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, endingId: r.ending_id,
    int: r.int, str: r.str, cha: r.cha, weight: r.weight, gold: r.gold, runs: r.runs, at: r.created_at }));
}

async function submitDaily(request, env, cors) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > MAX_BODY) return json({ error: '資料太大' }, 413, cors);
  let body;
  try { body = JSON.parse((await request.text()).slice(0, MAX_BODY)); } catch (e) { return json({ error: '不是有效的 JSON' }, 400, cors); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: '資料格式錯誤' }, 400, cors);

  const deviceId = typeof body.deviceId === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(body.deviceId) ? body.deviceId : null;
  if (!deviceId) return json({ error: '缺少裝置代碼' }, 400, cors);
  const name = cleanName(body.name);
  if (!name) return json({ error: '請輸入暱稱' }, 400, cors);
  const dateError = checkChallengeDate(body.date);
  if (dateError) return json({ error: dateError }, 400, cors);
  const v = validateSubmission(body.stats);
  if (v.error) return json({ error: v.error }, 400, cors);

  const now = Date.now();
  const score = v.score.total;
  const s = v.stats;
  // 與總榜共用裝置節流時鐘，避免切換模式繞過既有 20 秒限制。
  const prev = await env.DB.prepare('SELECT score, updated_at FROM scores WHERE device_id = ?').bind(deviceId).first();
  if (prev && now - prev.updated_at < MIN_INTERVAL_MS) return json({ error: '上傳太頻繁，請稍後再試' }, 429, cors);
  const dailyPrev = await env.DB.prepare('SELECT score FROM daily_scores WHERE challenge_date = ? AND device_id = ?').bind(date, deviceId).first();

  // 每日成績與總榜均以資料庫原子 upsert 保留最佳分，並在每次有效提交時更新暱稱、runs 與限速時間。
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO scores (device_id,name,score,ending_id,int,str,cha,weight,gold,runs,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,1,?,?)
      ON CONFLICT(device_id) DO UPDATE SET
        name=excluded.name,
        ending_id=CASE WHEN excluded.score > scores.score THEN excluded.ending_id ELSE scores.ending_id END,
        int=CASE WHEN excluded.score > scores.score THEN excluded.int ELSE scores.int END,
        str=CASE WHEN excluded.score > scores.score THEN excluded.str ELSE scores.str END,
        cha=CASE WHEN excluded.score > scores.score THEN excluded.cha ELSE scores.cha END,
        weight=CASE WHEN excluded.score > scores.score THEN excluded.weight ELSE scores.weight END,
        gold=CASE WHEN excluded.score > scores.score THEN excluded.gold ELSE scores.gold END,
        created_at=CASE WHEN excluded.score > scores.score THEN excluded.created_at ELSE scores.created_at END,
        score=MAX(scores.score, excluded.score), runs=scores.runs+1, updated_at=excluded.updated_at`)
      .bind(deviceId, name, score, v.ending.id, s.int, s.str, s.cha, s.weight, s.gold, now, now),
    env.DB.prepare(`INSERT INTO daily_scores (challenge_date,device_id,name,score,ending_id,int,str,cha,weight,gold,runs,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?)
      ON CONFLICT(challenge_date,device_id) DO UPDATE SET
        name=excluded.name,
        ending_id=CASE WHEN excluded.score > daily_scores.score THEN excluded.ending_id ELSE daily_scores.ending_id END,
        int=CASE WHEN excluded.score > daily_scores.score THEN excluded.int ELSE daily_scores.int END,
        str=CASE WHEN excluded.score > daily_scores.score THEN excluded.str ELSE daily_scores.str END,
        cha=CASE WHEN excluded.score > daily_scores.score THEN excluded.cha ELSE daily_scores.cha END,
        weight=CASE WHEN excluded.score > daily_scores.score THEN excluded.weight ELSE daily_scores.weight END,
        gold=CASE WHEN excluded.score > daily_scores.score THEN excluded.gold ELSE daily_scores.gold END,
        created_at=CASE WHEN excluded.score > daily_scores.score THEN excluded.created_at ELSE daily_scores.created_at END,
        score=MAX(daily_scores.score, excluded.score), runs=daily_scores.runs+1, updated_at=excluded.updated_at`)
      .bind(date, deviceId, name, score, v.ending.id, s.int, s.str, s.cha, s.weight, s.gold, now, now),
  ]);

  const dailyBest = await env.DB.prepare('SELECT score, created_at FROM daily_scores WHERE challenge_date = ? AND device_id = ?').bind(date, deviceId).first();
  const dailyRank = await env.DB.prepare(`SELECT COUNT(*) AS n FROM daily_scores
    WHERE challenge_date = ? AND (score > ? OR (score = ? AND created_at < ?) OR (score = ? AND created_at = ? AND device_id < ?))`)
    .bind(date, dailyBest.score, dailyBest.score, dailyBest.created_at, dailyBest.score, dailyBest.created_at, deviceId).first();
  const me = await env.DB.prepare('SELECT score FROM scores WHERE device_id = ?').bind(deviceId).first();
  const better = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE score > ?').bind(me.score).first();
  return json({
    ok: true, date, score, dailyBest: dailyBest.score, dailyRank: dailyRank.n + 1,
    best: me.score, rank: better.n + 1,
    newRecord: !dailyPrev || score > dailyPrev.score, ending: v.ending.id,
  }, 200, cors);
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/') return json({ name: '豬豬夢工場排行榜', endings: ENDINGS.length }, 200, cors);

    try {
      if (url.pathname === '/api/scores') {
        if (request.method === 'GET') {
          const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 50));
          return json({ scores: await listScores(env, limit) }, 200, cors);
        }
        if (request.method === 'POST') return await submit(request, env, cors);
        return json({ error: '不支援的方法' }, 405, cors);
      }
      if (url.pathname === '/api/daily-challenge') {
        if (request.method !== 'GET') return json({ error: '不支援的方法' }, 405, cors);
        const requestedDate = url.searchParams.get('date');
        const date = requestedDate === null ? utcToday() : requestedDate;
        if (!isIsoDate(date)) return json({ error: '日期必須是有效的 YYYY-MM-DD' }, 400, cors);
        if (date > utcToday()) return json({ error: '日期不可為未來' }, 400, cors);
        const seed = globalThis.PigCore.dailySeed(date) >>> 0;
        return json({ date, seed, rulesVersion: DAILY_RULES_VERSION }, 200, cors);
      }
      if (url.pathname === '/api/daily-scores') {
        if (request.method === 'GET') {
          const date = url.searchParams.get('date') ?? utcToday();
          const dateError = checkChallengeDate(date);
          if (dateError) return json({ error: dateError }, 400, cors);
          const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 50));
          return json({ date, scores: await listDailyScores(env, date, limit) }, 200, cors);
        }
        if (request.method === 'POST') return await submitDaily(request, env, cors);
        return json({ error: '不支援的方法' }, 405, cors);
      }
      return json({ error: '找不到' }, 404, cors);
    } catch (e) {
      return json({ error: '伺服器錯誤' }, 500, cors);
    }
  },
};
