"use client";
import { colourOf, labelOf, nearest, daysOf, type Filters } from "@/lib/places";
import type { Place } from "@/lib/types";

export default function PlaceList({
  places, filters, onSelect,
}: { places: Place[]; filters: Filters; onSelect: (p: Place) => void }) {
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {places.slice(0, 250).map((p) => (
        <li key={p.id}>
          <button
            onClick={() => onSelect(p)}
            className="flex w-full gap-2.5 border-b border-[var(--color-line-2)] px-3 py-2.5
                       text-left hover:bg-[var(--color-accent-soft)]"
          >
            <span
              className="mt-1.5 size-2.5 shrink-0 rounded-full ring-1 ring-black/20"
              style={{ background: colourOf(p) }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium">
                {p.name}
                {p.planned && <span className="ml-1.5 text-[var(--color-ok)]">✓</span>}
              </span>
              <span className="mt-0.5 block font-mono text-[10px] text-[var(--color-ink-3)] tabular-nums">
                {labelOf(p)} · {nearest(p, filters)} km
                {filters.day < 0 && ` · day ${daysOf(p, -1).map(([, d]) => d + 1).join("/")}`}
                {p.brand && p.brand !== p.name && ` · ${p.brand}`}
              </span>
              {p.hours && (
                <span className="mt-0.5 block truncate text-[11px] text-[var(--color-ink-2)] tabular-nums">
                  {p.hours}
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
      {places.length > 250 && (
        <li className="px-3 py-3 font-mono text-[10px] uppercase text-[var(--color-ink-3)]">
          showing 250 of {places.length} — narrow the day, radius or search
        </li>
      )}
      {!places.length && (
        <li className="px-3 py-6 text-center text-[13px] text-[var(--color-ink-3)]">
          Nothing matches. Widen the radius or turn on town centres.
        </li>
      )}
    </ul>
  );
}
