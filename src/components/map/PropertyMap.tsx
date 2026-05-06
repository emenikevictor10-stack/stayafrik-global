import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import type { Property } from "@/data/properties";

// Fix default marker icon paths (Vite/CDN)
const icon = L.divIcon({
  className: "stay-pin",
  html: `<div style="background:hsl(var(--primary));color:hsl(var(--primary-foreground));border-radius:9999px;padding:6px 10px;font-weight:800;font-size:11px;box-shadow:0 4px 12px rgba(0,0,0,0.4);border:2px solid #0A0A0A;white-space:nowrap;">📍</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const priceIcon = (label: string) =>
  L.divIcon({
    className: "stay-price-pin",
    html: `<div style="background:hsl(var(--primary));color:hsl(var(--primary-foreground));border-radius:9999px;padding:4px 10px;font-weight:800;font-size:11px;box-shadow:0 4px 12px rgba(0,0,0,0.4);border:2px solid #0A0A0A;white-space:nowrap;">${label}</div>`,
    iconSize: [60, 24],
    iconAnchor: [30, 24],
  });

const Recenter = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
};

export const SinglePropertyMap = ({ p, height = 200 }: { p: Property; height?: number }) => (
  <div className="rounded-2xl overflow-hidden border border-border" style={{ height }}>
    <MapContainer
      center={[p.lat, p.lng]}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[p.lat, p.lng]} icon={icon}>
        <Popup>{p.title}</Popup>
      </Marker>
    </MapContainer>
  </div>
);

export const PropertiesMap = ({ list, height = 400 }: { list: Property[]; height?: number }) => {
  const center: [number, number] = list.length
    ? [list[0].lat, list[0].lng]
    : [9.082, 8.6753];
  return (
    <div className="rounded-2xl overflow-hidden border border-border" style={{ height }}>
      <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {list.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={priceIcon(p.price)}>
            <Popup>
              <Link to={`/property/${p.id}`} className="font-semibold text-sm">
                {p.title}
              </Link>
              <div className="text-xs text-muted-foreground">{p.location}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export const LocationPicker = ({
  lat,
  lng,
  onChange,
  height = 240,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  height?: number;
}) => {
  const InnerEvents = () => {
    const map = useMap();
    useEffect(() => {
      const handler = (e: L.LeafletMouseEvent) => onChange(e.latlng.lat, e.latlng.lng);
      map.on("click", handler);
      return () => {
        map.off("click", handler);
      };
    }, [map]);
    return null;
  };
  return (
    <div className="rounded-2xl overflow-hidden border border-border" style={{ height }}>
      <MapContainer center={[lat, lng]} zoom={12} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter lat={lat} lng={lng} />
        <InnerEvents />
        <Marker
          position={[lat, lng]}
          icon={icon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const m = e.target as L.Marker;
              const ll = m.getLatLng();
              onChange(ll.lat, ll.lng);
            },
          }}
        />
      </MapContainer>
    </div>
  );
};
