#!/usr/bin/env python3
"""Assemble ../beds.html — the one-page explainer for why the bed plan changed."""
import pathlib, sys
here=pathlib.Path(__file__).parent; out=here.parent/"beds.html"
html=(here/"beds.template.html").read_text()
if "__DATA__" not in html: sys.exit("template missing __DATA__")
html=html.replace("__DATA__",(here/"beds-data.json").read_text().replace("</","<\\/"))
out.write_text(html); print(f"wrote {out} — {round(len(html)/1024)} KB")
