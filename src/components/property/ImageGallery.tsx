import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StayImage } from "./StayImage";

export const ImageGallery = ({ images, alt }: { images: string[]; alt: string }) => {
  const [idx, setIdx] = useState(0);
  const total = images.length;

  const go = (n: number) => setIdx((idx + n + total) % total);

  // touch swipe
  const [startX, setStartX] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => setStartX(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX == null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    setStartX(null);
  };

  return (
    <div
      className="relative aspect-[4/3] lg:aspect-[16/9] lg:max-h-[560px] bg-secondary overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex h-full transition-transform duration-300"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {images.map((src, i) => (Math.abs(i - idx) <= 1 ? (
          <StayImage
            key={i}
            src={src}
            width={1280}
            alt={`${alt} — photo ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            className="w-full h-full object-cover shrink-0"
          />
        ) : <div key={i} className="w-full h-full shrink-0" />))}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur-md border border-border items-center justify-center hover:scale-110 transition-transform"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur-md border border-border items-center justify-center hover:scale-110 transition-transform"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-6 bg-white" : "w-1.5 bg-white/50",
                )}
              />
            ))}
          </div>

          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-background/70 backdrop-blur-md border border-border text-xs font-semibold">
            {idx + 1} / {total}
          </div>
        </>
      )}
    </div>
  );
};
