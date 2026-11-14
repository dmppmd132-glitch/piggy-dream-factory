/* 豬豬夢工場：排行榜 API（Cloudflare Worker + D1）
 *   GET  /api/scores?limit=50   取得前 N 名（預設 50，最多 100）
 *   POST /api/scores            上傳成績
 * 結局與分數一律由伺服器用共用規則（game-core.js）重新計算，不信任前端傳來的分數。 */
import '../../game-core.js';

const { validateSubmission, cleanName, ENDINGS } = globalThis.PigCore;
const MIN_INTERVAL_MS = 20 * 1000;   // 同一裝置兩次上傳至少間隔 20 秒（遊戲 30 天本來就不可能更快）
const MAX_BODY = 2048;

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

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/' ) return json({ name: '豬豬夢工場排行榜', endings: ENDINGS.length }, 200, cors);
    if (url.pathname !== '/api/scores') return json({ error: '找不到' }, 404, cors);
    try {
      if (request.method === 'GET') {
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 50));
        return json({ scores: await listScores(env, limit) }, 200, cors);
      }
      if (request.method === 'POST') return await submit(request, env, cors);
      return json({ error: '不支援的方法' }, 405, cors);
    } catch (e) {
      return json({ error: '伺服器錯誤' }, 500, cors);
    }
  },
};
