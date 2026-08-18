#!/usr/bin/env python3
"""One Telegram message per day topic, generated from the verified itinerary.

    python3 data/scripts/build_days_telegram.py

Writes data/telegram-days/day-N.txt. Times, distances and daylight come from the
same data the app renders, so a pinned message cannot drift from the plan.
"""
import json, math, pathlib, datetime
from urllib.parse import quote

ROOT = pathlib.Path(__file__).resolve().parents[2]
R = json.loads((ROOT / "data/generated/itinerary.json").read_text())
T = json.loads((ROOT / "data/trip.json").read_text())
P = R["poi"]
idx = {k: i for i, k in enumerate(R["keys"])}
mx = lambda k: P[k].get("mx") or k
leg = lambda a, b: (round(R["dur"][idx[mx(a)]][idx[mx(b)]] * 1.15),
                    R["dist"][idx[mx(a)]][idx[mx(b)]])
hm = lambda m: f"{int(m)//60:02d}:{int(m)%60:02d}"
dur = lambda m: f"{m//60}h{m%60:02d}" if m >= 60 else f"{m}m"
rad, deg = math.pi/180, 180/math.pi

def sun(lat, lng, day):
    y, m, dd = 2026, 10, day
    A = y//100; B = 2 - A + A//4
    jd = int(365.25*(y+4716)) + int(30.6001*(m+1)) + dd + B - 1524.5
    t = (jd - 2451545)/36525
    L0 = (280.46646 + t*(36000.76983 + t*0.0003032)) % 360
    M = 357.52911 + t*(35999.05029 - 0.0001537*t)
    e = 0.016708634 - t*(0.000042037 + 0.0000001267*t)
    C = (math.sin(M*rad)*(1.914602-t*(0.004817+0.000014*t)) +
         math.sin(2*M*rad)*(0.019993-0.000101*t) + math.sin(3*M*rad)*0.000289)
    lam = L0 + C - 0.00569 - 0.00478*math.sin((125.04-1934.136*t)*rad)
    eps = 23 + (26 + (21.448 - t*(46.815+t*(0.00059-t*0.001813)))/60)/60 + \
          0.00256*math.cos((125.04-1934.136*t)*rad)
    dec = math.asin(math.sin(eps*rad)*math.sin(lam*rad))*deg
    yy = math.tan(eps/2*rad)**2
    eot = 4*deg*(yy*math.sin(2*L0*rad) - 2*e*math.sin(M*rad) +
                 4*e*yy*math.sin(M*rad)*math.cos(2*L0*rad) -
                 0.5*yy*yy*math.sin(4*L0*rad) - 1.25*e*e*math.sin(2*M*rad))
    cosH = math.cos(90.833*rad)/(math.cos(lat*rad)*math.cos(dec*rad)) - \
           math.tan(lat*rad)*math.tan(dec*rad)
    H = math.acos(max(-1, min(1, cosH)))*deg
    return round(720 - 4*lng - eot - 4*H), round(720 - 4*lng - eot + 4*H)

def country(q):
    q = q.strip()
    return q if q.lower().endswith(", iceland") else q + ", Iceland"

gm = lambda q: "https://www.google.com/maps/search/?api=1&query=" + quote(country(q))

def gm_route(names):
    q = lambda s: quote(country(s))
    mid = "%7C".join(q(n) for n in names[1:-1][:9])
    return (f"https://www.google.com/maps/dir/?api=1&origin={q(names[0])}"
            f"&destination={q(names[-1])}" + (f"&waypoints={mid}" if mid else "") +
            "&travelmode=driving")

tours = {}
for x in T["tours"]:
    tours.setdefault(x["date"], []).append(x)
beds = {b["night"]: b for b in T["bookings"]}

out = ROOT / "data/telegram-days"
out.mkdir(exist_ok=True)

