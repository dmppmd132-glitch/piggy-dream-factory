/* Service Worker 更新流程測試：避免未來改版時又恢復自動 skipWaiting。 */
const fs = require('fs');
const assert = require('assert');

const sw = fs.readFileSync('sw.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const installBlock = sw.match(/self\.addEventListener\('install',[\s\S]*?\n\}\);/);

assert.ok(installBlock, '應該有 install handler');
assert.ok(!installBlock[0].includes('skipWaiting'), 'install 不應自動 skipWaiting，必須先提示玩家');
assert.ok(sw.includes("event.data.type === 'SKIP_WAITING'"), 'Service Worker 應接受使用者確認後的更新訊息');
assert.ok(sw.includes("const CACHE = 'piggy-dream-factory-v12'"), '新版應更新快取版本號');
assert.ok(html.includes('function showUpdatePrompt'), '頁面應該有新版提示');
assert.ok(html.includes('function setupServiceWorkerUpdates'), '頁面應該設定新版偵測');
assert.ok(html.includes("waiting.postMessage({ type: 'SKIP_WAITING' })"), '更新按鈕應通知等待中的 Service Worker');
console.log('✅ Service Worker 新版提示流程靜態測試通過');
