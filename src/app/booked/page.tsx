import { gmaps, poi, trip } from "@/lib/data";
import { allSched, bedKeys } from "@/lib/schedule";
import { hhmm } from "@/lib/sun";

const NIGHT_DATES = ["Oct 2", "Oct 3", "Oct 4", "Oct 5", "Oct 6", "Oct 7", "Oct 8", "Oct 9"];

export default function Booked() {
  const beds = bedKeys();
  const s = allSched();
  const has = trip.bookings.length > 0;

  return (
    <div>
      <header className="border-b border-[var(--color-line)] px-4 pt-5 pb-4">
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-3)]">
          8 nights · 2 rooms
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Booked</h1>
      </header>

      {!has && (
        <p className="m-4 rounded-md border border-[var(--color-warn)] bg-[var(--color-warn)]/10
                      px-4 py-3 text-[13px] leading-relaxed">
          No booking details entered yet. These are the towns the route sleeps in — fill{" "}
          <code className="font-mono text-[11.5px]">data/trip.json</code> with the real
          properties and this page shows addresses, phone numbers and confirmations.
        </p>
      )}

      <ol>
        {beds.map((b, i) => {
          const p = poi(b);
          const booking = trip.bookings.find((x) => x.night === i + 1);
          const arrival = i === 0 ? null : s[i - 1];
          return (
            <li key={i} className="border-b border-[var(--color-line-2)] px-4 py-4">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--color-ink-3)]">
                  Night {i + 1} · {NIGHT_DATES[i]}
                </span>
                {arrival && arrival.slack < 60 && (
                  <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--color-warn)]">
                    tight — arrives {hhmm(arrival.end)}, dark {hhmm(arrival.set)}
                  </span>
                )}
              </div>

              <h2 className="mt-1 text-[16px] font-semibold">
                {booking?.property ?? p.name}
              </h2>
              {booking?.property && (
                <p className="font-mono text-[10.5px] text-[var(--color-ink-3)]">
                  in {booking.town}
                </p>
              )}

              {booking ? (
                <dl className="mt-2 space-y-0.5 text-[13px]">
                  {booking.address && (
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 font-mono text-[10px] uppercase text-[var(--color-ink-3)]">
                        Address
                      </dt>
                      <dd>
                        <a
                          href={gmaps(booking.address)}
                          target="_blank"
                          rel="noopener"
                          className="hover:text-[var(--color-accent-ink)]"
                        >
                          {booking.address}
                        </a>
                      </dd>
                    </div>
                  )}
                  {booking.phone && (
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 font-mono text-[10px] uppercase text-[var(--color-ink-3)]">
                        Phone
                      </dt>
                      <dd>
                        <a href={`tel:${booking.phone}`} className="font-mono">
                          {booking.phone}
                        </a>
                      </dd>
                    </div>
                  )}
                  {booking.bookingRef && (
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 font-mono text-[10px] uppercase text-[var(--color-ink-3)]">
                        Ref
                      </dt>
                      <dd className="font-mono select-all">{booking.bookingRef}</dd>
                    </div>
                  )}
                  {booking.checkIn && (
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 font-mono text-[10px] uppercase text-[var(--color-ink-3)]">
                        Check-in
                      </dt>
                      <dd className="font-mono tabular-nums">
                        {booking.checkIn}
                        {booking.breakfast != null &&
                          ` · breakfast ${booking.breakfast ? "included" : "no"}`}
                      </dd>
                    </div>
                  )}
                  {booking.notes && (
                    <p className="pt-1 text-[12.5px] text-[var(--color-ink-2)]">{booking.notes}</p>
                  )}
                </dl>
              ) : (
                <a
                  href={gmaps(p.search)}
                  target="_blank"
                  rel="noopener"
                  className="mt-1 inline-block font-mono text-[10px] tracking-[0.06em] uppercase
                             text-[var(--color-accent-ink)]"
                >
                  Google Maps
                </a>
              )}
            </li>
          );
        })}
      </ol>

      <section className="px-4 py-5">
        <h2 className="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--color-ink-3)]">
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
