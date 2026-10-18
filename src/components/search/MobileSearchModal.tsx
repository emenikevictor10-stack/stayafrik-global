import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { rememberPlace } from "@/hooks/useLocationSearch";
import { Search, X, Home, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { EMPTY_SEARCH, whenSummary, whoSummary } from "@/lib/search-state";
import { useSearch, type Segment } from "./SearchProvider";
import { WherePanel, useWhereResults, requestNearby, placePatch, autoPick, type WhereItem } from "./WherePanel";
import { WhenPanel } from "./WhenPanel";
import { WhoPanel } from "./WhoPanel";

/** Phone resting pill. */
export const MobileSearchPill = ({ onOpen }: { onOpen: () => void }) => {
  const { search } = useSearch();
  const has = search.where || whenSummary(search) || whoSummary(search);
  return (
    <button type="button" onClick={onOpen}
      className="w-full h-14 rounded-full bg-search-surface border border-border shadow-search flex items-center justify-center gap-2 px-5">
      <Search className="w-4 h-4 shrink-0" strokeWidth={2.5} />
      {has ? (
        <span className="min-w-0 text-left">
          <span className="block text-sm font-semibold truncate">{search.where || "Anywhere"}</span>
          <span className="block text-[11px] text-muted-foreground truncate">{whenSummary(search) || "Anytime"} · {whoSummary(search) || "Add guests"}</span>
        </span>
      ) : <span className="text-base font-medium">Start your search</span>}
    </button>
  );
};

export const MobileSearchModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const { search, draft, patch, setDraft, commit, places, hints, onLocate } = useSearch();
  const [step, setStep] = useState<Segment>("where");
  const where = useWhereResults(places, draft.where);

  useEffect(() => { if (open) { setDraft(search); setStep("where"); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = useNavigate();
  const submit = () => { commit(autoPick(draft, where)); onOpenChange(false); };
  const pick = (item: WhereItem) => {
    if (item.kind === "stay") { onOpenChange(false); navigate(`/property/${item.id}`); return; }
    rememberPlace(item); patch(placePatch(item)); setStep("when");
  };
  const toWhen = () => { patch(autoPick(draft, where)); setStep("when"); };

  const card = (id: Segment, title: string, label: string, summary: string, body: React.ReactNode) =>
    step === id ? (
      <section className="rounded-3xl bg-search-surface shadow-search-open p-6 animate-panel-in">
        <h2 className="text-[22px] font-bold mb-4">{title}</h2>
        {body}
      </section>
    ) : (
      <button type="button" onClick={() => setStep(id)} className="w-full rounded-2xl bg-search-surface shadow-search px-6 py-5 flex justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold truncate">{summary}</span>
      </button>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 border-0 max-w-none w-screen h-[100dvh] rounded-none bg-search-muted/95 backdrop-blur-md flex flex-col [&>button]:hidden">
        <DialogTitle className="sr-only">Search stays</DialogTitle>
        <div className="relative flex items-center justify-center px-5 pt-5 pb-4">
          <div className="flex flex-col items-center gap-1 text-sm font-semibold border-b-2 border-foreground pb-1.5">
            <Home className="w-5 h-5" /> Stays
          </div>
          <button type="button" onClick={() => onOpenChange(false)} aria-label="Close search"
            className="absolute right-5 top-5 w-10 h-10 rounded-full bg-search-surface border border-border flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-4">
          {card("where", "Where?", "Where", draft.where || "I'm flexible", (
            <>
              <label className="flex items-center gap-3 h-14 px-4 rounded-xl border border-muted-foreground focus-within:border-foreground">
                {draft.where
                  ? <button type="button" aria-label="Back" onClick={() => patch({ where: "", loc: undefined, locType: undefined })}><ArrowLeft className="w-4 h-4" /></button>
                  : <Search className="w-4 h-4" />}
                <input autoFocus value={draft.where} onChange={(e) => patch({ where: e.target.value, loc: undefined, locType: undefined })}
                  onKeyDown={(e) => { if (e.key === "Enter") { const it = where.typing ? where.items[0] : undefined; if (it) pick(it); else toWhen(); } }}
                  role="combobox" aria-expanded aria-controls="m-where-list"
                  placeholder="Search destinations" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                {draft.where && <button type="button" aria-label="Clear place" onClick={() => patch({ where: "", loc: undefined, locType: undefined })}><X className="w-4 h-4" /></button>}
              </label>
              <div className="mt-4 max-h-[42vh] overflow-y-auto -mx-2">
                <WherePanel listId="m-where-list" query={draft.where} results={where} cursor={where.typing ? 0 : -1}
                  onPick={pick} onFlexible={() => { patch({ where: "", loc: undefined, locType: undefined }); setStep("when"); }}
                  onNearby={onLocate ? () => requestNearby(onLocate, () => onOpenChange(false)) : undefined} />
              </div>
              <ChevronDown className="w-4 h-4 mx-auto mt-2 text-muted-foreground" aria-hidden />
            </>
          ))}
          {card("when", "When's your trip?", "When", whenSummary(draft) || "Add dates", (
            <WhenPanel layout="list" value={draft} onChange={patch} hints={hints} />
          ))}
          {card("who", "Who's coming?", "Who", whoSummary(draft) || "Add guests", <WhoPanel value={draft} onChange={patch} />)}
        </div>

        <div className="px-6 py-4 bg-search-surface border-t border-border flex items-center justify-between">
          {step === "when" ? (
            <>
              <button type="button" className="text-sm font-semibold underline"
                onClick={() => (draft.checkIn || draft.months.length ? patch({ checkIn: undefined, checkOut: undefined, months: [], flex: 0 }) : setStep("who"))}>
                {draft.checkIn || draft.months.length ? "Reset" : "Skip"}
              </button>
              <button type="button" onClick={() => setStep("who")} className="px-8 py-3 rounded-xl bg-foreground text-background font-semibold text-sm">Next</button>
            </>
          ) : step === "where" ? (
            <>
              <button type="button" onClick={() => setDraft(EMPTY_SEARCH)} className="text-sm font-semibold underline">Clear all</button>
              <button type="button" onClick={toWhen} className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">Next</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setDraft(EMPTY_SEARCH); setStep("where"); }} className="text-sm font-semibold underline">Clear all</button>
              <button type="button" onClick={submit} className={cn("inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm")}>
                <Search className="w-4 h-4" strokeWidth={2.5} /> Search
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
