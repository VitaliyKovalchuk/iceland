import { itinerary } from "./data";
import { isoDate } from "./schedule";

/** Which day are we on? Returns the index, or a countdown when the trip hasn't started.
 *  Iceland is UTC year-round so a plain UTC date comparison is correct on the ground. */
export function tripDay(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const dates = itinerary.days.map((d) => isoDate(d.date));
  const i = dates.indexOf(today);
  if (i >= 0) return { index: i, state: "during" as const, daysAway: 0 };
  const first = dates[0];
  if (today < first) {
    const away = Math.round(
      (Date.parse(first) - Date.parse(today)) / 86_400_000
    );
    return { index: 0, state: "before" as const, daysAway: away };
  }
  return { index: dates.length - 1, state: "after" as const, daysAway: 0 };
}
