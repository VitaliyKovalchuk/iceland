/* The route was verified against OSRM before any of this UI existed.
   These assertions pin the numbers so a refactor can't silently move them. */
import { describe, expect, it } from "vitest";
import { allSched, bedKeys } from "./schedule";
import { itinerary, poi } from "./data";
import { sunTimes } from "./sun";

const s = allSched();

describe("ring schedule", () => {
  it("reproduces the verified week", () => {
    expect(s).toHaveLength(8);
    // 2,054 km on the beds as actually booked: Skagastrond (+24 km) and central
    // Reykjavik instead of Selfoss (+57 km). Myvatn was briefly rebooked to
    // Akureyri, which cost ~180 km over two days; that booking was reversed.
    expect(s.reduce((a, x) => a + x.km, 0)).toBe(2058);
  });

  it("ends each day at the bed we actually booked", () => {
    const towns = bedKeys().map((k) => poi(k).name);
    expect(towns).toEqual([
      "Keflavík", "Skagaströnd", "Mývatn", "Egilsstadir",
      "Höfn", "Kirkjubæjarklaustur", "Vík í Mýrdal", "Reykjavík",
    ]);
  });

  it("keeps both routing defects fixed", () => {
    // Oct 6 must take the coastal Route 1, not the 939 Oxi gravel pass (85 km)
    expect(s[3].km).toBeGreaterThan(250);
    // Oct 3 must take Route 1 north, not the F338/F578 highland interior (251 km)
    expect(s[0].km).toBeGreaterThan(330);
  });

  it("only ends after sunset on the deliberate airport run", () => {
    const late = s.filter((x) => x.slack < 0);
    expect(late).toHaveLength(1);
    expect(itinerary.days[s.indexOf(late[0])].date).toBe("Oct 10");
    expect(late[0].slack).toBeGreaterThan(-60);
  });

  it("never reaches a SIGHT before dawn", () => {
    // Leaving a hotel a few minutes before official sunrise is fine and expected;
    // arriving somewhere we intend to look at in the dark is not.
    const early = s
      .flatMap((x) => x.rows)
      .filter((r) => r.arrive < r.rise && r.dwell > 0);
    expect(early).toHaveLength(0);
  });

  it("counts the arrival night and never treats the airport as a bed", () => {
    const beds = bedKeys();
    expect(beds).toHaveLength(8);
    expect(beds[0]).toBe("keflavik_town");
    expect(poi(beds[7]).name).toBe("Reykjavík");
    expect(beds).not.toContain("kef_airport");
  });

  it("each day's rows are contiguous in time", () => {
    for (const d of s)
      for (let i = 1; i < d.rows.length; i++)
        expect(d.rows[i].arrive).toBe(d.rows[i - 1].depart + d.rows[i - 1].legMin);
  });
});

describe("sun", () => {
  it("varies by location — a single Reykjavik column would be wrong", () => {
    const spread = Math.max(...s.map((x) => x.set)) - Math.min(...s.map((x) => x.set));
    expect(spread).toBeGreaterThan(20);
  });

  it("puts sunset in the right ballpark for early October in Iceland", () => {
    const { rise, set } = sunTimes(64.14, -21.94, 5);
    expect(set / 60).toBeGreaterThan(18);
    expect(set / 60).toBeLessThan(19.5);
    expect(rise / 60).toBeGreaterThan(7);
    expect(rise / 60).toBeLessThan(8.5);
  });
});
