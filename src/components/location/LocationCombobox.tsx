import { useMemo, useRef, useState } from "react";
import { Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { breadcrumb, filterLocations, type Location, type LocationType } from "@/lib/locations";

/** Search-as-you-type picker over the master place list. Only lets you pick listed places. */
export const LocationCombobox = ({
  all, byId, value, onPick, types, parentId, placeholder, disabled, allowFreeText, className,
}: {
  all: Location[]; byId: Map<string, Location>;
  value: string; onPick: (loc: Location | null, text: string) => void;
  types?: LocationType[]; parentId?: string | null; placeholder?: string; disabled?: boolean;
  allowFreeText?: boolean; className?: string;
}) => {
  const [q, setQ] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const blurT = useRef<number>();
  const text = q ?? value;
  const results = useMemo(() => filterLocations(all, q ?? "", { types, parentId, limit: 30 }), [all, q, types, parentId]);

  const pick = (l: Location) => { onPick(l, l.name); setQ(null); setOpen(false); };

  return (
    <div className={cn("relative", className)}>
      <input
        role="combobox" aria-expanded={open} aria-autocomplete="list"
        value={text} disabled={disabled} placeholder={placeholder}
        onFocus={() => { setOpen(true); setQ(""); setCursor(0); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setCursor(0); }}
        onBlur={() => {
          blurT.current = window.setTimeout(() => {
            setOpen(false);
            if (allowFreeText && q && q.trim() && q !== value) onPick(null, q.trim());
            setQ(null);
          }, 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
          else if (e.key === "Enter" && results[cursor]) { e.preventDefault(); pick(results[cursor]); }
          else if (e.key === "Escape") { setOpen(false); setQ(null); }
        }}
        className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm disabled:opacity-50"
      />
      {open && !disabled && (
        <ul role="listbox" className="absolute z-30 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-border bg-popover shadow-lg py-1">
          {results.map((l, i) => (
            <li key={l.id} role="option" aria-selected={i === cursor}
              onMouseDown={(e) => { e.preventDefault(); window.clearTimeout(blurT.current); pick(l); }}
              onMouseEnter={() => setCursor(i)}
              className={cn("px-3 py-2 text-sm cursor-pointer flex items-center gap-2", i === cursor && "bg-muted")}>
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="font-medium">{l.name}</span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {l.type === "neighbourhood" ? "Neighbourhood" : l.type === "city" ? "City / area" : "State"}
                  {breadcrumb(l, byId) ? ` · ${breadcrumb(l, byId)}` : ""}
                </span>
              </span>
              {l.name === value && <Check className="w-4 h-4 text-primary" />}
            </li>
          ))}
          {!results.length && (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              {allowFreeText ? "Not listed — we'll keep what you typed and our team will add it." : "No matching place. Try another spelling."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
