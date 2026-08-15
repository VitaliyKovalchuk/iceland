"""Emit Trello paste-blocks from a planner data file.

Trello's card composer creates one card per pasted line, so each block below
pastes straight into a list. Detour cost = cheapest insertion into that day.
"""
import json, sys

f = sys.argv[1] if len(sys.argv) > 1 else "ring-planner-data.json"
out = sys.argv[2] if len(sys.argv) > 2 else "../trello-ring.md"
P = json.load(open(f)); POI = P["poi"]; idx = {k: i for i, k in enumerate(P["keys"])}
mx = lambda k: POI[k].get("mx") or k
dur = lambda a, b: P["dur"][idx[mx(a)]][idx[mx(b)]]
PAD = 1.15

used = {s["loc"] for d in P["days"] for s in d["stops"]}
def cheapest(x, day):
    ks = [s["loc"] for s in day["stops"]]
    return min((round((dur(a, x) + dur(x, b) - dur(a, b)) * PAD), i + 1)
               for i, (a, b) in enumerate(zip(ks, ks[1:])))

L = []
L.append("# Iceland — Trello board\n")
L.append("Paste each block into the matching list. Trello makes one card per line.\n")
L.append("**Make these lists, left to right:**\n")
names = [f'{d["date"]} · {d.get("title","")}' for d in P["days"]]
L.append("`Pool — could add` · " + " · ".join(f"`{n}`" for n in names) + " · `Booked / fixed`\n")

for d in P["days"]:
    ks = [s["loc"] for s in d["stops"]]
    drive = round(sum(dur(a, b) for a, b in zip(ks, ks[1:])) * PAD)
    L.append(f'\n## {d["date"]} · {d.get("title","")}')
    L.append(f'_{drive//60}h{drive%60:02d} driving · sleep {POI[ks[-1]]["name"]}_\n')
    L.append("```")
    for s in d["stops"]:
        p = POI[s["loc"]]
        L.append(p["name"] if not s["dwell"] else f'{p["name"]} · {s["dwell"]}m · {p.get("cat","")}')
    L.append("```")

pool, far = [], []
for k in sorted(set(POI) - used):
    p = POI[k]
    if p.get("cat") == "airport": continue
    cost, day = min((cheapest(k, d)[0], d["date"]) for d in P["days"])
    (pool if cost <= 90 else far).append((cost, day, k, p))
L.append("\n## Pool — could add\n")
L.append(f"_{len(pool)} options, cheapest detour first. `+Nm` = extra driving if added to that day._\n")
L.append("```")
for cost, day, k, p in sorted(pool):
    L.append(f'[{day} +{cost}m] {p["name"]} · {p.get("dwell",30)}m · {p.get("cat","")}')
L.append("```")
if far:
    L.append(f'\n_Left out — over 90 min of extra driving: {", ".join(p["name"] for _,_,_,p in sorted(far))}_\n')

L.append("\n## Booked / fixed\n")
L.append("_Forward confirmation emails to the board's email-to-board address instead of typing these._\n")
L.append("```")
beds = ["keflavik_town"] + [d["stops"][-1]["loc"] for d in P["days"][:-1]]
for d, b in zip(["Oct 2"] + [x["date"] for x in P["days"][:-1]], beds):
    L.append(f'HOTEL {d} — {POI[b]["name"]}')
L.append("CAR pickup Oct 2 · KEF · drop Oct 10")
L.append("FLIGHT out Oct 2 21:00 · FLIGHT home Oct 10 23:30 (be at KEF 21:00)")
L.append("```")
open(out, "w").write("\n".join(L))
print(f"wrote {out} · {len(pool)} pool cards, {len(far)} excluded")
