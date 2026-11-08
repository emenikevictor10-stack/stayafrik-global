import { Link } from "react-router-dom";
import type { Property } from "@/data/properties";
import { Star, Heart, BedDouble, Bath } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { cn } from "@/lib/utils";
import { approxLocation } from "@/hooks/useListingAccess";
import { rememberRayPropListing } from "@/lib/rayprop";

export const PropertyCard = ({ p, nights = 0 }: { p: Property; nights?: number }) => {
  const { has, toggle } = useWishlist();
  const saved = has(p.id);

  const onHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(p.id);
  };

  return (
    <Link
      to={`/stays/${p.id}`}
      onClick={() => p.source === "rayprop" && rememberRayPropListing(p)}
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
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/70 backdrop-blur-md border border-primary/30 text-xs font-semibold text-primary">
            <span aria-hidden>{p.emoji}</span> {p.type}
          </span>
          <button
            type="button"
            onClick={onHeart}
            aria-label={saved ? "Remove from saved" : "Save property"}
            className="w-11 h-11 rounded-full bg-background/80 backdrop-blur-md border border-border flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Heart className={cn("w-4 h-4", saved ? "fill-primary text-primary" : "text-foreground")} />
          </button>
        </div>
        {p.verified && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success text-success-foreground text-xs font-bold shadow-lg">
              ✓ {p.source === "rayprop" ? "Verified Partner" : "Verified Host"}
            </span>
          </div>
        )}
        <div className="absolute bottom-3 right-3">
          <div className="text-primary font-extrabold text-base drop-shadow-lg bg-background/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-primary/30 text-right">
            {nights > 0 && p.priceNum > 0 ? (
              <>
                ₦{(p.priceNum * nights).toLocaleString()}
                <span className="text-xs font-medium text-foreground/80"> for {nights} night{nights > 1 ? "s" : ""}</span>
              </>
            ) : (
              <>
                {p.price}
                {p.type === "Shortlet" && (
                  <span className="text-xs font-medium text-foreground/80"> /night</span>
                )}
              </>
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
            <span className="text-muted-foreground ml-0.5">({p.reviews})</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">📍 {approxLocation(p.location)}</p>
        {p.beds > 0 && (
          <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><BedDouble className="w-3 h-3" />{p.beds} bed</span>
            <span className="inline-flex items-center gap-1"><Bath className="w-3 h-3" />{p.baths} bath</span>
            {p.area && <span>📐 {p.area}</span>}
          </div>
        )}
      </div>
    </Link>
  );
};
