# Iceland Ring Road — 2–10 October 2026

Trip guide for three people driving the Ring Road anticlockwise. Next.js, deployed on Vercel.

## Data

| file | what |
|---|---|
| `data/generated/itinerary.json` | the route — 8 days, POIs, OSRM duration/distance matrices, road polylines |
| `data/generated/corridor.json` | 1,936 sights and food stops within 10 km of the roads we drive |
| `data/trip.json` | hand-entered: flights, car, beds, tours |
| `data/raw/` | untouched source pulls (OSM Overpass, Rexby export, original research) |
| `data/build-scripts/` | the Python generators that produced the above |

Durations in `itinerary.json` are raw OSRM. **Multiply by 1.15** (`PAD` in `src/lib/data.ts`)
— that is the October padding the whole route was verified against.

Both routing defects found during planning are already fixed in the data: Oct 6 no longer
crosses the Öxi gravel pass (939), and Oct 3 no longer cuts over the F338/F578 highland
interior. Every leg was checked by road name for seasonal closures.

`corridor.json` opening hours come from OpenStreetMap volunteer data — treat as
"this place exists", not "this place is open".

## Dev

    npm run dev
    npm run build
