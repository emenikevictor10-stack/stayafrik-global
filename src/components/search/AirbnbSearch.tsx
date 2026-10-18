import { useEffect, useState } from "react";
import { addDays, format, nextFriday, nextSunday, parseISO, isFriday, isSaturday } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Search, X, MapPin, Locate, Clock, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { matchLocations, type LocationEntry } from "@/lib/location-search";
import { EMPTY_SEARCH, summarize, type SearchState } from "@/lib/search-state";
import { useIsMobile } from "@/hooks/use-mobile";

type Step = "where" | "when" | "who";
const RECENTS_KEY = "stay:recent-searches:v2";
const readRecents = (): SearchState[] => {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]"); } catch { return []; }
};
const pushRecent = (s: SearchState) => {
  if (!s.where.trim()) return;
  const list = [s, ...readRecents().filter((x) => x.where.toLowerCase() !== s.where.toLowerCase())].slice(0, 5);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
};
const ymd = (d: Date) => format(d, "yyyy-MM-dd");

/** Collapsed pill on the page; tapping a part opens the modal on that step. */
export const SearchPill = ({ value, onOpen, rightSlot }: { value: SearchState; onOpen: (s: Step) => void; rightSlot?: React.ReactNode }) => {
  const s = summarize(value);
  const seg = "flex-1 min-w-0 text-left px-4 py-2 rounded-full hover:bg-secondary transition-colors";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 flex items-center rounded-full bg-card border border-border shadow-sm p-1">
        {/* Phone: one tap target with two lines */}
        <button type="button" onClick={() => onOpen("where")} className="md:hidden flex-1 min-w-0 flex items-center gap-3 px-3 py-1.5 text-left">
          <Search className="w-4 h-4 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{value.where || "Where to?"}</div>
            <div className="text-[11px] text-muted-foreground truncate">{s.when} · {s.who}</div>
          </div>
        </button>
        {/* Tablet/desktop: three segments */}
        <div className="hidden md:flex flex-1 items-center divide-x divide-border">
          <button type="button" onClick={() => onOpen("where")} className={seg}>
            <div className="text-[11px] font-bold">Where</div>
            <div className="text-sm text-muted-foreground truncate">{value.where || "Search destinations"}</div>
          </button>
          <button type="button" onClick={() => onOpen("when")} className={seg}>
            <div className="text-[11px] font-bold">When</div>
            <div className="text-sm text-muted-foreground truncate">{s.when}</div>
          </button>
          <button type="button" onClick={() => onOpen("who")} className={seg}>
            <div className="text-[11px] font-bold">Who</div>
            <div className="text-sm text-muted-foreground truncate">{s.who}</div>
          </button>
        </div>
        <button type="button" onClick={() => onOpen("where")} aria-label="Search" className="hidden md:flex w-10 h-10 shrink-0 rounded-full bg-primary text-primary-foreground items-center justify-center">
          <Search className="w-4 h-4" />
        </button>
      </div>
      {rightSlot}
    </div>
  );
};

