#!/usr/bin/env python3
"""Turn the raw Overpass/Rexby pulls into the clean per-category files the app reads.

    python3 data/scripts/build_db.py

Reads   data/raw/*.json          untouched source pulls
Writes  data/db/*.json           one file per category, same record shape throughout

Every record carries `days`: [[km, dayIndex], ...] for each day of the ring whose driven
polyline passes within 10 km, nearest first. A place can legitimately sit on more than one
day — 1,423 of them do — so this is a list, never a single day.
"""
import json, math, pathlib, re, collections

ROOT = pathlib.Path(__file__).resolve().parents[2]
RAW, DB = ROOT / "data" / "raw", ROOT / "data" / "db"
DB.mkdir(parents=True, exist_ok=True)
R = 6371.0

# ---------------------------------------------------------------- geometry

def xy(la, ln):
    return (math.radians(ln) * math.cos(math.radians(64.9)) * R, math.radians(la) * R)

def seg_dist(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)

itin = json.loads((ROOT / "data" / "generated" / "itinerary.json").read_text())
DAY_LINES = []
for d in itin["days"]:
    ks = [s["loc"] for s in d["stops"]]
    pl = []
    for a, b in zip(ks, ks[1:]):
        if a != b:
            pl += itin["geo"][f"{a}|{b}"]
    DAY_LINES.append([xy(*p) for p in pl])

PLANNED = [
    xy(p["lat"], p["lng"])
    for k, p in itin["poi"].items()
    if p.get("cat") not in ("town", "hotel", None) and p.get("dwell", 0) > 0
]
# Reykjavik, Selfoss, Akureyri, Keflavik — used only to mark town-centre clutter
TOWNS = [(64.1466, -21.9426, 13), (63.9330, -20.9970, 4),
         (65.6835, -18.0878, 5), (63.9800, -22.5600, 6)]

def days_near(la, ln, limit=10.0):
    p = xy(la, ln)
    out = []
    for i, pl in enumerate(DAY_LINES):
        m = min((seg_dist(p, pl[j], pl[j + 1]) for j in range(len(pl) - 1)), default=1e9)
        if m <= limit:
            out.append([round(m, 1), i])
    return sorted(out)

def in_town(la, ln):
    p = xy(la, ln)
    return any(math.dist(p, xy(a, b)) < k for a, b, k in TOWNS)

def is_planned(la, ln):
    p = xy(la, ln)
    return min((math.dist(p, q) for q in PLANNED), default=9e9) < 1.0

# ---------------------------------------------------------------- tags

def pos(e):
    return (e["lat"], e["lon"]) if "lat" in e else (e["center"]["lat"], e["center"]["lon"])

def phone(t):
    v = t.get("phone") or t.get("contact:phone")
    if not v:
        return None
    v = re.sub(r"[^\d+]", "", v.split(";")[0])
    if v and not v.startswith("+"):
        v = "+354" + v.lstrip("0") if len(v) == 7 else v
    return v or None

def website(t):
    v = t.get("website") or t.get("contact:website") or t.get("url")
    if not v:
        return None
    v = v.split(";")[0].strip()
    return v if v.startswith("http") else "https://" + v

def address(t):
    street = " ".join(x for x in (t.get("addr:street"), t.get("addr:housenumber")) if x)
    city = t.get("addr:city") or t.get("addr:place")
    return ", ".join(x for x in (street or None, city) if x) or None

def base(e, name, kind, cat, limit=10.0):
    la, ln = pos(e)
    d = days_near(la, ln, limit)
    if not d:
        return None
    t = e.get("tags", {})
    rec = {
        "id": f'{e["type"][0]}{e["id"]}',
        "name": name,
        "lat": round(la, 5),
        "lng": round(ln, 5),
        "kind": kind,
        "cat": cat,
        "days": d,
        "town": bool(in_town(la, ln)),
    }
    for key, val in (
        ("phone", phone(t)), ("website", website(t)), ("address", address(t)),
        ("hours", t.get("opening_hours")), ("email", t.get("email")),
    ):
        if val:
            rec[key] = val
    if t.get("wheelchair") in ("yes", "limited"):
        rec["wheelchair"] = t["wheelchair"]
    if t.get("wikidata"):
        rec["wikidata"] = t["wikidata"]
    return rec

def load(fn):
    p = RAW / fn
    return json.loads(p.read_text())["elements"] if p.exists() else []

def dedupe(rows):
    seen, out = set(), []
    for r in sorted(rows, key=lambda r: (r["name"], -len(r))):
        k = (r["name"].lower(), round(r["lat"], 3), round(r["lng"], 3))
        if k in seen:
            continue
        seen.add(k)
        out.append(r)
    return sorted(out, key=lambda r: r["days"][0][0])

