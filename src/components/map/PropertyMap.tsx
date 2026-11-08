import { useEffect, useRef, useState } from "react";
import type { Property } from "@/data/properties";

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

let mapsPromise: Promise<any> | null = null;
let authFailed = false;
const authListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  (window as any).gm_authFailure = () => {
    authFailed = true;
    authListeners.forEach((fn) => { try { fn(); } catch {} });
  };
}
export const loadMaps = () => {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (authFailed) return Promise.reject(new Error("Google Maps auth failed"));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    if (!BROWSER_KEY) { reject(new Error("Google Maps key missing")); return; }
    (window as any).__stayInitMap = () => resolve((window as any).google);
    const s = document.createElement("script");
    const channel = TRACKING_ID ? `&channel=${TRACKING_ID}` : "";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=__stayInitMap&libraries=places${channel}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return mapsPromise;
};
const onAuthFailure = (cb: () => void) => {
  authListeners.add(cb);
  return () => authListeners.delete(cb);
};

// OpenStreetMap fallback used whenever Google Maps fails to load (missing key, blocked region, etc.)
const osmEmbedUrl = (lat: number, lng: number, zoom = 14) => {
  const d = 0.01 / Math.max(1, zoom / 14);
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
};

const Fallback = ({ height, lat, lng }: { height: number; lat?: number; lng?: number }) => {
  if (lat == null || lng == null) {
    return (
      <div className="rounded-2xl border border-border bg-card flex items-center justify-center text-xs text-muted-foreground" style={{ height }}>
        Map unavailable
      </div>
    );
  }
  return (
    <iframe
      title="OpenStreetMap"
      src={osmEmbedUrl(lat, lng)}
      className="rounded-2xl border border-border w-full"
      style={{ height }}
      loading="lazy"
    />
  );
};

export const SinglePropertyMap = ({
  p,
  height = 200,
  approximate = false,
}: { p: Property; height?: number; approximate?: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadMaps().then((g) => {
      if (cancelled || !ref.current) return;
      const map = new g.maps.Map(ref.current, {
        center: { lat: p.lat, lng: p.lng },
        zoom: approximate ? 13 : 14,
        disableDefaultUI: true,
        zoomControl: !approximate,
        gestureHandling: approximate ? "none" : "auto",
      });
      if (approximate) {
        new g.maps.Circle({
          map,
          center: { lat: p.lat, lng: p.lng },
          radius: 900,
          strokeOpacity: 0,
          fillColor: "#275f84",
          fillOpacity: 0.25,
        });
      } else {
        new g.maps.Marker({ map, position: { lat: p.lat, lng: p.lng }, title: p.title });
      }
    }).catch(() => setErr(true));
    const off = onAuthFailure(() => setErr(true));
    return () => { cancelled = true; off(); };
  }, [p.lat, p.lng, p.title, approximate]);
  if (err) return <Fallback height={height} lat={p.lat} lng={p.lng} />;
  return <div ref={ref} className="rounded-2xl overflow-hidden border border-border" style={{ height }} />;
};


const fmtPrice = (n: number) => {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${Math.round(n / 1_000)}k`;
  return `₦${n}`;
};

const pricePinIcon = (g: any, selected = false): any => ({
  path: "M -28 -28 L 28 -28 A 14 14 0 0 1 28 0 L 6 0 L 0 12 L -6 0 L -28 0 A 14 14 0 0 1 -28 -28 Z",
  fillColor: selected ? "#275f84" : "#ffffff",
  fillOpacity: 1,
  strokeColor: selected ? "#275f84" : "#0f172a",
  strokeWeight: 1.5,
  scale: 0.9,
  labelOrigin: new g.maps.Point(0, -14),
});


export const PropertiesMap = ({
  list,
  height = 400,
  onSelect,
}: {
  list: Property[];
  height?: number;
  onSelect?: (p: Property) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadMaps().then((g) => {
      if (cancelled || !ref.current) return;
      const center = list.length ? { lat: list[0].lat, lng: list[0].lng } : { lat: 9.082, lng: 8.6753 };
      const map = new g.maps.Map(ref.current, { center, zoom: list.length > 1 ? 6 : 12, disableDefaultUI: true, zoomControl: true });
      const bounds = new g.maps.LatLngBounds();
      list.forEach((p) => {
        const pos = { lat: p.lat, lng: p.lng };
        const m = new g.maps.Marker({
          map,
          position: pos,
          title: p.title,
          icon: pricePinIcon(g) as any,
          label: { text: fmtPrice(p.priceNum), color: "#0f172a", fontSize: "11px", fontWeight: "700" } as any,
        } as any);

        m.addListener("click", () => {
          if (onSelect) onSelect(p);
          else {
            const info = new g.maps.InfoWindow({
              content: `<div style="font-size:12px"><b>${p.title}</b><br/>${p.location}<br/><b>${p.price}</b></div>`,
            });
            info.open({ anchor: m, map });
          }
        });
        bounds.extend(pos);
      });
      if (list.length > 1) map.fitBounds(bounds);
    }).catch(() => setErr(true));
    const off = onAuthFailure(() => setErr(true));
    return () => { cancelled = true; off(); };
  }, [list, onSelect]);
  if (err) return <Fallback height={height} lat={list[0]?.lat} lng={list[0]?.lng} />;
  return <div ref={ref} className="rounded-2xl overflow-hidden border border-border" style={{ height }} />;
};

export const LocationPicker = ({
  lat, lng, onChange, height = 240,
}: { lat: number; lng: number; onChange: (lat: number, lng: number) => void; height?: number; }) => {
  const ref = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMaps().then((g) => {
      if (cancelled || !ref.current) return;
      const map = new g.maps.Map(ref.current, { center: { lat, lng }, zoom: 13, disableDefaultUI: true, zoomControl: true });
      const m = new g.maps.Marker({ map, position: { lat, lng }, draggable: true });
      m.addListener("dragend", () => {
        const p = m.getPosition();
        if (p) onChange(p.lat(), p.lng());
      });
      map.addListener("click", (e: any) => {
        m.setPosition(e.latLng);
        onChange(e.latLng.lat(), e.latLng.lng());
      });
      mapRef.current = map; markerRef.current = m;
    }).catch(() => setErr(true));
    const off = onAuthFailure(() => setErr(true));
    return () => { cancelled = true; off(); };
  }, []); // init once

  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setPosition({ lat, lng });
      mapRef.current.panTo({ lat, lng });
    }
  }, [lat, lng]);

  if (err) return <Fallback height={height} lat={lat} lng={lng} />;
  return <div ref={ref} className="rounded-2xl overflow-hidden border border-border" style={{ height }} />;
};
