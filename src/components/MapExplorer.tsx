"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ALL } from "@/lib/db";
import { itinerary } from "@/lib/data";
import { tripDay } from "@/lib/today";
import {
  CATS_BY_KIND, KIND_LABEL, CAT_LABEL, CAT_COLOUR, filterPlaces, type Filters,
} from "@/lib/places";
import { glyphFor } from "@/lib/icons";
import type { PlaceKind, Place } from "@/lib/types";
import PlaceList from "./PlaceList";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center font-mono text-[10.5px] tracking-[0.09em] uppercase text-[var(--color-ink-3)]">
      loading map
    </div>
  ),
});

/* Fuel and groceries were dropped: OSM coverage is patchy and Google does it better.
   Stays are our own bookings, drawn as a separate layer. */
const KINDS: PlaceKind[] = ["attraction", "food"];
const RADII = [3, 5, 10];

function Glyph({ cat, className = "" }: { cat: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
      strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden
      dangerouslySetInnerHTML={{ __html: glyphFor(cat) }}
    />
  );
}

export default function MapExplorer() {
  const start = tripDay();
  const [day, setDay] = useState(start.state === "during" ? start.index : -1);
  const [kinds, setKinds] = useState<Set<PlaceKind>>(new Set(["attraction"]));
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [radius, setRadius] = useState(5);
  const [showTowns, setShowTowns] = useState(false);
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<Place | null>(null);
  const [sheet, setSheet] = useState(false);

  const filters: Filters = useMemo(
    () => ({ day, kinds, cats, radius, showTowns, query }),
    [day, kinds, cats, radius, showTowns, query]
  );
  const places = useMemo(() => filterPlaces(ALL, filters), [filters]);

  /** Category chips for whichever kinds are on, with live counts at this day+radius. */
  const catChips = useMemo(() => {
    const pool = filterPlaces(ALL, { ...filters, cats: new Set() });
    const n = new Map<string, number>();
    for (const p of pool) n.set(p.cat, (n.get(p.cat) ?? 0) + 1);
    return KINDS.filter((k) => kinds.has(k))
      .flatMap((k) => CATS_BY_KIND[k])
      .filter((c) => n.get(c))
      .map((c) => ({ cat: c, count: n.get(c)! }));
  }, [filters, kinds]);

  const toggleIn = <T,>(set: Set<T>, v: T) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    return n;
  };

  const chip = (on: boolean) =>
    `shrink-0 rounded-md border px-2.5 py-1 font-mono text-[10.5px] tracking-[0.05em] uppercase transition-colors ${
      on
        ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-surface)]"
        : "border-[var(--color-line)] bg-[var(--color-raised)] text-[var(--color-ink-2)]"
    }`;

  return (
    <div className="flex h-[calc(100dvh-3.25rem)] flex-col">
      {/* day */}
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-2">
        <button onClick={() => setDay(-1)} className={chip(day === -1)}>All</button>
        {itinerary.days.map((d, i) => (
          <button key={d.date} onClick={() => setDay(i)} className={chip(day === i)}>
            {d.date.replace("Oct ", "")}
          </button>
        ))}
      </div>

      {/* kind */}
      <div className="flex gap-1 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-2">
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => { setKinds((s) => toggleIn(s, k)); setCats(new Set()); }}
            className={`${chip(kinds.has(k))} flex-1`}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>

      {/* category */}
      {catChips.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5">
          <button
            onClick={() => setCats(new Set())}
            className={`${chip(cats.size === 0)} flex items-center gap-1`}
          >
            All
          </button>
          {catChips.map(({ cat, count }) => {
            const on = cats.has(cat);
            return (
              <button
                key={cat}
                onClick={() => setCats((s) => toggleIn(s, cat))}
                className={`${chip(on)} flex items-center gap-1.5`}
                style={on ? undefined : { color: CAT_COLOUR[cat] }}
                title={`${CAT_LABEL[cat] ?? cat} — ${count}`}
              >
                <Glyph cat={cat} />
                <span>{CAT_LABEL[cat] ?? cat}</span>
                <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <MapCanvas places={places} day={day} focus={focus} onSelect={setFocus} filters={filters} />

        <button
          onClick={() => setSheet((v) => !v)}
          className="absolute top-2.5 left-2.5 z-400 rounded-md border border-[var(--color-line)]
                     bg-[var(--color-surface)]/95 px-2.5 py-1.5 font-mono text-[10.5px]
                     tracking-[0.05em] uppercase shadow-sm backdrop-blur"
        >
          {places.length} · {radius} km · {sheet ? "close" : "list"}
        </button>

        {sheet && (
          <div className="absolute inset-x-0 bottom-0 z-400 flex max-h-[70%] flex-col border-t
                          border-[var(--color-line)] bg-[var(--color-surface)] shadow-[0_-8px_24px_rgba(0,0,0,.18)]">
            <div className="space-y-2 border-b border-[var(--color-line)] p-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-raised)]
                           px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--color-accent)]"
              />
              <div className="flex items-center gap-1">
                <span className="mr-0.5 font-mono text-[9.5px] tracking-[0.08em] uppercase text-[var(--color-ink-3)]">
                  within
                </span>
                {RADII.map((r) => (
                  <button key={r} onClick={() => setRadius(r)} className={chip(radius === r)}>
                    {r} km
                  </button>
                ))}
                <button onClick={() => setShowTowns((v) => !v)} className={`${chip(showTowns)} ml-auto`}>
                  Town centres
                </button>
              </div>
            </div>
            <PlaceList
              places={places}
              filters={filters}
              onSelect={(p) => { setFocus(p); setSheet(false); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
