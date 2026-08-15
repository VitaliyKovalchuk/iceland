import { gmaps, poi, trip } from "@/lib/data";
import { allSched, bedKeys } from "@/lib/schedule";
import { hhmm } from "@/lib/sun";
import type { Booking } from "@/lib/types";

const NIGHTS = ["Oct 2", "Oct 3", "Oct 4", "Oct 5", "Oct 6", "Oct 7", "Oct 8", "Oct 9"];

const SOURCE_STYLE: Record<string, string> = {
  Airbnb: "border-[#FF5A5F] text-[#FF5A5F]",
  "Booking.com": "border-[#0071C2] text-[#0071C2]",
  Agoda: "border-[#8B5CF6] text-[#8B5CF6]",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-0.5">
      <dt className="w-[86px] shrink-0 font-mono text-[9.5px] tracking-[0.06em] uppercase text-[var(--color-ink-3)] pt-[3px]">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-[13px]">{children}</dd>
    </div>
  );
}

export default function Stays() {
  const beds = bedKeys();
  const s = allSched();
  const byNight = new Map<number, Booking>(trip.bookings.map((b) => [b.night, b]));

  return (
    <div>
      <header className="border-b border-[var(--color-line)] px-4 pt-5 pb-4">
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-3)]">
          8 nights · 2 rooms · 3 people
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Where we sleep</h1>
        <p className="mt-1.5 font-mono text-[11px] text-[var(--color-ink-2)]">
          {trip.bookings.filter((b) => !b.pending).length} booked ·{" "}
          {trip.bookings.filter((b) => b.pending).length} awaiting details
        </p>
      </header>

      <ol>
        {beds.map((bedKey, i) => {
          const night = i + 1;
          const b = byNight.get(night);
          const arrival = i === 0 ? null : s[i - 1];
          const tight = arrival && arrival.slack < 60;
          const planned = poi(bedKey);
          const elsewhere =
            b && !b.pending && !planned.name.toLowerCase().startsWith(b.town.toLowerCase().slice(0, 5));

          return (
            <li key={night} className="border-b border-[var(--color-line-2)] px-4 py-4">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--color-ink-3)]">
                  Night {night} · {NIGHTS[i]}
                </span>
                {b?.source && (
                  <span
                    className={`rounded border px-1.5 py-px font-mono text-[9px] tracking-[0.06em] uppercase ${
                      SOURCE_STYLE[b.source] ?? "border-[var(--color-line)] text-[var(--color-ink-3)]"
                    }`}
                  >
                    {b.source}
                  </span>
                )}
                {b?.pending && (
                  <span className="rounded border border-[var(--color-warn)] px-1.5 py-px font-mono text-[9px] tracking-[0.06em] uppercase text-[var(--color-warn)]">
                    details needed
                  </span>
                )}
                {tight && (
                  <span className="font-mono text-[9px] tracking-[0.06em] uppercase text-[var(--color-warn)]">
                    arrives {hhmm(arrival!.end)}, dark {hhmm(arrival!.set)}
                  </span>
                )}
              </div>

              <h2 className="mt-1.5 text-[16.5px] leading-snug font-semibold">
                {b?.property ?? planned.name}
              </h2>
              <p className="font-mono text-[10.5px] text-[var(--color-ink-3)]">
                {b?.town ?? planned.name}
                {elsewhere && " — not the town the route originally assumed"}
              </p>

              <dl className="mt-2">
                {b?.address && (
                  <Row label="Address">
                    <a
                      href={gmaps(b.address)}
                      target="_blank"
                      rel="noopener"
                      className="underline decoration-[var(--color-line)] underline-offset-2 hover:text-[var(--color-accent-ink)]"
                    >
                      {b.address}
                    </a>
                  </Row>
                )}
                {b?.phone && (
                  <Row label="Phone">
                    <a href={`tel:${b.phone}`} className="font-mono">{b.phone}</a>
                  </Row>
                )}
                {b?.bookingRef && (
                  <Row label="Ref">
                    <span className="font-mono select-all">{b.bookingRef}</span>
                  </Row>
                )}
                {(b?.checkIn || b?.checkOut) && (
                  <Row label="Check in/out">
                    <span className="font-mono tabular-nums">
                      {b.checkIn ?? "—"} / {b.checkOut ?? "—"}
                    </span>
                  </Row>
                )}
                {b?.rooms && <Row label="Rooms">{b.rooms}</Row>}
                {b?.bookedBy && <Row label="Booked by">{b.bookedBy}</Row>}
                {arrival && (
                  <Row label="We arrive">
                    <span className="font-mono tabular-nums">
                      {hhmm(arrival.end)} · sunset {hhmm(arrival.set)}
                    </span>
                  </Row>
                )}
              </dl>

              {b?.notes && (
                <p className="mt-2 rounded-md border-l-2 border-[var(--color-accent)] bg-[var(--color-accent-soft)]/50 px-3 py-2 text-[12.5px] leading-relaxed">
                  {b.notes}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {/* travel documents */}
      <section className="border-t-4 border-[var(--color-line)] px-4 py-5">
        <h2 className="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--color-ink-3)]">
          Flights
        </h2>
        {trip.flights.map((f) => (
          <div key={f.flightNo} className="mt-2.5 border-b border-[var(--color-line-2)] pb-2.5">
            <p className="text-[14px] font-semibold">
              {f.flightNo} <span className="font-normal text-[var(--color-ink-2)]">{f.airline}</span>
            </p>
            <p className="font-mono text-[11.5px] tabular-nums">
              {f.from} {f.depart} → {f.to} {f.arrive}
              <span className="ml-2 text-[var(--color-ink-3)]">{f.date}</span>
            </p>
            {f.notes && (
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-ink-2)]">{f.notes}</p>
            )}
          </div>
        ))}

        {trip.car && (
          <>
            <h2 className="mt-5 font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--color-ink-3)]">
              Car
            </h2>
            <p className="mt-2 text-[14px] font-semibold">{trip.car.model}</p>
            <p className="font-mono text-[11px] text-[var(--color-ink-2)]">
              {trip.car.spec} · customer {trip.car.customerNo}
            </p>
            <p className="mt-1.5 font-mono text-[11.5px] tabular-nums">
              Pick up {trip.car.pickup.date} {trip.car.pickup.time}
              <br />
              Drop off {trip.car.dropoff.date} {trip.car.dropoff.time}
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-ink-3)]">{trip.car.pickup.place}</p>
            {trip.car.notes && (
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-ink-2)]">
                {trip.car.notes}
              </p>
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
                <a href={`tel:${v}`} className="font-mono font-semibold">{v}</a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
