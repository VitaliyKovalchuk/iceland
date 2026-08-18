/* The app is deployed. Anything imported into it ships in the client bundle, so a
   property name or confirmation number in the DATA is a leak regardless of whether
   the UI renders it. This has regressed once already, when re-syncing the route
   from the planning workspace restored the bed POIs' original names. */
import { describe, expect, it } from "vitest";
import { itinerary, trip } from "./data";
import { ALL } from "./db";

const SENSITIVE = [
  "902184", "Z111MK", "690014187",                   // confirmation / customer no
  "Salthús", "Hlíð Bed", "Lonid", "Arctic Exclusive", "Hoepfner", // property names
  "Tjarnabraut", "Hraunbrún", "Einbúastígur", "Vesturbraut", "Seljavegur", // addresses
  "+3544644103", "+3548494404",                      // phones
];

describe("nothing identifying reaches the client bundle", () => {
  it.each([
    ["itinerary", () => itinerary],
    ["trip", () => trip],
    ["places", () => ALL],
  ])("%s is clean", (_name, get) => {
    const blob = JSON.stringify(get());
    expect(SENSITIVE.filter((s) => blob.includes(s))).toEqual([]);
  });
});