def write(fn, rows, note):
    (DB / fn).write_text(json.dumps(
        {"note": note, "count": len(rows), "items": rows},
        ensure_ascii=False, indent=1))
    by_day = collections.Counter(i for r in rows for _, i in r["days"])
    print(f'  {fn:20} {len(rows):5}   per day: ' +
          " ".join(f"{by_day.get(i,0):3}" for i in range(8)))

# ---------------------------------------------------------------- categories

SIGHT_CAT = {
    "waterfall": "waterfall", "hot_spring": "hot_spring", "geyser": "hot_spring",
    "public_bath": "baths", "swimming_pool": "baths", "beach": "beach", "arch": "coast",
    "cape": "coast", "peninsula": "coast", "volcano": "volcano", "crater": "volcano",
    "cave_entrance": "cave", "spring": "hot_spring", "viewpoint": "viewpoint",
    "attraction": "attraction", "nature_reserve": "nature", "museum": "museum",
    "ruins": "historic", "archaeological_site": "historic", "memorial": "historic",
    "monument": "historic", "castle": "historic", "church": "historic",
}
FOOD_CAT = {"restaurant": "restaurant", "cafe": "cafe", "fast_food": "fast_food",
            "bar": "bar", "pub": "bar", "bakery": "bakery"}
BIG_GROCERS = {"Bónus", "Krónan", "Nettó", "Hagkaup", "Fjarðarkaup", "Iceland"}
STAY_CAT = {"hotel": "hotel", "guest_house": "guesthouse", "hostel": "hostel",
            "motel": "hotel", "chalet": "cabin", "apartment": "apartment",
            "camp_site": "campsite", "caravan_site": "campsite"}

def tagcat(t, table):
    for k in ("waterway", "natural", "tourism", "historic", "leisure", "amenity", "shop", "place"):
        v = t.get(k)
        if v and v in table:
            return table[v]
    return None

print("building data/db from data/raw\n")
print(f'  {"file":20} {"count":>5}   per day: ' + " ".join(f"{i+1:>3}" for i in range(8)))

# --- attractions -------------------------------------------------
rows = []
for e in load("sights.json") + load("extra.json") + load("osm2.json"):
    t = e.get("tags", {})
    name = t.get("name")
    if not name:
        continue
    cat = "waterfall" if t.get("waterway") == "waterfall" else tagcat(t, SIGHT_CAT)
    if not cat or cat == "historic" and t.get("historic") in ("memorial", "monument"):
        continue
    r = base(e, name, "attraction", cat)
    if not r:
        continue
    r["planned"] = bool(is_planned(r["lat"], r["lng"]))
    rows.append(r)
write("attractions.json", dedupe(rows),
      "Sights within 10 km of the driven route. planned=true means it is already a stop.")

# --- food --------------------------------------------------------
rows = []
for e in load("food.json"):
    t = e.get("tags", {})
    name = t.get("name")
    cat = tagcat(t, FOOD_CAT)
    if not name or not cat:
        continue
    r = base(e, name, "food", cat)
    if not r:
        continue
    if t.get("cuisine"):
        r["cuisine"] = t["cuisine"].replace("_", " ")
    if t.get("diet:vegetarian") in ("yes", "only"):
        r["vegetarian"] = True
    if t.get("diet:vegan") in ("yes", "only"):
        r["vegan"] = True
    rows.append(r)
write("food.json", dedupe(rows),
      "Restaurants, cafes, bakeries and bars within 10 km of the route. "
      "Hours are OpenStreetMap volunteer data — verify anything you depend on.")

# --- fuel --------------------------------------------------------
BRAND_FIX = {"Olis": "Olís", "OB": "ÓB", "AO": "Atlantsolía", "N1 Árnes": "N1"}
rows = []
for e in load("fuel.json"):
    t = e.get("tags", {})
    if t.get("amenity") != "fuel":
        continue
    brand = t.get("brand") or t.get("operator") or t.get("name")
    brand = BRAND_FIX.get((brand or "").strip(), (brand or "").strip()) or None
    r = base(e, t.get("name") or brand or "Fuel", "fuel", "fuel")
    if not r:
        continue
    if brand:
        r["brand"] = brand
    if t.get("self_service") == "yes" or t.get("automated") == "yes":
        r["self_service"] = True
    for f in ("fuel:diesel", "fuel:octane_95"):
        if t.get(f) == "yes":
            r.setdefault("fuels", []).append(f.split(":")[1])
    rows.append(r)
write("fuel.json", dedupe(rows),
      "Petrol stations within 10 km of the route. Many rural Icelandic pumps are unmanned "
      "and card-only — carry a card with a PIN.")

