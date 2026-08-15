import json, subprocess, time, sys
D = json.load(open("data.json")); LOC = dict(D["locations"])
PAD = 1.15

# --- locations the source file never had ---
LOC.update({
 "keflavik_town": {"name":"Keflavík","lat":64.0049,"lng":-22.5624},
 "djupivogur":    {"name":"Djúpivogur","lat":64.6597,"lng":-14.2836},
 "blue_lagoon":   {"name":"Blue Lagoon","lat":63.8804,"lng":-22.4495},
})

# --- stop library: reuse the file's own wording where it exists ---
SRC = {}
for p in D["plans"]:
    for d in p["days"]:
        for s in d["stops"]:
            SRC.setdefault(s["loc"], s)
def base(loc, **over):
    s = SRC.get(loc, {})
    out = {"loc": loc, "activity": s.get("activity",""), "duration_min": s.get("duration_min") or 0,
           "hike": s.get("hike",False), "ticket": s.get("ticket",False),
           "optional": s.get("optional",False), "note": s.get("note")}
    out.update(over); return out

NEW = {
 "hofn": dict(activity="Harbour town — langoustine is the local dish", duration_min=0),
 "stokksnes": dict(activity="Vestrahorn over the black dunes, golden hour", duration_min=90,
   ticket=True, note="1,000 ISK at the Viking Café gate. Fifteen minutes from your bed — this is the whole reason for the Höfn nights."),
 "djupivogur": dict(activity="East-fjord village and the Eggin í Gleðivík eggs", duration_min=60,
   note="Turnaround point. The road out hugs three fjords and is the emptiest tarmac of the trip."),
 "borgarnes": dict(activity="Check in", duration_min=0, note="Settlement Centre if it's still open; otherwise the pool."),
 "keflavik_town": dict(activity="Sleep — car collected ~00:40", duration_min=0),
 "reykjadalur": dict(activity="Hot-river valley — 3 km uphill, then soak in the stream", duration_min=180,
   hike=True, note="Free, and the reason Secret Lagoon was cut from Day 1. Bring a towel and shoes you don't mind wetting."),
 "reykjavik": dict(activity="Check in, Hallgrímskirkja, Laugavegur, dinner", duration_min=0),
}
def S(loc, **o):
    o = {**NEW.get(loc, {}), **o}
    return base(loc, **o)

CAVE  = S("vik", activity="Katla ice cave tour (super-jeep from Vík)", duration_min=180,
          hike=True, ticket=True, note="Year-round cave under Mýrdalsjökull — the dependable one in early October. The Vatnajökull blue caves usually aren't open yet.")
LUNCH = lambda l="vik": S(l, activity="Lunch", duration_min=45, note=None)

GC   = [S("thingvellir"), S("geysir"), S("gullfoss"), S("kerid")]
# Kvernufoss is cut from W so Seljalandsfoss keeps the golden-hour slot the file designed for;
# E drops Seljalandsfoss here instead, because it is the headline of E's Oct 9.
SKOGA_W = S("skogafoss", note="If the glacier hike ran short, Kvernufoss is 10 minutes away and takes 40 — hidden falls you can walk behind, and almost nobody goes.")
FALLS_W = [S("solheimajokull"), S("dyrholaey"), S("reynisfjara"), LUNCH(), SKOGA_W,
           S("seljalandsfoss", note="Faces west — the golden-hour slot, and the whole reason this day runs east-to-west. You will get soaked; bring waterproofs.")]
FALLS_E = [S("solheimajokull"), S("dyrholaey"), S("reynisfjara"), LUNCH(), S("skogafoss"),
           S("kvernufoss")]
CAVEDAY = [CAVE, LUNCH(), S("fjadrargljufur"), S("skaftafell")]
SNAEF   = [S("gerduberg"), S("ytri_tunga"), S("budakirkja"), S("raudfeldsgja"),
           S("arnarstapi"), S("londrangar"), S("djupalonssandur")]
LASTDAY = [S("gunnuhver"), S("brimketill"),
           S("blue_lagoon", activity="Geothermal soak — the last act, 20 min from the gate",
             duration_min=150, ticket=True,
             note="Timed entry, book ahead. Sits in the Sundhnúkur eruption zone — if Reykjanes is closed on the day, swap to Sky Lagoon in Kópavogur and run this day in reverse."),
           S("kef_airport",
            activity="Fuel, drop the car, fly", duration_min=0,
            note="Be at the rental depot by 20:45 — shuttle and damage check eat 45 minutes before a 22:30 bag drop.")]

