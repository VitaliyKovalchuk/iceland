import DayView from "@/components/DayView";
import { tripDay } from "@/lib/today";

export default function Today() {
  const { index, state, daysAway } = tripDay();
  return (
    <>
      {state !== "during" && (
        <p className="border-b border-[var(--color-line)] bg-[var(--color-accent-soft)] px-4 py-2.5
                      font-mono text-[10.5px] tracking-[0.08em] uppercase text-[var(--color-accent-ink)]">
          {state === "before"
            ? `${daysAway} days to go — showing day 1`
            : "Trip complete — showing the last day"}
        </p>
      )}
      <DayView index={index} />
    </>
  );
}
