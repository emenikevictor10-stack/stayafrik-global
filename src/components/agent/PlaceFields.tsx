import { useLocations } from "@/hooks/useLocations";
import { LocationCombobox } from "@/components/location/LocationCombobox";
import { chainOf } from "@/lib/locations";

const field = "mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm";
const lbl = "text-xs font-semibold text-muted-foreground";

/** State → City → Neighbourhood, picked from the master place list (same list partner stays are matched to). */
export const PlaceFields = ({
  state, city, neighborhood, onChange,
}: {
  state: string; city: string; neighborhood: string;
  onChange: (patch: { state?: string; city?: string; neighborhood?: string }) => void;
}) => {
  const { all, byId } = useLocations();
  const states = all.filter((l) => l.type === "state");
  const stateLoc = states.find((s) => s.name === state);
  const cityLoc = all.find((l) => l.type === "city" && l.name === city && (!stateLoc || l.parent_id === stateLoc.id));

  return (
    <div className="space-y-4">
      <label className="block">
        <span className={lbl}>State</span>
        <select value={state} onChange={(e) => onChange({ state: e.target.value, city: "", neighborhood: "" })} className={field}>
          <option value="">Choose a state</option>
          {states.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </label>
      <div>
        <span className={lbl}>City / area</span>
        <LocationCombobox
          all={all} byId={byId} value={city} types={["city"]} parentId={stateLoc ? stateLoc.id : undefined}
          placeholder="Search e.g. Lekki, Ikeja, Abuja"
          onPick={(l) => {
            if (!l) return;
            const ch = chainOf(l.id, byId);
            onChange({ city: l.name, state: ch.state?.name || state, neighborhood: "" });
          }}
        />
      </div>
      <div>
        <span className={lbl}>Neighbourhood <span className="normal-case font-normal">(optional)</span></span>
        <LocationCombobox
          all={all} byId={byId} value={neighborhood} types={["neighbourhood"]}
          parentId={cityLoc ? cityLoc.id : undefined} disabled={!cityLoc} allowFreeText
          placeholder={cityLoc ? "Search e.g. Chevron, Lekki Phase 1" : "Pick a city first"}
          onPick={(l, text) => {
            if (l) { const ch = chainOf(l.id, byId); onChange({ neighborhood: l.name, city: ch.city?.name || city, state: ch.state?.name || state }); }
            else onChange({ neighborhood: text });
          }}
        />
      </div>
    </div>
  );
};

/** True when city is one of the listed places (the form requires state + a listed city). */
export const usePlaceIsValid = (state: string, city: string) => {
  const { all } = useLocations();
  const st = all.find((l) => l.type === "state" && l.name === state);
  return !!st && all.some((l) => l.type === "city" && l.name === city && l.parent_id === st.id);
};
