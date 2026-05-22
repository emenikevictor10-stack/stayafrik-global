import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Property } from "@/data/properties";

const BROWSER_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

let mapsPromise: Promise<any> | null = null;
export const loadMaps = () => {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    if (!BROWSER_KEY) { reject(new Error("Google Maps key missing")); return; }
    (window as any).__stayInitMap = () => resolve((window as any).google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=__stayInitMap&libraries=places`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return mapsPromise;
};

const Fallback = ({ height }: { height: number }) => (
  <div className="rounded-2xl border border-border bg-card flex items-center justify-center text-xs text-muted-foreground" style={{ height }}>
    Map unavailable
  </div>
);

export const SinglePropertyMap = ({ p, height = 200 }: { p: Property; height?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadMaps().then((g) => {
      if (cancelled || !ref.current) return;
      const map = new g.maps.Map(ref.current, { center: { lat: p.lat, lng: p.lng }, zoom: 14, disableDefaultUI: true, zoomControl: true });
      new g.maps.Marker({ map, position: { lat: p.lat, lng: p.lng }, title: p.title });
    }).catch(() => setErr(true));
    return () => { cancelled = true; };
  }, [p.lat, p.lng, p.title]);
  if (err) return <Fallback height={height} />;
  return <div ref={ref} className="rounded-2xl overflow-hidden border border-border" style={{ height }} />;
};

export const PropertiesMap = ({ list, height = 400 }: { list: Property[]; height?: number }) => {
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
        const m = new g.maps.Marker({ map, position: pos, title: p.title });
        const info = new g.maps.InfoWindow({ content: `<div style="font-size:12px"><b>${p.title}</b><br/>${p.location}</div>` });
        m.addListener("click", () => info.open({ anchor: m, map }));
        bounds.extend(pos);
      });
      if (list.length > 1) map.fitBounds(bounds);
    }).catch(() => setErr(true));
  }, [list]);
  if (err) return <Fallback height={height} />;
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
    return () => { cancelled = true; };
  }, []); // init once

  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setPosition({ lat, lng });
      mapRef.current.panTo({ lat, lng });
    }
  }, [lat, lng]);

  if (err) return <Fallback height={height} />;
  return <div ref={ref} className="rounded-2xl overflow-hidden border border-border" style={{ height }} />;
};
