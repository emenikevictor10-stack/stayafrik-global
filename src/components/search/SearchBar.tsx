import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { rememberPlace } from "@/hooks/useLocationSearch";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { whenSummary, whoSummary } from "@/lib/search-state";
import { useSearch, type Segment } from "./SearchProvider";
import { WherePanel, useWhereResults, requestNearby, placePatch, autoPick, type WhereItem } from "./WherePanel";
import { WhenPanel } from "./WhenPanel";
import { WhoPanel } from "./WhoPanel";

/** Desktop/tablet expanding pill with dropdown panels. */
export const SearchBar = ({ className, onClosed, panels = true }: { className?: string; onClosed?: () => void; panels?: boolean }) => {
  const { draft, patch, commit, active, setActive, places, hints, onLocate } = useSearch();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hovered, setHovered] = useState<Segment | null>(null);
  const [cursor, setCursor] = useState(-1);
  const where = useWhereResults(places, draft.where);
  const navigate = useNavigate();

  const close = () => { setActive(null); onClosed?.(); };

  useEffect(() => {
    if (!active || !panels) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (rootRef.current?.contains(t) || t.closest("[role=dialog],[data-radix-popper-content-wrapper]")) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setCursor(-1); }, [draft.where]);
  useEffect(() => { if (panels && active === "where") inputRef.current?.focus(); }, [active, panels]);

  const pickPlace = (item: WhereItem) => {
    if (item.kind === "stay") { close(); navigate(`/property/${item.id}`); return; }
    rememberPlace(item);
    patch(placePatch(item));
    setActive("when");
  };
  const submit = () => { commit(autoPick(draft, where)); onClosed?.(); };

  const values: Record<Segment, string> = { where: draft.where, when: whenSummary(draft), who: whoSummary(draft) };
  const clear: Record<Segment, () => void> = {
    where: () => patch({ where: "", loc: undefined, locType: undefined }),
    when: () => patch({ checkIn: undefined, checkOut: undefined, flex: 0, months: [] }),
    who: () => patch({ adults: 0, children: 0, infants: 0, pets: 0, bedrooms: 0 }),
  };

  const order: Segment[] = ["where", "when", "who"];
  const hideDivider = (i: number) => {
    const a = order[i], b = order[i + 1];
    return [a, b].includes(active as Segment) || [a, b].includes(hovered as Segment);
  };

  const segBox = (id: Segment) => cn(
    "relative flex-1 min-w-0 h-full rounded-full flex items-center transition-all duration-200",
    active === id ? "bg-search-surface shadow-search-open" : "hover:bg-search-hover",
  );
  const xBtn = (id: Segment) => values[id] && (active === id || hovered === id) && (
    <button type="button" aria-label={`Clear ${id}`} onClick={(e) => { e.stopPropagation(); clear[id](); }}
      className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-search-hover hover:bg-muted-foreground/30 flex items-center justify-center">
      <X className="w-3 h-3" />
    </button>
  );

  return (
    <div ref={rootRef} className={cn("relative w-full max-w-[850px] mx-auto", className)}>
      <div className={cn(
        "flex items-center h-[66px] rounded-full border border-border transition-colors duration-200",
        active ? "bg-search-muted shadow-search-open" : "bg-search-surface shadow-search",
      )}>
        {/* Where */}
        <div className={cn(segBox("where"), "basis-[36%]")} onMouseEnter={() => setHovered("where")} onMouseLeave={() => setHovered(null)}
          onClick={() => setActive("where")}>
          <label className="w-full pl-8 pr-10 cursor-pointer">
            <span className="block text-xs font-semibold">Where</span>
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded={active === "where"}
              aria-controls="where-list"
              aria-activedescendant={cursor >= 0 ? `where-list-${cursor}` : undefined}
              value={draft.where}
              onChange={(e) => patch({ where: e.target.value, loc: undefined, locType: undefined })}
              onFocus={() => setActive("where")}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, where.items.length - 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, -1)); }
                else if (e.key === "Enter") {
                  e.preventDefault();
                  const item = where.items[cursor >= 0 ? cursor : 0];
                  if (item && (cursor >= 0 || where.typing)) pickPlace(item); else setActive("when");
                } else if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); patch(autoPick(draft, where)); setActive("when"); }
              }}
              placeholder="Search destinations"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground truncate"
            />
          </label>
          {xBtn("where")}
        </div>
        <span className={cn("w-px h-8 bg-border shrink-0", hideDivider(0) && "opacity-0")} />
        {/* When */}
        <div className={cn(segBox("when"), "basis-[30%]")} onMouseEnter={() => setHovered("when")} onMouseLeave={() => setHovered(null)}>
          <button type="button" aria-expanded={active === "when"} aria-controls="search-panel" onClick={() => setActive("when")} className="w-full h-full text-left pl-6 pr-10 rounded-full">
            <span className="block text-xs font-semibold">When</span>
            <span className={cn("block text-sm truncate", values.when ? "text-foreground" : "text-muted-foreground")}>{values.when || "Add dates"}</span>
          </button>
          {xBtn("when")}
        </div>
        <span className={cn("w-px h-8 bg-border shrink-0", hideDivider(1) && "opacity-0")} />
        {/* Who + Search */}
        <div className={cn(segBox("who"), "basis-[34%] pr-2")} onMouseEnter={() => setHovered("who")} onMouseLeave={() => setHovered(null)}>
          <button type="button" aria-expanded={active === "who"} aria-controls="search-panel" onClick={() => setActive("who")} className="flex-1 min-w-0 h-full text-left pl-6 pr-2 rounded-full">
            <span className="block text-xs font-semibold">Who</span>
            <span className={cn("block text-sm truncate", values.who ? "text-foreground" : "text-muted-foreground")}>{values.who || "Add guests"}</span>
          </button>
          {values.who && (active === "who" || hovered === "who") && (
            <button type="button" aria-label="Clear who" onClick={clear.who} className="w-6 h-6 mr-2 shrink-0 rounded-full bg-search-hover flex items-center justify-center"><X className="w-3 h-3" /></button>
          )}
          <button type="button" onClick={submit} aria-label="Search"
            className={cn("h-12 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary-dim flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 overflow-hidden",
              active ? "px-5" : "w-12")}>
            <Search className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            {active && <span>Search</span>}
          </button>
        </div>
      </div>

      {active && panels && (
        <div
          id="search-panel"
          className={cn(
            "absolute top-full mt-3 z-50 rounded-[32px] bg-search-surface border border-border shadow-search-open animate-panel-in",
            active === "where" && "left-0 w-[425px] max-h-[420px] overflow-y-auto p-6",
            active === "when" && "left-0 right-0 p-8",
            active === "who" && "right-0 w-[400px] px-8 py-4",
          )}
        >
          {active === "where" && (
            <WherePanel listId="where-list" query={draft.where} results={where} cursor={cursor >= 0 ? cursor : where.typing ? 0 : -1}
              onPick={pickPlace} onNearby={onLocate ? () => requestNearby(onLocate, close) : undefined}
              onFlexible={() => { patch({ where: "", loc: undefined, locType: undefined }); setActive("when"); }} />
          )}
          {active === "when" && <WhenPanel layout="pair" value={draft} onChange={patch} hints={hints} />}
          {active === "who" && <WhoPanel value={draft} onChange={patch} />}
        </div>
      )}
    </div>
  );
};

/** Small sticky pill shown after scrolling past the full bar. */
export const CompactSearchBar = ({ onOpen }: { onOpen: (s: Segment) => void }) => {
  const { search } = useSearch();
  const part = "px-4 text-sm font-medium truncate hover:text-foreground";
  return (
    <div className="flex items-center h-12 rounded-full bg-search-surface border border-border shadow-search pl-2 pr-2 max-w-md mx-auto animate-panel-in">
      <button type="button" onClick={() => onOpen("where")} className={part}>{search.where || "Anywhere"}</button>
      <span className="w-px h-6 bg-border" />
      <button type="button" onClick={() => onOpen("when")} className={part}>{whenSummary(search) || "Anytime"}</button>
      <span className="w-px h-6 bg-border" />
      <button type="button" onClick={() => onOpen("who")} className={cn(part, !whoSummary(search) && "text-muted-foreground")}>{whoSummary(search) || "Add guests"}</button>
      <button type="button" onClick={() => onOpen("where")} aria-label="Search" className="ml-auto w-8 h-8 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
        <Search className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
};
