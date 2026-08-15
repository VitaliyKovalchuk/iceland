"use client";
import dynamic from "next/dynamic";

/* Leaflet touches window on import, so it can never render on the server. */
const Inner = dynamic(() => import("./RouteMapInner"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center font-mono text-[10.5px] tracking-[0.09em] uppercase text-[var(--color-ink-3)]">
      loading map
    </div>
  ),
});

export default function RouteMap(props: { dayIndex?: number; className?: string }) {
  return <Inner {...props} />;
}
