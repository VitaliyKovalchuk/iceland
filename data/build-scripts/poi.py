import json, subprocess, time, sys
S = json.load(open("site2.json"))
LOC = S["locations"]
W  = next(v for v in S["variants"] if v["id"] == "W")

# dwell + category + why, harvested from the built plan then filled in for everything else
seen = {}
for d in W["days"]:
    for s in d["stops"]:
        seen.setdefault(s["loc"], s)

EXTRA = {  # places the Guide to Iceland itinerary named that we did not have
 "bjarnarfoss":  (64.8206,-23.3897,"Bjarnarfoss","Bjarnarfoss","waterfall",30,"Ribbon falls above Búðir, five minutes off the road."),
 "gatklettur":   (64.7677,-23.6248,"Gatklettur arch","Gatklettur, Arnarstapi","coast",20,"Circular sea arch on the Arnarstapi cliff path."),
 "hellnar":      (64.7517,-23.6459,"Hellnar","Hellnar, Iceland","coast",30,"Fishing hamlet at the far end of the Arnarstapi coast walk."),
 "dritvik":      (64.7469,-23.9053,"Dritvík cove","Dritvík","coast",30,"Lifting stones the old crews used to test for a berth."),
 "svortuloft":   (64.8656,-24.0499,"Svörtuloft cliffs","Svortuloft Lighthouse","coast",30,"Orange lighthouse on black cliffs at the peninsula's tip."),
 "stykkisholmur":(65.0748,-22.7307,"Stykkishólmur","Stykkishólmur, Iceland","town",60,"Harbour town; the best food on Snæfellsnes."),
 "laugarvatn":   (64.2167,-20.7333,"Laugarvatn Fontana","Laugarvatn Fontana","spa",90,"Lakeside baths on the Golden Circle; rye bread baked in the sand."),
 "krysuvik":     (63.8925,-22.0556,"Krýsuvík / Seltún","Seltun Geothermal Area","geothermal",45,"Boiling mud and sulphur flats on Reykjanes."),
 "reykjanesviti":(63.8125,-22.7053,"Reykjanesviti","Reykjanesviti","viewpoint",30,"Iceland's oldest lighthouse, on the southwest tip."),
 "bridge":       (63.8683,-22.6747,"Bridge Between Continents","Bridge Between Continents","viewpoint",20,"Footbridge over the rift between the American and Eurasian plates."),
 "hafnarberg":   (63.8175,-22.7100,"Hafnarberg cliffs","Hafnarberg","coast",45,"Seabird cliffs; a 45-minute walk from the car."),
 "gljufrabui":   (63.6236,-19.9856,"Gljúfrabúi","Gljufrabui","waterfall",25,"Hidden in a slot canyon 5 min from Seljalandsfoss. Waders welcome."),
 "reynisdrangar":(63.4034,-19.0447,"Reynisdrangar","Reynisdrangar","coast",20,"The sea stacks, seen from the Vík side rather than Reynisfjara."),
}
OFFROUTE = {  # top-20 sights this route cannot reach — shown so you can see why
 "myvatn":      (65.6417,-16.9181,"Mývatn","Myvatn","geothermal",180,"Top-20 #7. North Iceland — Ring Road only."),
 "dettifoss":   (65.8145,-16.3849,"Dettifoss","Dettifoss","waterfall",90,"Top-20 #12. North Iceland — Ring Road only."),
 "godafoss":    (65.6828,-17.5500,"Goðafoss","Godafoss","waterfall",45,"Top-20 #17. North Iceland — Ring Road only."),
 "asbyrgi":     (66.0206,-16.5083,"Ásbyrgi","Asbyrgi Canyon","canyon",90,"Top-20 #19. North Iceland — Ring Road only."),
 "dynjandi":    (65.7333,-23.2000,"Dynjandi","Dynjandi","waterfall",90,"Top-20 #15. Westfjords — not on any Ring Road trip either."),
 "latrabjarg":  (65.5040,-24.5320,"Látrabjarg","Latrabjarg","coast",120,"Top-20 #20. Westfjords. Puffins gone since August anyway."),
 "landmannalaugar":(63.9900,-19.0600,"Landmannalaugar","Landmannalaugar","hike",240,"Top-20 #5. F208 shuts by late September — closed for you."),
 "thorsmork":   (63.6800,-19.4900,"Þórsmörk","Thorsmork","hike",240,"Top-20 #10. F249 shuts by late September — closed for you."),
}
CAT = {
 "kef_airport":"airport","keflavik_town":"town","reykjavik":"town","borgarnes":"town","hofn":"town",
 "grundarfjordur":"town","hvolsvollur":"town","vik":"town","hof":"town","klaustur":"town",
 "olafsvik":"town","selfoss_town":"town","hveragerdi":"town","djupivogur":"town",
 "blue_lagoon":"spa","sky_lagoon":"spa","secret_lagoon":"spa","reykjadalur":"spa","deildartunguhver":"spa",
 "gunnuhver":"geothermal","geysir":"geothermal",
 "seljalandsfoss":"waterfall","skogafoss":"waterfall","kvernufoss":"waterfall","gullfoss":"waterfall",
 "bruarfoss":"waterfall","hraunfossar":"waterfall",
 "solheimajokull":"glacier","fjallsarlon":"glacier","jokulsarlon":"glacier","diamond_beach":"glacier",
 "skaftafell":"glacier",
 "fjadrargljufur":"canyon","mulagljufur":"canyon","raudfeldsgja":"canyon",
 "reynisfjara":"coast","dyrholaey":"coast","brimketill":"coast","djupalonssandur":"coast",
 "arnarstapi":"coast","londrangar":"coast","ytri_tunga":"coast","vikurfjara":"coast","stokksnes":"coast",
 "thingvellir":"viewpoint","kerid":"viewpoint","kirkjufell":"viewpoint","gerduberg":"viewpoint",
 "budakirkja":"culture",
}
DEFAULT_DWELL = {"town":45,"airport":60,"spa":120,"geothermal":45,"waterfall":40,"glacier":60,
                 "canyon":60,"coast":40,"viewpoint":40,"culture":30,"hike":180}

