#!/usr/bin/env python3
"""Generate one pinned starter message per Telegram topic, from the verified data.

    python3 data/scripts/build_telegram.py > data/telegram.txt

Nothing here is retyped by hand — times, distances and daylight come from the same
itinerary the app renders, so the pinned messages cannot drift from the plan.
"""
import json, math, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parents[2]
R = json.loads((ROOT / "data/generated/itinerary.json").read_text())
T = json.loads((ROOT / "data/trip.json").read_text())
P = R["poi"]
idx = {k: i for i, k in enumerate(R["keys"])}
mx = lambda k: P[k].get("mx") or k
leg = lambda a, b: (round(R["dur"][idx[mx(a)]][idx[mx(b)]] * 1.15),
                    R["dist"][idx[mx(a)]][idx[mx(b)]])
hm = lambda m: f"{int(m)//60:02d}:{int(m)%60:02d}"
rad, deg = math.pi / 180, 180 / math.pi

def sun(lat, lng, day):
    y, m, dd = 2026, 10, day
    A = y // 100; B = 2 - A + A // 4
    jd = int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + dd + B - 1524.5
    t = (jd - 2451545) / 36525
    L0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360
    M = 357.52911 + t * (35999.05029 - 0.0001537 * t)
    e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)
    C = (math.sin(M*rad)*(1.914602-t*(0.004817+0.000014*t)) +
         math.sin(2*M*rad)*(0.019993-0.000101*t) + math.sin(3*M*rad)*0.000289)
    lam = L0 + C - 0.00569 - 0.00478 * math.sin((125.04-1934.136*t)*rad)
    eps = 23 + (26 + (21.448 - t*(46.815+t*(0.00059-t*0.001813)))/60)/60 + \
          0.00256*math.cos((125.04-1934.136*t)*rad)
    dec = math.asin(math.sin(eps*rad)*math.sin(lam*rad))*deg
    yy = math.tan(eps/2*rad)**2
    eot = 4*deg*(yy*math.sin(2*L0*rad) - 2*e*math.sin(M*rad) +
                 4*e*yy*math.sin(M*rad)*math.cos(2*L0*rad) -
                 0.5*yy*yy*math.sin(4*L0*rad) - 1.25*e*e*math.sin(2*M*rad))
    cosH = math.cos(90.833*rad)/(math.cos(lat*rad)*math.cos(dec*rad)) - \
           math.tan(lat*rad)*math.tan(dec*rad)
    H = math.acos(max(-1, min(1, cosH))) * deg
    noon = 720 - 4*lng - eot
    return round(noon - 4*H), round(noon + 4*H)

import re
def _country(q):
    """Some search strings already end in ", Iceland" — do not append it twice."""
    q = q.strip()
    return q if re.search(r",\s*iceland\s*$", q, re.I) else q + ", Iceland"

def gmaps(q):
    from urllib.parse import quote
    return "https://www.google.com/maps/search/?api=1&query=" + quote(_country(q))

def gmaps_route(names):
    from urllib.parse import quote
    q = lambda s: quote(_country(s))
    mid = "%7C".join(q(n) for n in names[1:-1][:9])
    return (f"https://www.google.com/maps/dir/?api=1&origin={q(names[0])}"
            f"&destination={q(names[-1])}" + (f"&waypoints={mid}" if mid else "") +
            "&travelmode=driving")

beds = {b["night"]: b for b in T["bookings"]}
tours_by_date = {}
for t in T["tours"]:
    tours_by_date.setdefault(t["date"], []).append(t)

out = []
def topic(name, body):
    out.append(f"{'='*60}\nTOPIC: {name}\n{'='*60}\n{body.strip()}\n")

# ---- Car
c = T["car"]
topic("Car", f"""
🚙 {c['company']} — confirmation {c['bookingRef']}

{c['model']}
{c['spec']}
Customer no {c['customerNo']} · class {c['classCode']}

PICK UP   Sat 3 Oct at {c['pickup']['time']}
DROP OFF  Sat 10 Oct at {c['dropoff']['time']}
{c['pickup']['place']}

Renter: {c['renter']} · {c['renterPhone']}
Paid in full: {c['price']:,} {c['currency']}
Hertz: {c['phone']} · {c['email']}

INSURANCE
{c['insurance']}

{c['notes']}

#car
""")

