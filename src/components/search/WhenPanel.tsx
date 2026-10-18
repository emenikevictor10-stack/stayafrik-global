import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FLEX_OPTIONS, type SearchState } from "@/lib/search-state";
import { DatesCalendar, type PriceHints } from "./DatesCalendar";
import { FlexiblePicker } from "./FlexiblePicker";

export const WhenPanel = ({
  value, onChange, hints, layout, onDatesDone,
}: {
  value: SearchState;
  onChange: (p: Partial<SearchState>) => void;
  hints: PriceHints;
  layout: "pair" | "list";
  onDatesDone?: () => void;
}) => (
  <div className="relative">
    <div className="flex justify-center mb-6">
      <div role="tablist" className="relative inline-flex rounded-full bg-search-muted p-1">
        {(["dates", "flexible"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={value.mode === m} type="button" onClick={() => onChange({ mode: m })}
            className={cn("relative z-10 px-5 py-1.5 rounded-full text-sm font-medium capitalize transition-colors",
              value.mode === m ? "bg-search-surface shadow-search" : "text-muted-foreground hover:text-foreground")}>
            {m}
          </button>
        ))}
      </div>
    </div>
    {Object.keys(hints).length > 0 && value.mode === "dates" && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="About price colours" className="absolute right-0 top-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground">
              <Info className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px] text-xs">
            Green dates are usually cheaper than normal for stays in this place; red dates are usually pricier.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}

    {value.mode === "dates" ? (
      <>
        <div className={cn(layout === "list" && "max-h-[50vh] overflow-y-auto")}>
          <DatesCalendar
            layout={layout}
            checkIn={value.checkIn}
            checkOut={value.checkOut}
            hints={hints}
            onChange={(checkIn, checkOut) => { onChange({ checkIn, checkOut }); if (checkIn && checkOut) onDatesDone?.(); }}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-6">
          {FLEX_OPTIONS.map((f) => (
            <button key={f} type="button" onClick={() => onChange({ flex: f })}
              className={cn("px-4 py-1.5 rounded-full text-xs border", value.flex === f ? "border-2 border-foreground" : "border-border hover:border-muted-foreground")}>
              {f ? `± ${f} day${f > 1 ? "s" : ""}` : "Exact dates"}
            </button>
          ))}
        </div>
      </>
    ) : (
      <FlexiblePicker stayLength={value.stayLength} months={value.months} onChange={onChange} />
    )}
  </div>
);
