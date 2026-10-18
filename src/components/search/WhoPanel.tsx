import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { applyGuests, LIMITS, minAdults, type SearchState } from "@/lib/search-state";

export const GuestStepperRow = ({
  label, hint, value, canDec, canInc, onDec, onInc,
}: { label: string; hint: React.ReactNode; value: number; canDec: boolean; canInc: boolean; onDec: () => void; onInc: () => void }) => (
  <div className="flex items-center justify-between min-h-[72px] py-3 border-b border-border last:border-0">
    <div>
      <div className="text-base font-medium">{label}</div>
      <div className="text-sm text-muted-foreground">{hint}</div>
    </div>
    <div className="flex items-center gap-3">
      <button type="button" aria-label={`Decrease ${label}`} disabled={!canDec} onClick={onDec}
        className="w-8 h-8 rounded-full border border-muted-foreground text-muted-foreground flex items-center justify-center hover:border-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:border-muted-foreground">
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="min-w-6 text-center text-base" aria-live="polite">{value}</span>
      <button type="button" aria-label={`Increase ${label}`} disabled={!canInc} onClick={onInc}
        className="w-8 h-8 rounded-full border border-muted-foreground text-muted-foreground flex items-center justify-center hover:border-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:border-muted-foreground">
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

export const WhoPanel = ({ value, onChange }: { value: SearchState; onChange: (p: Partial<SearchState>) => void }) => {
  const [info, setInfo] = useState(false);
  const total = value.adults + value.children;
  const set = (k: "adults" | "children" | "infants" | "pets", d: number) => onChange(applyGuests(value, { [k]: value[k] + d }));
  return (
    <div>
      <GuestStepperRow label="Adults" hint="Ages 13 or above" value={value.adults}
        canDec={value.adults > minAdults(value)} canInc={total < LIMITS.guests} onDec={() => set("adults", -1)} onInc={() => set("adults", 1)} />
      <GuestStepperRow label="Children" hint="Ages 2 – 12" value={value.children}
        canDec={value.children > 0} canInc={total < LIMITS.guests} onDec={() => set("children", -1)} onInc={() => set("children", 1)} />
      <GuestStepperRow label="Infants" hint="Under 2" value={value.infants}
        canDec={value.infants > 0} canInc={value.infants < LIMITS.infants} onDec={() => set("infants", -1)} onInc={() => set("infants", 1)} />
      <GuestStepperRow label="Pets" value={value.pets}
        hint={<button type="button" onClick={() => setInfo(true)} className="underline font-medium">Bringing a service animal?</button>}
        canDec={value.pets > 0} canInc={value.pets < LIMITS.pets} onDec={() => set("pets", -1)} onInc={() => set("pets", 1)} />
      <Dialog open={info} onOpenChange={setInfo}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogTitle>Service animals</DialogTitle>
          <DialogDescription>
            Service animals aren't pets, so there's no need to add them here. Let your host know in a message after booking if you're travelling with one.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
};
