import { gmaps, gmapsRoute, itinerary, poi } from "@/lib/data";
import { sched } from "@/lib/schedule";
import { dur, hhmm } from "@/lib/sun";
import RouteMap from "./RouteMap";

const INTENSITY: Record<string, string> = {
  relaxed: "text-[var(--color-ok)]",
  tight: "text-[var(--color-ink-2)]",
  full: "text-[var(--color-warn)]",
  hard: "text-[var(--color-bad)]",
};

export default function DayView({ index }: { index: number }) {
  const day = itinerary.days[index];
  const s = sched(day);
  const last = day.stops.length - 1;

  return (
    <div>
      <header className="border-b border-[var(--color-line)] px-4 pt-5 pb-4">
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-3)]">
          Day {index + 1} · {day.date} · departs {day.start}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-balance">{day.title}</h1>

        <dl className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-line-2)]">
          {[
            ["Driving", dur(s.min), INTENSITY[s.intensity]],
            ["Distance", `${s.km} km`, ""],
            ["Arrive", hhmm(s.end), ""],
            [
              "Before dark",
              (s.slack < 0 ? "−" : "") + dur(Math.abs(s.slack)),
              s.slack < 0 ? "text-[var(--color-bad)]" : s.slack < 60 ? "text-[var(--color-warn)]" : "",
            ],
          ].map(([k, v, cls]) => (
            <div key={k} className="bg-[var(--color-surface)] px-3 py-2.5">
              <dt className="font-mono text-[9px] tracking-[0.09em] uppercase text-[var(--color-ink-3)]">
                {k}
              </dt>
              <dd className={`mt-0.5 font-mono text-[15px] font-semibold tabular-nums ${cls}`}>
                {v}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-2.5 font-mono text-[10.5px] text-[var(--color-ink-3)]">
          Sunrise {hhmm(s.rise)} · sunset {hhmm(s.set)} at tonight&apos;s stop
        </p>

        <a
          href={gmapsRoute(day.stops.map((st) => poi(st.loc).search))}
          target="_blank"
          rel="noopener"
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-accent)]
                     bg-[var(--color-accent)] px-3 py-2 font-mono text-[10.5px] tracking-[0.06em]
                     uppercase text-[var(--color-surface)]"
        >
          Open the whole day in Google Maps
        </a>
      </header>

      <div className="h-64 border-b border-[var(--color-line)] sm:h-80">
        <RouteMap dayIndex={index} />
      </div>

      <ol className="px-4 py-2">
        {s.rows.map((r) => {
          const p = poi(r.loc);
          const isBed = r.i === last;
          const isStart = r.i === 0;
          return (
            <li key={`${r.loc}-${r.i}`} className="relative pl-7">
              {r.i < last && (
                <span className="absolute top-6 bottom-0 left-[9px] w-px bg-[var(--color-line)]" />
              )}
              <span
                className={`absolute top-[18px] left-1 size-[9px] rounded-full border-2 ${
                  isBed || isStart
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                    : "border-[var(--color-accent)] bg-[var(--color-surface)]"
                }`}
              />
              <div className="border-b border-[var(--color-line-2)] py-3.5">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-[13px] font-semibold tabular-nums">
                    {hhmm(r.arrive)}
                  </span>
                  <a
                    href={gmaps(p.search)}
                    target="_blank"
                    rel="noopener"
                    className="text-[15px] font-medium hover:text-[var(--color-accent-ink)]"
                  >
                    {p.name}
                  </a>
                  {isBed && (
                    <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--color-ok)]">
                      bed
                    </span>
                  )}
                  {r.dark && (
                    <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--color-warn)]">
                      dark
                    </span>
                  )}
                </div>

                {r.dwell > 0 && (
                  <p className="mt-0.5 font-mono text-[10.5px] text-[var(--color-ink-3)]">
                    {dur(r.dwell)} here → leaves {hhmm(r.depart)}
                    {p.price > 0 &&
                      ` · ${p.price.toLocaleString()} ISK (€${Math.round(
                        p.price / itinerary.isk_eur
                      )})`}
                  </p>
                )}

                {(p.note || p.activity) && (
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--color-ink-2)]">
                    {p.note || p.activity}
                  </p>
                )}

                <span className="mt-2 flex flex-wrap gap-1.5">
                  <a
                    href={gmaps(p.search)}
                    target="_blank"
                    rel="noopener"
                    className="rounded border border-[var(--color-line)] bg-[var(--color-raised)]
                               px-2 py-1 font-mono text-[9.5px] tracking-[0.06em] uppercase
                               text-[var(--color-accent-ink)]"
                  >
                    Map
                  </a>
                  {r.i > 0 && (
                    <a
                      href={gmapsRoute([poi(day.stops[r.i - 1].loc).search, p.search])}
                      target="_blank"
                      rel="noopener"
                      className="rounded border border-[var(--color-line)] bg-[var(--color-raised)]
                                 px-2 py-1 font-mono text-[9.5px] tracking-[0.06em] uppercase
                                 text-[var(--color-ink-2)]"
                    >
                      Drive here
                    </a>
                  )}
                </span>

                {r.legMin > 0 && (
                  <p className="mt-2.5 font-mono text-[10.5px] text-[var(--color-ink-3)]">
                    ↓ {dur(r.legMin)} · {r.legKm} km
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
