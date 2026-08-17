import { gmaps, gmapsRoute, poi, trip } from "@/lib/data";
import { allSched, bedKeys } from "@/lib/schedule";
import { hhmm } from "@/lib/sun";

const NIGHTS = ["Oct 2", "Oct 3", "Oct 4", "Oct 5", "Oct 6", "Oct 7", "Oct 8", "Oct 9"];

export default function Stays() {
  const beds = bedKeys();
  const s = allSched();
  const byNight = new Map(trip.bookings.map((b) => [b.night, b]));

  return (
    <div>
      <header className="border-b border-[var(--color-line)] px-4 pt-5 pb-4">
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-3)]">
          8 nights · 2 rooms · 3 people
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Where we sleep</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-2)]">
          Addresses, confirmation numbers and phone numbers are in Telegram, not here.
        </p>
        <a
          href={gmapsRoute(trip.bookings.map((b) => b.town))}
          target="_blank"
          rel="noopener"
          className="mt-3 inline-block rounded-md border border-[var(--color-accent)]
                     bg-[var(--color-accent)] px-3 py-2 font-mono text-[10.5px]
                     tracking-[0.06em] uppercase text-[var(--color-surface)]"
        >
          All eight as one Google route
        </a>
      </header>

      <ol>
        {beds.map((bedKey, i) => {
          const b = byNight.get(i + 1);
          const arrival = i === 0 ? null : s[i - 1];
          const tight = arrival && arrival.slack < 60;
          const town = b?.town ?? poi(bedKey).name;
          return (
            <li key={i} className="flex gap-3 border-b border-[var(--color-line-2)] px-4 py-3.5">
              <span className="mt-0.5 w-16 shrink-0 font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--color-ink-3)]">
                N{i + 1}
                <br />
                {NIGHTS[i]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15.5px] font-semibold">{town}</span>
                {arrival && (
                  <span
                    className={`mt-0.5 block font-mono text-[10.5px] tabular-nums ${
                      tight ? "text-[var(--color-warn)]" : "text-[var(--color-ink-3)]"
                    }`}
                  >
                    arrive {hhmm(arrival.end)} · dark {hhmm(arrival.set)}
                  </span>
                )}
                <a
                  href={gmaps(town)}
                  target="_blank"
                  rel="noopener"
                  className="mt-1.5 inline-block rounded border border-[var(--color-line)]
                             bg-[var(--color-raised)] px-2 py-1 font-mono text-[9.5px]
                             tracking-[0.06em] uppercase text-[var(--color-accent-ink)]"
                >
                  Map
                </a>
              </span>
            </li>
          );
        })}
      </ol>

      <section className="border-t-4 border-[var(--color-line)] px-4 py-5">
        <h2 className="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--color-ink-3)]">
          Flights
        </h2>
        {trip.flights.map((f) => (
          <p key={f.flightNo} className="mt-2 font-mono text-[12px] tabular-nums">
            <span className="font-sans font-semibold">{f.flightNo}</span>{" "}
            {f.from} {f.depart} → {f.to} {f.arrive}
            <span className="ml-2 text-[var(--color-ink-3)]">{f.date}</span>
          </p>
        ))}

        {trip.car && (
          <>
            <h2 className="mt-5 font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--color-ink-3)]">
              Car
            </h2>
            <p className="mt-2 text-[14px] font-semibold">{trip.car.model}</p>
            <p className="font-mono text-[11px] tabular-nums text-[var(--color-ink-2)]">
              {trip.car.pickup.date} {trip.car.pickup.time} → {trip.car.dropoff.date}{" "}
              {trip.car.dropoff.time}
            </p>
            {trip.car.restrictions && (
              <div className="mt-2.5 rounded-md border-l-2 border-[var(--color-bad)] bg-[var(--color-bad)]/8 px-3 py-2">
                <p className="font-mono text-[9.5px] tracking-[0.08em] uppercase text-[var(--color-bad)]">
                  This car may not use
                </p>
                <p className="mt-1 text-[13px] leading-relaxed">
                  {trip.car.restrictions.bannedRoads.join(" · ")}
                </p>
                <p className="mt-1 text-[11.5px] text-[var(--color-ink-2)]">
                  {trip.car.restrictions.penaltyISK.toLocaleString()} ISK penalty and no
                  insurance. Our route uses none of them — don&apos;t accept a nav shortcut.
                </p>
              </div>
            )}
          </>
        )}

        <h2 className="mt-5 font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--color-ink-3)]">
          Useful
        </h2>
        <ul className="mt-2 space-y-1 text-[13.5px]">
          {Object.entries(trip.emergency ?? {}).map(([k, v]) => (
            <li key={k} className="flex gap-2">
              <span className="w-40 shrink-0 text-[var(--color-ink-2)]">{k}</span>
              {v.startsWith("http") ? (
                <a href={v} target="_blank" rel="noopener" className="text-[var(--color-accent-ink)]">
                  {v.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <a href={`tel:${v}`} className="font-mono font-semibold">
                  {v}
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
