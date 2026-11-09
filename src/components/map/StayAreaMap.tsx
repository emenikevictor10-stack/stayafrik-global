import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@/data/properties";
import { areaView } from "@/lib/map-pins";

/**
 * Stay page map on free OpenStreetMap tiles. Before payment it shows only an area circle
 * centred on an approximate point (the real spot is inside, never at the centre);
 * after payment it shows the exact pin.
 */
export const StayAreaMap = ({ p, height = 220, approximate = true }: { p: Property; height?: number; approximate?: boolean }) => {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!box.current) return;
    const v = areaView(p.id, p.lat, p.lng, approximate);
    const map = L.map(box.current, {
      zoomControl: !approximate, attributionControl: true,
      dragging: !approximate, scrollWheelZoom: false, doubleClickZoom: !approximate, touchZoom: !approximate, keyboard: !approximate,
    }).setView(v.center, approximate ? 14 : 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "© OpenStreetMap" }).addTo(map);
    if (v.radius) L.circle(v.center, { radius: v.radius, className: "sg-area-circle", stroke: false, fillOpacity: 0.25 }).addTo(map);
    else L.circleMarker(v.center, { radius: 9, weight: 3, fillOpacity: 1, className: "sg-area-circle" }).addTo(map);
    return () => { map.remove(); };
  }, [p.id, p.lat, p.lng, approximate]);
  return <div ref={box} className="rounded-2xl overflow-hidden border border-border relative z-0" style={{ height }} role="img" aria-label={approximate ? "Approximate area of this stay" : "Location of this stay"} />;
};