POI = {}
for k, L in LOC.items():
    cat = CAT.get(k, "viewpoint")
    s = seen.get(k, {})
    POI[k] = {"name":L["name"],"lat":L["lat"],"lng":L["lng"],"search":L["search"],
              "coffee":L.get("coffee"),"cat":cat,
              "dwell":(s.get("duration_min") or DEFAULT_DWELL.get(cat,40)) or DEFAULT_DWELL.get(cat,40),
              "ticket":bool(s.get("ticket")),"hike":bool(s.get("hike")),
              "note":s.get("note"),"activity":s.get("activity") or "","off":False}
for k,(la,ln,nm,se,cat,dw,note) in EXTRA.items():
    POI[k]={"name":nm,"lat":la,"lng":ln,"search":se,"coffee":"cafe" if cat=="town" else None,
            "cat":cat,"dwell":dw,"ticket":cat=="spa","hike":cat=="hike","note":note,
            "activity":note,"off":False}
for k,(la,ln,nm,se,cat,dw,note) in OFFROUTE.items():
    POI[k]={"name":nm,"lat":la,"lng":ln,"search":se,"coffee":None,"cat":cat,"dwell":dw,
            "ticket":False,"hike":cat=="hike","note":note,"activity":note,"off":True}

keys=sorted(POI)
print(f"{len(keys)} POIs")
coords=";".join(f'{POI[k]["lng"]},{POI[k]["lat"]}' for k in keys)
r=json.loads(subprocess.run(["curl","-sS","--max-time","180",
  f"https://router.project-osrm.org/table/v1/driving/{coords}?annotations=distance,duration"],
  capture_output=True,text=True).stdout)
if r.get("code")!="Ok": sys.exit("table failed: "+str(r)[:300])
dur=[[round(v/60) if v is not None else -1 for v in row] for row in r["durations"]]
dist=[[round(v/1000) if v is not None else -1 for v in row] for row in r["distances"]]
print("matrix", len(dur),"x",len(dur[0]))
json.dump({"keys":keys,"poi":POI,"dur":dur,"dist":dist,"plan":W,
           "isk_eur":S["isk_eur"],"practical":S["practical"]},
          open("planner-raw.json","w"), ensure_ascii=False, separators=(",",":"))
print("planner-raw.json", round(len(open("planner-raw.json").read())/1024),"KB")
