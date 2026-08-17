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

## Structure

    src/lib/sun.ts        NOAA solar — per-location sunrise/sunset (Iceland is UTC year-round)
    src/lib/schedule.ts   day scheduling, ported from the verified planner
    src/lib/today.ts      which day is it — falls back to a countdown before the trip
    src/app/              Today · Days · Near us · Booked
    public/sw.js          offline for the guide; map tiles cache only once viewed

`src/lib/schedule.test.ts` pins the numbers the route was verified with — 1,948 km, one
deliberate after-dark arrival (the Oct 10 airport run), no pre-dawn departures, and both
routing defects staying fixed. If a refactor moves those, the tests fail.

    npx vitest run

## Deploying

Deployed on Vercel from `main`. Import the repo at vercel.com/new — it is a stock
Next.js app with no external services and no build configuration.

**Set one environment variable:**

    TRIP_PASSWORD = <a shared password>

`src/middleware.ts` redirects every page to `/unlock` until that password is entered,
then stores it in an httpOnly cookie for 120 days. The guide holds confirmation
numbers, eight addresses and the exact dates our homes are empty, so it should not
sit on an open URL.

Left unset (local dev) the gate is off. The service worker, manifest and icon stay
unauthenticated so the app still installs to a phone home screen.
