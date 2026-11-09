import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Free OpenStreetMap pin picker: tap the map or drag the pin. Starts zoomed out on Nigeria when no pin yet. */
export const PinPicker = ({ value, onChange, height = 240 }: {
  value: { lat: number; lng: number } | null; onChange: (lat: number, lng: number) => void; height?: number;
}) => {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const cb = useRef(onChange); cb.current = onChange;

  const place = (lat: number, lng: number) => {
    const m = map.current; if (!m) return;
    if (!marker.current) {
      marker.current = L.marker([lat, lng], {
        draggable: true, keyboard: true, title: "Your stay",
        icon: L.divIcon({ className: "sg-pin-wrap", html: `<span class="sg-pin sg-pin-active">Your stay</span>` }),
      }).addTo(m).on("dragend", () => { const p = marker.current!.getLatLng(); cb.current(p.lat, p.lng); });
    } else marker.current.setLatLng([lat, lng]);
  };

  useEffect(() => {
    if (!box.current || map.current) return;
    map.current = L.map(box.current, { zoomControl: true }).setView(value ? [value.lat, value.lng] : [9.08, 8.0], value ? 16 : 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map.current);
    map.current.on("click", (e: L.LeafletMouseEvent) => { place(e.latlng.lat, e.latlng.lng); cb.current(e.latlng.lat, e.latlng.lng); });
    if (value) place(value.lat, value.lng);
    return () => { map.current?.remove(); map.current = null; marker.current = null; };
  }, []);

  useEffect(() => {
    if (!value || !map.current) return;
    place(value.lat, value.lng);
    if (map.current.getZoom() < 14) map.current.setView([value.lat, value.lng], 16);
  }, [value?.lat, value?.lng]);

  return <div ref={box} style={{ height }} className="w-full rounded-2xl overflow-hidden border border-border z-0" role="application" aria-label="Map: tap to place your stay's pin" />;
};

/** Address → point via free OpenStreetMap search (user-initiated, one request). Nigeria only. */
export const findAddress = async (q: string): Promise<{ lat: number; lng: number }> => {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ng&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const hit = res.ok ? (await res.json())?.[0] : null;
  if (!hit) throw new Error("Couldn't find that address. Try the area name, or tap the map.");
  return { lat: Number(hit.lat), lng: Number(hit.lon) };
};
