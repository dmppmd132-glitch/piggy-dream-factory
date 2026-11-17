/* 存檔轉移測試：確認匯出包含進度與收藏資料，但不包含敏感設定。 */
const { JSDOM, VirtualConsole } = require('jsdom');
const assert = require('assert');

const URL = process.env.GAME_URL || 'http://localhost:8080/index.html';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message));
  const dom = await JSDOM.fromURL(URL, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
  const { window } = dom;
  await new Promise(resolve => window.addEventListener('load', resolve));
  await sleep(80);

  const snapshot = window.eval(`(() => {
    const s = newState({ personality: 'balanced' });
    s.day = 12; s.gold = 321; s.log = ['測試日記'];
    s.ranchCompetition = { round: 1, nextDay: 14, wins: 1, ties: 0, losses: 0, missed: 0, respect: 13, awards: [] };
    return s;
  })()`);
  window.localStorage.setItem('pdf_save_v1', JSON.stringify(snapshot));
  window.localStorage.setItem('pdf_endings_v1', JSON.stringify({ ending_a: true }));
  window.localStorage.setItem('pdf_achievements_v1', JSON.stringify({ unlocked: ['rich_pig', 'rival_tie_4'], bonuses: { int: 0, str: 0, cha: 10 } }));
  window.localStorage.setItem('pdf_personalities_v1', JSON.stringify({ balanced: { count: 2 } }));
  window.localStorage.setItem('pdf_gemini_key', 'must-not-leave-device');

  const exported = window.eval('buildSaveTransfer()');
  assert.strictEqual(exported.format, 'piggy-dream-factory-save');
  assert.strictEqual(exported.version, 1);
  assert.strictEqual(exported.data.pdf_save_v1.gold, 321);
  assert.strictEqual(exported.data.pdf_save_v1.ranchCompetition.wins, 1, '應匯出牧場競賽戰績');
  assert.ok(exported.data.pdf_endings_v1.ending_a, '應包含結局圖鑑');
  assert.ok(exported.data.pdf_achievements_v1.unlocked.includes('rich_pig'), '應包含永久成就');
  assert.ok(exported.data.pdf_achievements_v1.unlocked.includes('rival_tie_4'), '應包含元元隱藏成就');
  assert.ok(exported.data.pdf_personalities_v1.balanced, '應包含個性收集');
  assert.strictEqual(exported.data.pdf_gemini_key, undefined, '不可匯出 API Key');

  assert.strictEqual(window.validateSaveTransfer(exported), true, '合法存檔應通過驗證');
  const invalid = JSON.parse(JSON.stringify(exported));
  invalid.data.pdf_save_v1.mode = 'daily';
  assert.throws(() => window.validateSaveTransfer(invalid), /模式不正確/);

  const imported = JSON.parse(JSON.stringify(exported));
  imported.data.pdf_save_v1.gold = 777;
  assert.strictEqual(window.applySaveTransfer(imported), 4);
  assert.strictEqual(JSON.parse(window.localStorage.getItem('pdf_save_v1')).gold, 777);
  assert.strictEqual(JSON.parse(window.localStorage.getItem('pdf_save_v1')).ranchCompetition.respect, 13, '應保留宿敵敬意與競賽狀態');
  assert.strictEqual(window.localStorage.getItem('pdf_gemini_key'), 'must-not-leave-device');
  window.showSettings();
  assert.ok(window.document.getElementById('exportSaveBtn'), '設定視窗應顯示匯出按鈕');
  assert.ok(window.document.getElementById('importSaveBtn'), '設定視窗應顯示匯入按鈕');
  assert.deepStrictEqual(errors, [], `頁面不應有 JavaScript 錯誤：${errors.join('; ')}`);
  console.log('✅ 存檔匯出、匯入、驗證與敏感資料排除測試通過');
})().catch(err => { console.error(err.stack || err); process.exit(1); });
