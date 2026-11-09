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

  // Pins close together on screen merge into a "N stays" bubble that zooms in when tapped.
  const draw = () => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers(); markers.current.clear();
    const cells = new Map<string, { pts: [number, number][]; items: Property[] }>();
    list.forEach((p) => {
      if (!p.lat || !p.lng) return;
      const ll = approxPoint(p.id, p.lat, p.lng);
      const pt = m.latLngToLayerPoint(ll);
      const key = `${Math.round(pt.x / 56)}:${Math.round(pt.y / 32)}`;
      const c = cells.get(key) || { pts: [], items: [] };
      c.pts.push(ll); c.items.push(p); cells.set(key, c);
    });
    cells.forEach((c) => {
      if (c.items.length === 1) {
        const p = c.items[0];
        const mk = L.marker(c.pts[0], {
          icon: L.divIcon({ className: "sg-pin-wrap", html: `<span class="sg-pin">${shortPrice(p.priceNum)}</span>` }),
          keyboard: true, title: `${shortPrice(p.priceNum)} per night`,
        }).on("click", () => onSelect?.(p));
        mk.addTo(g); markers.current.set(p.id, mk);
      } else {
        const bounds = L.latLngBounds(c.pts);
        L.marker(bounds.getCenter(), {
          icon: L.divIcon({ className: "sg-pin-wrap", html: `<span class="sg-pin">${c.items.length} stays</span>` }),
          keyboard: true, title: `${c.items.length} stays here — zoom in`,
        }).on("click", () => {
          if (m.getZoom() >= 16) onSelect?.(c.items[0]);
          else m.flyToBounds(bounds.pad(0.5), { maxZoom: Math.min(17, m.getZoom() + 3) });
        }).addTo(g);
        c.items.forEach((p) => markers.current.set(p.id, null as unknown as L.Marker));
      }
    });
  };
  const drawRef = useRef(draw); drawRef.current = draw;

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const pts = list.filter((p) => p.lat && p.lng).map((p) => approxPoint(p.id, p.lat, p.lng));
    if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 14 });
    drawRef.current();
    const on = () => drawRef.current();
    m.on("zoomend", on);
    return () => { m.off("zoomend", on); };
  }, [list]);

  useEffect(() => {
    markers.current.forEach((mk, id) => {
      if (!mk) return;
      const el = mk.getElement()?.querySelector(".sg-pin");
      el?.classList.toggle("sg-pin-active", id === activeId);
      if (id === activeId) mk.setZIndexOffset(1000); else mk.setZIndexOffset(0);
    });
  }, [activeId, list]);

  return <div ref={box} style={{ height }} className="w-full rounded-xl overflow-hidden border border-border z-0" aria-label="Map of stays (approximate areas)" role="region" />;
};
