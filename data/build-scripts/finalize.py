import json
from shapely.geometry import LineString
V = json.load(open("variants.json")); D = json.load(open("data.json"))
LOC, VAR = V["locations"], V["variants"]
SEARCH = {
 "kef_airport":"Keflavík International Airport","keflavik_town":"Keflavík, Iceland",
 "reykjavik":"Reykjavík, Iceland","gunnuhver":"Gunnuhver, Iceland","brimketill":"Brimketill, Iceland",
 "blue_lagoon":"Blue Lagoon, Grindavík","sky_lagoon":"Sky Lagoon, Kópavogur",
 "thingvellir":"Þingvellir National Park","bruarfoss":"Brúarfoss","geysir":"Geysir, Iceland",
 "gullfoss":"Gullfoss","kerid":"Kerið","secret_lagoon":"Secret Lagoon, Flúðir",
 "reykjadalur":"Reykjadalur Hot Spring Thermal River","hveragerdi":"Hveragerði, Iceland",
 "selfoss_town":"Selfoss, Iceland","hvolsvollur":"Hvolsvöllur, Iceland",
 "seljalandsfoss":"Seljalandsfoss","skogafoss":"Skógafoss","kvernufoss":"Kvernufoss",
 "solheimajokull":"Sólheimajökull","dyrholaey":"Dyrhólaey","reynisfjara":"Reynisfjara Beach",
 "vikurfjara":"Víkurfjara","vik":"Vík í Mýrdal","fjadrargljufur":"Fjaðrárgljúfur",
 "klaustur":"Kirkjubæjarklaustur","skaftafell":"Skaftafell","hof":"Hof, Öræfi",
 "mulagljufur":"Múlagljúfur Canyon","fjallsarlon":"Fjallsárlón","jokulsarlon":"Jökulsárlón",
 "diamond_beach":"Diamond Beach, Iceland","stokksnes":"Stokksnes","hofn":"Höfn, Iceland",
 "djupivogur":"Djúpivogur, Iceland","borgarnes":"Borgarnes, Iceland","gerduberg":"Gerðuberg Cliffs",
 "ytri_tunga":"Ytri Tunga Beach","budakirkja":"Búðakirkja","raudfeldsgja":"Rauðfeldsgjá",
 "arnarstapi":"Arnarstapi, Iceland","londrangar":"Lóndrangar","djupalonssandur":"Djúpalónssandur",
 "olafsvik":"Ólafsvík, Iceland","grundarfjordur":"Grundarfjörður, Iceland","kirkjufell":"Kirkjufell",
 "hraunfossar":"Hraunfossar","deildartunguhver":"Deildartunguhver"}
CAFE = {"geysir","gullfoss","skogafoss","vik","arnarstapi","hraunfossar","reykjavik","keflavik_town",
        "hofn","borgarnes","grundarfjordur","blue_lagoon","sky_lagoon","thingvellir",
        "deildartunguhver","djupivogur"}
N1 = {"klaustur","hvolsvollur","hof","selfoss_town","hveragerdi"}
for k,L in LOC.items():
    L["search"]=SEARCH.get(k,L["name"]); L["coffee"]="cafe" if k in CAFE else ("n1" if k in N1 else None)
BED={"keflavik_town":(42000,1),"reykjavik":(47000,0),"hvolsvollur":(40000,0),"hof":(66000,0),
     "vik":(49000,0),"hofn":(47000,1),"borgarnes":(39000,1),"grundarfjordur":(35000,0)}
TOP={"jokulsarlon":1,"thingvellir":2,"seljalandsfoss":3,"skogafoss":4,"reynisfjara":6,"dyrholaey":6,
     "gullfoss":8,"skaftafell":9,"kirkjufell":11,"geysir":13,"stokksnes":14,"diamond_beach":16,"arnarstapi":18}
T={"katla":23920,"solheimajokull":13500,"boat":7100,"blue":11990,"krauma":6800,"gate":1000}
PPL,FX,CARD=3,D["isk_eur"],9
for v in VAR:
    ids={r["loc"] for d in v["days"] for r in d["stops"]}
    v["top20"]=sorted({TOP[k] for k in ids if k in TOP})
    v["beds_detail"]=[{"night":i+1,"date":f"Oct {2+i}","loc":b,"town":LOC[b]["name"],
                       "isk":BED[b][0],"est":bool(BED[b][1])} for i,b in enumerate(v["beds"])]
    lodging=sum(BED[b][0] for b in v["beds"])
    pp=T["katla"]+T["solheimajokull"]+T["boat"]+T["blue"]
    if "deildartunguhver" in ids: pp+=T["krauma"]
    if "stokksnes" in ids: pp+=T["gate"]
    items=[("Rental car, small 4x4, 9 days",round(60000/7*CARD/1000)*1000,"Local firms beat the chains. Confirm after-hours pickup — you land at 23:00."),
      ("Insurance bundle (SCDW + GP + SAAP)",5600*CARD,"Sand and ash cover is not optional on the south coast."),
      ("Fuel",round(v["km"]*14.7/500)*500,"~210 ISK/L after the Jan 2026 tax reform, ~7 L/100km."),
      ("Kilometre road tax",round(v["km"]*6.95/100)*100,"6.95 ISK/km, effective 1 Jan 2026."),
      ("Accommodation, 2 rooms x 8 nights",lodging,"Höfn, Borgarnes and Keflavík are my estimates — not priced in the source file."),
      ("Food",134000,"3 people, mixed self-catering and restaurants, ~6,000 ISK pp/day."),
      ("Tours and lagoons",pp*PPL,"Katla cave, Sólheimajökull, Jökulsárlón boat, Blue Lagoon"+(", Krauma" if "deildartunguhver" in ids else "")+(", Stokksnes gate" if "stokksnes" in ids else "")+"."),
      ("Parking and entry fees",20500,"Mostly 1,000 ISK/car via the Parka app.")]
    v["budget"]=[{"item":a,"isk":b,"eur":round(b/FX),"note":c} for a,b,c in items]
    tot=sum(b for _,b,_ in items)
    v.update(total_isk=tot,total_eur=round(tot/FX),pp_isk=round(tot/PPL),
             pp_eur=round(tot/PPL/FX),lodging_isk=lodging)
    for d in v["days"]:
        d["cafes"]=[LOC[r["loc"]]["name"] for r in d["stops"] if LOC[r["loc"]]["coffee"]=="cafe"]
        d["n1"]=[LOC[r["loc"]]["name"] for r in d["stops"] if LOC[r["loc"]]["coffee"]=="n1"]
        if len(d["road"])>3:
            s=LineString([(p[1],p[0]) for p in d["road"]]).simplify(0.0006,preserve_topology=False)
            d["road"]=[[round(y,4),round(x,4)] for x,y in s.coords]
json.dump({"variants":VAR,"locations":LOC,"top":D["top"],"practical":D["practical"],
           "booking_order":D["booking_order"],"isk_eur":FX,"coast":D["coast"],
           "glaciers":D["glaciers"],"viewBox":D["viewBox"]},
          open("site2.json","w"),ensure_ascii=False,separators=(",",":"))
print(f'site2.json {round(len(open("site2.json").read())/1024)} KB')
for v in VAR:
    dark=sum(len(d["after_dark"]) for d in v["days"])
    print(f'  {v["id"]:3}{v["km"]:>6} km {v["hours"]:>5} h  worst {v["worst"]//60}h{v["worst"]%60:02d}'
          f'  places {v["stops_count"]:>3}  top20 {len(v["top20"]):>2}  {v["total_eur"]:>6,}€  after-dark stops {dark}')
