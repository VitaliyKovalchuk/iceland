#!/usr/bin/env python3
"""Assemble ../index.html from the template + vendored Leaflet + app.js + site2.json.
Everything is inlined: the page needs the network only for map tiles."""
import pathlib, sys
here = pathlib.Path(__file__).parent
out  = here.parent / "index.html"
html = (here / "index.template.html").read_text()
for tag, name in [("__LEAFLET_CSS__", "leaflet.min.css"), ("__LEAFLET_JS__", "leaflet.min.js"),
                  ("__APP_JS__", "app.js"), ("__DATA__", "site2.json")]:
    if tag not in html:
        sys.exit(f"template is missing {tag}")
    body = (here / name).read_text()
    if tag == "__DATA__":       body = body.replace("</", "<\\/")
    if name.endswith(".js"):    body = body.replace("</script", "<\\/script")
    html = html.replace(tag, body)
out.write_text(html)
print(f"wrote {out} — {round(len(html)/1024)} KB")