VARIANTS = [
{"id":"W","name":"Snæfellsnes","tagline":"See the most, nothing over 5½ hours",
 "beds":["keflavik_town","hvolsvollur","hvolsvollur","hof","vik","borgarnes","grundarfjordur","reykjavik"],
 "days":[
  ("Oct 3","Golden Circle","09:00",["keflavik_town"]+GC+[S("hvolsvollur",activity="Check in",duration_min=0)]),
  ("Oct 4","Waterfalls & glacier","07:45",[S("hvolsvollur",activity="Depart",duration_min=0)]+FALLS_W+[S("hvolsvollur",activity="Return",duration_min=0)]),
  ("Oct 5","Ice cave & Skaftafell","07:30",[S("hvolsvollur",activity="Depart",duration_min=0)]+CAVEDAY+[S("hof",activity="Check in",duration_min=0)]),
  ("Oct 6","Glacier lagoons","08:00",[S("hof",activity="Depart",duration_min=0),S("mulagljufur",activity="Moss-walled canyon, waterfall at the head",optional=True),S("fjallsarlon"),S("jokulsarlon"),S("diamond_beach"),S("vik",activity="Check in",duration_min=0,note=None)]),
  ("Oct 7","West, with a hot river","08:30",[S("vik",activity="Depart",duration_min=0,note=None),S("reykjadalur"),S("borgarnes")]),
  ("Oct 8","Snæfellsnes loop","08:30",[S("borgarnes",activity="Depart",duration_min=0,note=None)]+SNAEF+[S("grundarfjordur",activity="Check in",duration_min=0)]),
  ("Oct 9","Kirkjufell, then east","08:30",[S("kirkjufell"),S("hraunfossar"),S("deildartunguhver"),S("reykjavik")]),
  ("Oct 10","Soak, steam, fly","09:30",[S("reykjavik",activity="Slow morning, coffee",duration_min=0,note=None)]+LASTDAY),
 ]},
{"id":"E","name":"Vestrahorn","tagline":"The calmest week, and the one landscape you can't get otherwise",
 "beds":["keflavik_town","hvolsvollur","hvolsvollur","hof","hofn","hofn","vik","reykjavik"],
 "days":[
  ("Oct 3","Golden Circle","09:00",["keflavik_town"]+GC+[S("hvolsvollur",activity="Check in",duration_min=0)]),
  ("Oct 4","Waterfalls & glacier","07:45",[S("hvolsvollur",activity="Depart",duration_min=0)]+FALLS_E+[S("hvolsvollur",activity="Return",duration_min=0)]),
  ("Oct 5","Ice cave & Skaftafell","07:30",[S("hvolsvollur",activity="Depart",duration_min=0)]+CAVEDAY+[S("hof",activity="Check in",duration_min=0)]),
  ("Oct 6","Lagoons, unhurried","08:30",[S("hof",activity="Depart",duration_min=0),S("mulagljufur",activity="Moss-walled canyon, waterfall at the head"),S("fjallsarlon"),S("jokulsarlon"),S("diamond_beach"),S("hofn",activity="Check in",duration_min=0)]),
  ("Oct 7","Vestrahorn & the east fjords","08:30",[S("hofn",activity="Depart",duration_min=0,note=None),S("djupivogur"),LUNCH("djupivogur"),S("stokksnes"),S("hofn",activity="Return — second night, same bed",duration_min=0,note=None)]),
  ("Oct 8","Back west","08:00",[S("hofn",activity="Depart",duration_min=0,note=None),S("jokulsarlon",activity="Second pass, no boat, no rush",duration_min=60,ticket=False,optional=True,note=None),S("skaftafell",activity="Svartifoss if you skipped it"),LUNCH("klaustur"),S("vik",activity="Check in",duration_min=0,note=None)]),
  ("Oct 9","South coast, second look","08:30",[S("vik",activity="Depart",duration_min=0,note=None),S("reynisfjara",activity="Second look, or first if Day 2 was rained out",optional=True),S("seljalandsfoss",activity="Walk behind the falls + Gljúfrabúi"),S("reykjadalur"),S("reykjavik")]),
  ("Oct 10","Soak, steam, fly","09:30",[S("reykjavik",activity="Slow morning, coffee",duration_min=0,note=None)]+LASTDAY),
 ]},
{"id":"WE","name":"Both ends","tagline":"Most top-20 ticks, one punishing day",
 "beds":["keflavik_town","hvolsvollur","hvolsvollur","hof","hofn","vik","borgarnes","reykjavik"],
 "days":[
  ("Oct 3","Golden Circle","09:00",["keflavik_town"]+GC+[S("hvolsvollur",activity="Check in",duration_min=0)]),
  ("Oct 4","Waterfalls & glacier","07:45",[S("hvolsvollur",activity="Depart",duration_min=0),S("solheimajokull"),S("dyrholaey"),S("reynisfjara"),LUNCH(),S("skogafoss"),S("seljalandsfoss"),S("hvolsvollur",activity="Return",duration_min=0)]),
  ("Oct 5","Ice cave & Skaftafell","07:30",[S("hvolsvollur",activity="Depart",duration_min=0)]+CAVEDAY+[S("hof",activity="Check in",duration_min=0)]),
  ("Oct 6","Lagoons + Vestrahorn","08:00",[S("hof",activity="Depart",duration_min=0),S("fjallsarlon"),S("jokulsarlon"),S("diamond_beach"),S("stokksnes",duration_min=60,note="Mid-afternoon, not golden hour — the light is the compromise this variant makes."),S("hofn",activity="Check in",duration_min=0)]),
  ("Oct 7","The long haul west","08:00",[S("hofn",activity="Depart",duration_min=0,note=None),S("skaftafell",activity="Leg-stretch and Svartifoss",duration_min=90),S("vik",activity="Check in",duration_min=0,note=None)]),
  ("Oct 8","West, with a hot river","08:30",[S("vik",activity="Depart",duration_min=0,note=None),S("reykjadalur"),S("borgarnes")]),
  ("Oct 9","Snæfellsnes in one go","07:30",[S("borgarnes",activity="Depart early — this is the hard day",duration_min=0,note=None),S("gerduberg"),S("budakirkja"),S("arnarstapi"),S("djupalonssandur"),S("kirkjufell"),S("reykjavik")]),
  ("Oct 10","Soak, steam, fly","09:30",[S("reykjavik",activity="Slow morning, coffee",duration_min=0,note=None)]+LASTDAY),
 ]},
]

