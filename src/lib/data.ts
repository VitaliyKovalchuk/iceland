import type { Itinerary, CorridorPoi, Trip } from "./types";
import itineraryJson from "../../data/generated/itinerary.json";
import corridorJson from "../../data/generated/corridor.json";
import tripJson from "../../data/trip.json";

export const itinerary = itineraryJson as unknown as Itinerary;
export const corridor = (corridorJson as unknown as { poi: CorridorPoi[] }).poi;
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
export const gmaps = (q: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q + ", Iceland")}`;
