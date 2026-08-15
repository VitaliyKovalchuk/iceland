import Link from "next/link";
import { itinerary, poi } from "@/lib/data";
import { allSched, bedKeys } from "@/lib/schedule";
import { dur, hhmm } from "@/lib/sun";
import RouteMap from "@/components/RouteMap";
import { DAY_COLOURS } from "@/components/dayColours";

export default function Days() {
  const s = allSched();
  const beds = bedKeys();
  const km = s.reduce((a, x) => a + x.km, 0);
  const min = s.reduce((a, x) => a + x.min, 0);

  return (
    <div>
      <header className="border-b border-[var(--color-line)] px-4 pt-5 pb-4">
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-3)]">
          2–10 October 2026 · anticlockwise
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">The whole ring</h1>
        <p className="mt-1.5 font-mono text-[11px] text-[var(--color-ink-2)] tabular-nums">
          {km.toLocaleString()} km · {dur(min)} driving · 8 days
        </p>
      </header>

      <div className="h-72 border-b border-[var(--color-line)] sm:h-96">
        <RouteMap />
      </div>

      <ol>
        {s.map((x, i) => {
          const d = itinerary.days[i];
          return (
            <li key={d.date}>
              <Link
                href={`/days/${i + 1}`}
                className="flex gap-3 border-b border-[var(--color-line-2)] px-4 py-3.5
                           hover:bg-[var(--color-accent-soft)]"
              >
                <span
                  className="mt-1.5 h-9 w-1 shrink-0 rounded-full"
                  style={{ background: DAY_COLOURS[i % 8] }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] font-semibold tracking-wide uppercase text-[var(--color-ink-3)]">
                      Day {i + 1} · {d.date}
                    </span>
                    {x.slack < 0 && (
                      <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--color-warn)]">
                        ends after dark
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[15px] font-medium">{d.title}</span>
                  <span className="mt-0.5 block font-mono text-[10.5px] text-[var(--color-ink-3)] tabular-nums">
                    {x.km} km · {dur(x.min)} · {d.start}–{hhmm(x.end)} · sleep{" "}
                    {poi(beds[i + 1] ?? beds[beds.length - 1]).name}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
