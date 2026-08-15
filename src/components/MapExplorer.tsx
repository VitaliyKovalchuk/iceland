"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ALL } from "@/lib/db";
import { itinerary } from "@/lib/data";
import { tripDay } from "@/lib/today";
import { KIND_LABEL, filterPlaces, type Filters } from "@/lib/places";
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

const KINDS: PlaceKind[] = ["attraction", "food", "fuel", "grocery", "stay"];
const RADII = [3, 5, 10];

export default function MapExplorer() {
  const start = tripDay();
  const [day, setDay] = useState(start.state === "during" ? start.index : -1);
  const [kinds, setKinds] = useState<Set<PlaceKind>>(new Set(["attraction"]));
  const [radius, setRadius] = useState(5);
  const [showTowns, setShowTowns] = useState(false);
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<Place | null>(null);
  const [sheet, setSheet] = useState(false);

  const filters: Filters = useMemo(
    () => ({ day, kinds, radius, showTowns, query }),
    [day, kinds, radius, showTowns, query]
  );
  const places = useMemo(() => filterPlaces(ALL, filters), [filters]);

  const toggle = (k: PlaceKind) =>
    setKinds((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const chip = (on: boolean) =>
    `shrink-0 rounded-md border px-2.5 py-1 font-mono text-[10.5px] tracking-[0.05em] uppercase transition-colors ${
      on
        ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-surface)]"
        : "border-[var(--color-line)] bg-[var(--color-raised)] text-[var(--color-ink-2)]"
    }`;

  return (
    <div className="flex h-[calc(100dvh-3.25rem)] flex-col">
      {/* day tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-2">
        <button onClick={() => setDay(-1)} className={chip(day === -1)}>
          All
        </button>
        {itinerary.days.map((d, i) => (
          <button key={d.date} onClick={() => setDay(i)} className={chip(day === i)}>
            {d.date.replace("Oct ", "")}
          </button>
        ))}
      </div>

      {/* kind + radius */}
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-2">
        {KINDS.map((k) => (
          <button key={k} onClick={() => toggle(k)} className={chip(kinds.has(k))}>
            {KIND_LABEL[k]}
          </button>
        ))}
        <span className="mx-1 w-px shrink-0 bg-[var(--color-line)]" />
        {RADII.map((r) => (
          <button key={r} onClick={() => setRadius(r)} className={chip(radius === r)}>
            {r} km
          </button>
        ))}
        <button onClick={() => setShowTowns((v) => !v)} className={chip(showTowns)}>
          Towns
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <MapCanvas
          places={places}
          day={day}
          focus={focus}
          onSelect={setFocus}
          filters={filters}
        />

        {/* count + list handle */}
        <button
          onClick={() => setSheet((v) => !v)}
          className="absolute top-2.5 left-2.5 z-400 rounded-md border border-[var(--color-line)]
                     bg-[var(--color-surface)]/95 px-2.5 py-1.5 font-mono text-[10.5px]
                     tracking-[0.05em] uppercase shadow-sm backdrop-blur"
        >
          {places.length} places · {sheet ? "hide list" : "list"}
        </button>

        {sheet && (
          <div
            className="absolute inset-x-0 bottom-0 z-400 flex max-h-[62%] flex-col border-t
                       border-[var(--color-line)] bg-[var(--color-surface)] shadow-[0_-8px_24px_rgba(0,0,0,.18)]"
          >
            <div className="border-b border-[var(--color-line)] p-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-raised)]
                           px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <PlaceList
              places={places}
              filters={filters}
              onSelect={(p) => {
                setFocus(p);
                setSheet(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
