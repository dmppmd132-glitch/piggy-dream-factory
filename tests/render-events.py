#!/usr/bin/env python3
"""把 data/events.json 渲染成可校稿的 Markdown 劇本全文（docs/event-scripts.md）。

用法：python3 tests/render-events.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "data/events.json").read_text(encoding="utf-8"))
OUT = ROOT / "docs" / "event-scripts.md"

LABEL = {"stamina": "體力", "int": "智慧", "str": "力量", "cha": "魅力", "weight": "體重", "gold": "豬豬幣", "mood": "心情"}
UNIT = {"weight": "kg", "gold": "G"}
PERSONA = {"balanced": "平凡小豬", "lazy": "慵懶小豬", "scholar": "學者豬", "foodie": "吃貨豬", "star": "明星豬", "athlete": "運動豬", "brave": "冒險豬"}
THEME = {"warmth": "暖心", "money": "金錢", "mystery": "神秘", "courage": "勇氣", "dream": "夢想", "legend": "傳說"}


def fmt_range(r):
    lo, hi = r.get("min"), r.get("max")
    if lo is not None and hi is not None:
        return f"{lo}～{hi}"
    if lo is not None:
        return f"≥ {lo}"
    return f"≤ {hi}"


def cond_text(c):
    if not c:
        return "無條件"
    parts = []
    if "day" in c:
        parts.append(f"第 {fmt_range(c['day'])} 天")
    for key, rng in (c.get("stats") or {}).items():
        parts.append(f"{LABEL.get(key, key)} {fmt_range(rng)}")
    for npc, rng in (c.get("relationship") or {}).items():
        name = DATA.get("npcs", {}).get(npc, {}).get("name", npc)
        parts.append(f"{name}好感 {fmt_range(rng)}")
    flags = c.get("flags") or {}
    if flags.get("all"):
        parts.append("同時有 " + "、".join(f"`{f}`" for f in flags["all"]))
    if flags.get("any"):
        parts.append("任一個 " + "、".join(f"`{f}`" for f in flags["any"]))
    if flags.get("none"):
        parts.append("沒有 " + "、".join(f"`{f}`" for f in flags["none"]))
    if flags.get("atLeast"):
        a = flags["atLeast"]
        parts.append(f"以下至少 {a['count']} 個：" + "、".join(f"`{f}`" for f in a["of"]))
    if c.get("personality"):
        parts.append("個性為 " + "、".join(PERSONA.get(p, p) for p in c["personality"]))
    if c.get("chainDone"):
        parts.append("已完成 " + "、".join(f"`{x}`" for x in c["chainDone"]))
    if "chance" in c:
        parts.append(f"機率 {round(c['chance'] * 100)}%")
    return "；".join(parts) if parts else "無條件"


def effects_text(e):
    if not e:
        return ""
    return "、".join(f"{LABEL[k]} {v:+d}{UNIT.get(k, '')}" for k, v in e.items())


def npc_text(r):
    if not r:
        return ""
    return "、".join(f"{DATA.get('npcs', {}).get(n, {}).get('name', n)} 好感 {v:+d}" for n, v in r.items())


def flag_text(f):
    if not f:
        return ""
    bits = []
    if f.get("set"):
        bits.append("獲得 " + "、".join(f"`{x}`" for x in f["set"]))
    if f.get("clear"):
        bits.append("移除 " + "、".join(f"`{x}`" for x in f["clear"]))
    return "；".join(bits)


def mermaid(chain):
    lines = ["```mermaid", "flowchart TD", f'  start(["{chain["emoji"]} {chain["title"]}"]) --> {chain["start"]}']
    for nid, node in chain["nodes"].items():
        text = (node.get("speaker") or nid).replace('"', "'")
        if node.get("terminal"):
            end = node.get("ending")
            label = "依條件判定" if end == "auto" else f"結局：{end}"
            lines.append(f'  {nid}["{text}<br/>{nid}"] --> END_{nid}(["{label}"])')
            continue
        lines.append(f'  {nid}["{text}<br/>{nid}"]')
        for c in node["choices"]:
            label = c["text"][:12].replace('"', "'")
            lines.append(f'  {nid} -->|"{label}"| {c["next"]}')
    lines.append("```")
    return "\n".join(lines)


out = []
out.append("# 事件連鎖劇本全文\n")
out.append("> 本文件由 `tests/render-events.py` 從 `data/events.json` 自動產生，請不要手動編輯。\n")
out.append("> 修改劇本請改 JSON，再執行 `python3 tests/render-events.py` 重新產生。\n")
chains = DATA["chains"]
nodes = sum(len(c["nodes"]) for c in chains)
choices = sum(len(n.get("choices") or []) for c in chains for n in c["nodes"].values())
endings = sum(len(c["endings"]) for c in chains)
out.append(f"目前共 **{len(chains)} 條事件鏈**、{nodes} 個節點、{choices} 個選項、{endings} 個鏈結局。\n")
out.append("## 目錄\n")
for c in chains:
    out.append(f"- [{c['emoji']} {c['title']}（`{c['id']}`）](#{c['id']})")
out.append("")

for c in chains:
    out.append(f'<a id="{c["id"]}"></a>\n')
    hidden = "（隱藏）" if c.get("hidden") else ""
    out.append(f"## {c['emoji']} {c['title']}{hidden}\n")
    out.append(f"`{c['id']}`｜主題：{THEME.get(c['theme'], c['theme'])}｜{c['summary']}\n")
    affinity = "、".join(PERSONA.get(p, p) for p in c.get("personalityAffinity", [])) or "無偏好"
    out.append(f"- 個性偏好：{affinity}")
    out.append(f"- 觸發條件：{cond_text(c['trigger'].get('requires'))}")
    out.append(f"- 觸發時間：第 {fmt_range(c['trigger']['day'])} 天，優先度 {c['trigger']['priority']}")
    out.append("")
    out.append(mermaid(c))
    out.append("")

    for nid, node in c["nodes"].items():
        terminal = "（結束節點）" if node.get("terminal") else ""
        speaker = node.get("speaker") or nid
        out.append(f"### {nid}｜{speaker}{terminal}\n")
        out.append(f"> {node['text']}\n")
        if node.get("terminal"):
            out.append(f"→ 結局判定：`{node.get('ending')}`\n")
            continue
        for i, ch in enumerate(node["choices"]):
            mark = "🔒 " if ch.get("requires") else ""
            out.append(f"- **{chr(65 + i)}. {mark}{ch['text']}** → `{ch['next']}`")
            if ch.get("locked"):
                out.append(f"  - 解鎖條件：{ch['locked']}")
            if ch.get("requires"):
                out.append(f"  - 條件：{cond_text(ch['requires'])}")
            out.append(f"  - 結果：{ch['result']}")
            detail = [x for x in (effects_text(ch.get("effects")), npc_text(ch.get("relationship")), flag_text(ch.get("flags"))) if x]
            if detail:
                out.append("  - 變化：" + "｜".join(detail))
        out.append("")

    out.append("### 鏈結局\n")
    for e in c["endings"]:
        out.append(f"#### {e['emoji']} {e['title']}（`{e['id']}`）\n")
        out.append(f"- 條件：{cond_text(e.get('requires'))}")
        out.append(f"> {e['text']}\n")
        r = e["reward"]
        detail = [x for x in (effects_text(r.get("effects")), npc_text(r.get("relationship")), flag_text(r.get("flags"))) if x]
        if detail:
            out.append("- 獎勵：" + "｜".join(detail))
        if r.get("title"):
            out.append(f"- 稱號：{r['title']}")
        if r.get("log"):
            out.append(f"- 日記：{r['log']}")
        out.append("")

OUT.parent.mkdir(parents=True, exist_ok=True)
text = "\n".join(out)
text = re.sub(r"\n{3,}", "\n\n", text)
text = re.sub(r"(?<!\n)\n(#{1,4} )", r"\n\n\1", text)
text = re.sub(r"(?m)^(#{1,4} .*)\n(?!\n)", r"\1\n\n", text)
OUT.write_text(text.rstrip("\n") + "\n", encoding="utf-8")
print(f"已產生 {OUT.relative_to(ROOT)}（{len(text.splitlines())} 行）")