def leg_route(a, b):
    q = f"{LOC[a]['lng']},{LOC[a]['lat']};{LOC[b]['lng']},{LOC[b]['lat']}"
    u = f"https://router.project-osrm.org/route/v1/driving/{q}?overview=full&geometries=geojson"
    for i in range(4):
        try:
            r = json.loads(subprocess.run(["curl","-sS","--max-time","60",u],
                                          capture_output=True,text=True).stdout)
            if r.get("code") == "Ok": break
        except Exception: pass
        time.sleep(2 + i*2)
    time.sleep(0.7); rt = r["routes"][0]
    return (round(rt["distance"]/1000), rt["duration"]/60,
            [[round(la,4), round(ln,4)] for ln,la in rt["geometry"]["coordinates"]])

SUN = {3:(460,1123),4:(463,1120),5:(465,1117),6:(468,1113),
       7:(470,1110),8:(473,1106),9:(476,1103),10:(479,1099)}
def hm(m): return f"{int(m)//60:02d}:{int(m)%60:02d}"

cache = {}
out = []
for V in VARIANTS:
    vdays, tk, tm = [], 0, 0
    for di,(date, title, start, stops) in enumerate(V["days"]):
        dnum = 3 + di
        clock = int(start[:2])*60 + int(start[3:])
        rows, geom, dkm, dmin = [], [], 0, 0
        for i, s in enumerate(stops):
            if isinstance(s, str): s = S(s)
            s = dict(s)
            s["arrive"] = hm(clock) if i else None
            clock += s["duration_min"]
            s["depart"] = hm(clock) if (i < len(stops)-1 or s["duration_min"]) else None
            if i < len(stops)-1:
                nxt = stops[i+1]; nloc = nxt if isinstance(nxt,str) else nxt["loc"]
                if nloc == s["loc"]:
                    s["drive_to_next_km"] = s["drive_to_next_min"] = 0
                else:
                    key = (s["loc"], nloc)
                    if key not in cache: cache[key] = leg_route(*key)
                    km, mn, g = cache[key]
                    mn = round(mn * PAD)
                    s["drive_to_next_km"], s["drive_to_next_min"] = km, mn
                    dkm += km; dmin += mn; geom += g
                    clock += mn
            else:
                s["drive_to_next_km"] = s["drive_to_next_min"] = 0
            rows.append(s)
        rise, set_ = SUN[dnum]
        after = [r["loc"] for r in rows
                 if r["arrive"] and (int(r["arrive"][:2])*60+int(r["arrive"][3:])) > set_]
        inten = "hard" if dmin >= 330 else "full" if dmin >= 270 else "relaxed" if dmin < 210 else "tight"
        vdays.append({"day": di+1, "date": date, "title": title, "start": start,
                      "from": LOC[rows[0]["loc"]]["name"], "to": LOC[rows[-1]["loc"]]["name"],
                      "km": dkm, "min": dmin, "intensity": inten, "stops": rows,
                      "road": geom, "sunrise": hm(rise), "sunset": hm(set_),
                      "ends": hm(clock), "after_dark": after,
                      "droppable_min": sum(r["duration_min"] for r in rows if r.get("optional"))})
        tk += dkm; tm += dmin
        print(f'  {V["id"]:2} {date:7} {title:30} {dkm:>4} km {dmin//60}h{dmin%60:02d}'
              f'  ends {hm(clock)}  sunset {hm(set_)}' + (f'  DARK:{",".join(after)}' if after else ''))
        sys.stdout.flush()
    V2 = {k:v for k,v in V.items() if k != "days"}
    V2.update({"days": vdays, "km": tk, "hours": round(tm/60,1),
               "worst": max(d["min"] for d in vdays),
               "stops_count": len({r["loc"] for d in vdays for r in d["stops"]})})
    out.append(V2)
    print(f'  {V["id"]:2} TOTAL {tk} km / {tm/60:.1f} h  worst {max(d["min"] for d in vdays)//60}h'
          f'{max(d["min"] for d in vdays)%60:02d}  distinct places {V2["stops_count"]}\n')

json.dump({"variants": out, "locations": LOC}, open("variants.json","w"),
          ensure_ascii=False, separators=(",",":"))
print("variants.json", round(len(open("variants.json").read())/1024), "KB")
