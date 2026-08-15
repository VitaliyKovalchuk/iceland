"use client";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { gmaps, itinerary, poi } from "@/lib/data";
import { sched } from "@/lib/schedule";
import { hhmm } from "@/lib/sun";
import type { LatLng } from "@/lib/types";

import { DAY_COLOURS } from "./dayColours";

function dayLine(i: number): LatLng[] {
  const ks = itinerary.days[i].stops.map((s) => s.loc);
  const out: LatLng[] = [];
  for (let j = 0; j < ks.length - 1; j++) {
    if (ks[j] === ks[j + 1]) continue;
    out.push(...(itinerary.geo[`${ks[j]}|${ks[j + 1]}`] ?? []));
  }
  return out;
}

export default function RouteMapInner({ dayIndex }: { dayIndex?: number }) {
  const days = dayIndex == null ? itinerary.days.map((_, i) => i) : [dayIndex];
  const lines = days.map(dayLine);
  const all = lines.flat();
  const bounds: LatLngBoundsExpression = all.length
    ? [
        [Math.min(...all.map((p) => p[0])), Math.min(...all.map((p) => p[1]))],
        [Math.max(...all.map((p) => p[0])), Math.max(...all.map((p) => p[1]))],
      ]
    : [
        [63.3, -24.6],
        [66.6, -13.4],
      ];

  return (
    <MapContainer bounds={bounds} boundsOptions={{ padding: [22, 22] }} scrollWheelZoom>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
        maxZoom={17}
      />
      {days.map((di, n) => (
        <Polyline
          key={di}
          positions={lines[n]}
          pathOptions={{ color: DAY_COLOURS[di % 8], weight: dayIndex == null ? 3.2 : 4.5, opacity: 0.85 }}
        />
      ))}
      {days.flatMap((di) => {
        const s = sched(itinerary.days[di]);
        return s.rows
          .filter((r) => r.dwell > 0 || r.i === itinerary.days[di].stops.length - 1)
          .map((r) => {
            const p = poi(r.loc);
            return (
              <CircleMarker
                key={`${di}-${r.loc}-${r.i}`}
                center={[p.lat, p.lng]}
                radius={5.5}
                pathOptions={{
                  color: "#fff",
                  weight: 2,
                  fillColor: DAY_COLOURS[di % 8],
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <strong>{p.name}</strong>
                  <br />
                  <span className="font-mono text-[10px] tracking-wide uppercase opacity-70">
                    {hhmm(r.arrive)}
                    {r.dwell > 0 && `–${hhmm(r.depart)}`} · {itinerary.days[di].date}
                  </span>
                  <br />
                  <a href={gmaps(p.search)} target="_blank" rel="noopener">
                    Google Maps
                  </a>
                </Popup>
              </CircleMarker>
            );
          });
      })}
    </MapContainer>
  );
}
