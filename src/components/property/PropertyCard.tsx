import { Link } from "react-router-dom";
import { useRef, useState } from "react";
import type { Property } from "@/data/properties";
import { Star, Heart, GitCompare, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { StayImage } from "./StayImage";
import { useWishlist } from "@/hooks/useWishlist";
import { useCompare, COMPARE_MAX } from "@/hooks/useCompare";
import { cn } from "@/lib/utils";
import { rememberRayPropListing } from "@/lib/rayprop";
import { toast } from "sonner";

/** Area label for the card: neighbourhood, else city, else first part of the location. */
const areaOf = (p: Property) => p.neighborhood || p.city || (p.location || "").split(",")[0].trim() || "Nigeria";

/** PRD stay card: photos, heart, compare, price on top, then "area · N bed · ★ rating". No title. */
export const PropertyCard = ({ p, nights = 0, priority = false }: { p: Property; nights?: number; priority?: boolean }) => {
  const { has, toggle } = useWishlist();
  const compare = useCompare();
  const saved = has(p.id);
  const inCompare = compare.has(p.id);
  const photos = (p.images?.length ? p.images : [p.image]).filter(Boolean).slice(0, 6);
  const strip = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };
  const go = (e: React.MouseEvent, d: number) => {
    stop(e);
    const el = strip.current; if (!el) return;
    el.scrollTo({ left: el.clientWidth * Math.max(0, Math.min(photos.length - 1, idx + d)), behavior: "smooth" });
  };
  const onCompare = (e: React.MouseEvent) => {
    stop(e);
    if (!compare.toggle(p.id)) toast(`You can compare up to ${COMPARE_MAX} stays`);
    else if (!inCompare) toast("Added to compare");
  };
  const area = areaOf(p);

  return (
    <Link
      to={`/stays/${p.id}`}
      onClick={() => p.source === "rayprop" && rememberRayPropListing(p)}
      aria-label={`${p.beds ? `${p.beds}-bed stay` : "Stay"} in ${area}, ${p.price} per night`}
      className="block group"
    >
      <div className="relative h-[240px] md:h-[204px] rounded-xl overflow-hidden bg-surface">
        <div
          ref={strip}
          onScroll={(e) => { const el = e.currentTarget; setIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); }}
          className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        >
          {photos.map((src, i) => (Math.abs(i - idx) <= 1 ? (
            <StayImage key={src + i} src={src} width={640} alt="" loading={priority && i === 0 ? "eager" : "lazy"} decoding="async"
              {...(priority && i === 0 ? { fetchpriority: "high" } : {})} height={400}
              className="w-full h-full object-cover shrink-0 snap-center" />
          ) : <div key={src + i} className="w-full h-full shrink-0 snap-center bg-surface" />))}
        </div>
        {!!p.videos?.length && (
          <span className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-background/85 backdrop-blur-md text-[12px] font-semibold flex items-center gap-1">
            <Play className="w-3 h-3 fill-current" aria-hidden /> Video
          </span>
        )}
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button type="button" onClick={onCompare} aria-pressed={inCompare} aria-label={inCompare ? "Remove from compare" : "Add to compare"}
            className={cn("w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center", inCompare ? "bg-primary text-primary-foreground" : "bg-background/80 text-foreground")}>
            <GitCompare className="w-4 h-4" />
          </button>
          <button type="button" onClick={(e) => { stop(e); toggle(p.id); }} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save stay"}
            className="w-11 h-11 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center">
            <Heart className={cn("w-4 h-4", saved ? "fill-primary text-primary" : "text-foreground")} />
          </button>
        </div>
        {photos.length > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={(e) => go(e, -1)}
              className={cn("hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity", idx === 0 && "invisible")}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" aria-label="Next photo" onClick={(e) => go(e, 1)}
              className={cn("hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity", idx === photos.length - 1 && "invisible")}>
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1" aria-hidden>
              {photos.map((_, i) => <span key={i} className={cn("w-1.5 h-1.5 rounded-full", i === idx ? "bg-background" : "bg-background/50")} />)}
            </div>
          </>
        )}
      </div>
      <div className="pt-2.5">
        <p className="text-[15px] font-semibold">
          {nights > 0 && p.priceNum > 0 ? (
            <>₦{(p.priceNum * nights).toLocaleString()} <span className="text-[13px] font-normal text-muted-foreground">for {nights} night{nights > 1 ? "s" : ""}</span></>
          ) : (
            <>{p.price} <span className="text-[13px] font-normal text-muted-foreground">/ night</span></>
          )}
        </p>
        <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
          {area}{p.beds > 0 && <> · {p.beds} bed</>}
          {p.rating > 0 && <> · <Star className="inline w-3 h-3 -mt-0.5 fill-foreground text-foreground" /> {p.rating}</>}
          {p.verified && <> · Verified</>}
        </p>
      </div>
    </Link>
  );
};
