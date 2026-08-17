import type { Itinerary, Trip } from "./types";
import itineraryJson from "../../data/generated/itinerary.json";
// deliberately the PUBLIC copy — the full trip.json holds confirmation numbers,
// addresses and phone numbers, and anything imported here ships in the client bundle
import tripJson from "../../data/trip.public.json";

export const itinerary = itineraryJson as unknown as Itinerary;
export const trip = tripJson as unknown as Trip;

/** October padding on every OSRM duration — the convention the route was verified with. */
export const PAD = 1.15;

const idx = new Map(itinerary.keys.map((k, i) => [k, i]));
const mx = (k: string) => itinerary.poi[k]?.mx ?? k;

export function legMin(from: string, to: string): number {
  const a = idx.get(mx(from)), b = idx.get(mx(to));
  if (a == null || b == null) return 0;
  return Math.round(itinerary.dur[a][b] * PAD);
}
export function legKm(from: string, to: string): number {
  const a = idx.get(mx(from)), b = idx.get(mx(to));
  if (a == null || b == null) return 0;
  return itinerary.dist[a][b];
}
export const poi = (k: string) => itinerary.poi[k];
/** Some POI search strings already name the country; appending it again gives
 *  "Geysir, Iceland, Iceland". Normalise before building any Maps URL. */
const withCountry = (q: string) =>
  /,\s*iceland\s*$/i.test(q.trim()) ? q.trim() : `${q.trim()}, Iceland`;

export const gmaps = (q: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(withCountry(q))}`;

/** Google Maps directions for a whole day: origin, destination and the stops between.
 *  Uses place names rather than coordinates so the pin lands on the real entry, and
 *  Google's URL API caps waypoints at 9 — our longest day uses 5. */
export function gmapsRoute(names: string[]): string {
  const clean = names.filter(Boolean);
  if (clean.length < 2) return gmaps(clean[0] ?? "Iceland");
  const q = (s: string) => encodeURIComponent(withCountry(s));
  const origin = q(clean[0]);
  const destination = q(clean[clean.length - 1]);
  const mid = clean.slice(1, -1).slice(0, 9).map(q).join("%7C");
  return (
    `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}` +
    (mid ? `&waypoints=${mid}` : "") + "&travelmode=driving"
  );
}

/** Maps link for an arbitrary POI. Names are ambiguous out here — there are 57
 *  petrol stations called "N1" — so pin by coordinate and carry the name as a label. */
export const gmapsAt = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/** Driving directions to a coordinate from wherever the phone currently is. */
export const gmapsDriveTo = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
