#!/usr/bin/env python3
"""Assemble ../ring.html — the Ring Road option, mapped and costed."""
import pathlib, sys
here=pathlib.Path(__file__).parent; out=here.parent/"ring.html"
h=(here/"ring.template.html").read_text()
if "__DATA__" not in h: sys.exit("template missing __DATA__")
out.write_text(h.replace("__DATA__",(here/"ring-data.json").read_text().replace("</","<\\/")))
print(f"wrote {out} — {round(len(out.read_text())/1024)} KB")
