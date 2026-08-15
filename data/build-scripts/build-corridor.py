#!/usr/bin/env python3
"""Assemble ../corridor.html — sights and food within 10 km of the roads we drive."""
import pathlib, sys
here = pathlib.Path(__file__).parent
out  = here.parent / "corridor.html"
html = (here / "corridor.template.html").read_text()
for tag, name in [("__LEAFLET_CSS__","leaflet.min.css"), ("__LEAFLET_JS__","leaflet.min.js"),
                  ("__DATA__","corridor-data.json")]:
    if tag not in html: sys.exit(f"template missing {tag}")
    body = (here / name).read_text()
    if tag == "__DATA__":    body = body.replace("</", "<\\/")
    if name.endswith(".js"): body = body.replace("</script", "<\\/script")
    html = html.replace(tag, body)
out.write_text(html)
print(f"wrote {out} — {round(len(html)/1024)} KB")
