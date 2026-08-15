"use client";
import { useMemo, useState } from "react";
import { corridor, gmaps, itinerary } from "@/lib/data";
import type { CorridorPoi } from "@/lib/types";
import { tripDay } from "@/lib/today";

const CAT_NAME: Record<string, string> = {
  waterfall: "Waterfall", hot_spring: "Hot spring", geyser: "Geyser",
  public_bath: "Baths", swimming_pool: "Pool", beach: "Beach", volcano: "Volcano",
  cave_entrance: "Cave", arch: "Arch", cape: "Headland", peninsula: "Peninsula",
  crater: "Crater", spring: "Spring", viewpoint: "Viewpoint", attraction: "Attraction",
  nature_reserve: "Nature reserve", museum: "Museum", ruins: "Ruins",
  archaeological_site: "Archaeology", restaurant: "Restaurant", cafe: "Café",
  fast_food: "Fast food", bakery: "Bakery", bar: "Bar", pub: "Pub",
  supermarket: "Supermarket", convenience: "Shop", fuel: "Fuel",
};
const CAT_COLOUR: Record<string, string> = {
  waterfall: "#2E86C1", hot_spring: "#C0392B", geyser: "#C0392B", public_bath: "#C0392B",
  swimming_pool: "#C0392B", beach: "#7D6608", arch: "#7D6608", cape: "#7D6608",
  volcano: "#873600", crater: "#873600", cave_entrance: "#4A235A",
  viewpoint: "#1E8449", attraction: "#1E8449", nature_reserve: "#1E8449",
  museum: "#6C3483", ruins: "#6C3483", archaeological_site: "#6C3483",
  restaurant: "#B9770E", cafe: "#B9770E", fast_food: "#B9770E", bakery: "#B9770E",
  bar: "#B9770E", pub: "#B9770E", supermarket: "#5D6D7E", convenience: "#5D6D7E",
  fuel: "#5D6D7E",
};
const colour = (r: CorridorPoi) =>
  CAT_COLOUR[r.c] ?? (r.k === "food" ? "#B9770E" : "#1E8449");

export default function NearView() {
  const start = tripDay();
  const [day, setDay] = useState<number>(start.state === "during" ? start.index : -1);
  const [rad, setRad] = useState(10);
  const [kinds, setKinds] = useState({ sight: true, food: true });
  const [urban, setUrban] = useState(false);
  const [planned, setPlanned] = useState(false);

  const rows = useMemo(() => {
    const hits = (r: CorridorPoi) =>
      (r.ring ?? []).filter(([km, d]) => km <= rad && (day < 0 || d === day));
    return corridor
      .filter((r) => {
        if (!hits(r).length) return false;
        if (!kinds[r.k]) return false;
        if (!urban && r.u) return false;
        if (!planned && r.in) return false;
        return true;
      })
      .map((r) => ({ r, h: hits(r) }))
      .sort((a, b) => a.h[0][0] - b.h[0][0]);
  }, [day, rad, kinds, urban, planned]);

  const nSights = rows.filter((x) => x.r.k === "sight").length;

  const chip = (on: boolean) =>
    `rounded-md border px-2.5 py-1 font-mono text-[10.5px] tracking-[0.05em] uppercase transition-colors ${
      on
        ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-surface)]"
        : "border-[var(--color-line)] bg-[var(--color-raised)] text-[var(--color-ink-2)]"
    }`;

  return (
    <div>
      <header className="border-b border-[var(--color-line)] px-4 pt-5 pb-4">
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-3)]">
          Within {rad} km of the roads we drive
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">What&apos;s near us</h1>

        <div className="mt-3.5 flex flex-wrap gap-1.5">
          <select
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="rounded-md border border-[var(--color-line)] bg-[var(--color-raised)]
                       px-2 py-1 font-mono text-[10.5px] uppercase"
          >
            <option value={-1}>All 8 days</option>
            {itinerary.days.map((d, i) => (
              <option key={d.date} value={i}>
                Day {i + 1} · {d.date}
              </option>
            ))}
          </select>
          {([3, 5, 10] as const).map((k) => (
            <button key={k} onClick={() => setRad(k)} className={chip(rad === k)}>
              {k} km
            </button>
          ))}
          <button
            onClick={() => setKinds((s) => ({ ...s, sight: !s.sight }))}
            className={chip(kinds.sight)}
          >
            Sights
          </button>
          <button
            onClick={() => setKinds((s) => ({ ...s, food: !s.food }))}
            className={chip(kinds.food)}
          >
            Food
          </button>
          <button onClick={() => setUrban((v) => !v)} className={chip(urban)}>
            Towns
          </button>
          <button onClick={() => setPlanned((v) => !v)} className={chip(planned)}>
            Our stops
          </button>
        </div>

        <p className="mt-2.5 font-mono text-[10.5px] text-[var(--color-ink-3)] tabular-nums">
          {rows.length} places — {nSights} sights, {rows.length - nSights} food &amp; shops
        </p>
      </header>

      <ul>
        {rows.slice(0, 300).map(({ r, h }, i) => (
          <li key={`${r.n}-${i}`}>
            <a
              href={gmaps(r.n)}
              target="_blank"
              rel="noopener"
              className="flex gap-2.5 border-b border-[var(--color-line-2)] px-4 py-3
                         hover:bg-[var(--color-accent-soft)]"
            >
              <span
                className="mt-1.5 size-2.5 shrink-0 rounded-full ring-1 ring-black/20"
                style={{ background: colour(r) }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">
                  {r.n}
                  {r.in && <span className="ml-1.5 text-[var(--color-ok)]">✓</span>}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-[var(--color-ink-3)] tabular-nums">
                  {CAT_NAME[r.c] ?? r.c} · {h[0][0]} km · day {h.map(([, d]) => d + 1).join("/")}
                </span>
                {r.oh && (
                  <span className="mt-0.5 block text-[11.5px] text-[var(--color-ink-2)] tabular-nums">
                    {r.oh}
                  </span>
                )}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {rows.length > 300 && (
        <p className="px-4 py-3 font-mono text-[10px] uppercase text-[var(--color-ink-3)]">
          showing first 300 of {rows.length} — narrow the radius or pick a day
        </p>
      )}
      <p className="px-4 py-4 text-[11.5px] leading-relaxed text-[var(--color-ink-3)]">
        Opening hours come from OpenStreetMap volunteers and are often missing or stale.
        Treat them as &ldquo;this place exists&rdquo;, not &ldquo;this place is open&rdquo;.
      </p>
    </div>
  );
}
