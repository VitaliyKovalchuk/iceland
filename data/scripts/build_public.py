#!/usr/bin/env python3
"""Produce data/trip.public.json — the only trip file the app is allowed to import.

The full data/trip.json holds confirmation numbers, eight addresses, phone numbers
and the exact dates our homes are empty. Rendering it on a deployed site puts all
of that in the client bundle, where hiding it in the UI achieves nothing. So the
app reads this stripped copy instead, and the real details live in Telegram.

Kept: which nights, which towns, arrival times, flights, the car's practical facts.
Tour meeting points are dropped too — one of them named a guesthouse.
Dropped: property names, addresses, confirmation numbers, phones, private notes.
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
t = json.loads((ROOT / "data/trip.json").read_text())

pub = {
    "title": t["title"],
    "bookings": [
        {k: v for k, v in b.items() if k in ("night", "date", "town", "lat", "lng")}
        for b in t["bookings"]
    ],
    "tours": [
        {k: v for k, v in x.items() if k in ("name", "date", "time", "duration")}
        for x in t["tours"]
    ],
    "flights": [
        {k: v for k, v in f.items()
         if k in ("direction", "airline", "flightNo", "from", "to", "date",
                  "depart", "arrive", "arriveDate")}
        for f in t["flights"]
    ],
    "car": {
        "model": t["car"]["model"],
        "spec": t["car"]["spec"],
        "pickup": t["car"]["pickup"],
        "dropoff": t["car"]["dropoff"],
        "restrictions": t["car"]["restrictions"],
    },
    "emergency": t.get("emergency", {}),
}
(ROOT / "data/trip.public.json").write_text(json.dumps(pub, ensure_ascii=False, indent=1))

# fail loudly if anything sensitive leaked through
blob = json.dumps(pub, ensure_ascii=False)
leaks = [s for s in ("902184", "Z111MK", "690014187", "+354464", "Hraunbrún",
                     "Tjarnabraut", "Seljavegur", "Brekkur", "Einbúastígur",
                     "Hafnarstræti", "Vesturbraut", "6460") if s in blob]
assert not leaks, f"sensitive strings leaked into trip.public.json: {leaks}"
print(f"wrote data/trip.public.json — {len(pub['bookings'])} nights, no identifiers")
