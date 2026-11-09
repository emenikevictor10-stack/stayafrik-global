import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@/data/properties";
import { shortPrice, AREA_CIRCLE_M, AREA_ONLY_CIRCLE_M, pinFor, trimOutliers, type AreaPoint, type Pin } from "@/lib/map-pins";

/**
 * Explore map: every stay as a price pin at an approximate point (never the building).
 * Stays without their own pin sit at their neighbourhood/city point (dashed "area" pin).
 * Free OpenStreetMap tiles; loads only when rendered. `activeId` highlights a pin (card hover).
 */
export const StayPinMap = ({ list, areas = {}, activeId, onSelect, onCluster, height = 520 }: {
  list: Property[]; areas?: Record<string, AreaPoint | undefined>; activeId?: string | null; onSelect?: (p: Property) => void;
  /** Stays that still overlap at full zoom — show them as a list to pick from. */
  onCluster?: (items: Property[]) => void; height?: number | string;
}) => {
  const circle = useRef<L.Circle | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());

  const pins = useMemo(() => {
    const m = new Map<string, Pin>();
    list.forEach((p) => { const pin = pinFor(p, areas); if (pin) m.set(p.id, pin); });
    return m;
  }, [list, areas]);
  const placed = useMemo(() => list.filter((p) => pins.has(p.id)), [list, pins]);

  useEffect(() => {
    if (!box.current || map.current) return;
    map.current = L.map(box.current, { zoomControl: true, attributionControl: true }).setView([6.45, 3.47], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "© OpenStreetMap" }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  // Pins close together on screen merge into a count bubble (sized by count) that zooms in when tapped.
  const draw = () => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers(); markers.current.clear();
    const cells = new Map<string, { pts: [number, number][]; items: Property[] }>();
    placed.forEach((p) => {
      const ll = pins.get(p.id)!.point;
      const pt = m.latLngToLayerPoint(ll);
      const key = `${Math.round(pt.x / 80)}:${Math.round(pt.y / 52)}`;
      const c = cells.get(key) || { pts: [], items: [] };
      c.pts.push(ll); c.items.push(p); cells.set(key, c);
    });
    cells.forEach((c) => {
      if (c.items.length === 1) {
        const p = c.items[0];
        const area = pins.get(p.id)!.kind === "area";
        const mk = L.marker(c.pts[0], {
          icon: L.divIcon({ className: "sg-pin-wrap", html: `<span class="sg-pin${area ? " sg-pin-area" : ""}">${shortPrice(p.priceNum)}</span>` }),
          keyboard: true, title: `${shortPrice(p.priceNum)} per night${area ? " (approximate area)" : ""}`,
        }).on("click", () => onSelect?.(p));
        mk.addTo(g); markers.current.set(p.id, mk);
      } else {
        const bounds = L.latLngBounds(c.pts);
        const n = c.items.length;
        const size = n >= 100 ? "sg-bubble-lg" : n >= 20 ? "sg-bubble-md" : "sg-bubble-sm";
        const bub = L.marker(bounds.getCenter(), {
          icon: L.divIcon({ className: "sg-pin-wrap", html: `<span class="sg-bubble ${size}">${n}</span>` }),
          keyboard: true, title: `${n} stays here — zoom in`, zIndexOffset: 500,
        }).on("click", () => {
          const tiny = bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 150;
          if (m.getZoom() >= 16 || tiny) (onCluster ? onCluster(c.items) : onSelect?.(c.items[0]));
          else m.flyToBounds(bounds.pad(0.3), { maxZoom: Math.min(17, m.getZoom() + 3) });
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
    const pts = trimOutliers(placed.map((p) => pins.get(p.id)!.point));
    if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 14 });
    drawRef.current();
    const on = () => drawRef.current();
    m.on("zoomend", on);
    return () => { m.off("zoomend", on); };
  }, [placed, pins]);

  useEffect(() => {
    const active = activeId ? markers.current.get(activeId) : undefined;
    new Set(markers.current.values()).forEach((mk) => {
      const on = mk === active;
      mk.getElement()?.querySelector(".sg-pin, .sg-bubble")?.classList.toggle("sg-pin-active", on);
      mk.setZIndexOffset(on ? 2000 : 0);
    });
    // Soft area circle around the picked stay's approximate point (never the building).
    const m = map.current;
    circle.current?.remove(); circle.current = null;
    const pin = activeId ? pins.get(activeId) : null;
    if (m && pin) {
      circle.current = L.circle(pin.point, {
        radius: pin.kind === "area" ? AREA_ONLY_CIRCLE_M : AREA_CIRCLE_M, className: "sg-area-circle", interactive: false, weight: 1.5, fillOpacity: 0.12,
      }).addTo(m);
    }
  }, [activeId, pins]);

  return <div ref={box} style={{ height }} className="w-full rounded-xl overflow-hidden border border-border z-0" aria-label="Map of stays (approximate areas)" role="region" />;
};
