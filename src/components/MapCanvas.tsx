"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap, LayersControl } from "react-leaflet";
import { itinerary, poi, gmaps } from "@/lib/data";
import { trip } from "@/lib/data";
import { colourOf, labelOf, nearest, daysOf, type Filters } from "@/lib/places";
import { DAY_COLOURS } from "./dayColours";
import type { LatLng, Place } from "@/lib/types";

function dayLine(i: number): LatLng[] {
  const ks = itinerary.days[i].stops.map((s) => s.loc);
  const out: LatLng[] = [];
  for (let j = 0; j < ks.length - 1; j++) {
    if (ks[j] === ks[j + 1]) continue;
    out.push(...(itinerary.geo[`${ks[j]}|${ks[j + 1]}`] ?? []));
  }
  return out;
}

/** Re-fit when the chosen day changes, and fly to a place picked from the list. */
function Controller({ day, focus }: { day: number; focus: Place | null }) {
  const map = useMap();
  useEffect(() => {
    const idx = day < 0 ? itinerary.days.map((_, i) => i) : [day];
    const pts = idx.flatMap(dayLine);
    if (pts.length) map.fitBounds(pts as [number, number][], { padding: [26, 26] });
  }, [day, map]);
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], 13, { duration: 0.6 });
  }, [focus, map]);
  // The map mounts inside a flex column that settles a frame later; without this
  // Leaflet keeps the size it measured on mount and tiles come out misaligned.
  useEffect(() => {
    const fix = () => map.invalidateSize();
    const t = setTimeout(fix, 60);
    const ro = new ResizeObserver(fix);
    ro.observe(map.getContainer());
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [map]);
  return null;
}

export default function MapCanvas({
  places, day, focus, onSelect, filters,
}: {
  places: Place[]; day: number; focus: Place | null;
  onSelect: (p: Place) => void; filters: Filters;
}) {
  const days = day < 0 ? itinerary.days.map((_, i) => i) : [day];

  return (
    <MapContainer center={[64.9, -18.6]} zoom={6} scrollWheelZoom className="h-full w-full">
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Streets">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap" maxZoom={17} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri" maxZoom={17} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Terrain">
          <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenTopoMap" maxZoom={16} />
        </LayersControl.BaseLayer>
      </LayersControl>

      <Controller day={day} focus={focus} />

      {days.map((i) => (
        <Polyline key={i} positions={dayLine(i)}
          pathOptions={{ color: DAY_COLOURS[i % 8], weight: day < 0 ? 3 : 4.5, opacity: 0.8 }} />
      ))}

      {/* filtered places */}
      {places.slice(0, 900).map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]}
          radius={focus?.id === p.id ? 8 : 4.5}
          eventHandlers={{ click: () => onSelect(p) }}
          pathOptions={{
            color: focus?.id === p.id ? "#fff" : "rgba(0,0,0,.35)",
            weight: focus?.id === p.id ? 3 : 1,
            fillColor: colourOf(p), fillOpacity: 0.9,
          }}>
          <Popup>
            <strong>{p.name}</strong>
            <br />
            <span style={{ fontSize: 11, opacity: 0.7 }}>
              {labelOf(p)} · {nearest(p, filters)} km off route · day{" "}
              {daysOf(p, filters.day).map(([, d]) => d + 1).join("/")}
            </span>
            {p.hours && <><br /><span style={{ fontSize: 11 }}>{p.hours}</span></>}
            {p.address && <><br /><span style={{ fontSize: 11 }}>{p.address}</span></>}
            <br />
            <a href={gmaps(p.name)} target="_blank" rel="noopener">Maps</a>
            {p.phone && <> · <a href={`tel:${p.phone}`}>{p.phone}</a></>}
            {p.website && <> · <a href={p.website} target="_blank" rel="noopener">Web</a></>}
          </Popup>
        </CircleMarker>
      ))}

      {/* our stops, always on top */}
      {days.flatMap((i) =>
        itinerary.days[i].stops
          .filter((s) => s.dwell > 0)
          .map((s, n) => {
            const q = poi(s.loc);
            return (
              <CircleMarker key={`${i}-${s.loc}-${n}`} center={[q.lat, q.lng]} radius={6}
                pathOptions={{ color: "#fff", weight: 2.5, fillColor: DAY_COLOURS[i % 8], fillOpacity: 1 }}>
                <Popup>
                  <strong>{q.name}</strong>
                  <br />
                  <span style={{ fontSize: 11, opacity: 0.7 }}>
                    Our stop · day {i + 1} · {itinerary.days[i].date}
                  </span>
                  <br />
                  <a href={gmaps(q.search)} target="_blank" rel="noopener">Maps</a>
                </Popup>
              </CircleMarker>
            );
          })
      )}

      {/* where we sleep */}
      {trip.bookings.map((b) =>
        b.lat && b.lng ? (
          <CircleMarker key={`bed-${b.night}`} center={[b.lat, b.lng]} radius={7}
            pathOptions={{ color: "#fff", weight: 2.5, fillColor: "#0E1518", fillOpacity: 1 }}>
            <Popup>
              <strong>Night {b.night} — {b.property}</strong>
              <br />
              <span style={{ fontSize: 11, opacity: 0.7 }}>{b.date} · {b.town}</span>
              {b.address && <><br /><span style={{ fontSize: 11 }}>{b.address}</span></>}
              <br />
              <a href={gmaps(b.address ?? b.town)} target="_blank" rel="noopener">Maps</a>
            </Popup>
          </CircleMarker>
        ) : null
      )}
    </MapContainer>
  );
}
