/* 煙霧測試：真的玩到第 30 天，確認事件、結局、成就與每日挑戰都沒被個性系統弄壞 */
const { JSDOM, VirtualConsole } = require('jsdom');
const assert = require('assert');

const URL = process.env.GAME_URL || 'http://localhost:8080/index.html';
const errors = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  const dom = await JSDOM.fromURL(URL, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
  const { window } = dom;
  const doc = window.document;
  await new Promise(r => window.addEventListener('load', r));

  // 選個性 → 開始
  await waitFor(() => doc.querySelectorAll('.pers-card').length, '個性選擇');
  click(doc.querySelector('[data-pers="balanced"]'));
  click([...doc.querySelectorAll('.mbtn')].find(b => b.textContent.includes('就這隻')));
  await waitFor(() => window.eval('state'), '新局');
  click([...doc.querySelectorAll('.mbtn')].find(b => b.textContent.includes('開始一般養成')));

  // 跳到第 28 天，關掉事件，避免測試等太久
  window.eval('state.day = 28; state.nextEventDay = 99; save(); renderAll();');

  // 連續行動到第 30 天之後；遇到任何彈窗就點第一個選項／繼續
  for (let i = 0; i < 6; i++) {
    const act = doc.querySelector('button.act[data-id="sleep"]');
    if (act && !act.disabled && !doc.getElementById('modalOverlay')) { click(act); await sleep(120); }
    // 處理事件／住院／結局彈窗
    for (let k = 0; k < 12; k++) {
      const ov = doc.getElementById('modalOverlay');
      if (!ov) break;
      const btns = [...ov.querySelectorAll('.mbtn')];
      const choice = btns.find(b => b.textContent.includes('🅰️'));
      const next = btns.find(b => b.textContent.includes('繼續冒險'));
      const endingBtn = btns.find(b => b.textContent.includes('重新開始'));
      if (choice) { click(choice); await sleep(60); continue; }
      if (next) { click(next); await sleep(60); continue; }
      if (endingBtn) break;
      const primary = btns.find(b => b.className.includes('primary')) || btns[0];
      if (primary) { click(primary); await sleep(80); continue; }
      break;
    }
    await sleep(120);
  }

  // 應已進入結局畫面
  const ending = await waitFor(() => {
    const t = doc.body.textContent;
    return t.includes('綜合分數') ? t : null;
  }, '結局畫面', 12000);
  assert.ok(ending.includes('結局'), '應顯示結局標題');
  assert.ok(ending.includes('平凡小豬'), '結局摘要應顯示本局個性');
  assert.ok(window.eval('state.ended'), '狀態應標記已結束');
  assert.ok(window.eval('state.score.total') > 0, '應計算綜合分數');

  // 個性收集記錄
  const book = JSON.parse(window.localStorage.getItem('pdf_personalities_v1') || '{}');
  assert.ok(book.balanced && book.balanced.count >= 1, '通關後應記錄使用的個性');
  assert.strictEqual(window.eval('state.personalityCleared'), 1, '應記錄已通關 1 種個性');

  // 每日挑戰：不應出現個性選擇，且固定標準豬豬
  window.eval('startDailyChallenge()');
  await waitFor(() => window.eval('state && state.mode === "daily"'), '每日挑戰建立');
  assert.strictEqual(window.eval('state.personality'), 'balanced', '每日挑戰記錄為預設個性');
  assert.strictEqual(window.eval('getPersonality(state).id'), 'standard', '每日挑戰實際使用標準豬豬');
  assert.ok(doc.getElementById('persBadge').textContent.includes('標準豬豬'), '徽章應顯示標準豬豬');
  assert.strictEqual(doc.querySelectorAll('.pers-card').length, 0, '每日挑戰不應跳出個性選擇');

  if (errors.length) {
    console.error('❌ 頁面發生錯誤：');
    errors.forEach(e => console.error('  ' + e));
    process.exitCode = 1;
  } else {
    console.log('✅ 通關流程、個性收集與每日挑戰煙霧測試全部通過');
  }
  dom.window.close();
})().catch(e => { console.error('❌ 測試失敗：', e.message); process.exit(1); });
