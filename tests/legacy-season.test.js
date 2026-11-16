/* 傳承與季節測試：確認世代加成、日期切換與節慶外觀狀態。 */
const { JSDOM, VirtualConsole } = require('jsdom');
const assert = require('assert');

const URL = process.env.GAME_URL || 'http://localhost:8080/index.html';
(async () => {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message));
  const dom = await JSDOM.fromURL(URL, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
  const { window } = dom;
  await new Promise(resolve => window.addEventListener('load', resolve));

  const seasons = window.eval(`({
    spring: getSeasonalEvent('2026-02-10'),
    autumn: getSeasonalEvent('2026-09-15'),
    christmas: getSeasonalEvent('2026-12-24'),
    none: getSeasonalEvent('2026-11-16')
  })`);
  assert.strictEqual(seasons.spring.id, 'spring_festival');
  assert.strictEqual(seasons.autumn.id, 'mid_autumn');
  assert.strictEqual(seasons.christmas.id, 'christmas');
  assert.strictEqual(seasons.none, null);
  assert.strictEqual(window.eval('SEASONAL_EVENTS.length'), 6, '三個節慶應各有兩個限定事件');

  const inherited = window.eval("newState({ personality: 'balanced', legacyTrait: 'bookish_blood' })");
  assert.strictEqual(inherited.int, 13, '書香血脈應讓智慧 +3');
  assert.strictEqual(inherited.legacyTrait, 'bookish_blood');
  const look = window.eval(`(() => {
    const s = newState({ personality: 'balanced', legacyTrait: 'iron_will' });
    s.seasonalId = 'christmas';
    return getLook(s);
  })()`);
  assert.strictEqual(look.season, 'christmas', '存檔中的節慶外觀狀態應可讀取');

  const meta = window.eval(`(() => { localStorage.removeItem('pdf_legacy_v1'); recordLegacyTrait('golden_hoof'); return getLegacyMeta(); })()`);
  assert.strictEqual(meta.retired, 1);
  assert.strictEqual(meta.traits.golden_hoof, 1);
  assert.ok(window.eval('TRANSFER_KEYS.includes(LEGACY_KEY)'), '傳承紀錄應納入存檔匯出');
  assert.deepStrictEqual(errors, [], `頁面不應有 JavaScript 錯誤：${errors.join('; ')}`);
  console.log('✅ 傳承加成、節慶日期、限定事件與外觀測試通過');
  dom.window.close();
})().catch(err => { console.error(err.stack || err); process.exit(1); });
