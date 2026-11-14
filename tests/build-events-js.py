#!/usr/bin/env python3
"""把 data/events.json 包成 data/events.js（window.PIG_EVENTS），
讓遊戲在 file:// 直接開啟、或 PWA 離線時也能讀到劇本，不必 fetch JSON。

用法：python3 tests/build-events-js.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = ROOT / "data" / "events.json"
out = ROOT / "data" / "events.js"

data = json.loads(src.read_text(encoding="utf-8"))
payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
header = (
    "/* 由 tests/build-events-js.py 從 data/events.json 產生，請勿手動編輯。\n"
    " * 以 <script src=\"data/events.js\"></script> 載入，內容會掛在 window.PIG_EVENTS。\n"
    " */\n"
)
out.write_text(header + "window.PIG_EVENTS = " + payload + ";\n", encoding="utf-8")
print(f"已產生 {out.relative_to(ROOT)}（{len(payload):,} 字元）")
