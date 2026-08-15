"use client";
import { useEffect, useRef } from "react";
import {
  MapContainer, TileLayer, Polyline, Marker, CircleMarker, Popup, useMap, LayersControl, ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import { itinerary, poi, gmaps, gmapsAt, gmapsDriveTo, trip } from "@/lib/data";
import { colourOf, labelOf, nearest, daysOf, type Filters } from "@/lib/places";
import { markerHtml } from "@/lib/icons";
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

/** View management.
 *
 *  Two traps, both learned the hard way:
 *  1. The map mounts inside a flex column that settles a frame later, so a fit at
 *     mount can use a stale container size.
 *  2. fitBounds is not idempotent under the default zoomSnap — getBoundsZoom is
 *     reference-dependent, so re-fitting can drop a whole level. Hence zoomSnap=0
 *     on the container, and fit once per (day, size).
 */
function Controller({ day, focus }: { day: number; focus: Place | null }) {
  const map = useMap();
  const fittedAt = useRef("");

  useEffect(() => {
    const fit = () => {
      const el = map.getContainer();
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      const stamp = `${day}|${w}x${h}`;
      if (stamp === fittedAt.current) return;
      fittedAt.current = stamp;
      map.invalidateSize({ animate: false });
      const idx = day < 0 ? itinerary.days.map((_, i) => i) : [day];
      const pts = idx.flatMap(dayLine);
      if (pts.length) map.fitBounds(pts as [number, number][], { padding: [20, 20], animate: false });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [day, map]);

  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], 13, { duration: 0.6 });
  }, [focus, map]);

  return null;
}

/** Icons are pure functions of (category, focus) so they cache once for the whole
 *  session rather than per render — there are 20 categories and up to 700 markers. */
const ICONS = new Map<string, L.DivIcon>();
function iconFor(p: Place, isFocus: boolean) {
  const key = `${p.cat}|${isFocus}`;
  const hit = ICONS.get(key);
  if (hit) return hit;
  const size = isFocus ? 32 : 24;
  const ic = L.divIcon({
    html: markerHtml(p.cat, colourOf(p), size),
    className: `mk-wrap${isFocus ? " is-focus" : ""}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
  ICONS.set(key, ic);
  return ic;
}

function PlaceMarkers({
  places, focus, onSelect, filters,
}: { places: Place[]; focus: Place | null; onSelect: (p: Place) => void; filters: Filters }) {
  return (
    <>
      {places.slice(0, 700).map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={iconFor(p, focus?.id === p.id)}
          zIndexOffset={focus?.id === p.id ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(p) }}
        >
          <Popup>
            <strong>{p.name}</strong>
            <br />
            <span style={{ fontSize: 11, opacity: 0.7 }}>
              {labelOf(p)} · {nearest(p, filters)} km off route · day{" "}
              {daysOf(p, filters.day).map(([, d]) => d + 1).join("/")}
            </span>
            {p.cuisine && <><br /><span style={{ fontSize: 11 }}>{p.cuisine}</span></>}
            {p.hours && <><br /><span style={{ fontSize: 11 }}>{p.hours}</span></>}
            {p.address && <><br /><span style={{ fontSize: 11, opacity: 0.75 }}>{p.address}</span></>}
            <br />
            {/* by coordinate: names out here are ambiguous and land on the wrong pin */}
            <a href={gmapsAt(p.lat, p.lng)} target="_blank" rel="noopener">Open</a>
            {" · "}
            <a href={gmapsDriveTo(p.lat, p.lng)} target="_blank" rel="noopener">Drive</a>
            {p.phone && <> · <a href={`tel:${p.phone}`}>Call</a></>}
            {p.website && <> · <a href={p.website} target="_blank" rel="noopener">Web</a></>}
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export default function MapCanvas({
  places, day, focus, onSelect, filters,
}: {
  places: Place[]; day: number; focus: Place | null;
  onSelect: (p: Place) => void; filters: Filters;
}) {
  const days = day < 0 ? itinerary.days.map((_, i) => i) : [day];

  return (
    <MapContainer
      center={[64.9, -18.6]}
      zoom={6}
      scrollWheelZoom
      zoomControl={false}
      /* fractional zoom — with the default snap of 1, fitBounds floors an exact
         boundary value and the whole-ring view settles a level too far out */
      zoomSnap={0}
      className="h-full w-full"
    >
      <ZoomControl position="bottomleft" />
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

      <PlaceMarkers places={places} focus={focus} onSelect={onSelect} filters={filters} />

      {/* our own stops */}
      {days.flatMap((i) =>
        itinerary.days[i].stops.filter((s) => s.dwell > 0).map((s, n) => {
          const q = poi(s.loc);
          return (
            <CircleMarker key={`${i}-${s.loc}-${n}`} center={[q.lat, q.lng]} radius={7}
              pane="markerPane"
              pathOptions={{ color: "#fff", weight: 3, fillColor: DAY_COLOURS[i % 8], fillOpacity: 1 }}>
              <Popup>
                <strong>{q.name}</strong>
                <br />
                <span style={{ fontSize: 11, opacity: 0.7 }}>
                  Our stop · day {i + 1} · {itinerary.days[i].date}
                </span>
                <br />
                <a href={gmaps(q.search)} target="_blank" rel="noopener">Open</a>
                {" · "}
                <a href={gmapsDriveTo(q.lat, q.lng)} target="_blank" rel="noopener">Drive</a>
              </Popup>
            </CircleMarker>
          );
        })
      )}

      {/* where we sleep */}
      {trip.bookings.map((b) =>
        b.lat && b.lng ? (
          <CircleMarker key={`bed-${b.night}`} center={[b.lat, b.lng]} radius={8}
            pane="markerPane"
            pathOptions={{ color: "#fff", weight: 3, fillColor: "#0E1518", fillOpacity: 1 }}>
            <Popup>
              <strong>Night {b.night} — {b.property}</strong>
              <br />
              <span style={{ fontSize: 11, opacity: 0.7 }}>{b.date} · {b.town}</span>
              {b.address && <><br /><span style={{ fontSize: 11 }}>{b.address}</span></>}
              <br />
              <a href={gmapsAt(b.lat, b.lng)} target="_blank" rel="noopener">Open</a>
              {" · "}
              <a href={gmapsDriveTo(b.lat, b.lng)} target="_blank" rel="noopener">Drive</a>
              {b.phone && <> · <a href={`tel:${b.phone}`}>Call</a></>}
            </Popup>
          </CircleMarker>
        ) : null
      )}
    </MapContainer>
  );
}
