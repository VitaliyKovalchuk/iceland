import type { Place, PlaceKind } from "./types";

export const KIND_LABEL: Record<PlaceKind, string> = {
  attraction: "Attractions",
  food: "Food",
  fuel: "Fuel",
  grocery: "Groceries",
  stay: "Stays",
};

/** One colour per kind, then shades within attractions so the map reads at a glance.
 *  Chosen to stay distinguishable under the common colour-vision deficiencies. */
export const CAT_COLOUR: Record<string, string> = {
  waterfall: "#2E86C1", hot_spring: "#C0392B", baths: "#C0392B",
  beach: "#7D6608", coast: "#7D6608", volcano: "#873600", cave: "#4A235A",
  viewpoint: "#1E8449", attraction: "#1E8449", nature: "#1E8449",
  museum: "#6C3483", historic: "#6C3483",
  restaurant: "#B9770E", cafe: "#B9770E", fast_food: "#B9770E",
  bakery: "#B9770E", bar: "#B9770E",
  fuel: "#5D6D7E", supermarket: "#117A65", minimarket: "#117A65",
  hotel: "#7B241C", guesthouse: "#7B241C", hostel: "#7B241C",
  cabin: "#7B241C", apartment: "#7B241C", campsite: "#7B241C",
};
export const colourOf = (p: Place) => CAT_COLOUR[p.cat] ?? "#5D6D7E";

export const CAT_LABEL: Record<string, string> = {
  waterfall: "Waterfall", hot_spring: "Hot spring", baths: "Baths",
  beach: "Beach", coast: "Coast", volcano: "Volcano", cave: "Cave",
  viewpoint: "Viewpoint", attraction: "Attraction", nature: "Nature reserve",
  museum: "Museum", historic: "Historic",
  restaurant: "Restaurant", cafe: "Café", fast_food: "Fast food",
  bakery: "Bakery", bar: "Bar",
  fuel: "Petrol", supermarket: "Supermarket", minimarket: "Village shop",
  hotel: "Hotel", guesthouse: "Guesthouse", hostel: "Hostel",
  cabin: "Cabin", apartment: "Apartment", campsite: "Campsite",
};
export const labelOf = (p: Place) => CAT_LABEL[p.cat] ?? p.cat;

export interface Filters {
  day: number;            // -1 = whole trip
  kinds: Set<PlaceKind>;
  /** Category sub-filter. Empty means "every category of the active kinds". */
  cats: Set<string>;
  radius: number;         // km from the driven road
  showTowns: boolean;
  query: string;
}

/** Categories belonging to each kind, in the order they should appear as chips. */
export const CATS_BY_KIND: Record<PlaceKind, string[]> = {
  attraction: ["waterfall", "hot_spring", "baths", "viewpoint", "nature", "beach",
               "coast", "volcano", "cave", "museum", "historic", "attraction"],
  food: ["restaurant", "cafe", "bakery", "fast_food", "bar"],
  fuel: ["fuel"],
  grocery: ["supermarket", "minimarket"],
  stay: ["hotel", "guesthouse", "hostel", "cabin", "apartment", "campsite"],
};

export function filterPlaces(all: Place[], f: Filters): Place[] {
  const q = f.query.trim().toLowerCase();
  const out: Place[] = [];
  for (const p of all) {
    if (!f.kinds.has(p.kind)) continue;
    if (f.cats.size && !f.cats.has(p.cat)) continue;
    if (!f.showTowns && p.town) continue;
    const hit = p.days.find(([km, d]) => km <= f.radius && (f.day < 0 || d === f.day));
    if (!hit) continue;
    if (q && !p.name.toLowerCase().includes(q) && !labelOf(p).toLowerCase().includes(q)) continue;
    out.push(p);
  }
  return out.sort((a, b) => nearest(a, f) - nearest(b, f));
}

export const nearest = (p: Place, f: Filters) =>
  Math.min(...p.days.filter(([, d]) => f.day < 0 || d === f.day).map(([km]) => km));

export const daysOf = (p: Place, day: number) =>
  p.days.filter(([, d]) => day < 0 || d === day);
