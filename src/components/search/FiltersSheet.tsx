import { useEffect, useState } from "react";
import { Sheet, Button } from "@/ui/kit";
import { cn } from "@/lib/utils";
import { KINDS, POWER, emptyFilters, type Filters } from "@/lib/results";

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" aria-pressed={on} onClick={onClick}
    className={cn("min-h-11 px-3.5 rounded-lg border text-[13px] font-medium", on ? "border-foreground bg-surface" : "border-border")}>
    {children}
  </button>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="py-3 border-b border-border last:border-0">
    <h3 className="text-[13px] font-semibold mb-2">{title}</h3>
    <div className="flex flex-wrap gap-2">{children}</div>
  </section>
);

export const FiltersSheet = ({ open, onOpenChange, value, onApply, countFor }: {
  open: boolean; onOpenChange: (o: boolean) => void; value: Filters; onApply: (f: Filters) => void; countFor: (f: Filters) => number;
}) => {
  const [f, setF] = useState(value);
  useEffect(() => { if (open) setF(value); }, [open, value]);
  const tog = <K extends "kinds" | "power">(k: K, v: Filters[K][number]) =>
    setF((s) => ({ ...s, [k]: (s[k] as string[]).includes(v) ? (s[k] as string[]).filter((x) => x !== v) : [...(s[k] as string[]), v] }));
  const n = countFor(f);
  const price = (v: string) => (v === "" ? undefined : Math.max(0, Number(v) || 0));

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Filters">
      <div className="max-h-[65vh] overflow-y-auto -mx-1 px-1">
        <section className="py-3 border-b border-border">
          <h3 className="text-[13px] font-semibold mb-2">Price per night (₦)</h3>
          <div className="flex items-center gap-2">
            <input inputMode="numeric" aria-label="Minimum price" placeholder="Min" value={f.minPrice ?? ""}
              onChange={(e) => setF({ ...f, minPrice: price(e.target.value) })}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[15px]" />
            <span className="text-muted-foreground">–</span>
            <input inputMode="numeric" aria-label="Maximum price" placeholder="Max" value={f.maxPrice ?? ""}
              onChange={(e) => setF({ ...f, maxPrice: price(e.target.value) })}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[15px]" />
          </div>
        </section>
        <Section title="Bedrooms">
          {[0, 1, 2, 3, 4].map((b) => <Chip key={b} on={(f.beds || 0) === b} onClick={() => setF({ ...f, beds: b || undefined })}>{b === 0 ? "Any" : b === 4 ? "4+" : b}</Chip>)}
        </Section>
        <Section title="Type of place">
          {KINDS.map((k) => <Chip key={k.key} on={f.kinds.includes(k.key)} onClick={() => tog("kinds", k.key)}>{k.label}</Chip>)}
        </Section>
        <Section title="Power">
          {POWER.map((k) => <Chip key={k.key} on={f.power.includes(k.key)} onClick={() => tog("power", k.key)}>{k.label}</Chip>)}
        </Section>
        <Section title="More">
          <Chip on={f.water} onClick={() => setF({ ...f, water: !f.water })}>Water supply</Chip>
          <Chip on={f.verified} onClick={() => setF({ ...f, verified: !f.verified })}>Verified only</Chip>
          <Chip on={f.rating4} onClick={() => setF({ ...f, rating4: !f.rating4 })}>Rated 4+</Chip>
        </Section>
      </div>
      <div className="flex items-center justify-between gap-3 pt-3">
        <button type="button" className="text-[15px] font-semibold underline min-h-11" onClick={() => setF({ ...emptyFilters(), sort: f.sort })}>Clear all</button>
        <Button onClick={() => { onApply(f); onOpenChange(false); }}>Show {n} stay{n === 1 ? "" : "s"}</Button>
      </div>
    </Sheet>
  );
};
