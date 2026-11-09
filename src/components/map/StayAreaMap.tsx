import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@/data/properties";
import { areaView, hasCoords, approxPoint, AREA_ONLY_CIRCLE_M } from "@/lib/map-pins";
import { useAreaPoints } from "@/hooks/useAreaPoints";

/**
 * Stay page map on free OpenStreetMap tiles. Before payment it shows only an area circle
 * centred on an approximate point (the real spot is inside, never at the centre);
 * after payment it shows the exact pin. Stays without their own pin show their neighbourhood/city area.
 */
export const StayAreaMap = ({ p, height = 220, approximate = true }: { p: Property; height?: number; approximate?: boolean }) => {
  const box = useRef<HTMLDivElement>(null);
  const areas = useAreaPoints([p]);
  const own = hasCoords(p);
  const area = areas[p.id];
  useEffect(() => {
    if (!box.current || (!own && !area)) return;
    const v = own ? areaView(p.id, p.lat, p.lng, approximate) : { center: approxPoint(p.id, area!.lat, area!.lng), radius: AREA_ONLY_CIRCLE_M };
    const loose = approximate || !own;
    const map = L.map(box.current, {
      zoomControl: !loose, attributionControl: true,
      dragging: !loose, scrollWheelZoom: false, doubleClickZoom: !loose, touchZoom: !loose, keyboard: !loose,
    }).setView(v.center, own ? (approximate ? 14 : 15) : 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "© OpenStreetMap" }).addTo(map);
    if (v.radius) L.circle(v.center, { radius: v.radius, className: "sg-area-circle", stroke: false, fillOpacity: 0.25 }).addTo(map);
    else L.circleMarker(v.center, { radius: 9, weight: 3, fillOpacity: 1, className: "sg-area-circle" }).addTo(map);
    return () => { map.remove(); };
  }, [p.id, p.lat, p.lng, approximate, own, area?.lat, area?.lng]);
  if (!own && !area) return null;
  return (
    <div>
      <div ref={box} className="rounded-2xl overflow-hidden border border-border relative z-0" style={{ height }} role="img" aria-label={approximate || !own ? "Approximate area of this stay" : "Location of this stay"} />
      {!own && <p className="text-xs text-muted-foreground mt-1">Approximate area. The exact location is shared after booking.</p>}
    </div>
  );
};