for i, d in enumerate(R["days"]):
    dayn = int(d["date"].split()[1])
    date = datetime.date(2026, 10, dayn)
    tt = tours.get(f"2026-10-{dayn:02d}", [])
    tour_at = {}
    for x in tt:
        for s in d["stops"]:
            nm = P[s["loc"]]["name"].lower()
            if x["name"].split()[0].lower().strip("ó") in nm.replace("ö", "o").lower() \
               or nm.split()[0].lower() in x["name"].lower():
                tour_at[s["loc"]] = x

    t = int(d["start"][:2])*60 + int(d["start"][3:])
    lines, km, mn = [], 0, 0
    for j, s_ in enumerate(d["stops"]):
        s = s_
        p = P[s_["loc"]]
        arrive = t; t += s_["dwell"]; depart = t
        last = j == len(d["stops"]) - 1
        if j == 0:
            lines.append(f"**{hm(arrive)} · Leave {p['name']}**")
        elif last:
            b = beds.get(i + 2)
            if b:
                lines.append(f"**{hm(arrive)} · {b['property']}** 🛏")
                if b.get("address"):
                    lines.append(f"_{b['address']}_")
                who = " · ".join(x for x in (
                    b.get("source"),
                    f"ref {b['bookingRef']}" if b.get("bookingRef") else None,
                    f"booked by {b['bookedBy']}" if b.get("bookedBy") else None,
                    b.get("phone")) if x)
                if who:
                    lines.append(who)
                # pin by coordinate: several of these have no street number, so a
                # name/address search lands on the town rather than the property
                if b.get("lat"):
                    lines.append(f"https://www.google.com/maps/search/?api=1&query={b['lat']},{b['lng']}")
                else:
                    lines.append(gm(b.get("address") or b["town"]))
            else:
                # the last day ends at the airport, not a bed
                home = next((f for f in T["flights"] if f["direction"] == "home"), None)
                if home:
                    lines.append(f"**{hm(arrive)} · {p['name']}** ✈️")
                    lines.append(f"_{home['flightNo']} departs {home['depart']} — "
                                 f"{dur((int(home['depart'][:2])*60+int(home['depart'][3:])) - arrive)} to spare_")
                    lines.append(f"_car back by {T['car']['dropoff']['time']}_")
                else:
                    lines.append(f"**{hm(arrive)} · {p['name']}** 🛏")
        else:
            lines.append(f"**{hm(arrive)}–{hm(depart)} · {p['name']}** _{s['dwell']}m_")
            if s["loc"] in tour_at:
                x = tour_at[s["loc"]]
                bits = [f"🎟 **{x['time']}** {x['name']}"]
                if x.get("operator"):
                    bits.append(f"_{x['operator']}_")
                if x.get("phone"):
                    bits.append(x["phone"])
                lines.append(" · ".join(bits))
                if x.get("meetingPoint"):
                    lines.append(f"_{x['meetingPoint']}_")
            # a tour meeting point is not a searchable place — pin it by coordinate
            if s_["loc"] in tour_at and tour_at[s_["loc"]].get("lat"):
                x = tour_at[s_["loc"]]
                lines.append(f"https://www.google.com/maps/search/?api=1&query={x['lat']},{x['lng']}")
            else:
                lines.append(gm(p["search"]))
        if not last:
            m, k = leg(s["loc"], d["stops"][j+1]["loc"]); t += m; mn += m; km += k
            lines.append(f"↓ {dur(m)} · {k} km")
        lines.append("")

    first = P[d["stops"][0]["loc"]]
    last = P[d["stops"][-1]["loc"]]
    rise, _ = sun(first["lat"], first["lng"], dayn)      # where we wake up
    _, ss = sun(last["lat"], last["lng"], dayn)          # where we end up
    slack = ss - t
    start_min = int(d["start"][:2])*60 + int(d["start"][3:])
    predawn = (f"\n🔦 we leave **{dur(rise - start_min)} before sunrise** — first stretch in the dark"
               if start_min < rise else "")
    bed = beds.get(i + 2)

    msg = f"""📅 **DAY {i+1} · {date:%a %-d %b}** — {d['title']}

**{km} km** · {dur(mn)} driving · {d['start']} → **{hm(t)}**
**{'+' if slack>=0 else '−'}{dur(abs(slack))}** of daylight spare

━━━━━━━━━━━━━━━

""" + "\n".join(lines).rstrip() + f"""

🌅 sunrise **{hm(rise)}**  ·  🌇 sunset **{hm(ss)}**{predawn}"""
    (out / f"day-{i+1}.txt").write_text(msg)
    print(f"  day-{i+1}.txt  {len(msg):5} chars" + ("  <-- OVER 4096" if len(msg) > 4096 else ""))
print(f"\nwritten to {out}")
