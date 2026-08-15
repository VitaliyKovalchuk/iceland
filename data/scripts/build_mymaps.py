#!/usr/bin/env python3
"""Export the trip for Google My Maps (mymaps.google.com).

    python3 data/scripts/build_mymaps.py

Writes data/mymaps/:
    route.kml        the 8 day routes as lines, our stops, and the 8 beds
    day-1.csv .. day-8.csv   attractions and food near that day's road

My Maps limits that shaped this: 10 layers per map, 2,000 features per layer,
10,000 per map, and ONE FILE PER LAYER on import. There is no interactive
filtering — toggling layers is the only filter — so the layers are the days.

Import: mymaps.google.com -> Create a new map -> Import -> one file per layer.
For the CSVs pick "Latitude/Longitude" columns and "Name" as the title.
"""
import csv, json, math, pathlib, xml.sax.saxutils as esc

ROOT = pathlib.Path(__file__).resolve().parents[2]
DB, OUT = ROOT / "data" / "db", ROOT / "data" / "mymaps"
OUT.mkdir(parents=True, exist_ok=True)

itin = json.loads((ROOT / "data" / "generated" / "itinerary.json").read_text())
trip = json.loads((ROOT / "data" / "trip.json").read_text())
load = lambda n: json.loads((DB / f"{n}.json").read_text())["items"]

RADIUS_KM = 5.0          # inside this, off the road we actually drive
DAY_COLOUR = ["1F6FD0", "D55E00", "009E73", "CC79A7",
              "E69F00", "56B4E9", "8B4A9C", "B84A3E"]

# ---------------------------------------------------------------- route.kml

def kml_line(name, coords, colour, width=4):
    pts = " ".join(f"{ln},{la},0" for la, ln in coords)
    return f"""    <Placemark>
      <name>{esc.escape(name)}</name>
      <Style><LineStyle><color>ff{colour[4:6]}{colour[2:4]}{colour[0:2]}</color>
        <width>{width}</width></LineStyle></Style>
      <LineString><tessellate>1</tessellate><coordinates>{pts}</coordinates></LineString>
    </Placemark>
"""

def kml_point(name, lat, lng, desc=""):
    return f"""    <Placemark>
      <name>{esc.escape(name)}</name>
      <description>{esc.escape(desc)}</description>
      <Point><coordinates>{lng},{lat},0</coordinates></Point>
    </Placemark>
"""

def day_coords(i):
    ks = [s["loc"] for s in itin["days"][i]["stops"]]
    out = []
    for a, b in zip(ks, ks[1:]):
        if a != b:
            out += itin["geo"].get(f"{a}|{b}", [])
    return out

parts = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<kml xmlns="http://www.opensource.apple.com/xmlns/kml/2.2">'.replace(
             "http://www.opensource.apple.com/xmlns", "http://www.opengis.net"),
         "<Document><name>Iceland Ring Road 2026</name>"]

parts.append("<Folder><name>Route</name>")
for i, d in enumerate(itin["days"]):
    parts.append(kml_line(f"Day {i+1} · {d['date']} — {d.get('title','')}",
                          day_coords(i), DAY_COLOUR[i % 8]))
parts.append("</Folder>")

parts.append("<Folder><name>Our stops</name>")
for i, d in enumerate(itin["days"]):
    for s in d["stops"]:
        if not s["dwell"]:
            continue
        p = itin["poi"][s["loc"]]
        parts.append(kml_point(p["name"], p["lat"], p["lng"],
                               f"Day {i+1} · {d['date']} · {s['dwell']} min"))
parts.append("</Folder>")

parts.append("<Folder><name>Where we sleep</name>")
for b in trip["bookings"]:
    if not b.get("lat"):
        continue
    bits = [f"Night {b['night']} · {b['date']}", b.get("property", ""), b.get("address", "")]
    if b.get("bookingRef"):
        bits.append(f"Ref {b['bookingRef']}")
    if b.get("phone"):
        bits.append(b["phone"])
    if b.get("checkIn"):
        bits.append(f"Check-in {b['checkIn']}")
    parts.append(kml_point(f"Night {b['night']} — {b.get('town','')}",
                           b["lat"], b["lng"], " · ".join(x for x in bits if x)))
parts.append("</Folder>")
parts.append("</Document></kml>")
(OUT / "route.kml").write_text("\n".join(parts), encoding="utf-8")

# ---------------------------------------------------------------- day CSVs

CAT_NAME = {
    "waterfall": "Waterfall", "hot_spring": "Hot spring", "baths": "Baths",
    "beach": "Beach", "coast": "Coast", "volcano": "Volcano", "cave": "Cave",
    "viewpoint": "Viewpoint", "attraction": "Attraction", "nature": "Nature",
    "museum": "Museum", "historic": "Historic",
    "restaurant": "Restaurant", "cafe": "Cafe", "fast_food": "Fast food",
    "bakery": "Bakery", "bar": "Bar",
}

places = load("attractions") + load("food")
print(f"exporting within {RADIUS_KM:.0f} km of the route, town centres excluded\n")
print("  layer                     rows   attractions  food")
total = 0
for i, d in enumerate(itin["days"]):
    rows = []
    for p in places:
        if p["town"]:
            continue
        hit = next((h for h in p["days"] if h[1] == i and h[0] <= RADIUS_KM), None)
        if not hit:
            continue
        rows.append({
            "Name": p["name"],
            "Category": CAT_NAME.get(p["cat"], p["cat"]),
            "Type": "Attraction" if p["kind"] == "attraction" else "Food",
            "Km off route": hit[0],
            "Latitude": p["lat"],
            "Longitude": p["lng"],
            "Hours": p.get("hours", ""),
            "Phone": p.get("phone", ""),
            "Address": p.get("address", ""),
            "Website": p.get("website", ""),
        })
    rows.sort(key=lambda r: (r["Type"], r["Km off route"]))
    fn = OUT / f"day-{i+1}.csv"
    with fn.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()) if rows else ["Name"])
        w.writeheader()
        w.writerows(rows)
    a = sum(1 for r in rows if r["Type"] == "Attraction")
    total += len(rows)
    print(f"  day-{i+1}.csv  {d['date']:8} {len(rows):5}   {a:8}  {len(rows)-a:5}")

print(f"\n  route.kml   8 day lines + our stops + 8 beds")
print(f"  {total} points across 8 day layers + 1 route layer = 9 of the 10 allowed")
print(f"  written to {OUT}")
