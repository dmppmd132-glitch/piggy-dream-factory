# 🐷 豬豬夢工場：30天豬生逆襲

繁體中文的「養成模擬網頁遊戲」。你有 30 天，要把一隻普通的小粉豬養成獨當一面的傳奇豬豬！

- 純前端單檔遊戲（HTML / CSS / SVG / JavaScript），**不需要任何外部圖片或建置工具**
- 可當成 **PWA** 安裝到手機／電腦主畫面，也能離線遊玩（Service Worker 快取）
- 突發事件與結局報紙頭條由 **Gemini（`gemini-2.5-flash`）** 即時生成；沒有 API Key 或連線失敗時，自動改用內建內容
- 🏆 **排行榜**：本機排行榜開箱即用；線上排行榜（Cloudflare Worker + D1）部署後在 `config.js` 填網址即可開啟

## 怎麼玩

每天選 **1 個行動**，30 天後依最終數值解鎖結局。

| 行程 | 效果 |
| --- | --- |
| 📚 豬豬圖書館 | 智慧 ＋＋、體力 −15、豬豬幣 −10 |
| 🏋️ 泥巴健身房 | 力量 ＋＋、體重 −2kg、體力 −20 |
| 💃 儀態訓練課 | 魅力 ＋＋、體力 −15、豬豬幣 −15 |
| 🍔 豪華松露大餐 | 體力 +40、體重 +5kg、豬豬幣 −25 |
| 🧹 牧場打工 | 豬豬幣 +40、體力 −20、魅力 −2 |
| 💤 睡大覺休息 | 體力 +50、體重 +1kg |

- 「＋＋」代表每次增加 6～10 點；體力低於 25 或病後虛弱時，成長打七折。
- **體力歸零**會昏倒，強制住院 2 天並扣醫藥費（最多 40G）。
- 起始數值：體力 100、智慧／力量／魅力 各 10、體重 30kg、豬豬幣 100G。
- 每隔 3～4 天，或數值突破門檻（智慧／力量／魅力 40、70，體重 70／100kg 等）時，會觸發 **突發事件**，有 2 個選項可選。

### 豬豬會跟著成長
- 智慧高 → 戴眼鏡、博士帽；力量高 → 拿木劍、戴頭盔；魅力高 → 蝴蝶結、墨鏡、閃閃發光
- 體重越重 → 越圓滾滾；三項能力都很高 → 傳說級（皇冠、披風、光環）
- 心情好 → 微笑冒愛心；疲勞 → 流汗、垂耳朵；生病 → 臉色發青、貼 OK 繃

### 17 種結局（含 1 個隱藏結局）
豬豬大總統、銀河偶像豬、米其林三星主廚豬、傳奇屠龍騎士豬、諾貝爾豬博士、橫綱相撲豬、豬豬首富、優雅貴族豬、閃電賽跑豬、躺平沙發馬鈴薯豬、山林隱士豬……以及一個隱藏的「傳說中的全能豬」。
通關後可在「📖 結局圖鑑」查看已解鎖的結局。

## 🏆 排行榜

**綜合分數** ＝ 智慧＋力量＋魅力 ＋ 豬豬幣÷10（最多 100 分）＋ 結局稀有度（每顆星 40 分，隱藏結局再 +50 分）。

- **本機排行榜**：通關後自動記錄（保留前 30 名），存在這台裝置的瀏覽器，不需要任何設定。
- **線上排行榜**：所有玩家共用，需要先部署 `worker/` 裡的伺服器（見下）。沒部署時，遊戲會自動隱藏上傳按鈕，其他功能不受影響。
- 每位玩家（以匿名裝置代碼辨識）在線上只保留**最高分**一筆；暱稱最多 12 字。

### 部署線上排行榜（Cloudflare 免費方案即可）

需要 Node.js 與 Cloudflare 帳號。

```bash
cd worker
npx wrangler login
# 資料庫 piggy-leaderboard 與資料表已建立好，wrangler.toml 已填入 database_id，這兩步可略過：
#   npx wrangler d1 create piggy-leaderboard
#   npx wrangler d1 execute piggy-leaderboard --remote --file=schema.sql
# 若要換成自己的資料庫，才需要執行上面兩行並改 wrangler.toml 的 database_id。
# 確認 wrangler.toml 的 ALLOWED_ORIGINS 是你的 GitHub Pages 網址（例如 https://<帳號>.github.io）
npx wrangler deploy
```

部署完成會得到 `https://piggy-dream-factory-leaderboard.<帳號>.workers.dev`，把它填進專案根目錄的 `config.js`：

```js
window.PIG_CONFIG = { leaderboardUrl: 'https://piggy-dream-factory-leaderboard.<帳號>.workers.dev' };
```

再把修改後的 `config.js` 推上 GitHub 即可。

### 關於防作弊（請先知道的限制）

這是純前端遊戲，成績由玩家的瀏覽器送出，**無法做到真正防作弊**，有心人可以直接呼叫 API 送出任何「看起來合理」的數值。目前的防護只有：

- 伺服器用與遊戲相同的規則（`game-core.js`）**重新計算結局與分數**，不信任前端傳來的分數；
- 檢查每項數值的範圍、結局與數值是否相符；
- 同一裝置兩次上傳至少間隔 20 秒、請求大小限制、只允許指定網站來源（CORS）；
- 暱稱會清理，顯示時一律跳脫，避免被塞入 HTML。

這些能擋掉亂填與隨手竄改，但擋不住用腳本送出「最完美成績」的人。若需要更嚴格，必須改成由伺服器模擬整局遊戲（記錄每天的行動並重算），這會是較大的改動。

## 開啟 AI 事件（選填）

1. 到 [Google AI Studio](https://aistudio.google.com/apikey) 取得 Gemini API Key。
2. 遊戲右上角「⚙️ 設定」貼上 Key 並儲存。

> 🔒 Key 只會存在你自己裝置的瀏覽器（`localStorage`），並直接傳給 Google，不會上傳到本專案。
> **請不要把 API Key 寫進程式碼或提交到 GitHub。** 如果要公開部署，建議維持「每位玩家自行輸入 Key」的做法。

## 本機執行

PWA 需要 `http://localhost` 或 `https://` 才能註冊 Service Worker：

```bash
# 在專案資料夾內
python3 -m http.server 8080
# 然後開啟 http://localhost:8080
```

直接雙擊開啟 `index.html` 也能玩，只是不會有離線／安裝功能。

## 部署到 GitHub Pages

1. 到 repo 的 **Settings → Pages**。
2. Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾 `/ (root)`，按 Save。
3. 幾分鐘後即可用 `https://<你的帳號>.github.io/piggy-dream-factory/` 開啟。
4. 手機瀏覽器開啟後：
   - Android Chrome：選單 →「安裝應用程式／加到主畫面」
   - iPhone Safari：分享 →「加入主畫面」

## 專案結構

```
index.html              遊戲本體（畫面、SVG 豬豬、遊戲邏輯、Gemini 串接、排行榜介面）
game-core.js            共用核心：結局判定、計分、成績驗證（遊戲與伺服器共用）
config.js               設定檔（線上排行榜網址）
worker/                 線上排行榜伺服器（Cloudflare Worker + D1）
manifest.webmanifest    PWA 設定
sw.js                   Service Worker（離線快取）
icon.svg                向量圖示
icons/                  PNG 圖示（192、512、maskable、apple-touch-icon）
```

更新遊戲後若想讓玩家立即拿到新版，請把 `sw.js` 裡的 `CACHE` 版本號加 1。