const Stepper = ({ label, hint, value, onChange, min = 0, max = 16 }: { label: string; hint: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) => (
  <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
    <div>
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
    <div className="flex items-center gap-3">
      <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30">
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="w-5 text-center text-sm font-semibold">{value}</span>
      <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30">
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

export const SearchModal = ({
  open, onOpenChange, initialStep, value, onSearch, places, onLocate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialStep: Step;
  value: SearchState;
  onSearch: (s: SearchState) => void;
  places: LocationEntry[];
  onLocate?: (c: { lat: number; lng: number }) => void;
}) => {
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState<SearchState>(value);
  const [step, setStep] = useState<Step>(initialStep);
  const [recents, setRecents] = useState<SearchState[]>([]);

  useEffect(() => {
    if (open) { setDraft(value); setStep(initialStep); setRecents(readRecents()); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<SearchState>) => setDraft((d) => ({ ...d, ...patch }));
  const sum = summarize(draft);
  const matches = matchLocations(places, draft.where);
  const popular = places.filter((p) => p.kind !== "state").slice(0, 8);
  const range: DateRange | undefined = draft.checkIn ? { from: parseISO(draft.checkIn), to: draft.checkOut ? parseISO(draft.checkOut) : undefined } : undefined;

  const pickPlace = (label: string) => { set({ where: label }); setStep("when"); };
  const submit = (s = draft) => { pushRecent(s); onSearch(s); onOpenChange(false); };

  const locate = () => {
    if (!navigator.geolocation) return toast.error("Location not supported on this device");
    navigator.geolocation.getCurrentPosition(
      (pos) => { onLocate?.({ lat: pos.coords.latitude, lng: pos.coords.longitude }); onOpenChange(false); toast.success("Showing stays near you"); },
      () => toast.error("Couldn't get your location"),
      { timeout: 8000, maximumAge: 60000 },
    );
  };

  const onRange = (r: DateRange | undefined) => {
    if (!r?.from) return set({ checkIn: undefined, checkOut: undefined });
    // Re-tapping after a full range starts a new one
    if (draft.checkIn && draft.checkOut) { set({ checkIn: ymd(r.from === range?.from ? (r.to || r.from) : r.from), checkOut: undefined }); return; }
    if (r.to && ymd(r.to) > ymd(r.from)) { set({ checkIn: ymd(r.from), checkOut: ymd(r.to) }); setStep("who"); return; }
    set({ checkIn: ymd(r.from), checkOut: undefined });
  };

  const weekend = () => {
    const today = new Date();
    const fri = isFriday(today) || isSaturday(today) ? today : nextFriday(today);
    set({ checkIn: ymd(fri), checkOut: ymd(isSaturday(fri) ? addDays(fri, 1) : nextSunday(fri)) });
    setStep("who");
  };

  const card = (id: Step, title: string, summary: string, body: React.ReactNode) =>
    step === id ? (
      <section className="rounded-3xl bg-card border border-border shadow-lg p-5">
        <h2 className="text-xl font-extrabold mb-4">{title}</h2>
        {body}
      </section>
    ) : (
      <button type="button" onClick={() => setStep(id)} className="w-full rounded-2xl bg-card border border-border shadow-sm px-5 py-4 flex justify-between text-sm">
        <span className="text-muted-foreground">{title.replace("?", "")}</span>
        <span className="font-semibold truncate ml-3">{summary}</span>
      </button>
    );

  const whereBody = (
    <>
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border focus-within:border-primary">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          autoFocus={!isMobile || step === "where"}
          value={draft.where}
          onChange={(e) => set({ where: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") setStep("when"); }}
          placeholder="Search destinations"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {draft.where && <button type="button" aria-label="Clear place" onClick={() => set({ where: "" })}><X className="w-4 h-4 text-muted-foreground" /></button>}
      </div>
      <div className="mt-3 max-h-[45vh] overflow-y-auto -mx-2">
        {draft.where.trim().length >= 2 ? (
          matches.length ? matches.map((e) => (
            <button key={`${e.kind}-${e.label}`} type="button" onClick={() => pickPlace(e.label)} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-secondary text-left">
              <span className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0"><MapPin className="w-5 h-5" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{e.label}</span>
                <span className="block text-[11px] text-muted-foreground">{({ area: "Neighbourhood", city: "City", state: "State" } as const)[e.kind]}</span>
              </span>
            </button>
          )) : <p className="px-2 py-3 text-xs text-muted-foreground">We'll search every stay for "{draft.where}".</p>
        ) : (
          <>
            {onLocate && (
              <button type="button" onClick={locate} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-secondary text-left">
                <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Locate className="w-5 h-5" /></span>
                <span className="text-sm font-medium">Nearby stays</span>
              </button>
            )}
            {recents.length > 0 && <div className="px-2 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground">Recent searches</div>}
            {recents.map((r) => {
              const rs = summarize(r);
              return (
                <button key={r.where} type="button" onClick={() => submit({ ...EMPTY_SEARCH, ...r })} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-secondary text-left">
                  <span className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center"><Clock className="w-5 h-5" /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{r.where}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{rs.when} · {rs.who}</span>
                  </span>
                </button>
              );
            })}
            {popular.length > 0 && <div className="px-2 pt-3 pb-2 text-[11px] font-semibold text-muted-foreground">Popular places</div>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-2">
              {popular.map((p) => (
                <button key={p.label} type="button" onClick={() => pickPlace(p.label)} className="rounded-2xl border border-border bg-secondary/50 hover:border-primary p-3 text-left">
                  <MapPin className="w-4 h-4 text-primary mb-2" />
                  <div className="text-xs font-semibold truncate">{p.label}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );

  const whenBody = (
    <>
      <div className="flex justify-center overflow-x-auto">
        <Calendar
          mode="range"
          selected={range}
          onSelect={onRange}
          numberOfMonths={isMobile ? 1 : 2}
          disabled={{ before: new Date() }}
          className="p-0 pointer-events-auto"
        />
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {([0, 1, 3] as const).map((f) => (
          <button key={f} type="button" onClick={() => set({ flex: f })} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border", draft.flex === f ? "border-foreground bg-secondary" : "border-border")}>
            {f ? `± ${f} day${f > 1 ? "s" : ""}` : "Exact dates"}
          </button>
        ))}
        <button type="button" onClick={weekend} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-border">This weekend</button>
      </div>
    </>
  );

  const whoBody = (
    <div>
      <Stepper label="Adults" hint="Ages 13 or above" value={draft.adults} onChange={(n) => set({ adults: n })} />
      <Stepper label="Children" hint="Ages 2–12" value={draft.children} onChange={(n) => set({ children: n, adults: Math.max(draft.adults, n > 0 ? 1 : 0) })} />
      <Stepper label="Infants" hint="Under 2" max={5} value={draft.infants} onChange={(n) => set({ infants: n, adults: Math.max(draft.adults, n > 0 ? 1 : 0) })} />
    </div>
  );

  const seg = (id: Step, label: string, text: string) => (
    <button type="button" onClick={() => setStep(id)} className={cn("flex-1 min-w-0 text-left px-5 py-2.5 rounded-full transition-colors", step === id ? "bg-card shadow-md" : "hover:bg-card/60")}>
      <div className="text-[11px] font-bold">{label}</div>
      <div className="text-sm text-muted-foreground truncate">{text}</div>
    </button>
  );

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <button type="button" onClick={() => { setDraft(EMPTY_SEARCH); setStep("where"); }} className="text-sm font-semibold underline">Clear all</button>
      <button type="button" onClick={() => submit()} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
        <Search className="w-4 h-4" /> Search
      </button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 border-0 [&>button]:hidden",
          isMobile ? "max-w-none w-screen h-[100dvh] rounded-none bg-secondary flex flex-col" : "max-w-3xl top-[8%] translate-y-0 rounded-3xl bg-secondary",
        )}
      >
        <DialogTitle className="sr-only">Search stays</DialogTitle>
        {isMobile ? (
          <>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <button type="button" onClick={() => onOpenChange(false)} aria-label="Close search" className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center"><X className="w-4 h-4" /></button>
              <span className="text-sm font-bold border-b-2 border-foreground pb-1">Stays</span>
              <span className="w-9" />
            </div>
            <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
              {card("where", "Where to?", draft.where || "I'm flexible", whereBody)}
              {card("when", "When's your trip?", sum.when === "Any week" ? "Add dates" : sum.when, whenBody)}
              {card("who", "Who's coming?", sum.who, whoBody)}
            </div>
            <div className="px-5 py-4 bg-card border-t border-border">{footer}</div>
          </>
        ) : (
          <div className="p-4">
            <div className="flex items-center gap-1 rounded-full bg-muted p-1 border border-border">
              {seg("where", "Where", draft.where || "Search destinations")}
              {seg("when", "When", sum.when === "Any week" ? "Add dates" : sum.when)}
              {seg("who", "Who", sum.who)}
              <button type="button" onClick={() => submit()} aria-label="Search" className="w-12 h-12 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Search className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 rounded-3xl bg-card border border-border p-5">
              {step === "where" ? whereBody : step === "when" ? whenBody : whoBody}
              <div className="mt-5 pt-4 border-t border-border">{footer}</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
