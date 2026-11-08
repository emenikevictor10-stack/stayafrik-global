import { ShoppingCart, Hospital, Plane, Landmark, MapPin } from "lucide-react";
import type { Property } from "@/data/properties";

// Deterministic mock distances seeded by property id so they don't change per render.
const seedFromId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
};

const mockDistance = (seed: number, min: number, max: number) => {
  const v = ((seed % 1000) / 1000) * (max - min) + min;
  return v < 1 ? `${Math.round(v * 1000)}m` : `${v.toFixed(1)}km`;
};

export const NearbyServices = ({ p }: { p: Property }) => {
  const s = seedFromId(p.id);

  const items = [
    { icon: ShoppingCart, label: "Supermarket", dist: mockDistance(s + 1, 0.3, 1.8), tag: "Nearest" },
    { icon: Hospital, label: "Hospital", dist: mockDistance(s + 7, 0.8, 4), tag: "Nearest" },
    { icon: MapPin, label: "ATM", dist: mockDistance(s + 13, 0.2, 1.5), tag: "Nearest" },
    { icon: Landmark, label: "City center", dist: mockDistance(s + 19, 1.5, 12), tag: "Distance" },
    { icon: Plane, label: "Airport", dist: mockDistance(s + 23, 8, 35), tag: "Distance" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="rounded-xl bg-card border border-border p-3 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate">{it.label}</div>
              <div className="text-xs text-muted-foreground">{it.tag} · {it.dist}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
