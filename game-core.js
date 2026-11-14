/* =====================================================================
 *  豬豬夢工場：共用核心
 *  結局判定、計分、成績驗證。遊戲（瀏覽器）與排行榜伺服器（Cloudflare Worker）
 *  共用同一份規則，避免兩邊判斷不一致。
 *  - 瀏覽器：<script src="game-core.js"> 之後用全域的 PigCore
 *  - Worker ：import '../../game-core.js' 之後用 globalThis.PigCore
 * ===================================================================== */
(function (root) {
  'use strict';

  // 三項能力都達此值＝傳說級全能豬（外觀變傳說＋隱藏結局）
  const OMNI_MIN = 70;
  const NAME_MAX = 12;
  const DAILY_RULES_VERSION = 1;

  // 依 UTC 日期產生穩定、公開的每日挑戰種子；版本字串固定後不可任意改動。
  function dailySeed(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const parsed = new Date(date + 'T00:00:00Z');
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
    const text = `piggy-dream-factory-daily-v${DAILY_RULES_VERSION}:${date}`;
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) || 1;
  }

  // 多重結局（陣列順序 = 判定優先順序，第一個符合的就是結局）
  const ENDINGS = [
    { id: 'omni', emoji: '🌟', title: '傳說中的全能豬', stars: 3, hidden: true,
      hint: '智慧、力量、魅力三項都達 70 以上',
      test: s => Math.min(s.int, s.str, s.cha) >= OMNI_MIN,
      headline: '「全能豬」橫空出世　全牧場跪著喊偶像', quote: '我只是比較努力，不是比較神。',
      story: '你既會解微積分，又能徒手劈木頭，還順便把整個牧場的小雞都迷倒。長老們決定把牧場改名為「豬豬王國」，你一邊啃蘋果一邊說：「低調，低調。」' },
    { id: 'president', emoji: '🎩', title: '豬豬大總統', stars: 3,
      hint: '智慧、魅力都達 60 以上，且豬豬幣至少 80',
      test: s => s.int >= 60 && s.cha >= 60 && s.gold >= 80,
      headline: '豬豬大總統就職　首道命令竟是「加菜」', quote: '我的政見只有一個：每天都要吃得飽！',
      story: '憑著聰明的腦袋與迷人的演說，你高票當選第一任豬豬大總統。就職典禮上，你宣布國定假日增加到每週五天，全國豬民當場落淚鼓掌。' },
    { id: 'idol', emoji: '🎤', title: '銀河偶像豬', stars: 3,
      hint: '魅力 70 以上，體重 60kg 以下',
      test: s => s.cha >= 70 && s.weight <= 60,
      headline: '銀河偶像豬巡演破億人次　螢光棒庫存全宇宙告罄', quote: '大家的愛，我都收到了～哼哼！',
      story: '你的歌聲從牧場傳到了銀河系，外星粉絲開著飛碟來應援。你在舞台上轉圈圈、比愛心，連黑洞都想拿來當你的背景。' },
    { id: 'lightning', emoji: '⚡', title: '閃電賽跑豬', stars: 2,
      hint: '體重降到 20kg 以下，力量 30 以上（瘦到極致）',
      test: s => s.weight <= 20 && s.str >= 30,
      headline: '閃電賽跑豬刷新紀錄　目擊者：「只看到一道粉紅色殘影」', quote: '我跑太快，連影子都追不上我。',
      story: '瘦身加上鍛鍊，你變成了一道粉紅色閃電。田徑場的計時器因為跟不上你的速度，當場宣告罷工。' },
    { id: 'knight', emoji: '🐉', title: '傳奇屠龍騎士豬', stars: 3,
      hint: '力量 70 以上，體重在 21～75kg 之間',
      test: s => s.str >= 70 && s.weight <= 75,
      headline: '屠龍騎士豬凱旋　巨龍：「我只是想借個火」', quote: '其實那隻龍人很好，我們現在是球友。',
      story: '你扛著木劍殺進龍穴，和巨龍大戰三百回合，最後兩邊累癱在地上一起看星星。傳說就這樣誕生了，只是細節被吟遊詩人誇大了一點點。' },
    { id: 'nobel', emoji: '🔬', title: '諾貝爾豬博士', stars: 2,
      hint: '智慧 70 以上',
      test: s => s.int >= 70,
      headline: '諾貝爾獎頒給豬博士　發明「永不冷掉的鹹酥雞」', quote: '科學的盡頭，是好吃。',
      story: '你的腦袋裡裝著整座圖書館，還發明了讓午餐永遠保溫的魔法鍋。評審團邊吃邊投票，全票通過。' },
    { id: 'sumo', emoji: '🥋', title: '橫綱相撲豬', stars: 2,
      hint: '力量 40 以上，體重 60kg 以上',
      test: s => s.str >= 40 && s.weight >= 60,
      headline: '橫綱豬一屁股坐贏冠軍　對手：「我被壓扁了」', quote: '體重是我的武器，也是我的溫柔。',
      story: '你用壯碩的體格與扎實的肌肉稱霸土俵，每次入場地面都會抖三下。粉絲說，你的屁股比任何必殺技都有說服力。' },
    { id: 'chef', emoji: '👨‍🍳', title: '米其林三星主廚豬', stars: 2,
      hint: '體重 55kg 以上，且智慧或魅力 35 以上',
      test: s => s.weight >= 55 && (s.int >= 35 || s.cha >= 35),
      headline: '米其林三星主廚豬開店　排隊人龍繞牧場三圈', quote: '好吃的秘訣？先自己吃三碗。',
      story: '你把松露、熱情和一點點泥土香燉進同一鍋湯，竟成了全國最搶手的料理。評審吃完眼眶泛淚，說這是「家的味道」。' },
    { id: 'tycoon', emoji: '💰', title: '豬豬首富', stars: 2,
      hint: '豬豬幣 350 以上',
      test: s => s.gold >= 350,
      headline: '豬豬首富誕生　金幣多到拿來當枕頭', quote: '錢不是萬能，但可以買很多松露。',
      story: '你把每一枚豬豬幣都存得好好的，30 天後荷包滿到快爆炸。銀行行員看到你都立正站好，還請你坐上最軟的那張沙發。' },
    { id: 'noble', emoji: '👑', title: '優雅貴族豬', stars: 2,
      hint: '魅力 50 以上，豬豬幣 200 以上',
      test: s => s.cha >= 50 && s.gold >= 200,
      headline: '優雅貴族豬舉辦茶會　全場小指翹得比天高', quote: '請用茶，不過別吃我的杯子。',
      story: '你舉止優雅、口袋又夠深，鄰近牧場的豬都搶著收你的茶會邀請函。連最挑剔的老鵝都忍不住說：「哎呀，真有品味。」' },
    { id: 'broke', emoji: '🥲', title: '窮得很快樂的流浪豬藝術家', stars: 1,
      hint: '最後豬豬幣只剩 10 以下',
      test: s => s.gold <= 10,
      headline: '流浪豬藝術家街頭開唱　帽子裡只有一顆鈕扣', quote: '錢包空空，心裡滿滿。',
      story: '你的豬豬幣花光了，但沒關係，你用快樂換來了滿滿的故事。路人投進帽子的，是一顆鈕扣和一個大大的微笑。' },
    { id: 'couch', emoji: '🛋️', title: '躺平沙發馬鈴薯豬', stars: 1,
      hint: '三項能力都低於 35，體重 45kg 以上',
      test: s => s.int < 35 && s.str < 35 && s.cha < 35 && s.weight >= 45,
      headline: '沙發馬鈴薯豬宣布「今年都不起床」　鄰居：「他其實很快樂」', quote: '人生的意義就是……再睡五分鐘。',
      story: '你把沙發睡成了自己的形狀，遙控器就是你的權杖。雖然沒有什麼成就，但你笑得比誰都開心。' },
    { id: 'hermit', emoji: '🍃', title: '山林隱士豬', stars: 1,
      hint: '三項能力都低於 35，體重 45kg 以下',
      test: s => s.int < 35 && s.str < 35 && s.cha < 35,
      headline: '山林隱士豬歸隱　小鳥與松鼠都來串門子', quote: '我不是躲起來，我是在發呆。',
      story: '你選擇遠離塵囂，每天看雲、數樹葉，自在得像一陣風。山裡的小動物都說，你是最好的聊天對象。' },
    { id: 'teacher', emoji: '🍎', title: '豬豬小學名師', stars: 1,
      hint: '智慧 40 以上，且為三項能力中最高',
      test: s => s.int >= 40 && s.int >= s.str && s.int >= s.cha,
      headline: '名師豬獲頒「年度最佳老師」　學生：「他的點心最好吃」', quote: '不會的題目，我們一起吃飽再想。',
      story: '你把學到的知識教給小豬們，教室永遠充滿笑聲與餅乾香。畢業典禮那天，全班小豬一起把你拋向空中。' },
    { id: 'guard', emoji: '🛡️', title: '牧場金牌保鑣豬', stars: 1,
      hint: '力量 40 以上，且高過魅力',
      test: s => s.str >= 40 && s.str >= s.cha,
      headline: '金牌保鑣豬守護牧場　野狼聞風喪膽', quote: '有我在，沒有人可以偷吃飼料。',
      story: '你的肌肉成了牧場最可靠的圍牆。夜裡野狼探頭一看，被你的背影嚇得連夜搬家。' },
    { id: 'influencer', emoji: '📱', title: '人氣網紅豬', stars: 1,
      hint: '魅力 40 以上',
      test: s => s.cha >= 40,
      headline: '人氣網紅豬粉絲破萬　一支「轉圈圈」影片爆紅', quote: '記得按讚、訂閱、再來一份松露！',
      story: '你的一舉一動都被拍成短影音，轉圈圈的片段更被全牧場瘋傳。走在路上都有小雞跑來要簽名。' },
    { id: 'default', emoji: '🌾', title: '平凡幸福小豬', stars: 1,
      hint: '不上不下，過著剛剛好的日子',
      test: () => true,
      headline: '平凡小豬過著幸福日常　鄰居：「看到他就覺得安心」', quote: '今天的太陽很溫暖，真好。',
      story: '你沒有成為傳奇，卻把每一天都過得踏實又開心。傍晚坐在籬笆邊看夕陽，你覺得，這樣就很好了。' },
  ];
  function pickEnding(s) { return ENDINGS.find(e => e.test(s)); }

  // 綜合分數 = 三項能力總和 + 豬豬幣分（每 10G 得 1 分，上限 100）+ 結局稀有度（每顆星 40 分，隱藏結局再 +50）
  function calcScore(s, ending) {
    const e = ending || pickEnding(s);
    const base = s.int + s.str + s.cha;
    const goldPts = Math.min(100, Math.floor(s.gold / 10));
    const endPts = e.stars * 40 + (e.hidden ? 50 : 0);
    return { total: base + goldPts + endPts, base, goldPts, endPts };
  }

  // 暱稱整理：去掉控制字元與尖括號、合併空白、最多 12 個字
  function cleanName(raw) {
    if (typeof raw !== 'string') return '';
    const t = raw.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
    return Array.from(t).slice(0, NAME_MAX).join('');
  }

  // 驗證要上傳的最終成績（只能檢查「合理性」，無法防止有心人偽造）
  function validateSubmission(raw) {
    if (!raw || typeof raw !== 'object') return { error: '資料格式錯誤' };
    const s = {};
    const ranges = { int: [0, 100], str: [0, 100], cha: [0, 100], weight: [10, 200], gold: [0, 3000] };
    for (const [k, [lo, hi]] of Object.entries(ranges)) {
      const v = raw[k];
      if (!Number.isInteger(v) || v < lo || v > hi) return { error: '數值超出合理範圍：' + k };
      s[k] = v;
    }
    const ending = pickEnding(s);
    if (raw.endingId !== undefined && raw.endingId !== ending.id) return { error: '結局與數值不符' };
    return { stats: s, ending, score: calcScore(s, ending) };
  }

  root.PigCore = { OMNI_MIN, NAME_MAX, DAILY_RULES_VERSION, dailySeed, ENDINGS, pickEnding, calcScore, cleanName, validateSubmission };
})(typeof globalThis !== 'undefined' ? globalThis : window);
