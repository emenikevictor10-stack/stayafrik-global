import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@/data/properties";
import { approxPoint, shortPrice } from "@/lib/map-pins";

/**
 * Explore map: every stay as a price pin at an approximate point (never the building).
 * Free OpenStreetMap tiles; loads only when rendered. `activeId` highlights a pin (card hover).
 */
export const StayPinMap = ({ list, activeId, onSelect, height = 520 }: {
  list: Property[]; activeId?: string | null; onSelect?: (p: Property) => void; height?: number | string;
}) => {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());

  useEffect(() => {
    if (!box.current || map.current) return;
    map.current = L.map(box.current, { zoomControl: true, attributionControl: true }).setView([6.45, 3.47], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "© OpenStreetMap" }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers(); markers.current.clear();
    const pts: L.LatLngExpression[] = [];
    list.forEach((p) => {
      if (!p.lat || !p.lng) return;
      const [lat, lng] = approxPoint(p.id, p.lat, p.lng);
      pts.push([lat, lng]);
      const mk = L.marker([lat, lng], {
        icon: L.divIcon({ className: "sg-pin-wrap", html: `<span class="sg-pin" data-id="${p.id}">${shortPrice(p.priceNum)}</span>`, iconSize: undefined }),
        keyboard: true, title: `${shortPrice(p.priceNum)} per night`,
      }).on("click", () => onSelect?.(p));
      mk.addTo(g); markers.current.set(p.id, mk);
    });
    if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 14 });
  }, [list]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    markers.current.forEach((mk, id) => {
      const el = mk.getElement()?.querySelector(".sg-pin");
      el?.classList.toggle("sg-pin-active", id === activeId);
      if (id === activeId) mk.setZIndexOffset(1000); else mk.setZIndexOffset(0);
    });
  }, [activeId, list]);

  return <div ref={box} style={{ height }} className="w-full rounded-xl overflow-hidden border border-border z-0" aria-label="Map of stays (approximate areas)" role="region" />;
};
