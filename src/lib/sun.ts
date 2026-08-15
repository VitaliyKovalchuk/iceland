/** NOAA solar position, ported from the verified planner. Iceland is UTC year-round,
 *  so minutes-from-midnight UTC is local time with no offset.
 *
 *  Per-location matters: a single Reykjavík column is off by up to ±16 min across the
 *  ring, and the sign of the error flips with longitude. Always pass the real stop. */

const rad = Math.PI / 180, deg = 180 / Math.PI;
const cache = new Map<string, { rise: number; set: number }>();

export function sunTimes(lat: number, lng: number, dayOfOct: number) {
  const ck = `${lat.toFixed(3)}|${lng.toFixed(3)}|${dayOfOct}`;
  const got = cache.get(ck);
  if (got) return got;

  const y = 2026, m = 10, d = dayOfOct;
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  const jd =
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  const t = (jd - 2451545) / 36525;
  const L0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const C =
    Math.sin(M * rad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * M * rad) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * M * rad) * 0.000289;
  const lam = L0 + C - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * t) * rad);
  const eps =
    23 +
    (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60 +
    0.00256 * Math.cos((125.04 - 1934.136 * t) * rad);
  const dec = Math.asin(Math.sin(eps * rad) * Math.sin(lam * rad)) * deg;
  const yy = Math.tan((eps / 2) * rad) ** 2;
  const eot =
    4 *
    deg *
    (yy * Math.sin(2 * L0 * rad) -
      2 * e * Math.sin(M * rad) +
      4 * e * yy * Math.sin(M * rad) * Math.cos(2 * L0 * rad) -
      0.5 * yy * yy * Math.sin(4 * L0 * rad) -
      1.25 * e * e * Math.sin(2 * M * rad));
  const cosH =
    Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(dec * rad)) -
    Math.tan(lat * rad) * Math.tan(dec * rad);

  let out: { rise: number; set: number };
  if (Math.abs(cosH) > 1) out = { rise: 0, set: 1440 };
  else {
    const H = Math.acos(cosH) * deg, noon = 720 - 4 * lng - eot;
    out = { rise: Math.round(noon - 4 * H), set: Math.round(noon + 4 * H) };
  }
  cache.set(ck, out);
  return out;
}

/** "Oct 3" -> 3 */
export const dayNum = (date: string) => Number(date.split(" ")[1]);

export const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m) % 60).padStart(2, "0")}`;

export const mins = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

export const dur = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : `${m}m`;
