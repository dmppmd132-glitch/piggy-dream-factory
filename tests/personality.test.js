/* 個性系統整合測試：用 jsdom 真正載入 index.html，模擬玩家操作
 * 執行：node tests/personality.test.js（需先啟動 http://localhost:8080）
 */
const { JSDOM, VirtualConsole } = require('jsdom');
const assert = require('assert');

const URL = process.env.GAME_URL || 'http://localhost:8080/index.html';
const errors = [];

function waitFor(fn, label, timeout = 8000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      let v;
      try { v = fn(); } catch (e) { v = null; }
      if (v) return resolve(v);
      if (Date.now() - start > timeout) return reject(new Error('timeout: ' + label));
      setTimeout(tick, 25);
    };
    tick();
  });
}
const click = el => el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));

(async () => {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + e.message));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = await JSDOM.fromURL(URL, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
  });
  const { window } = dom;
  const doc = window.document;
  await new Promise(r => window.addEventListener('load', r));

  // 1. 首次啟動應出現個性選擇，且列出 7 種個性
  const cards = await waitFor(() => {
    const c = doc.querySelectorAll('.pers-card');
    return c.length ? c : null;
  }, '個性選擇卡片');
  assert.strictEqual(cards.length, 7, '應該有 7 種個性可選');
  assert.strictEqual(window.eval('state'), null, '選個性前不應建立存檔');

  // 2. 選「學者豬」並開始
  click(doc.querySelector('[data-pers="scholar"]'));
  assert.ok(doc.querySelector('[data-pers="scholar"]').classList.contains('on'), '選取的卡片要有 on 樣式');
  const startBtn = [...doc.querySelectorAll('.mbtn')].find(b => b.textContent.includes('就這隻'));
  click(startBtn);

  // 夢想專精是獨立於個性的第二個開局選擇
  await waitFor(() => doc.querySelector('[data-dream="scholar"]'), '夢想專精選擇卡片');
  click(doc.querySelector('[data-dream="scholar"]'));
  click([...doc.querySelectorAll('.mbtn')].find(b => b.textContent.includes('選擇這個夢想')));

  const s = await waitFor(() => window.eval('state'), '建立新局');
  assert.strictEqual(s.personality, 'scholar');
  assert.strictEqual(s.int, 12, '學者豬開局智慧 +2');
  assert.strictEqual(s.inventory.reading_glasses, 1, '學者豬開局送讀書眼鏡');
  assert.strictEqual(s.mode, 'normal');
  assert.strictEqual(s.dreamId, 'scholar', '新局應記錄選定的夢想專精');

  // 3. 徽章與開場說明
  assert.ok(doc.getElementById('persBadge').textContent.includes('學者豬'), '狀態列徽章應顯示個性');
  const intro = doc.querySelector('.modal-inner');
  assert.ok(intro && intro.textContent.includes('本局個性'), '開場說明應提到個性');
  click([...doc.querySelectorAll('.mbtn')].find(b => b.textContent.includes('開始一般養成')));

  // 4. 行動數值：圖書館智慧成長 1.38 倍、體力消耗 1.12 倍
  const results = window.eval(`(() => {
    const out = [];
    for (let i = 0; i < 40; i++) {
      const st = newState({ personality: 'scholar' });
      const before = { int: st.int, stamina: st.stamina };
      runAction(st, ACTIONS.find(a => a.id === 'library'));
      out.push({ gain: st.int - before.int, cost: before.stamina - st.stamina });
    }
    return out;
  })()`);
  const gains = results.map(r => r.gain);
  // 基礎 6~10 ×1.38（8~14）＋ 圖書館專屬 +2 → 10~16
  assert.ok(Math.min(...gains) >= 10 && Math.max(...gains) <= 16, `學者豬智慧成長應落在 10~16，實際 ${Math.min(...gains)}~${Math.max(...gains)}`);
  assert.strictEqual(results[0].cost, 17, '學者豬圖書館體力消耗 15×1.12≈17');

  // 5. 吃貨豬：大餐更便宜、體重增加更多、額外體力
  const foodie = window.eval(`(() => {
    const st = newState({ personality: 'foodie' });
    const d = effectiveDelta(st, ACTIONS.find(a => a.id === 'feast'));
    const st2 = newState({ personality: 'foodie' });
    const w0 = st2.weight;
    runAction(st2, ACTIONS.find(a => a.id === 'feast'));
    return { gold: d.gold, stamina: d.stamina, weightGain: st2.weight - w0, price: shopPrice({ price: 100 }, st2) };
  })()`);
  assert.strictEqual(foodie.gold, -22, '吃貨豬大餐 25G×0.88≈22G');
  assert.strictEqual(foodie.stamina, 48, '吃貨豬大餐體力 40×1.1 + 4 = 48');
  assert.ok(foodie.weightGain >= 7, `吃貨豬體重增加 5×1.45≈7，實際 ${foodie.weightGain}`);
  assert.strictEqual(foodie.price, 88, '吃貨豬商店價格 100×0.88');

  // 6. 慵懶豬：連續同動作的心情懲罰減半
  const lazy = window.eval(`(() => {
    const st = newState({ personality: 'lazy' });
    st.lastActionId = 'gym'; st.sameActionStreak = 2;
    const m0 = st.mood;
    runAction(st, ACTIONS.find(a => a.id === 'gym'));
    return st.mood - m0;
  })()`);
  assert.strictEqual(lazy, -2, '慵懶豬重複動作心情 -12×0.45≈-5，加上 +3 心情 → -2');

  // 7. 冒險豬：事件間隔 2~3 天、事件正向效果 +15%
  const brave = window.eval(`(() => {
    const st = newState({ personality: 'brave' });
    const scaled = PigPersonalities.scaleEventEffects(getPersonality(st), { int: 5, stamina: 20, gold: -10 });
    const gaps = [];
    for (let i = 0; i < 30; i++) gaps.push(newState({ personality: 'brave' }).nextEventDay);
    return { scaled, min: Math.min(...gaps), max: Math.max(...gaps) };
  })()`);
  assert.strictEqual(brave.scaled.int, 6, '冒險豬事件智慧 +5×1.15≈6');
  assert.strictEqual(brave.scaled.stamina, 23, '冒險豬事件體力 +20×1.15=23');
  assert.strictEqual(brave.scaled.gold, -10, '冒險豬不放大負向效果');
  assert.ok(brave.min >= 2 && brave.max <= 3, `冒險豬首次事件應在 2~3 天內，實際 ${brave.min}~${brave.max}`);

  // 8. 每日挑戰必須完全中立（與舊版規則一致）
  const daily = window.eval(`(() => {
    const st = newState({ mode: 'daily', challengeDate: '2026-11-14', seed: 12345 });
    const p = getPersonality(st);
    const before = { int: st.int, stamina: st.stamina };
    runAction(st, ACTIONS.find(a => a.id === 'library'));
    return { name: p.name, id: p.id, gain: st.int - before.int, cost: before.stamina - st.stamina, mood: st.mood, price: shopPrice({ price: 100 }, st) };
  })()`);
  assert.strictEqual(daily.id, 'standard');
  assert.ok(daily.gain >= 6 && daily.gain <= 10, `每日挑戰成長應維持 6~10，實際 ${daily.gain}`);
  assert.strictEqual(daily.cost, 15, '每日挑戰體力消耗維持 15');
  assert.strictEqual(daily.price, 100, '每日挑戰商店價格不變');

  // 9. 存檔往返與舊存檔相容
  const persist = window.eval(`(() => {
    state.personality = 'star';
    state.int = 42;
    save();
    const reloaded = loadState();
    localStorage.setItem('pdf_save_v1', JSON.stringify(Object.assign({}, reloaded, { personality: undefined })));
    const legacy = loadState();
    return { saved: reloaded.personality, legacy: legacy.personality, legacyMode: legacy.mode };
  })()`);
  assert.strictEqual(persist.saved, 'star', '存檔應保留個性');
  assert.strictEqual(persist.legacy, null, '舊存檔的一般養成不強制指定個性');
  assert.strictEqual(persist.legacyMode, 'normal');

  // 10. 重來可重新選個性，取消則保留原局
  const restartFn = window.eval('restart');
  assert.strictEqual(typeof restartFn, 'function');
  const beforeRestart = window.eval('state.day');
  window.eval('restart()');
  const confirmBtn = await waitFor(() => [...doc.querySelectorAll('.mbtn')].find(b => b.textContent.includes('重新開始')), '重新開始確認');
  click(confirmBtn);
  await waitFor(() => doc.querySelector('.pers-card'), '重來後的個性選擇');
  click([...doc.querySelectorAll('.mbtn')].find(b => b.textContent.includes('取消')));
  await new Promise(r => setTimeout(r, 100));
  assert.strictEqual(window.eval('state.day'), beforeRestart, '取消重來應保留原進度');

  // 11. 個性說明視窗
  click(doc.getElementById('persBadge'));
  await waitFor(() => doc.querySelector('.pers-detail'), '個性說明');
  assert.ok(doc.body.textContent.includes('成長倍率'), '個性說明應顯示成長倍率');

  if (errors.length) {
    console.error('❌ 頁面發生錯誤：');
    errors.forEach(e => console.error('  ' + e));
    process.exitCode = 1;
  } else {
    console.log('✅ 個性系統 11 項整合測試全部通過');
  }
  dom.window.close();
})().catch(e => { console.error('❌ 測試失敗：', e.message); process.exit(1); });
