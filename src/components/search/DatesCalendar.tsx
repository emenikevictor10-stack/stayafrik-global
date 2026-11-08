import { useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isBefore, startOfDay, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ymd = (d: Date) => format(d, "yyyy-MM-dd");
export type PriceHints = Record<string, "low" | "high">;

const Month = ({
  month, checkIn, checkOut, hover, setHover, onPick, hints, prev, next,
}: {
  month: Date; checkIn?: string; checkOut?: string; hover?: string;
  setHover: (d?: string) => void; onPick: (d: string) => void; hints: PriceHints;
  prev?: { onClick: () => void; disabled: boolean }; next?: { onClick: () => void };
}) => {
  const today = startOfDay(new Date());
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const lead = getDay(days[0]);
  const end = checkOut || (checkIn && hover && hover > checkIn ? hover : undefined);
  return (
    <div className="w-full max-w-[340px]">
      <div className="flex items-center justify-between h-8 mb-3">
        {prev ? (
          <button type="button" onClick={prev.onClick} disabled={prev.disabled} aria-label="Previous month" className="w-11 h-11 rounded-full hover:bg-search-hover flex items-center justify-center disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : <span className="w-8" />}
        <div className="text-base font-semibold">{format(month, "MMMM yyyy")}</div>
        {next ? (
          <button type="button" onClick={next.onClick} aria-label="Next month" className="w-11 h-11 rounded-full hover:bg-search-hover flex items-center justify-center">
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : <span className="w-8" />}
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="h-8 flex items-center justify-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
        {days.map((d) => {
          const k = ymd(d);
          const past = isBefore(d, today);
          const isEnd = k === checkIn || k === checkOut;
          const inRange = !!checkIn && !!end && k > checkIn && k < end;
          const rangeEdgeL = !!checkIn && !!end && k === checkIn;
          const rangeEdgeR = !!checkIn && !!end && k === end;
          const hint = !past && !isEnd && !inRange ? hints[k] : undefined;
          return (
            <div key={k} className={cn("relative h-12 flex items-center justify-center",
              inRange && "bg-search-hover",
              rangeEdgeL && "bg-gradient-to-r from-transparent from-50% to-search-hover to-50%",
              rangeEdgeR && "bg-gradient-to-l from-transparent from-50% to-search-hover to-50%",
              inRange && getDay(d) === 0 && "rounded-l-full", inRange && getDay(d) === 6 && "rounded-r-full")}>
              <button
                type="button"
                disabled={past}
                onClick={() => onPick(k)}
                onMouseEnter={() => setHover(k)}
                aria-label={`${format(d, "EEEE, d MMMM yyyy")}${past ? ", unavailable" : ", available"}${hint === "low" ? ", lower prices" : hint === "high" ? ", higher prices" : ""}`}
                aria-pressed={isEnd}
                className={cn(
                  "w-11 h-11 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  past ? "text-muted-foreground/50 line-through cursor-not-allowed" : "hover:ring-1 hover:ring-foreground",
                  isEnd && "bg-foreground text-background",
                  hint === "low" && "bg-hint-low text-hint-low-foreground",
                  hint === "high" && "bg-hint-high text-hint-high-foreground",
                )}
              >
                {format(d, "d")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const DatesCalendar = ({
  checkIn, checkOut, onChange, hints = {}, layout,
}: {
  checkIn?: string; checkOut?: string;
  onChange: (checkIn?: string, checkOut?: string) => void;
  hints?: PriceHints;
  layout: "pair" | "list";
}) => {
  const first = startOfMonth(new Date());
  const [offset, setOffset] = useState(() => {
    if (!checkIn) return 0;
    const d = new Date(checkIn + "T00:00:00");
    return Math.max(0, (d.getFullYear() - first.getFullYear()) * 12 + d.getMonth() - first.getMonth());
  });
  const [hover, setHover] = useState<string>();

  const pick = (k: string) => {
    if (!checkIn || checkOut || k <= checkIn) return onChange(k, undefined);
    onChange(checkIn, k);
  };
  const common = { checkIn, checkOut, hover: checkOut ? undefined : hover, setHover, onPick: pick, hints };

  if (layout === "list") {
    return (
      <div className="space-y-6" onMouseLeave={() => setHover(undefined)}>
        {Array.from({ length: 12 }, (_, i) => <div key={i} className="flex justify-center"><Month month={addMonths(first, i)} {...common} /></div>)}
      </div>
    );
  }
  const m = addMonths(first, offset);
  return (
    <div className="flex justify-center gap-10" onMouseLeave={() => setHover(undefined)}>
      <Month month={m} {...common} prev={{ onClick: () => setOffset((o) => Math.max(0, o - 1)), disabled: offset === 0 }} />
      <Month month={addMonths(m, 1)} {...common} next={{ onClick: () => setOffset((o) => o + 1) }} />
    </div>
  );
};
