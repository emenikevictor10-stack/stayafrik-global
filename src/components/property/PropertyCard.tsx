import { Link, useNavigate } from "react-router-dom";
import type { Property } from "@/data/properties";
import { Star } from "lucide-react";

export const PropertyCard = ({ p }: { p: Property }) => {
  const navigate = useNavigate();
  return (
    <Link
      to={`/property/${p.id}`}
      className="block group rounded-2xl overflow-hidden bg-card border border-border transition-all hover:border-primary/50 active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={p.image}
          alt={p.title}
          loading="lazy"
          width={800}
          height={640}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/70 backdrop-blur-md border border-primary/30 text-[10px] font-semibold text-primary">
            <span aria-hidden>{p.emoji}</span> {p.type}
          </span>
          {p.verified && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success text-white text-[10px] font-bold">
              ✓ Verified
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="text-primary font-extrabold text-lg drop-shadow-lg">
            {p.price}
            {p.type === "Shortlet" && (
              <span className="text-xs font-medium text-foreground/80"> /night</span>
            )}
          </div>
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug truncate">{p.title}</h3>
          <span className="inline-flex items-center gap-0.5 text-xs font-medium shrink-0">
            <Star className="w-3 h-3 fill-primary text-primary" />
            {p.rating}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">📍 {p.location}</p>
        {p.beds > 0 && (
          <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground">
            <span>🛏️ {p.beds} bed</span>
            <span>🛁 {p.baths} bath</span>
            <span>📐 {p.area}</span>
          </div>
        )}
      </div>
    </Link>
  );
};