# --- groceries ---------------------------------------------------
rows = []
for e in load("fuel.json"):
    t = e.get("tags", {})
    if t.get("shop") != "supermarket":
        continue
    brand = (t.get("brand") or t.get("operator") or t.get("name") or "").strip()
    big = brand in BIG_GROCERS or brand.split(" ")[0] in BIG_GROCERS
    r = base(e, t.get("name") or brand or "Supermarket", "grocery",
             "supermarket" if big else "minimarket")
    if not r:
        continue
    if brand:
        r["brand"] = brand
    rows.append(r)
write("groceries.json", dedupe(rows),
      "Supermarkets within 10 km of the route. cat=supermarket is a full shop "
      "(Bonus, Kronan, Netto, Hagkaup); minimarket is a village store or petrol-station shop.")

# --- stays -------------------------------------------------------
rows = []
for e in load("stays.json"):
    t = e.get("tags", {})
    name = t.get("name")
    cat = tagcat(t, STAY_CAT)
    if not name or not cat:
        continue
    r = base(e, name, "stay", cat)
    if not r:
        continue
    if t.get("stars"):
        r["stars"] = t["stars"]
    rows.append(r)
write("stays.json", dedupe(rows),
      "Accommodation within 10 km of the route — reference only; our own bookings live "
      "in data/trip.json.")

print("\ndone")

# --- per-day summary --------------------------------------------
# Derived, not sourced: what each day's road actually offers, plus the longest
# stretch with no fuel within 5 km. Cheap insurance against a bad assumption.

def along_route(rows, day, limit=5.0):
    """Distance along day's polyline for each row within `limit` km of it."""
    P = DAY_LINES[day]
    cum = [0.0]
    for j in range(len(P) - 1):
        cum.append(cum[-1] + math.dist(P[j], P[j + 1]))
    out = []
    for r in rows:
        q = xy(r["lat"], r["lng"])
        best = (9e9, 0.0)
        for j in range(len(P) - 1):
            (ax, ay), (bx, by) = P[j], P[j + 1]
            dx, dy = bx - ax, by - ay
            L = dx * dx + dy * dy
            t = 0 if L == 0 else max(0, min(1, ((q[0] - ax) * dx + (q[1] - ay) * dy) / L))
            d = math.hypot(q[0] - ax - t * dx, q[1] - ay - t * dy)
            if d < best[0]:
                best = (d, cum[j] + t * math.hypot(dx, dy))
        if best[0] <= limit:
            out.append((best[1], r))
    return sorted(out, key=lambda x: x[0]), cum[-1]

def load_db(fn):
    return json.loads((DB / fn).read_text())["items"]

A, F, FU, G, S = (load_db(f) for f in
                  ("attractions.json", "food.json", "fuel.json", "groceries.json", "stays.json"))

summary = []
for i, d in enumerate(itin["days"]):
    on = lambda rows: [r for r in rows if any(x[1] == i for x in r["days"])]
    fuel_on, total_km = along_route(on(FU), i)
    marks = [(0.0, "start of day")] + [(p, r["name"]) for p, r in fuel_on] + [(total_km, "end of day")]
    gaps = [(round(marks[k + 1][0] - marks[k][0]), marks[k][1], marks[k + 1][1])
            for k in range(len(marks) - 1)]
    worst = max(gaps) if gaps else (0, "", "")
    summary.append({
        "day": i + 1,
        "date": d["date"],
        "title": d.get("title", ""),
        "routeKm": round(total_km),
        "counts": {
            "attractions": len(on(A)), "food": len(on(F)),
            "fuel": len(on(FU)), "groceries": len(on(G)), "stays": len(on(S)),
            "attractionsRural": sum(1 for r in on(A) if not r["town"]),
            "foodRural": sum(1 for r in on(F) if not r["town"]),
            "bigSupermarkets": sum(1 for r in on(G) if r["cat"] == "supermarket"),
        },
        "fuelOnRoute": len(fuel_on),
        "longestFuelGapKm": worst[0],
        "longestFuelGapBetween": [worst[1], worst[2]],
    })

(DB / "days.json").write_text(json.dumps(
    {"note": "Derived per-day summary. longestFuelGapKm is the longest stretch of that "
             "day's route with no petrol station within 5 km of the road.",
     "items": summary}, ensure_ascii=False, indent=1))

print(f'\n  {"days.json":20} {len(summary):5}')
print("\n day  date     km   fuel  worst gap   attractions/food (rural)")
for s in summary:
    c = s["counts"]
    print(f'  {s["day"]}   {s["date"]:7} {s["routeKm"]:4}   {s["fuelOnRoute"]:3}   '
          f'{s["longestFuelGapKm"]:4} km    {c["attractionsRural"]:3} / {c["foodRural"]:3}')
