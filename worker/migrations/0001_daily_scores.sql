-- 每日挑戰排行榜：每個日期、每台裝置各保留一筆最佳成績
CREATE TABLE IF NOT EXISTS daily_scores (
  challenge_date TEXT NOT NULL,
  device_id      TEXT NOT NULL,
  name           TEXT NOT NULL,
  score          INTEGER NOT NULL,
  ending_id      TEXT NOT NULL,
  int            INTEGER NOT NULL,
  str            INTEGER NOT NULL,
  cha            INTEGER NOT NULL,
  weight         INTEGER NOT NULL,
  gold           INTEGER NOT NULL,
  runs           INTEGER NOT NULL DEFAULT 1,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  PRIMARY KEY (challenge_date, device_id)
);
CREATE INDEX IF NOT EXISTS idx_daily_scores_rank
  ON daily_scores (challenge_date, score DESC, created_at ASC);
