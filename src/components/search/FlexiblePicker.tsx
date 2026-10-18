import { useRef } from "react";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StayLength } from "@/lib/search-state";

export const FlexiblePicker = ({
  stayLength, months, onChange,
}: {
  stayLength: StayLength; months: string[];
  onChange: (p: { stayLength?: StayLength; months?: string[] }) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const list = Array.from({ length: 12 }, (_, i) => format(addMonths(startOfMonth(new Date()), i), "yyyy-MM"));
  const toggle = (m: string) => onChange({ months: months.includes(m) ? months.filter((x) => x !== m) : [...months, m].sort() });
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  const goIn = months.length ? `Go in ${months.map((m) => format(parseISO(`${m}-01`), "MMMM")).join(", ")}` : "Go anytime";

  return (
    <div className="text-center">
      <h3 className="text-lg font-medium mb-4">How long would you like to stay?</h3>
      <div className="flex justify-center gap-2 mb-8">
        {(["weekend", "week", "month"] as const).map((l) => (
          <button key={l} type="button" onClick={() => onChange({ stayLength: l })}
            className={cn("px-4 py-2 rounded-full text-sm border capitalize", stayLength === l ? "border-2 border-foreground" : "border-border")}>
            {l}
          </button>
        ))}
      </div>
      <h3 className="text-lg font-medium mb-4">{goIn}</h3>
      <div className="relative">
        <button type="button" onClick={() => scroll(-1)} aria-label="Scroll months left" className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-search-surface border border-border items-center justify-center shadow-search">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div ref={ref} className="flex gap-3 overflow-x-auto scrollbar-hide px-1 py-1 snap-x">
          {list.map((m) => {
            const d = parseISO(`${m}-01`);
            const on = months.includes(m);
            return (
              <button key={m} type="button" onClick={() => toggle(m)} aria-pressed={on}
                className={cn("snap-start shrink-0 w-[120px] h-[105px] rounded-2xl border flex flex-col items-center justify-center gap-1", on ? "border-2 border-foreground bg-search-hover" : "border-border hover:border-muted-foreground")}>
                <CalendarDays className="w-7 h-7 text-muted-foreground" />
                <span className="text-sm font-medium">{format(d, "MMMM")}</span>
                <span className="text-xs text-muted-foreground">{format(d, "yyyy")}</span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => scroll(1)} aria-label="Scroll months right" className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-search-surface border border-border items-center justify-center shadow-search">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
