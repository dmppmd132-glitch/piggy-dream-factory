#!/usr/bin/env python3
"""驗證 data/events.json：JSON Schema + 節點引用 + 條件/效果/旗標的語意檢查。

用法：python3 tests/validate-events.py
需要：pip install jsonschema（僅驗證時使用，遊戲本身不需要）
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "data/events.json").read_text(encoding="utf-8"))
SCHEMA = json.loads((ROOT / "data/events.schema.json").read_text(encoding="utf-8"))

errors, warnings = [], []
STATS = {"stamina", "int", "str", "cha", "weight", "gold", "mood"}
EFFECT_RANGE = {
    "stamina": (-30, 30), "int": (-8, 12), "str": (-8, 12), "cha": (-8, 12),
    "weight": (-8, 10), "gold": (-120, 120), "mood": (-20, 20),
}

# 1. JSON Schema
try:
    import jsonschema
    validator = jsonschema.Draft202012Validator(SCHEMA)
    for e in sorted(validator.iter_errors(DATA), key=lambda e: list(e.path)):
        errors.append(f"schema: {list(e.path)}: {e.message}")
except ImportError:
    warnings.append("未安裝 Python jsonschema，Schema 驗證請執行 node tests/validate-schema.js")

npcs = set(DATA.get("npcs", {})) | {"teacher", "truffle"}
chain_ids = [c["id"] for c in DATA["chains"]]
if len(set(chain_ids)) != len(chain_ids):
    errors.append("chain id 重複")

all_flags_set, all_flags_used = set(), set()


def walk_condition(cond, where, chain_flags):
    if not cond:
        return
    for key, rng in (cond.get("stats") or {}).items():
        if key not in STATS:
            errors.append(f"{where}: 未知數值 {key}")
        for bound in ("min", "max"):
            if bound in rng and not isinstance(rng[bound], (int, float)):
                errors.append(f"{where}: stats.{key}.{bound} 必須是數字")
    for npc in (cond.get("relationship") or {}):
        if npc not in npcs:
            errors.append(f"{where}: 未定義的 NPC {npc}")
    flags = cond.get("flags") or {}
    for bucket in ("all", "any", "none"):
        all_flags_used.update(flags.get(bucket, []))
    if "atLeast" in flags:
        all_flags_used.update(flags["atLeast"].get("of", []))
    all_flags_used.update(cond.get("chainDone", []))


for chain in DATA["chains"]:
    cid = chain["id"]
    nodes = chain["nodes"]
    endings = chain["endings"]
    ending_ids = [e["id"] for e in endings]
    if len(set(ending_ids)) != len(ending_ids):
        errors.append(f"{cid}: ending id 重複")
    if chain["start"] not in nodes:
        errors.append(f"{cid}: start 節點 {chain['start']} 不存在")
    if all("requires" in e for e in endings):
        errors.append(f"{cid}: 缺少無條件的備援結局（最後一個 ending 必須沒有 requires）")
    if "requires" in endings[-1]:
        errors.append(f"{cid}: 最後一個 ending 必須是無條件備援（目前是 {endings[-1]['id']}）")

    walk_condition(chain["trigger"].get("requires"), f"{cid}.trigger", set())

    reachable = {chain["start"]}
    for node_id, node in nodes.items():
        if node.get("id") != node_id:
            errors.append(f"{cid}.{node_id}: id 與鍵名不一致")
        if node.get("terminal"):
            target = node.get("ending")
            if target not in ("auto", None) and target not in ending_ids:
                errors.append(f"{cid}.{node_id}: ending {target} 不存在")
            continue
        choices = node.get("choices") or []
        if not choices:
            errors.append(f"{cid}.{node_id}: 非 terminal 節點必須有 choices")
        choice_ids = [c["id"] for c in choices]
        if len(set(choice_ids)) != len(choice_ids):
            errors.append(f"{cid}.{node_id}: choice id 重複")
        for choice in choices:
            where = f"{cid}.{node_id}.{choice['id']}"
            if choice["next"] not in nodes:
                errors.append(f"{where}: next {choice['next']} 不存在")
            reachable.add(choice["next"])
            if "requires" in choice and "locked" not in choice:
                warnings.append(f"{where}: 有 requires 但沒有 locked 提示文字")
            for key, value in (choice.get("effects") or {}).items():
                if key not in STATS:
                    errors.append(f"{where}: 未知效果鍵 {key}")
                    continue
                lo, hi = EFFECT_RANGE[key]
                if not (lo <= value <= hi):
                    errors.append(f"{where}: {key}={value} 超出 {lo}~{hi}")
            for npc in (choice.get("relationship") or {}):
                if npc not in npcs:
                    errors.append(f"{where}: 未定義的 NPC {npc}")
            all_flags_set.update((choice.get("flags") or {}).get("set", []))
            walk_condition(choice.get("requires"), where, set())

    for ending in endings:
        where = f"{cid}.ending.{ending['id']}"
        walk_condition(ending.get("requires"), where, set())
        reward = ending["reward"]
        all_flags_set.update((reward.get("flags") or {}).get("set", []))
        for key, value in (reward.get("effects") or {}).items():
            if key not in STATS:
                errors.append(f"{where}: 未知效果鍵 {key}")
                continue
            lo, hi = EFFECT_RANGE[key]
            if not (lo <= value <= hi):
                errors.append(f"{where}: {key}={value} 超出 {lo}~{hi}")
        for npc in (reward.get("relationship") or {}):
            if npc not in npcs:
                errors.append(f"{where}: 未定義的 NPC {npc}")

    unreachable = set(nodes) - reachable
    if unreachable:
        warnings.append(f"{cid}: 無法從 start 抵達的節點 {sorted(unreachable)}")

unknown_flags = all_flags_used - all_flags_set
if unknown_flags:
    warnings.append(f"條件引用但從未設定的旗標：{sorted(unknown_flags)}")

node_count = sum(len(c["nodes"]) for c in DATA["chains"])
choice_count = sum(len(n.get("choices") or []) for c in DATA["chains"] for n in c["nodes"].values())
print(f"劇本：{len(DATA['chains'])} 條鏈、{node_count} 個節點、{choice_count} 個選項、"
      f"{sum(len(c['endings']) for c in DATA['chains'])} 個鏈結局")
for w in warnings:
    print("⚠️  " + w)
if errors:
    print(f"\n❌ {len(errors)} 個錯誤：")
    for e in errors:
        print("  - " + e)
    sys.exit(1)
print("✅ 事件連鎖劇本驗證通過")
