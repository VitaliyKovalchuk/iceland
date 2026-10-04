import { describe, expect, it } from "vitest";
import { gmapsDetour } from "./data";
import { ALL } from "./db";
import { filterPlaces } from "./places";

describe("map picks and detours", () => {
  it("slots Stuðlagil into the Ásbyrgi → Egilsstaðir leg", () => {
    const url = gmapsDetour(2, 65.1843, -15.2579);
    expect(url).toContain("origin=Asbyrgi");
    expect(url).toContain("Egilssta");
    expect(url).toContain("waypoints=65.1843,-15.2579");
  });

  it("picks-only keeps the curated sights and drops OSM filler", () => {
    const f = { day: 2, kinds: new Set(["attraction" as const]), cats: new Set<string>(),
                radius: 25, showTowns: false, query: "" };
    const picks = filterPlaces(ALL, { ...f, picks: true });
    const all = filterPlaces(ALL, { ...f, picks: false });
    expect(picks.map((p) => p.name)).toEqual(expect.arrayContaining(["Stuðlagil", "Hengifoss"]));
    expect(picks.length).toBeLessThan(all.length / 2);
  });
});
