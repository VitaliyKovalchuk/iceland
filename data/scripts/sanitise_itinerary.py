#!/usr/bin/env python3
"""Strip booking identity out of the itinerary the APP ships.

    python3 data/scripts/sanitise_itinerary.py

The bed POIs pick up property names in search/note/activity whenever the route is
re-synced from the planning workspace, and anything in itinerary.json ends up in
the client bundle. This runs after every sync so the leak cannot come back — it
did once, because the fix lived in a one-off command instead of the pipeline.
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
p = ROOT / "data/generated/itinerary.json"
R = json.loads(p.read_text())
POI = R["poi"]

TOWNS = {"keflavik_town": "Keflavík", "skagastrond": "Skagaströnd", "myvatn": "Mývatn",
         "egilsstadir": "Egilsstaðir", "hofn": "Höfn", "klaustur": "Kirkjubæjarklaustur",
         "vik": "Vík í Mýrdal", "reykjavik": "Reykjavík"}
NOTE = "Tonight's bed. Address and confirmation are in Telegram."

for k, town in TOWNS.items():
    if k in POI:
        POI[k] = dict(POI[k], name=town, search=town, note=NOTE, activity=NOTE)

# Drop only UNUSED POIs that still carry an address — an abandoned booking leaves
# one behind. Unused sightseeing POIs are alternates worth keeping.
used = {s["loc"] for d in R["days"] for s in d["stops"]}
used |= {POI[k].get("mx") for k in used if POI[k].get("mx")}
IDENTIFYING = ("Salthús", "Hlíð Bed", "Lonid", "Arctic Exclusive", "Hoepfner",
               "Tjarnabraut", "Hraunbrún", "Einbúastígur", "Vesturbraut",
               "Seljavegur", "Hafnarstræti", "Brekkur")
def carries_address(k):
    blob = json.dumps(POI[k], ensure_ascii=False)
    return any(x in blob for x in IDENTIFYING)
for dead in [k for k in list(POI) if k not in used and carries_address(k)]:
    if dead in R["keys"]:
        i = R["keys"].index(dead)
        R["keys"].pop(i)
        R["dur"] = [[v for j, v in enumerate(row) if j != i] for n, row in enumerate(R["dur"]) if n != i]
        R["dist"] = [[v for j, v in enumerate(row) if j != i] for n, row in enumerate(R["dist"]) if n != i]
    POI.pop(dead, None)
    R["geo"] = {g: v for g, v in R["geo"].items() if dead not in g.split("|")}
    print(f"  dropped unused POI {dead}")

p.write_text(json.dumps(R, ensure_ascii=False, separators=(",", ":")))

blob = json.dumps(R, ensure_ascii=False)
leaks = [s for s in ("Salthús", "Hlíð Bed", "Lonid", "Arctic Exclusive", "Brekkur",
                     "Seljavegur", "Tjarnabraut", "Hraunbrún", "Einbúastígur",
                     "Hafnarstræti 20", "Vesturbraut", "Hoepfner") if s in blob]
assert not leaks, f"property names still in itinerary.json: {leaks}"
print(f"  sanitised — {len(R['keys'])} POIs, no property names")
