import type { DaySummary, Place } from "./types";
import attractionsJson from "../../data/db/attractions.json";
import foodJson from "../../data/db/food.json";
import fuelJson from "../../data/db/fuel.json";
import groceriesJson from "../../data/db/groceries.json";
import staysJson from "../../data/db/stays.json";
import daysJson from "../../data/db/days.json";

const items = (j: unknown) => (j as { items: Place[] }).items;

export const attractions = items(attractionsJson);
export const food = items(foodJson);
export const fuel = items(fuelJson);
export const groceries = items(groceriesJson);
export const stays = items(staysJson);
export const daySummaries = (daysJson as unknown as { items: DaySummary[] }).items;

export const ALL: Place[] = [...attractions, ...food, ...fuel, ...groceries, ...stays];

/** Distance to a given day's road, or null if that day never comes within 10 km. */
export const kmOnDay = (p: Place, day: number) =>
  p.days.find(([, d]) => d === day)?.[0] ?? null;
