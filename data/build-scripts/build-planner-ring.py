#!/usr/bin/env python3
"""Assemble ../planner-ring.html — same planner, the Ring Road itinerary."""
import pathlib, sys
here=pathlib.Path(__file__).parent; out=here.parent/"planner-ring.html"
h=(here/"planner.template.html").read_text()
h=h.replace("<title>Iceland planner — Snæfellsnes, 2–10 October</title>",
            "<title>Iceland planner — Ring Road, 2–10 October</title>")
for tag,name in [("__LEAFLET_CSS__","leaflet.min.css"),("__LEAFLET_JS__","leaflet.min.js"),
                 ("__APP_JS__","planner-app.js"),("__DATA__","ring-planner-data.json")]:
    if tag not in h: sys.exit(f"template missing {tag}")
    b=(here/name).read_text()
    if tag=="__DATA__":    b=b.replace("</","<\\/")
    if name.endswith(".js"): b=b.replace("</script","<\\/script")
    h=h.replace(tag,b)
out.write_text(h); print(f"wrote {out} — {round(len(h)/1024)} KB")
