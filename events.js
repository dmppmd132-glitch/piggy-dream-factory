/* 豬豬夢工場：內建事件庫（沒有 Gemini API Key，或 AI 連線失敗時使用）
 * 欄位說明：
 *   tag    觸發原因標籤（int / str / cha / weight / gold / null）；數值突破門檻時，會優先挑同標籤的事件
 *   w      （選填）只會在這些天氣出現：sunny / cloudy / rainy / hot / cold / stormy
 *   after  （選填）第幾天以後才會出現
 *   effects 數值變化：stamina / int / str / cha / weight / gold */
window.PIG_EVENTS = [
  { tag: 'gold', title: '路邊的神祕松露攤', emoji: '🍄', story: '路邊有個戴斗篷的老闆在賣松露，香味一路飄進你的鼻子。老闆壓低聲音說：「小豬，要不要來一份？」',
    choices: [
      { text: '掏錢買一份，立刻吃光', result: '松露入口即化，你幸福得直打嗝，只是荷包瘦了一圈。', effects: { stamina: 20, weight: 3, gold: -25 } },
      { text: '幫老闆搬貨換工錢', result: '你扛了一整車箱子，老闆笑得合不攏嘴，還多給了點小費。', effects: { stamina: -15, str: 2, gold: 30 } } ] },
  { tag: 'cha', title: '迷路的小雞', emoji: '🐥', story: '一隻小雞哭哭啼啼地拉著你的蹄：「我找不到媽媽了……」遠處的雞舍好像有點遠。',
    choices: [
      { text: '牽著小雞護送回家', result: '雞媽媽感動得送你一籃蛋，牧場都誇你是暖心豬。', effects: { stamina: -10, cha: 4, gold: 10 } },
      { text: '假裝沒看到，先去休息', result: '你睡了個好覺，但夢裡一直有小雞在哭，醒來有點心虛。', effects: { stamina: 15, cha: -3 } } ] },
  { tag: 'str', title: '泥巴摔角大賽', emoji: '🤼', story: '牧場舉辦年度泥巴摔角大賽，裁判一看到你就舉起大喇叭：「那邊那隻小豬，要不要上場？」',
    choices: [
      { text: '捲起袖子上場！', result: '你在泥巴裡滾了十圈，雖然全身髒兮兮，但拿到了人生第一面獎牌。', effects: { stamina: -20, str: 6, gold: 20 } },
      { text: '當啦啦隊幫大家加油', result: '你的加油聲響徹雲霄，大家都說你是最可愛的啦啦隊長。', effects: { stamina: -5, cha: 4, gold: -5 } } ] },
  { tag: 'int', title: '知識問答擂台', emoji: '🧠', story: '廣場上擺了一個「豬豬知識問答擂台」，獎金豐厚。主持人拿著麥克風問：「有誰敢來挑戰？」',
    choices: [
      { text: '舉手挑戰', result: '你一路過關斬將，連最難的「泥巴的化學式」都答對了！', effects: { stamina: -10, int: 5, gold: 25 } },
      { text: '躲去樹下睡午覺', result: '你睡得好香，只是醒來時擂台已經收攤了。', effects: { stamina: 15 } } ] },
  { tag: 'cha', title: '牧場偶像海選', emoji: '🎤', story: '牧場舉辦偶像海選，舞台上閃著五彩燈光。評審席上的老牛眼睛一亮：「那隻小豬，上來秀一段！」',
    choices: [
      { text: '上台跳一段圈圈舞', result: '你轉得又快又可愛，台下觀眾尖叫連連！', effects: { stamina: -15, cha: 6 } },
      { text: '當評審，順便吃點心', result: '你邊吃餅乾邊點評，被大家笑稱「最有說服力的評審」。', effects: { weight: 2, gold: 15 } } ] },
  { tag: 'int', title: '大野狼來敲門', emoji: '🐺', story: '一隻大野狼笑嘻嘻地站在門口：「小豬小豬，把門打開，我只是想借個鹽巴～」',
    choices: [
      { text: '用腦袋智取，反過來請他幫忙', result: '你說服野狼幫忙劈柴，還給了他一張「友善鄰居證」，皆大歡喜。', effects: { int: 4, gold: 10 } },
      { text: '直接用蠻力把他轟出去', result: '你大喝一聲，野狼嚇得連滾帶爬逃走，你也累得喘吁吁。', effects: { stamina: -15, str: 5 } } ] },
  { tag: null, w: ['rainy'], title: '下雨天的泥巴浴', emoji: '🌧️', story: '下雨了，牧場的泥巴地變成一池池暖暖的泥巴浴，對豬來說簡直是天堂。',
    choices: [
      { text: '跳進去泡個痛快', result: '你舒服得瞇起眼睛，渾身的疲勞都被洗掉了，皮膚還滑滑的。', effects: { stamina: 20, cha: 2 } },
      { text: '待在屋裡讀書', result: '你窩在被子裡讀了一本好書，雖然有點冷，但收穫滿滿。', effects: { stamina: -5, int: 3 } } ] },
  { tag: 'weight', title: '神祕老人的魔法蘋果', emoji: '🍎', story: '一位白鬍子老人遞給你一顆閃閃發光的蘋果：「吃了它，身體會變得很輕盈喔。」',
    choices: [
      { text: '吃掉魔法蘋果', result: '你的身體輕飄飄的，像是卸下了一袋飼料，只是有點頭暈。', effects: { weight: -3, stamina: -10 } },
      { text: '轉手把蘋果賣掉', result: '收藏家看到蘋果兩眼發光，立刻開出好價錢。', effects: { gold: 40 } } ] },
  { tag: 'gold', title: '小豬網紅直播', emoji: '📹', story: '一個小鴨子拿著手機跑來：「我在做直播，要不要一起上鏡？觀眾說想看豬豬！」',
    choices: [
      { text: '大方開直播', result: '你對著鏡頭轉圈圈，打賞像雪片一樣飛來。', effects: { stamina: -15, cha: 4, gold: 25 } },
      { text: '婉拒，回家睡覺', result: '你揮揮蹄走了，睡得很沉，隔天精神飽滿。', effects: { stamina: 20 } } ] },
  { tag: 'int', title: '想拜師的小老鼠', emoji: '🐭', story: '一隻失業的小老鼠跪在你面前：「大師！請收我為徒！我願意端茶倒水！」',
    choices: [
      { text: '收為徒弟，傳授知識', result: '你在教學中也學到了新東西，徒弟還送了你一包乾果。', effects: { int: 3, cha: 2, gold: -10 } },
      { text: '請他幫忙打工賺錢', result: '小老鼠勤勞地搬了一整天貨，賺來的錢你抽了一成。', effects: { gold: 25 } } ] },
  { tag: 'weight', title: '吃到飽優惠日', emoji: '🍽️', story: '鎮上新開了一間自助餐，今天開幕大優惠，只要一點點錢就能吃到肚子爆炸！',
    choices: [
      { text: '放開肚皮大吃特吃', result: '你吃到天昏地暗，肚子圓得像顆球，但元氣滿滿。', effects: { stamina: 30, weight: 6, gold: -10 } },
      { text: '只買一份外帶，克制一下', result: '你抱著外帶盒慢慢享用，滿足又不失理智。', effects: { stamina: 10, weight: 1, gold: -5 } } ] },
  { tag: 'gold', title: '路上撿到錢包', emoji: '👛', story: '你在路邊撿到一個鼓鼓的錢包，裡面有不少豬豬幣，還有一張失主的名片。',
    choices: [
      { text: '主動送去失物招領', result: '失主感動得熱淚盈眶，還送你一份謝禮，你的好名聲也傳開了。', effects: { cha: 5, gold: 10 } },
      { text: '偷偷收進口袋', result: '荷包確實變重了，但你走路總覺得背後有人在盯著你……', effects: { gold: 45, cha: -4 } } ] },
  { tag: null, w: ['rainy'], title: '雨中的屋簷小店', emoji: '🏪', story: '下起傾盆大雨，你衝進一間小雜貨店避雨。老闆娘笑著說：「進來坐，今天雨太大，一個客人都沒有。」',
    choices: [
      { text: '幫忙整理貨架', result: '你把罐頭排得整整齊齊，老闆娘塞給你一點工錢，還誇你手腳俐落。', effects: { stamina: -10, gold: 25, cha: 2 } },
      { text: '窩在角落看漫畫', result: '你看完了一整套《勇者豬豬傳》，一邊吃餅乾一邊等雨停，智商都被劇情提升了。', effects: { stamina: 15, int: 3 } } ] },
  { tag: 'cha', w: ['rainy', 'cloudy'], title: '雨後的彩虹', emoji: '🌈', story: '雨停了，天空掛起一道漂亮的彩虹，一群小鴨興奮地跑來喊：「豬豬！快來一起拍照！」',
    choices: [
      { text: '擺出最可愛的姿勢合照', result: '照片上傳後瘋狂轉發，大家都說你笑起來像一顆粉紅色的小太陽。', effects: { cha: 5, stamina: -5 } },
      { text: '追著彩虹跑到盡頭', result: '你跑到氣喘吁吁，雖然沒找到金罐子，卻在草叢裡撿到一把零錢。', effects: { str: 3, stamina: -15, gold: 15 } } ] },
  { tag: null, w: ['sunny'], title: '牧場野餐日', emoji: '🧺', story: '難得的好天氣，牧場舉辦年度野餐活動，草地上鋪滿了格子布，到處都是好吃的。',
    choices: [
      { text: '帶著大籃子盡情享用', result: '你每樣都嘗了一口，結果每樣都吃了三輪，肚子圓滾滾，元氣也滿滿。', effects: { stamina: 20, weight: 3, gold: -10 } },
      { text: '擔任活動主持人', result: '你拿著麥克風帶大家玩遊戲，全場笑聲不斷，主辦單位還發了紅包給你。', effects: { cha: 4, stamina: -10, gold: 15 } } ] },
  { tag: 'weight', w: ['sunny'], title: '曬太陽的午後', emoji: '☀️', story: '陽光暖洋洋地灑在草地上，風輕輕吹過，整個世界都在對你說：「別動，躺著就好。」',
    choices: [
      { text: '躺下來打個盹', result: '你睡得像一塊剛出爐的鬆餅，醒來全身都是陽光的味道。', effects: { stamina: 25, weight: 1 } },
      { text: '趁天氣好去慢跑一圈', result: '你沿著河邊跑了五公里，流了一身汗，心情像天空一樣晴朗。', effects: { str: 3, weight: -2, stamina: -10 } } ] },
  { tag: 'gold', w: ['hot'], title: '冰棒車叮叮噹', emoji: '🍦', story: '酷暑難耐，一輛冰棒車叮叮噹噹地開進牧場，所有動物都朝它衝過去，你也不例外。',
    choices: [
      { text: '買一支特大號冰棒', result: '冰涼的甜味從舌尖一路竄到尾巴，整隻豬都復活了，只是荷包輕了一點。', effects: { stamina: 15, weight: 2, gold: -10 } },
      { text: '幫冰棒車叫賣賺佣金', result: '你大喊「冰的冰的最好吃」，生意好到老闆決定多分你一份。', effects: { stamina: -10, cha: 3, gold: 30 } } ] },
  { tag: null, w: ['hot'], title: '池塘消暑大作戰', emoji: '🏊', story: '太陽像烤箱一樣烤著大地，牧場的池塘成了全村最熱門的景點，水面上漂滿了鴨子和游泳圈。',
    choices: [
      { text: '跳進池塘游泳', result: '你撲通一聲跳下去，一路游到對岸，肌肉和心情都舒服極了。', effects: { stamina: 10, str: 3, weight: -1 } },
      { text: '躲進圖書館吹冷氣', result: '你捧著書窩在冷氣口前，一口氣讀完三章，涼爽又充實。', effects: { int: 4, stamina: -5 } } ] },
  { tag: 'weight', w: ['cold'], title: '熱湯大叔的小攤', emoji: '🍲', story: '寒流來襲，街角一位大叔推著小攤車，熱湯的蒸氣在冷空氣裡升得老高，聞起來香到不行。',
    choices: [
      { text: '喝兩碗熱湯暖暖身子', result: '一碗下肚全身暖呼呼，第二碗下肚連耳朵都紅了，幸福指數爆表。', effects: { stamina: 20, weight: 3, gold: -10 } },
      { text: '幫大叔顧攤子換湯喝', result: '你一邊吆喝一邊攪湯，大叔笑說下次還要找你，順便給了你一點小費。', effects: { stamina: 5, cha: 2, gold: 15 } } ] },
  { tag: null, w: ['cold'], title: '圍爐的毛線手套', emoji: '🧤', story: '寒風刮得耳朵生疼，隔壁的羊奶奶正坐在暖爐前織毛線，看到你打哆嗦，朝你招招手。',
    choices: [
      { text: '跟奶奶學織毛線', result: '你笨手笨腳地織了一隻歪歪的手套，奶奶笑得合不攏嘴，說這是最有個性的作品。', effects: { int: 3, cha: 3, stamina: -10 } },
      { text: '借了手套去健身房', result: '你戴著暖呼呼的手套多練了好幾組，連呼出的白氣都帶著熱血。', effects: { str: 4, stamina: -15 } } ] },
  { tag: null, w: ['stormy'], title: '停電的暴風雨夜', emoji: '🕯️', story: '暴風雨把整個牧場的電都打掉了，屋裡一片漆黑，只剩窗外時不時閃過的雷光。',
    choices: [
      { text: '點蠟燭安靜讀書', result: '燭光搖搖晃晃，你卻越讀越專心，雷聲都成了最棒的背景音樂。', effects: { int: 5, stamina: -10 } },
      { text: '大夥聚在一起說鬼故事', result: '大家擠在一起說鬼故事，你繪聲繪影的演出讓小雞嚇到鑽進你的懷裡。', effects: { cha: 5, stamina: -5, gold: -5 } } ] },
  { tag: 'str', w: ['stormy'], title: '雷公來襲', emoji: '⚡', story: '一道閃電劈中了穀倉旁的稻草人，屋頂被風掀開一角，雨水直直灌進去，大家慌成一團。',
    choices: [
      { text: '衝出去搶救穀倉屋頂', result: '你頂著狂風暴雨扛著木板爬上屋頂，終於把洞補好，全場歡呼，還領了一筆獎金。', effects: { str: 6, stamina: -25, gold: 35 } },
      { text: '躲在被窩裡看熱鬧', result: '你裹著被子探出半顆頭看大家忙，雖然有點心虛，但睡得特別香。', effects: { stamina: 20 } } ] },
  { tag: null, w: ['cloudy'], title: '看雲猜形狀', emoji: '☁️', story: '陰天的天空佈滿厚厚的雲層，小動物們躺在草地上，開始比賽誰能猜出雲像什麼。',
    choices: [
      { text: '大聲喊出每朵雲像什麼', result: '你說有一朵像烤雞，結果全場肚子一起咕嚕叫，歡笑聲不斷。', effects: { cha: 4, stamina: -5 } },
      { text: '看著看著就睡著了', result: '你把一朵雲想成一張大棉被，下一秒就打起呼來，醒來元氣滿滿。', effects: { stamina: 20, weight: 1 } } ] },
  { tag: 'gold', title: '松露獵人公會', emoji: '🐽', story: '松露獵人公會正在招募新人，會長拍著你的肩膀說：「小豬，你的鼻子是天生的獵人！」',
    choices: [
      { text: '加入搜索隊', result: '你拱著鼻子在林間挖了一整天，滿身泥巴，卻挖出了好幾顆又大又香的松露。', effects: { stamina: -20, str: 2, gold: 50 } },
      { text: '當情報販子賣地圖', result: '你把秘密地點整理成小冊子賣給新手，賺錢之餘，腦袋也越來越靈光。', effects: { int: 3, gold: 20 } } ] },
  { tag: 'gold', title: '跳蚤市場大特賣', emoji: '🛍️', story: '週末的跳蚤市場人山人海，各種稀奇古怪的小東西擺滿整條街，看得你眼睛都花了。',
    choices: [
      { text: '擺攤賣舊玩具', result: '你把小時候的玩具擺出來，靠著一張甜嘴賣得精光，荷包鼓了起來。', effects: { stamina: -10, cha: 3, gold: 35 } },
      { text: '四處挖寶逛逛', result: '你東翻西找，撿到一本冷門的好書，雖然花了點錢，卻覺得賺到了。', effects: { int: 2, gold: -15, stamina: 5 } } ] },
  { tag: 'gold', title: '可疑的投資達人', emoji: '🕶️', story: '一位戴著墨鏡的狐狸攔住你：「小豬，這個項目三天翻三倍，保證穩賺不賠，錯過就沒有了！」',
    choices: [
      { text: '投資一點點試水溫', result: '錢是投出去了，但狐狸隔天就人間蒸發，你上了寶貴的一課。', effects: { gold: -30, cha: -2 } },
      { text: '識破並反過來開導他', result: '你條理分明地戳破每個漏洞，狐狸羞愧地低下頭，還請你喝了一杯飲料。', effects: { int: 4, cha: 3, gold: 10 } } ] },
  { tag: 'gold', title: '糖果工廠試吃員', emoji: '🍬', story: '新開的糖果工廠在徵人，要找一位「味覺靈敏、不怕胖」的試吃員，你一眼就相中了這份工作。',
    choices: [
      { text: '當試吃員吃到飽', result: '你吃到嘴角都是糖粉，肚子也圓了一圈，但薪水真的不錯。', effects: { weight: 4, gold: 35, stamina: 10 } },
      { text: '當品管員挑瑕疵', result: '你用靈敏的鼻子挑出了整批裡的瑕疵品，主管對你刮目相看。', effects: { int: 3, gold: 20, stamina: -10 } } ] },
  { tag: 'gold', title: '牧場抽獎活動', emoji: '🎟️', story: '牧場辦了一場超大型抽獎，獎品是一年份的飼料，抽獎箱前排滿了長長的人龍。',
    choices: [
      { text: '花點錢連抽三次', result: '第三張居然中獎了！你抱著獎品笑到合不攏嘴，隔壁小雞眼睛都紅了。', effects: { gold: 30, cha: 1 } },
      { text: '把抽獎券送給路過的小雞', result: '小雞感動得眼淚汪汪，逢人就說你是牧場最暖的豬。', effects: { cha: 4, gold: -5 } } ] },
  { tag: 'int', title: '圖書館的幽靈', emoji: '👻', story: '圖書館深夜總傳來翻書聲，今晚你終於看見了：一個半透明的老學者，正悠悠地漂在書架之間。',
    choices: [
      { text: '勇敢上前請教', result: '幽靈被你的勇氣感動，傳授了一整套失傳的學習方法，你頭都快冒煙了。', effects: { int: 5, stamina: -15 } },
      { text: '趁幽靈睡著偷偷研究藏書', result: '你躡手躡腳翻完了他的珍藏，雖然學到不少，卻被幽靈的鼾聲嚇得手腳發軟。', effects: { int: 3, cha: -2, gold: 15 } } ] },
  { tag: 'int', title: '神祕寶箱謎題', emoji: '🧩', story: '路邊的石頭上放著一個上鎖的寶箱，箱蓋刻著一行字：「答對這道謎題，寶藏就屬於你。」',
    choices: [
      { text: '動腦解開謎題', result: '你想了很久才發現答案是「豬」，寶箱喀的一聲打開，裡面是一疊金幣。', effects: { int: 6, stamina: -15, gold: 20 } },
      { text: '直接用蠻力砸開', result: '你一拳砸開寶箱，雖然拿到了更多錢，卻被路過的學者搖頭嘆氣。', effects: { str: 4, int: -2, gold: 35 } } ] },
  { tag: 'int', title: '數學小鴨補習班', emoji: '🦆', story: '一隻戴著小眼鏡的鴨子在公佈欄貼了一張海報：「數學補習班，保證學會，不會退費！」',
    choices: [
      { text: '報名當學生', result: '你坐在小板凳上寫了一整晚習題，鴨老師的口頭禪是「這題很簡單嘎」。', effects: { int: 5, gold: -15, stamina: -10 } },
      { text: '毛遂自薦當助教', result: '你一邊批改作業一邊解說，學生們都叫你「豬老師」，月底還領到一筆津貼。', effects: { int: 3, cha: 3, gold: 20, stamina: -10 } } ] },
  { tag: 'int', title: '天文台的夜晚', emoji: '🔭', story: '牧場後山的天文台今晚開放參觀，流星雨預計在午夜出現，館長笑著問你要不要一起來。',
    choices: [
      { text: '整晚觀星做筆記', result: '你在星空下畫了一堆星圖，還想出了自己的「豬豬座」，大家都很佩服。', effects: { int: 4, stamina: -20, cha: 2 } },
      { text: '早點睡明天再說', result: '你乖乖鑽進被窩，睡了一場好覺，隔天精神飽滿，只是錯過了流星。', effects: { stamina: 25 } } ] },
  { tag: 'str', title: '搬家工人缺人手', emoji: '📦', story: '隔壁的羊家要搬家，搬家公司臨時有人請假，羊爸爸急得團團轉，一眼看見強壯的你。',
    choices: [
      { text: '全程扛重物', result: '你一個人扛起冰箱的氣勢嚇壞了所有人，雖然累癱了，但酬勞相當豐厚。', effects: { str: 5, stamina: -25, gold: 45 } },
      { text: '負責指揮和打包', result: '你用小紙箱把東西分門別類，效率超高，羊媽媽誇你「比專業的還專業」。', effects: { int: 2, cha: 2, stamina: -10, gold: 20 } } ] },
  { tag: 'str', title: '拔河大賽', emoji: '🪢', story: '牧場拔河大賽即將開始，東邊隊還缺最後一位隊員，隊長一邊揮手一邊喊：「豬豬，你來當錨！」',
    choices: [
      { text: '當錨點使盡全力', result: '你腳底一蹬、屁股一坐，整支隊伍像生根一樣穩，最後險勝獲得冠軍。', effects: { str: 6, stamina: -20 } },
      { text: '當裁判吹哨', result: '你認真地吹哨舉旗，判得公平又清楚，現場觀眾都為你鼓掌。', effects: { cha: 3, gold: 15, stamina: -5 } } ] },
  { tag: 'str', title: '巨石擋路', emoji: '🪨', story: '一顆大到離譜的石頭滾到了路中間，把整條小路堵得水洩不通，過路的動物紛紛抱怨。',
    choices: [
      { text: '用盡全力推開它', result: '你咬緊牙關推了好久，大石頭終於一點點挪開，路人紛紛鼓掌還送你飲料。', effects: { str: 5, stamina: -20, gold: 25 } },
      { text: '號召大家一起想辦法', result: '你喊來鄰居們一起搬，還想出用木棍當槓桿的好方法，大家都覺得你很有領袖風範。', effects: { int: 3, cha: 3, stamina: -10 } } ] },
  { tag: 'str', title: '牛仔競技表演', emoji: '🤠', story: '牧場裡正舉辦牛仔競技表演，場中央站著一頭看起來很不爽的大公牛，主持人拿著麥克風尋找志願者。',
    choices: [
      { text: '挑戰騎公牛', result: '你死命抱著牛脖子撐了整整八秒，下來的時候腿軟，卻拿下全場最高分。', effects: { str: 6, stamina: -25, gold: 30 } },
      { text: '當評審吃爆米花', result: '你一邊啃爆米花一邊舉牌打分，說得頭頭是道，卻也胖了一點。', effects: { weight: 2, cha: 2, gold: -5, stamina: 5 } } ] },
  { tag: 'cha', title: '牧場週末舞會', emoji: '🪩', story: '週末牧場舞廳閃著五彩燈球，音樂震耳欲聾，大家都在舞池裡搖擺，你一進門就成了焦點。',
    choices: [
      { text: '跳出最炫的舞步', result: '你轉圈、扭腰、甩尾巴一氣呵成，舞池瞬間為你讓出一圈空地。', effects: { cha: 6, stamina: -20 } },
      { text: '接手當臨時DJ', result: '你切歌的節奏讓全場嗨翻天，老闆當場給你一筆打賞。', effects: { int: 2, cha: 3, gold: 25, stamina: -10 } } ] },
  { tag: 'cha', title: '畫家的模特兒', emoji: '🎨', story: '一位留著鬍子的畫家攔住你：「你這張臉太有故事了，願不願意讓我畫一幅肖像？」',
    choices: [
      { text: '擺一整天的姿勢', result: '你一動也不動撐了一整天，畫作掛進畫廊後，大家都說你有「藝術家氣質」。', effects: { cha: 5, stamina: -15, gold: 25 } },
      { text: '婉拒，去外面運動', result: '你揮手道別，轉頭跑去操場舉了一整個下午的啞鈴，滿身大汗但很爽快。', effects: { str: 3, stamina: -10 } } ] },
  { tag: 'cha', title: '小學演講邀請', emoji: '🎙️', story: '牧場小學請你去演講，主題是「如何成為一隻有夢想的豬」，台下坐著五十雙閃亮亮的眼睛。',
    choices: [
      { text: '親自上台演講', result: '你講到自己的奮鬥故事，講到一半台下的小豬都紅了眼眶，結束時掌聲如雷。', effects: { cha: 5, int: 2, stamina: -15 } },
      { text: '錄一段影片寄過去', result: '你在鏡頭前講了五分鐘，雖然效果普通，但省下不少力氣。', effects: { cha: 2, stamina: -5, gold: 10 } } ] },
  { tag: 'cha', title: '婚禮花童邀請', emoji: '💐', story: '牧場裡的兩隻小羊要結婚了，新娘特地跑來邀請你當花童，還說「全場只有你最適合」。',
    choices: [
      { text: '認真當花童撒花', result: '你踏著小碎步撒花瓣，優雅到連新郎都看呆了，紅包也包得特別厚。', effects: { cha: 5, stamina: -10, gold: 15 } },
      { text: '偷吃宴席上的喜餅', result: '你躲在桌子後面吃掉了整整一盤，被發現時嘴邊還沾著奶油。', effects: { weight: 4, stamina: 15, cha: -3 } } ] },
  { tag: 'weight', title: '神奇體重計', emoji: '⚖️', story: '街角出現了一台會說話的體重計，每次有人站上去，它都會用誇張的語氣評論一番。',
    choices: [
      { text: '每天乖乖站上去報到', result: '體重計每天碎念你一點，你漸漸養成自律的習慣，連腦袋都清醒不少。', effects: { weight: -2, int: 2 } },
      { text: '把它當成踩腳凳拿零食', result: '你踩著它拿到了櫃子最上層的零食，體重計氣到當場罷工。', effects: { weight: 3, stamina: 15, gold: -5 } } ] },
  { tag: 'weight', title: '清晨瑜珈課', emoji: '🧘', story: '清晨的草地上有一群小動物在做瑜伽，領頭的羊駝老師笑著向你招手：「來吧，深呼吸。」',
    choices: [
      { text: '跟著做完整套動作', result: '你的身體被拉得又長又軟，呼吸也順了，整個人像脫胎換骨。', effects: { weight: -3, cha: 3, stamina: -15 } },
      { text: '在旁邊呼呼大睡', result: '你在墊子邊緣睡得香甜，老師說這也是一種「大休息式」。', effects: { stamina: 20, weight: 1 } } ] },
  { tag: 'weight', title: '披薩外送大賽', emoji: '🍕', story: '鎮上的披薩店舉辦外送大賽，只要在三十分鐘內把披薩送到顧客手上，就能領到獎金。',
    choices: [
      { text: '騎車幫忙外送賺錢', result: '你踩著腳踏車在街上狂飆，送完十份披薩，雙腿都在發抖，但荷包飽飽的。', effects: { weight: -2, str: 2, gold: 30, stamina: -15 } },
      { text: '當試吃代表', result: '你負責試吃每一款新口味，吃到暈頭轉向，體重計上的數字也跟著往上跳。', effects: { weight: 5, stamina: 20, gold: -10 } } ] },
  { tag: null, title: '夢見傳說豬', emoji: '🌙', story: '你做了一個奇怪的夢，夢裡有一隻閃閃發光的傳說豬，對你說：「好好努力，我在終點等你。」',
    choices: [
      { text: '醒來立刻鍛鍊', result: '你被夢裡的鼓勵燃起熱血，一邊刷牙一邊深蹲，整個人精神抖擻。', effects: { str: 3, int: 2, stamina: -20 } },
      { text: '繼續睡回籠覺', result: '你把夢當成最好的催眠曲，翻個身又睡了過去，醒來全身舒暢。', effects: { stamina: 30 } } ] },
  { tag: null, title: '走失的小牛', emoji: '🐮', story: '一隻小牛在路口淚眼汪汪地東張西望，看到你立刻小跑過來：「豬豬哥哥，我找不到媽媽了…」',
    choices: [
      { text: '陪牠一起找媽媽', result: '你牽著小牛挨家挨戶地問，終於把牠送回去，牛媽媽感動地送你一壺牛奶。', effects: { cha: 4, stamina: -10, gold: 10 } },
      { text: '帶牠去草坪吃點心', result: '你和小牛在草坪上野餐，牠忘了哭，你也吃得很開心，只是媽媽稍後還是來找了。', effects: { weight: 2, stamina: 5, cha: 2 } } ] },
  { tag: null, title: '新鄰居搬來了', emoji: '🏠', story: '隔壁空了很久的小房子，今天終於搬來了新鄰居，搬家的卡車和紙箱堆滿整條路。',
    choices: [
      { text: '送上見面禮', result: '你捧著一籃水果上門自我介紹，新鄰居很感動，從此多了一位好朋友。', effects: { gold: -15, cha: 4 } },
      { text: '偷看他的書櫃', result: '你趁他整理房間時瞄了一眼書櫃，發現很多珍稀好書，忍不住借了幾本。', effects: { int: 3, cha: -1 } } ] },
  { tag: null, title: '郵差的神祕包裹', emoji: '📬', story: '郵差氣喘吁吁地敲門，遞給你一個沉甸甸的包裹，收件人欄位寫的卻是別人的名字。',
    choices: [
      { text: '偷偷收下', result: '包裹裡是一整箱松露，你吃得肚子圓滾滾，但心裡總是有點過意不去。', effects: { weight: 3, stamina: 15, cha: -3 } },
      { text: '親自送還並領謝禮', result: '失主感動得熱淚盈眶，附上一份謝禮，還在牧場裡替你美言幾句。', effects: { cha: 3, gold: 25 } } ] },
  { tag: null, title: '牧場大掃除', emoji: '🧹', story: '今天是牧場一年一度的大掃除日，所有動物都拿著掃把水桶在院子裡忙進忙出。',
    choices: [
      { text: '認真打掃全場', result: '你擦窗戶、刷地板、倒垃圾，忙得汗流浹背，結束後領到一筆辛苦費。', effects: { str: 2, stamina: -15, gold: 30 } },
      { text: '偷偷躲起來睡覺', result: '你躲在乾草堆後睡了一整個下午，醒來被抓到，被迫乖乖洗了整桶抹布。', effects: { stamina: 25, cha: -2 } } ] },
  { tag: null, after: 10, title: '流星許願', emoji: '🌠', story: '深夜裡，一顆流星劃過夜空，亮得像一把銀色的刀，你只來得及許一個願望。',
    choices: [
      { text: '許願變聰明', result: '你雙手合十認真許願，隔天起床，竟覺得自己腦袋格外清晰。', effects: { int: 5, stamina: -5 } },
      { text: '許願成為大富翁', result: '你閉上眼睛許下財富的願望，隔天在牆縫裡摸到一小袋金幣，不知是不是巧合。', effects: { gold: 40, stamina: -10 } } ] },
  { tag: null, after: 15, title: '時光膠囊', emoji: '⏳', story: '牧場廣場上舉辦了時光膠囊開啟儀式，大家圍成一圈，期待著十年前埋下的神祕箱子被打開。',
    choices: [
      { text: '挖出來看看裡面有什麼', result: '裡面有一張舊地圖和一小袋金幣，還有你小時候畫的醜醜塗鴉，讓你笑到打滾。', effects: { int: 2, gold: 30 } },
      { text: '再埋更深並加點紀念品', result: '你放進一封給未來的信，儀式感拉滿，大家都對你的浪漫讚不絕口。', effects: { cha: 3, gold: -10 } } ] },
  { tag: null, after: 20, title: '傳說豬的足跡', emoji: '👣', story: '後山的泥地上出現了一串巨大的蹄印，村民們紛紛議論，說這是傳說中的豬留下的足跡。',
    choices: [
      { text: '循著足跡拜訪', result: '你追著足跡翻山越嶺，雖然沒找到傳說豬，卻在途中悟到不少事，身體也練壯了。', effects: { int: 4, str: 4, stamina: -25 } },
      { text: '把足跡拍照賣錢', result: '你把照片洗成明信片擺攤，生意好得不得了，只是有人懷疑你是假裝的。', effects: { gold: 55, cha: -2 } } ] },
];
