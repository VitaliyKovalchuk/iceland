import type { Day, Stop } from "./types";
import { itinerary, legKm, legMin, poi } from "./data";
import { dayNum, mins, sunTimes } from "./sun";

export interface Row extends Stop {
  i: number;
  arrive: number;
  depart: number;
  legMin: number;
  legKm: number;
  rise: number;
  set: number;
  /** true if we are at this stop outside daylight — tested on BOTH ends, not arrival only */
  dark: boolean;
}

export interface DaySchedule {
  rows: Row[];
  end: number;
  km: number;
  min: number;
  rise: number;
  set: number;
  slack: number;
  dark: Row[];
  intensity: "relaxed" | "tight" | "full" | "hard";
}

const sunAt = (loc: string, d: Day) => {
  const p = poi(loc);
  return sunTimes(p.lat, p.lng, dayNum(d.date));
};

export function sched(d: Day): DaySchedule {
  let t = mins(d.start), km = 0, mn = 0;
  const rows: Row[] = d.stops.map((s, i) => {
    const arrive = t;
    t += s.dwell || 0;
    const depart = t;
    let lm = 0, lk = 0;
    if (i < d.stops.length - 1) {
      lm = legMin(s.loc, d.stops[i + 1].loc);
      lk = legKm(s.loc, d.stops[i + 1].loc);
      t += lm; mn += lm; km += lk;
    }
    const su = sunAt(s.loc, d);
    return {
      ...s, i, arrive, depart, legMin: lm, legKm: lk,
      rise: su.rise, set: su.set,
      dark: depart > su.set || arrive < su.rise,
    };
  });

  // the sunset that decides "did we make it" is the one where the day ENDS
  const endSun = sunAt(d.stops[d.stops.length - 1].loc, d);
  return {
    rows, end: t, km, min: mn,
    rise: endSun.rise, set: endSun.set,
    slack: endSun.set - t,
    dark: rows.filter((r) => r.dark),
    intensity: mn >= 330 ? "hard" : mn >= 270 ? "full" : mn < 210 ? "relaxed" : "tight",
  };
}

export const allSched = () => itinerary.days.map(sched);

/** Night 1 is the arrival night in Keflavík; nights 2..8 are where days 1..7 end. */
export const bedKeys = () => [
  "keflavik_town",
  ...itinerary.days.slice(0, -1).map((d) => d.stops[d.stops.length - 1].loc),
];

/** ISO date for a "Oct 3" style label. */
export const isoDate = (date: string) =>
  `2026-10-${String(dayNum(date)).padStart(2, "0")}`;