# ---- Tours
lines = []
for t in sorted(T["tours"], key=lambda x: x["date"]):
    d = datetime.date.fromisoformat(t["date"])
    lines.append(f"▸ {d:%a %d %b} {t['time']} — {t['name']}")
    if t.get("operator"): lines.append(f"    {t['operator']}")
    lines.append(f"    meet: {t['meetingPoint']}")
    if t.get("bookedBy"): lines.append(f"    booked by {t['bookedBy']}")
    lines.append("")
topic("Tours", "🎟 ALL FOUR BOOKED\n\n" + "\n".join(lines) + """
⚠️ Still needed: operator names and confirmation numbers for Jökulsárlón and Katla.

#tours
""")

# ---- Stays
lines = []
for n in range(1, 9):
    b = beds[n]
    d = datetime.date.fromisoformat(b["date"])
    lines.append(f"▸ NIGHT {n} · {d:%a %d %b} — {b['town']}")
    lines.append(f"    {b['property']}")
    if b.get("address"): lines.append(f"    {b['address']}")
    bits = []
    if b.get("source"): bits.append(b["source"])
    if b.get("bookingRef"): bits.append(f"ref {b['bookingRef']}")
    if b.get("phone"): bits.append(b["phone"])
    if b.get("bookedBy"): bits.append(f"by {b['bookedBy']}")
    if bits: lines.append("    " + " · ".join(bits))
    if b.get("checkIn"): lines.append(f"    check-in {b['checkIn']}")
    lines.append(f"    {gmaps(b.get('address') or b['town'])}")
    lines.append("")
topic("Stays", "🛏 ALL 8 NIGHTS BOOKED\n\n" + "\n".join(lines) + """
⚠️ NIGHT 1: check-in closes 00:30 and we arrive ~01:10. Arrange a key box.

#stays
""")

# ---- one per day
for i, d in enumerate(R["days"]):
    dayn = int(d["date"].split()[1])
    date = datetime.date(2026, 10, dayn)
    t = int(d["start"][:2]) * 60 + int(d["start"][3:])
    rows, km, mn = [], 0, 0
    for j, s in enumerate(d["stops"]):
        p = P[s["loc"]]
        a = t; t += s["dwell"]
        label = f"{hm(a)}  {p['name']}"
        if s["dwell"]:
            label += f"  ({s['dwell']}m)"
        rows.append(label)
        if j < len(d["stops"]) - 1:
            m, k = leg(s["loc"], d["stops"][j+1]["loc"]); t += m; mn += m; km += k
            rows.append(f"          ↓ {hm(m)} · {k} km")
    last = P[d["stops"][-1]["loc"]]
    rise, ss = sun(last["lat"], last["lng"], dayn)
    slack = ss - t
    bed = beds.get(i + 2)
    tt = tours_by_date.get(f"2026-10-{dayn:02d}", [])
    body = f"""📅 DAY {i+1} · {date:%A %d %B}
{d['title']}

{km} km · {hm(mn)} driving · {d['start']}–{hm(t)}
sunrise {hm(rise)} · sunset {hm(ss)} · {'+' if slack>=0 else '−'}{hm(abs(slack))} spare

{chr(10).join(rows)}
"""
    if tt:
        body += "\n🎟 " + "\n🎟 ".join(f"{x['time']} {x['name']}" for x in tt) + "\n"
    if bed:
        body += f"\n🛏 {bed['property']}, {bed['town']}\n"
    body += f"\n🗺 Whole day in Maps:\n{gmaps_route([P[s['loc']]['search'] for s in d['stops']])}\n\n#day{i+1}"
    topic(f"Day {i+1} — {date:%d %b}", body)

print("\n".join(out))
