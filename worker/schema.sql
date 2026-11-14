-- 排行榜資料表：每台裝置只保留「最高分」那一筆
CREATE TABLE IF NOT EXISTS scores (
  device_id  TEXT PRIMARY KEY,          -- 玩家裝置代碼（匿名亂數，存在瀏覽器）
  name       TEXT NOT NULL,             -- 暱稱（已清理，最多 12 字）
  score      INTEGER NOT NULL,          -- 綜合分數
  ending_id  TEXT NOT NULL,             -- 結局代碼
  int        INTEGER NOT NULL,
  str        INTEGER NOT NULL,
  cha        INTEGER NOT NULL,
  weight     INTEGER NOT NULL,
  gold       INTEGER NOT NULL,
  runs       INTEGER NOT NULL DEFAULT 1, -- 通關次數
  created_at INTEGER NOT NULL,           -- 該最高分的時間（毫秒）
  updated_at INTEGER NOT NULL            -- 最近一次上傳（毫秒），也用來限制頻率
);
CREATE INDEX IF NOT EXISTS idx_scores_rank ON scores (score DESC, created_at ASC);
