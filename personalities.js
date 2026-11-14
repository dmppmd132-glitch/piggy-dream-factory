/* =====================================================================
 *  豬豬個性系統：資料 + 純邏輯
 *  - 只包含資料與計算，不碰 DOM，方便在瀏覽器、測試與將來的 Worker 共用
 *  - index.html 用全域的 PigPersonalities；測試可用 require('./personalities.js')
 *
 *  設計原則
 *  1. 每種個性都有明確的「強項」與「代價」，不做純粹的上位互換。
 *  2. 所有倍率都作用在「單次行動的增減量」上，不改變數值上下限。
 *  3. 每日挑戰固定使用 NEUTRAL（標準豬豬），確保全球玩家起始條件完全一致，
 *     也讓既有每日排行榜與舊存檔的規則不被個性影響。
 * ===================================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PigPersonalities = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = 1;
  const DEFAULT_ID = 'balanced';

  // 個性清單。growth 的鍵與遊戲數值一致：int / str / cha
  const LIST = [
    {
      id: 'balanced', emoji: '🐷', name: '平凡小豬', tagline: '樣樣都行，樣樣都不特別',
      desc: '沒有偏科的天賦，但適應力最好。任何路線都走得通，適合第一次養豬、或想穩穩收集結局的人。',
      growth: { int: 1.06, str: 1.06, cha: 1.06 },
      staminaCost: 1, restGain: 1, income: 1, spend: 1, weightGain: 1, weightLoss: 1,
      moodPerAction: 2, repeatTolerance: 1,
      actionBonus: {}, startBonus: { mood: 10 }, startItems: {},
      eventAffinity: [], eventInterval: [3, 4], eventGain: 1,
      pros: ['三項能力成長 +6%', '每次行動心情 +2', '開局心情 +10'],
      cons: ['沒有突出的專長', '突發事件頻率普通'],
    },
    {
      id: 'lazy', emoji: '😴', name: '慵懶小豬', tagline: '能躺著，就不要站著',
      desc: '天生懂得休息的藝術。體力消耗少、回復多，連續做同一件事也不容易膩，但訓練成效偏弱。',
      growth: { int: 0.88, str: 0.85, cha: 0.9 },
      staminaCost: 0.82, restGain: 1.35, income: 1, spend: 1, weightGain: 1.15, weightLoss: 0.85,
      moodPerAction: 3, repeatTolerance: 0.45,
      actionBonus: { sleep: { mood: 4 } }, startBonus: { mood: 12 }, startItems: {},
      eventAffinity: ['weight'], eventInterval: [3, 4], eventGain: 1,
      pros: ['體力消耗 -18%', '休息回復 +35%', '連續同動作的心情懲罰減半', '每次行動心情 +3'],
      cons: ['三項能力成長 -10~15%', '體重容易增加', '減重效果較差'],
    },
    {
      id: 'scholar', emoji: '🎓', name: '學者豬', tagline: '先查資料，再決定要不要動',
      desc: '看到書就會走不動路。智慧成長飛快，圖書館還有額外加成，但體力消耗比別人大，容易讀到昏倒。',
      growth: { int: 1.38, str: 0.86, cha: 0.92 },
      staminaCost: 1.12, restGain: 1, income: 1.05, spend: 1, weightGain: 1, weightLoss: 1,
      moodPerAction: 0, repeatTolerance: 1,
      actionBonus: { library: { int: 2 } }, startBonus: { int: 2 }, startItems: { reading_glasses: 1 },
      eventAffinity: ['int'], eventInterval: [3, 4], eventGain: 1,
      pros: ['智慧成長 +38%', '圖書館額外 +2 智慧', '開局智慧 +2、送「讀書眼鏡」', '打工收入 +5%'],
      cons: ['體力消耗 +12%', '力量成長 -14%', '事件常與讀書、考試有關'],
    },
    {
      id: 'foodie', emoji: '🍰', name: '吃貨豬', tagline: '先吃飽，再談理想',
      desc: '對食物的執著有口皆碑。吃東西回復更多、買食物更便宜，但體重上升得特別快，減重也特別難。',
      growth: { int: 0.94, str: 1.02, cha: 1 },
      staminaCost: 1, restGain: 1.1, income: 1, spend: 0.88, weightGain: 1.45, weightLoss: 0.8,
      moodPerAction: 1, repeatTolerance: 1,
      actionBonus: { feast: { mood: 5, stamina: 4 } }, startBonus: { weight: 3, gold: 10 }, startItems: { energy_drink: 1 },
      eventAffinity: ['weight', 'gold'], eventInterval: [3, 4], eventGain: 1,
      pros: ['吃東西額外 +4 體力、+5 心情', '商店與大餐價格 -12%', '開局送「能量飲料」'],
      cons: ['體重增加 +45%', '減重效果 -20%', '智慧成長 -6%'],
    },
    {
      id: 'star', emoji: '✨', name: '明星豬', tagline: '鏡頭在哪，我就在哪',
      desc: '天生自帶spotlight。魅力成長極快、收入也高，但愛漂亮愛花錢，體力與力量都不是強項。',
      growth: { int: 0.94, str: 0.86, cha: 1.38 },
      staminaCost: 1, restGain: 1, income: 1.1, spend: 1.12, weightGain: 1, weightLoss: 1,
      moodPerAction: 2, repeatTolerance: 1,
      actionBonus: { charm: { cha: 2 } }, startBonus: { cha: 2, gold: 10 }, startItems: {},
      eventAffinity: ['cha'], eventInterval: [3, 4], eventGain: 1,
      pros: ['魅力成長 +38%', '儀態課額外 +2 魅力', '所有收入 +10%', '開局魅力 +2'],
      cons: ['購物與大餐價格 +12%', '力量成長 -14%', '事件常要你上台表演'],
    },
    {
      id: 'athlete', emoji: '💪', name: '運動豬', tagline: '今天的泥巴，是明天的肌肉',
      desc: '把健身房當第二個家。力量成長快、體力消耗低、減重效率高，但書讀得比較辛苦。',
      growth: { int: 0.88, str: 1.38, cha: 0.96 },
      staminaCost: 0.9, restGain: 1, income: 1, spend: 1, weightGain: 0.9, weightLoss: 1.5,
      moodPerAction: 0, repeatTolerance: 1.05,
      actionBonus: { gym: { str: 2 } }, startBonus: { str: 2, weight: -2 }, startItems: {},
      eventAffinity: ['str'], eventInterval: [3, 4], eventGain: 1,
      pros: ['力量成長 +38%', '健身房額外 +2 力量', '體力消耗 -10%', '減重效果 +50%'],
      cons: ['智慧成長 -12%', '魅力成長 -4%', '連續重訓仍會膩'],
    },
    {
      id: 'brave', emoji: '🧭', name: '冒險豬', tagline: '沒走過的路，最好玩',
      desc: '天生好奇，運氣也特別好。突發事件來得比別人勤，事件帶來的好處更多，但沒有特別突出的能力成長。',
      growth: { int: 1, str: 1, cha: 1 },
      staminaCost: 1, restGain: 1, income: 1.05, spend: 1, weightGain: 1, weightLoss: 1,
      moodPerAction: 1, repeatTolerance: 1,
      actionBonus: {}, startBonus: { gold: 25 }, startItems: {},
      eventAffinity: ['int', 'str', 'cha', 'gold', 'weight'], eventInterval: [2, 3], eventGain: 1.15,
      pros: ['突發事件間隔縮短為 2～3 天', '事件帶來的正向數值 +15%', '開局多 25G', '打工收入 +5%'],
      cons: ['沒有能力成長加成', '事件多，選錯的代價也更多'],
    },
  ];

  // 每日挑戰固定使用：所有倍率皆為 1，確保與舊版規則完全一致
  const NEUTRAL = {
    id: 'standard', emoji: '🐷', name: '標準豬豬', tagline: '每日挑戰專用，全球條件一致',
    desc: '每日挑戰固定使用標準豬豬：不套用任何個性加成，所有玩家在同一組種子、天氣與事件順序下競爭。',
    growth: { int: 1, str: 1, cha: 1 },
    staminaCost: 1, restGain: 1, income: 1, spend: 1, weightGain: 1, weightLoss: 1,
    moodPerAction: 0, repeatTolerance: 1,
    actionBonus: {}, startBonus: {}, startItems: {},
    eventAffinity: [], eventInterval: [3, 4], eventGain: 1,
    pros: ['與所有玩家條件完全相同'], cons: ['沒有個性加成'],
  };

  const MAP = LIST.reduce((m, p) => { m[p.id] = p; return m; }, {});

  function has(id) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(MAP, id); }
  function byId(id) { return has(id) ? MAP[id] : MAP[DEFAULT_ID]; }
  function growthFor(p, key) {
    const v = p && p.growth ? Number(p.growth[key]) : 1;
    return Number.isFinite(v) && v > 0 ? v : 1;
  }

  // 倍率換算：保持正負號、整數、且非零值不會被抹成 0
  function scaleInt(value, mult) {
    const n = Number(value) || 0;
    const m = Number(mult);
    if (!n || !Number.isFinite(m) || m === 1) return n;
    const out = Math.sign(n) * Math.round(Math.abs(n) * m);
    return out === 0 ? Math.sign(n) : out;
  }
  function scaleStamina(p, v) { return v < 0 ? scaleInt(v, p.staminaCost) : scaleInt(v, p.restGain); }
  function scaleGold(p, v) { return v < 0 ? scaleInt(v, p.spend) : scaleInt(v, p.income); }
  function scaleWeight(p, v) { return v < 0 ? scaleInt(v, p.weightLoss) : scaleInt(v, p.weightGain); }

  // 事件效果：只放大「正向」的能力與金錢，避免冒險豬連懲罰都被放大
  function scaleEventEffects(p, effects) {
    const gain = Number(p && p.eventGain) || 1;
    const out = {};
    for (const [k, v] of Object.entries(effects || {})) {
      const n = Number(v) || 0;
      out[k] = (gain !== 1 && n > 0) ? scaleInt(n, gain) : n;
    }
    return out;
  }

  // 給 UI 用的簡短倍率說明，例如「智慧 ×1.38」
  function growthLabel(p) {
    const parts = [];
    for (const [k, label] of [['int', '智慧'], ['str', '力量'], ['cha', '魅力']]) {
      const g = growthFor(p, k);
      if (Math.abs(g - 1) >= 0.01) parts.push(`${label} ×${g.toFixed(2)}`);
    }
    return parts.length ? parts.join('、') : '三項能力無加成';
  }

  return { VERSION, DEFAULT_ID, LIST, NEUTRAL, MAP, has, byId, growthFor, scaleInt, scaleStamina, scaleGold, scaleWeight, scaleEventEffects, growthLabel };
});
