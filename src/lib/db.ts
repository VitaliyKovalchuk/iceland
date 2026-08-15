import type { DaySummary, Place } from "./types";
import attractionsJson from "../../data/db/attractions.json";
import foodJson from "../../data/db/food.json";
import daysJson from "../../data/db/days.json";

const items = (j: unknown) => (j as { items: Place[] }).items;

export const attractions = items(attractionsJson);
export const food = items(foodJson);
export const daySummaries = (daysJson as unknown as { items: DaySummary[] }).items;

/** What the map shows. Deliberately just attractions and food:
 *  - stays: our eight beds are booked and drawn as their own layer
 *  - fuel and groceries: OpenStreetMap coverage is patchy (102 shops for the whole
 *    corridor) and Google Maps does "petrol near me" better than we ever will
 *  All four files are still generated into data/db; they just don't reach the client. */
export const ALL: Place[] = [...attractions, ...food];

/** Distance to a given day's road, or null if that day never comes within 10 km. */
export const kmOnDay = (p: Place, day: number) =>
  p.days.find(([, d]) => d === day)?.[0] ?? null;
