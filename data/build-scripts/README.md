# iceland/.build

`../index.html` is generated. Do not hand-edit it — it will be overwritten.

    python3 .build/build.py     # rebuild ../index.html

| file | what it is |
|---|---|
| `index.template.html` | page shell: CSS, markup, four `__PLACEHOLDER__` slots |
| `app.js` | all page logic (tabs, Leaflet maps, day cards, compare table) |
| `site2.json` | the trip data — variants, routed geometry, beds, budget |
| `leaflet.min.*` | Leaflet 1.9.4, vendored so the page has no CDN dependency |
| `variants.py` | rebuilds `variants.json` from scratch — re-routes every leg via OSRM (needs network) |
| `finalize.py` | variants.json → site2.json: names, coffee, beds, budget, geometry simplification |
| `shim.js` | headless DOM stub, for `node -e "require('./shim.js');require('./app.js')"` |

Data pipeline: `variants.py` → `variants.json` → `finalize.py` → `site2.json` → `build.py` → `index.html`.
Only `build.py` is needed for a plain restore; the other two re-derive the routing.

## planner.html

    python3 .build/build-planner.py   # rebuild ../planner.html

The editable single-route planner (Snæfellsnes). Same placeholder scheme.

| file | what it is |
|---|---|
| `planner.template.html` | shell: CSS, markup, four placeholders |
| `planner-app.js` | editor logic — schedule, add/remove/reorder, maps, budget |
| `planner-data.json` | 71 POIs, 70x70 travel-time matrix, pre-baked leg geometry, the 8-day plan |
| `poi.py` | rebuilds the POI library and the matrix from `site2.json` (needs network) |
| `shim-planner.js` | headless DOM stub: `PLANNER_DATA=./planner-data.json node -e "require('./shim-planner.js');require('./planner-app.js')"` |

`planner-app.js` ends with a `typeof module !== "undefined"` export used only by the headless test.

## corridor.html
`build-corridor.py` ← `corridor.template.html` + `corridor-data.json`.
Data comes from OpenStreetMap via Overpass (see git log for the queries); each POI stores
`ring`/`south` as `[[km, dayIndex], ...]` for every day whose driven polyline passes within
10 km, nearest first. `u:1` = inside a town centre, `in:1` = already a planned stop.
Regenerate the OSM pull only if the routes change.
