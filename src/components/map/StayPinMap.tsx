import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@/data/properties";
import { approxPoint, shortPrice, hasCoords, AREA_CIRCLE_M } from "@/lib/map-pins";

/**
 * Explore map: every stay as a price pin at an approximate point (never the building).
 * Free OpenStreetMap tiles; loads only when rendered. `activeId` highlights a pin (card hover).
 */
export const StayPinMap = ({ list, activeId, onSelect, onCluster, height = 520 }: {
  list: Property[]; activeId?: string | null; onSelect?: (p: Property) => void;
  /** Stays that still overlap at full zoom — show them as a list to pick from. */
  onCluster?: (items: Property[]) => void; height?: number | string;
}) => {
  const circle = useRef<L.Circle | null>(null);
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
      if (!hasCoords(p)) return;
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
        const bub = L.marker(bounds.getCenter(), {
          icon: L.divIcon({ className: "sg-pin-wrap", html: `<span class="sg-pin">${c.items.length} stays</span>` }),
          keyboard: true, title: `${c.items.length} stays here — zoom in`,
        }).on("click", () => {
          const tiny = bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 150;
          if (m.getZoom() >= 16 || tiny) (onCluster ? onCluster(c.items) : onSelect?.(c.items[0]));
          else m.flyToBounds(bounds.pad(0.5), { maxZoom: Math.min(17, m.getZoom() + 3) });
        }).addTo(g);
        // A stay inside a bubble highlights the bubble.
        c.items.forEach((p) => markers.current.set(p.id, bub));
      }
    });
  };
  const drawRef = useRef(draw); drawRef.current = draw;

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const pts = list.filter(hasCoords).map((p) => approxPoint(p.id, p.lat, p.lng));
    if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 14 });
    drawRef.current();
    const on = () => drawRef.current();
    m.on("zoomend", on);
    return () => { m.off("zoomend", on); };
  }, [list]);

  useEffect(() => {
    const active = activeId ? markers.current.get(activeId) : undefined;
    new Set(markers.current.values()).forEach((mk) => {
      const on = mk === active;
      mk.getElement()?.querySelector(".sg-pin")?.classList.toggle("sg-pin-active", on);
      mk.setZIndexOffset(on ? 1000 : 0);
    });
    // Soft area circle around the picked stay's approximate point (never the building).
    const m = map.current;
    circle.current?.remove(); circle.current = null;
    const p = activeId ? list.find((x) => x.id === activeId) : null;
    if (m && p && hasCoords(p)) {
      circle.current = L.circle(approxPoint(p.id, p.lat, p.lng), {
        radius: AREA_CIRCLE_M, className: "sg-area-circle", interactive: false, weight: 1.5, fillOpacity: 0.12,
      }).addTo(m);
    }
  }, [activeId, list]);

  return <div ref={box} style={{ height }} className="w-full rounded-xl overflow-hidden border border-border z-0" aria-label="Map of stays (approximate areas)" role="region" />;
};
