/* 行程小遊戲測試：確認成績倍率會實際影響圖書館成長與打工工錢。 */
const { JSDOM, VirtualConsole } = require('jsdom');
const assert = require('assert');

const URL = process.env.GAME_URL || 'http://localhost:8080/index.html';
(async () => {
  const vc = new VirtualConsole();
  const dom = await JSDOM.fromURL(URL, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
  const { window } = dom;
  await new Promise(resolve => window.addEventListener('load', resolve));

  assert.strictEqual(window.eval('miniGameMultiplier(0)'), 0.65);
  assert.strictEqual(window.eval('miniGameMultiplier(1)'), 1.35);
  assert.strictEqual(window.eval("MINIGAME_IDS.has('work') && MINIGAME_IDS.has('library')"), true);
  assert.strictEqual(window.eval("miniGameMode({ day: 1 })"), 'standard');
  assert.strictEqual(window.eval("miniGameMode({ day: 8 })"), 'hard');
  assert.ok(window.document.body.textContent.includes('點擊接乾草'));
  assert.ok(window.document.body.textContent.includes('翻牌配對'));

  const result = window.eval(`(() => {
    const workLow = newState({ mode: 'daily', challengeDate: '2026-11-16', seed: 123 });
    const workHigh = newState({ mode: 'daily', challengeDate: '2026-11-16', seed: 123 });
    const w = ACTIONS.find(a => a.id === 'work');
    runAction(workLow, w, 0.65);
    runAction(workHigh, w, 1.35);
    const libraryLow = newState({ mode: 'daily', challengeDate: '2026-11-16', seed: 456 });
    const libraryHigh = newState({ mode: 'daily', challengeDate: '2026-11-16', seed: 456 });
    const l = ACTIONS.find(a => a.id === 'library');
    const i0 = libraryLow.int, i1 = libraryHigh.int;
    runAction(libraryLow, l, 0.65);
    runAction(libraryHigh, l, 1.35);
    return { workLow: workLow.gold, workHigh: workHigh.gold, libraryLow: libraryLow.int - i0, libraryHigh: libraryHigh.int - i1 };
  })()`);
  assert.strictEqual(result.workLow, 126, '低分打工應得到 26G');
  assert.strictEqual(result.workHigh, 154, '高分打工應得到 54G');
  assert.ok(result.libraryHigh > result.libraryLow, '翻牌高分應有較高智慧成長');

  const reward = window.eval(`(() => {
    state = newState({ personality: 'balanced' });
    const item = awardMiniGameReward({ id: 'work', score: 1 });
    return { id: item.id, count: state.inventory.hay_gloves };
  })()`);
  assert.deepStrictEqual({ id: reward.id, count: reward.count }, { id: 'hay_gloves', count: 1 }, '完美打工應取得金色乾草手套');

  window.eval("state.day = 8; state.inventory.hay_gloves = 1;");
  const hayPromise = window.eval('playHayGame()');
  assert.ok(window.document.querySelector('.modal-inner').textContent.includes('12 捆'), '第 8 天起打工應進入 12 捆困難模式');
  assert.ok(window.document.querySelector('.modal-inner').textContent.includes('自動接住 2 捆'), '金色乾草手套應顯示並發動');
  window.document.querySelector('.modal-btns .mbtn').click();
  await hayPromise;
  assert.strictEqual(window.eval('state.inventory.hay_gloves'), 0, '發動後應消耗金色乾草手套');
  console.log('✅ 行程小遊戲倍率與行程成長測試通過');
  dom.window.close();
})().catch(err => { console.error(err.stack || err); process.exit(1); });
