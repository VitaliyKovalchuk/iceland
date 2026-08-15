#!/usr/bin/env python3
"""Assemble ../compare.html — what each plan sees that the other doesn't."""
import pathlib, sys
here=pathlib.Path(__file__).parent; out=here.parent/"compare.html"
h=(here/"diff.template.html").read_text()
if "__DATA__" not in h: sys.exit("template missing __DATA__")
out.write_text(h.replace("__DATA__",(here/"diff-data.json").read_text().replace("</","<\\/")))
print(f"wrote {out} — {round(len(out.read_text())/1024)} KB")
