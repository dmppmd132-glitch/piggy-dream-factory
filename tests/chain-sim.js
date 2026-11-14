/* 事件連鎖可玩性模擬：不碰 DOM，只驗證劇本狀態機能不能走完、每個結局是否可達。
 * 執行：node tests/chain-sim.js [局數]
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'events.json'), 'utf8'));
const PERSONAS = ['balanced', 'lazy', 'scholar', 'foodie', 'star', 'athlete', 'brave'];

// ---------- 條件 ----------
function inRange(value, range) {
  if (!range) return true;
  if (range.min !== undefined && value < range.min) return false;
  if (range.max !== undefined && value > range.max) return false;
  return true;
}
function conditionsMet(cond, ctx) {
  if (!cond) return true;
  if (!inRange(ctx.day, cond.day)) return false;
  for (const [k, r] of Object.entries(cond.stats || {})) if (!inRange(ctx.stats[k], r)) return false;
  for (const [npc, r] of Object.entries(cond.relationship || {})) if (!inRange(ctx.relationships[npc] || 0, r)) return false;
  const f = cond.flags;
  if (f) {
    if ((f.all || []).some(x => !ctx.flags.has(x))) return false;
    if (f.any && f.any.length && !f.any.some(x => ctx.flags.has(x))) return false;
    if ((f.none || []).some(x => ctx.flags.has(x))) return false;
    if (f.atLeast && f.atLeast.of.filter(x => ctx.flags.has(x)).length < f.atLeast.count) return false;
  }
  if (cond.personality && !cond.personality.includes(ctx.personality)) return false;
  if (cond.mode && cond.mode !== ctx.mode) return false;
  if (cond.chainDone && cond.chainDone.some(id => !ctx.chainDone.has(id))) return false;
  return true;
}

// ---------- 觸發 ----------
function eligibleChains(ctx, rng) {
  return DATA.chains.filter(c => {
    if (ctx.chainDone.has(c.id) || ctx.active) return false;
    if (ctx.mode === 'daily') return false;
    if (!conditionsMet(c.trigger.requires, ctx)) return false;
    return rng() <= (c.trigger.chance === undefined ? 1 : c.trigger.chance);
  });
}
function scoreChain(chain, ctx, rng) {
  const affinity = (chain.personalityAffinity || []).includes(ctx.personality) ? 15 : 0;
  return chain.trigger.priority + affinity + rng() * 20;
}
function pickChain(ctx, rng) {
  const list = eligibleChains(ctx, rng);
  if (!list.length) return null;
  return list.reduce((best, c) => (scoreChain(c, ctx, rng) > scoreChain(best, ctx, rng) ? c : best));
}

// ---------- 推進 ----------
function availableChoices(node, ctx) {
  return node.choices.filter(c => conditionsMet(c.requires, ctx));
}
function applyFlags(ctx, ops) {
  if (!ops) return;
  for (const f of ops.set || []) ctx.flags.add(f);
  for (const f of ops.clear || []) ctx.flags.delete(f);
}
function applyReward(ctx, reward) {
  for (const [k, v] of Object.entries(reward.effects || {})) ctx.stats[k] = (ctx.stats[k] || 0) + v;
  for (const [npc, v] of Object.entries(reward.relationship || {})) ctx.relationships[npc] = (ctx.relationships[npc] || 0) + v;
  applyFlags(ctx, reward.flags);
}
function resolveEnding(chain, ctx) {
  return chain.endings.find(e => conditionsMet(e.requires, ctx)) || chain.endings[chain.endings.length - 1];
}
function playChain(chain, ctx, rng, log) {
  let nodeId = chain.start;
  let guard = 0;
  while (guard++ < 30) {
    const node = chain.nodes[nodeId];
    assert(node, `${chain.id}: 節點 ${nodeId} 不存在`);
    log.push(`${chain.id}:${nodeId}`);
    if (node.terminal) {
      const ending = node.ending && node.ending !== 'auto'
        ? chain.endings.find(e => e.id === node.ending)
        : resolveEnding(chain, ctx);
      assert(ending, `${chain.id}.${nodeId}: 指定的結局 ${node.ending} 不存在`);
      applyReward(ctx, ending.reward);
      ctx.chainDone.add(chain.id);
      return ending.id;
    }
    const choices = availableChoices(node, ctx);
    assert(choices.length > 0, `${chain.id}.${nodeId}: 沒有任何可選選項`);
    const choice = choices[Math.floor(rng() * choices.length)];
    for (const [k, v] of Object.entries(choice.effects || {})) ctx.stats[k] = (ctx.stats[k] || 0) + v;
    for (const [npc, v] of Object.entries(choice.relationship || {})) ctx.relationships[npc] = (ctx.relationships[npc] || 0) + v;
    applyFlags(ctx, choice.flags);
    nodeId = choice.next;
  }
  throw new Error(`${chain.id}: 節點迴圈超過 30 次`);
}

// ---------- 模擬 ----------
const RUNS = Number(process.argv[2]) || 800;
let seed = 20261114;
const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

const chainStarts = {}, endingCounts = {}, flagsSeen = new Set();
let totalEvents = 0, chainsPlayed = 0;

for (let run = 0; run < RUNS; run++) {
  const ctx = {
    day: 1, mode: 'normal', personality: PERSONAS[Math.floor(rng() * PERSONAS.length)],
    stats: { stamina: 100, int: 10, str: 10, cha: 10, weight: 30, gold: 100, mood: 70 },
    relationships: { teacher: 0, truffle: 0, chick: 0, wolf: 0, critic: 0 },
    flags: new Set(), chainDone: new Set(), active: null,
  };
  for (let day = 2; day <= 30; day += 3) {
    ctx.day = day;
    // 模擬玩家這幾天的成長
    ctx.stats.int += 3 + Math.floor(rng() * 6);
    ctx.stats.str += 3 + Math.floor(rng() * 6);
    ctx.stats.cha += 3 + Math.floor(rng() * 6);
    ctx.stats.gold += 10 + Math.floor(rng() * 30);
    ctx.stats.stamina = 60 + Math.floor(rng() * 40);
    for (const npc of ['teacher', 'truffle', 'chick', 'wolf']) if (rng() < 0.5) ctx.relationships[npc] += 2 + Math.floor(rng() * 6);
    totalEvents++;
    const chain = pickChain(ctx, rng);
    if (!chain) continue;
    chainsPlayed++;
    chainStarts[chain.id] = (chainStarts[chain.id] || 0) + 1;
    const log = [];
    const ending = playChain(chain, ctx, rng, log);
    endingCounts[`${chain.id}/${ending}`] = (endingCounts[`${chain.id}/${ending}`] || 0) + 1;
    for (const f of ctx.flags) flagsSeen.add(f);
  }
}

// ---------- 驗證 ----------
const missingChains = DATA.chains.filter(c => !chainStarts[c.id]).map(c => c.id);
const missingEndings = [];
for (const c of DATA.chains) {
  for (const e of c.endings) {
    const key = `${c.id}/${e.id}`;
    if (!endingCounts[key]) missingEndings.push(key);
  }
}
const declaredFlags = new Set();
for (const c of DATA.chains) {
  for (const n of Object.values(c.nodes)) for (const ch of n.choices || []) for (const f of (ch.flags || {}).set || []) declaredFlags.add(f);
  for (const e of c.endings) for (const f of (e.reward.flags || {}).set || []) declaredFlags.add(f);
}
const unsetFlags = [...declaredFlags].filter(f => !flagsSeen.has(f));

console.log(`模擬 ${RUNS} 局、${totalEvents} 個事件日、實際遊玩 ${chainsPlayed} 條鏈`);
console.log('各鏈觸發次數：', chainStarts);
if (missingChains.length) console.log('⚠️  模擬中從未觸發的鏈：', missingChains);
if (missingEndings.length) console.log('⚠️  模擬中從未到達的結局：', missingEndings);
if (unsetFlags.length) console.log('⚠️  從未在模擬中被設定的旗標：', unsetFlags);

if (missingChains.length || missingEndings.length) {
  console.error('❌ 有鏈或結局在模擬中不可達');
  process.exit(1);
}
console.log('✅ 所有事件鏈都能觸發，所有鏈結局都能到達');
