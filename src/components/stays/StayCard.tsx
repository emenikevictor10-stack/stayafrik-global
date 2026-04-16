import { Heart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Stay {
  id: string;
  title: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  img: string;
  badge?: string;
}

export const StayCard = ({ stay }: { stay: Stay }) => {
  const [liked, setLiked] = useState(false);
  return (
    <Link
      to={`/stay/${stay.id}`}
      className="group block animate-fade-in"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-card">
        <img
          src={stay.img}
          alt={stay.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {stay.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-background/95 px-3 py-1 text-[11px] font-semibold text-foreground shadow-soft backdrop-blur">
            {stay.badge}
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            setLiked((v) => !v);
          }}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/30 backdrop-blur-md transition-base hover:bg-background/50"
          aria-label="Save"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-base",
              liked ? "fill-primary text-primary" : "text-primary-foreground",
            )}
          />
        </button>
      </div>
      <div className="mt-3 px-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-foreground line-clamp-1">
            {stay.title}
          </h3>
          <div className="flex shrink-0 items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
            <span className="font-medium text-foreground">{stay.rating.toFixed(2)}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1">{stay.location}</p>
        <p className="mt-1.5 text-sm text-foreground">
          <span className="font-semibold">${stay.price}</span>
          <span className="text-muted-foreground"> · night</span>
        </p>
      </div>
    </Link>
  );
};
