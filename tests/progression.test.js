/* 夢想專精與 NPC 好感任務回歸測試。需先啟動遊戲靜態伺服器。 */
const { JSDOM, VirtualConsole } = require('jsdom');
const assert = require('assert');

const URL = process.env.GAME_URL || 'http://localhost:8080/index.html';
const errors = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const click = el => el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
function waitFor(fn, label, timeout = 8000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      let value;
      try { value = fn(); } catch (e) { value = null; }
      if (value) return resolve(value);
      if (Date.now() - start > timeout) return reject(new Error('timeout: ' + label));
      setTimeout(tick, 25);
    };
    tick();
  });
}

(async () => {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message));
  vc.on('error', (...args) => errors.push(args.join(' ')));
  const dom = await JSDOM.fromURL(URL, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
  const { window } = dom;
  const doc = window.document;
  await new Promise(resolve => window.addEventListener('load', resolve));

  // 一般養成有專精成長倍率；每日挑戰維持固定規則。
  const growth = window.eval(`(() => {
    const original = Math.random;
    Math.random = () => 0;
    try {
      const plain = newState({ personality: 'balanced' });
      const focused = newState({ personality: 'balanced', dreamId: 'star' });
      runAction(plain, ACTIONS.find(a => a.id === 'charm'));
      runAction(focused, ACTIONS.find(a => a.id === 'charm'));
      return { plain: plain.cha, focused: focused.cha, daily: newState({ mode: 'daily', challengeDate: '2026-11-16', seed: 42, dreamId: 'star' }).dreamId };
    } finally { Math.random = original; }
  })()`);
  assert.strictEqual(growth.focused - growth.plain, 1, '明星夢想最低魅力成長應比一般養成多 1 點');
  assert.strictEqual(growth.daily, null, '每日挑戰不得套用夢想專精');

  // 每一個夢想里程碑各增加 +2 專精能力，進度只計一次。
  const milestone = window.eval(`(() => {
    state = newState({ personality: 'balanced', dreamId: 'star' });
    state.cha = 25;
    const first = checkDreamMilestones(state);
    state.cha = 65;
    const last = checkDreamMilestones(state);
    return { first, last, cha: state.cha, level: state.dreamMilestones };
  })()`);
  assert.strictEqual(milestone.first.length, 1);
  assert.strictEqual(milestone.first[0].bonus, 2);
  assert.strictEqual(milestone.last.length, 2, '跳過的里程碑要一次補發');
  assert.strictEqual(milestone.cha, 69);
  assert.strictEqual(milestone.level, 3);

  // 三種夢想都有自己的專屬尾聲；里程碑決定收尾篇章，每日挑戰不顯示。
  const epilogues = window.eval(`(() => {
    const scholar = getDreamEpilogue({ mode: 'normal', dreamId: 'scholar', dreamMilestones: 3 });
    const knight = getDreamEpilogue({ mode: 'normal', dreamId: 'knight', dreamMilestones: 2 });
    const star = getDreamEpilogue({ mode: 'normal', dreamId: 'star', dreamMilestones: 0 });
    const daily = getDreamEpilogue({ mode: 'daily', dreamId: 'star', dreamMilestones: 3 });
    return { scholar, knight, star, daily, markup: renderDreamEpilogue(scholar) };
  })()`);
  assert.strictEqual(epilogues.scholar.title, '星圖學院創辦人');
  assert.strictEqual(epilogues.scholar.complete, true);
  assert.ok(epilogues.knight.title.includes('護衛隊'));
  assert.ok(epilogues.knight.story.includes('2 / 3'));
  assert.strictEqual(epilogues.star.title, '追光的第一步');
  assert.strictEqual(epilogues.daily, null);
  assert.ok(epilogues.markup.includes('dream-ending--scholar'), '夢想尾聲需渲染專屬視覺樣式');

  // 每種專精都有專屬互動事件；每局至多一次，僅一般事件日抽選。
  const specialtyEvents = await window.eval(`(async () => {
    const originalRandom = Math.random;
    const originalSeason = getSeasonalEvent;
    try {
      Math.random = () => 0;
      const collect = dreamId => {
        const run = newState({ personality: 'balanced', dreamId });
        const event = getDreamSpecializationEvent(run);
        if (event) run.eventTitles.push(event.title);
        return { event, duplicate: getDreamSpecializationEvent(run) };
      };
      const scholar = collect('scholar');
      const knight = collect('knight');
      const star = collect('star');
      const daily = getDreamSpecializationEvent(newState({ mode: 'daily', challengeDate: '2026-11-16', seed: 42, dreamId: 'star' }));
      const missedRun = newState({ personality: 'balanced', dreamId: 'star' });
      Math.random = () => 0.99;
      const missed = getDreamSpecializationEvent(missedRun);
      Math.random = () => 0;
      getSeasonalEvent = () => null;
      state = newState({ personality: 'balanced', dreamId: 'star' });
      const integrated = await getEvent({ reason: '專精事件測試' });
      return { scholar, knight, star, daily, missed, integrated };
    } finally { Math.random = originalRandom; getSeasonalEvent = originalSeason; }
  })()`);
  assert.strictEqual(specialtyEvents.scholar.event.title, '燈塔圖書館的遺失星頁');
  assert.strictEqual(specialtyEvents.knight.event.title, '暴雨前的斷橋求援');
  assert.strictEqual(specialtyEvents.star.event.title, '月光舞台的臨時救場');
  for (const id of ['scholar', 'knight', 'star']) {
    assert.strictEqual(specialtyEvents[id].event.choices.length, 2, `${id} 事件應提供兩個互動選擇`);
    assert.strictEqual(specialtyEvents[id].event.source, 'local');
    assert.strictEqual(specialtyEvents[id].duplicate, null, `${id} 事件每局只能登場一次`);
  }
  assert.strictEqual(specialtyEvents.daily, null, '每日挑戰不得抽到專精事件');
  assert.strictEqual(specialtyEvents.missed, null, '未命中機率時不應強制抽到專精事件');
  assert.strictEqual(specialtyEvents.integrated.title, '月光舞台的臨時救場', 'getEvent 應接入專精事件抽選');

  // 宿敵盃固定在第 7／14／21／28 天舉行；玩家依當前能力挑賽制。
  const competitionRules = window.eval(`(() => {
    const run = newState({ personality: 'balanced', dreamId: 'knight' });
    run.day = 7; run.nextEventDay = 30;
    const scheduled = checkEventTrigger(run);
    const event = getRanchCompetitionEvent(run);
    const daily = newState({ mode: 'daily', challengeDate: '2026-11-16', seed: 42 });
    daily.day = 14; daily.nextEventDay = 30;
    const dailyTrigger = checkEventTrigger(daily);
    return { scheduled, title: event.title, source: event.source, story: event.story, choices: event.choices.map(c => c.discipline), dialogue: event.choices.map(c => c.text), profile: RIVAL_PROFILE, rounds: RANCH_COMPETITION.rounds, daily: daily.ranchCompetition, dailyTrigger };
  })()`);
  assert.strictEqual(competitionRules.scheduled.competition, true);
  assert.strictEqual(competitionRules.title, '牧場新秀賽');
  assert.strictEqual(competitionRules.source, 'competition');
  assert.deepStrictEqual(Array.from(competitionRules.choices), ['int', 'str', 'cha']);
  assert.strictEqual(competitionRules.profile.name, '元元');
  assert.ok(competitionRules.profile.backstory.includes('黃色緞帶'));
  assert.ok(competitionRules.story.includes('晨露牧場') && competitionRules.story.includes('豐收節'));
  assert.ok(competitionRules.dialogue.some(line => line.includes('把去年沒解完的謎題')));
  assert.strictEqual(competitionRules.rounds.length, 4);
  for (const round of competitionRules.rounds) {
    assert.ok(round.story.includes('元元'));
    assert.deepStrictEqual(Object.keys(round.playerLines).sort(), ['cha', 'int', 'str']);
    assert.deepStrictEqual(Object.keys(round.replies).sort(), ['loss', 'tie', 'win']);
  }
  assert.strictEqual(competitionRules.daily, null, '每日挑戰不建立競賽資料');
  assert.strictEqual(competitionRules.dailyTrigger, null, '每日挑戰不會被週賽排程打斷');

  const tournament = window.eval(`(() => {
    const original = Math.random;
    try {
      Math.random = () => 0;
      const run = newState({ personality: 'balanced' });
      run.int = run.str = run.cha = 100;
      const first = resolveRanchCompetition(run, getRanchCompetitionEvent(run), { discipline: 'str' });
      const second = resolveRanchCompetition(run, getRanchCompetitionEvent(run), { discipline: 'int' });
      const third = resolveRanchCompetition(run, getRanchCompetitionEvent(run), { discipline: 'cha' });
      const fourth = resolveRanchCompetition(run, getRanchCompetitionEvent(run), { discipline: 'str' });
      const late = getRanchCompetitionEvent(run);
      return { first, second, third, fourth, cup: run.ranchCompetition, late };
    } finally { Math.random = original; }
  })()`);
  assert.strictEqual(tournament.first.outcome, 'win');
  assert.ok(tournament.first.result.includes('你回應元元') && tournament.first.result.includes('這次一起衝過終點線！'));
  assert.ok(tournament.first.result.includes('你終於把那場平手跑完了！'));
  assert.strictEqual(tournament.second.outcome, 'win');
  assert.ok(tournament.second.result.includes('銀蹄獎盃'));
  assert.strictEqual(tournament.fourth.outcome, 'win');
  assert.ok(tournament.fourth.result.includes('牧場總冠軍'));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(tournament.cup)), { round: 4, nextDay: null, wins: 4, ties: 0, losses: 0, missed: 0, respect: 52, awards: ['silver', 'champion'] });
  assert.strictEqual(tournament.late, null, '四場賽事完畢後不應重複觸發');

  window.eval(`state = newState({ personality: 'balanced' }); state.day = 7; state.str = 100; Math.random = () => 0; renderAll(); window.__cupPromise = presentEvent(getRanchCompetitionEvent(state));`);
  assert.ok(doc.querySelector('#relationships').textContent.includes('認識宿敵 元元') && doc.querySelector('#relationships').textContent.includes('黃色緞帶'), '關係面板應提供元元背景故事與紀念物');
  await waitFor(() => doc.querySelector('#modalOverlay .mbtn'), '宿敵競賽選項');
  click([...doc.querySelectorAll('#modalOverlay .mbtn')].find(b => b.textContent.includes('力量障礙賽')));
  await waitFor(() => doc.querySelector('#modalOverlay .mbtn')?.textContent.includes('繼續冒險'), '競賽賽果');
  assert.strictEqual(window.eval('state.ranchCompetition.wins'), 1, '互動選項應登記勝場');
  assert.strictEqual(window.eval('state.ranchCompetition.round'), 1, '完成比賽後應排定下一場');
  assert.ok(doc.querySelector('#modalOverlay').textContent.includes('元元'), '競賽結果應呈現元元的專屬回話');
  click(doc.querySelector('#modalOverlay .mbtn'));
  await window.eval('window.__cupPromise');
  window.Math.random = Math.random;

  // 好感門檻未達時不觸發任務，達標後在一般事件日優先登場；每日挑戰停用。
  const availability = window.eval(`(() => {
    state = newState({ personality: 'balanced', dreamId: 'scholar' });
    state.relationships.teacher = 19;
    const locked = getNpcQuestEvent(state);
    state.relationships.teacher = 20;
    const ready = getNpcQuestEvent(state);
    const daily = getNpcQuestEvent(newState({ mode: 'daily', challengeDate: '2026-11-16', seed: 42 }));
    return { locked, title: ready && ready.title, chapter: ready && ready.quest.chapter, daily };
  })()`);
  assert.strictEqual(availability.locked, null);
  assert.strictEqual(availability.title, '老師的藏書票');
  assert.strictEqual(availability.chapter, 1);
  assert.strictEqual(availability.daily, null);

  // 實際走過任務選項，確認關係與章節進度寫入存檔狀態。
  window.eval(`state.relationships.teacher = 20; state.npcQuestProgress.teacher = 0; renderAll(); window.__questPromise = presentEvent(getNpcQuestEvent(state));`);
  await waitFor(() => doc.querySelector('#modalOverlay .mbtn'), 'NPC 任務選項');
  const firstChoice = [...doc.querySelectorAll('#modalOverlay .mbtn')].find(b => b.textContent.includes('整理藏書'));
  assert.ok(firstChoice, '應顯示教師任務的普通選項');
  click(firstChoice);
  await waitFor(() => doc.querySelector('#modalOverlay .mbtn')?.textContent.includes('繼續冒險'), '任務結果');
  assert.strictEqual(window.eval('state.npcQuestProgress.teacher'), 1, '完成第一章後任務進度應為 1');
  assert.ok(window.eval('state.relationships.teacher') > 20, '任務選擇應提高教師好感');
  click(doc.querySelector('#modalOverlay .mbtn'));
  await window.eval('window.__questPromise');
  assert.strictEqual(window.eval('getNpcQuestEvent(state)'), null, '第二章未達好感門檻時不可提前觸發');

  // 舊版 v1 存檔缺少新欄位時，可載入並補上預設任務狀態。
  const migration = window.eval(`(() => {
    const old = newState({ personality: 'balanced' });
    delete old.dreamId; delete old.dreamMilestones; delete old.npcQuestProgress; delete old.ranchCompetition;
    localStorage.setItem(SAVE_KEY, JSON.stringify(old));
    const loaded = loadState();
    return { dreamId: loaded.dreamId, dreamMilestones: loaded.dreamMilestones, quests: loaded.npcQuestProgress, cup: loaded.ranchCompetition };
  })()`);
  assert.strictEqual(migration.dreamId, null);
  assert.strictEqual(migration.dreamMilestones, 0);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(migration.quests)), { teacher: 0, truffle: 0 });
  assert.strictEqual(migration.cup.round, 0, '舊存檔應補上競賽狀態');
  assert.deepStrictEqual(errors, [], `頁面不應有 JavaScript 錯誤：${errors.join('; ')}`);
  console.log('✅ 夢想專精倍率、里程碑、NPC 好感任務與舊存檔遷移測試通過');
  dom.window.close();
})().catch(err => { console.error(err.stack || err); process.exit(1); });
