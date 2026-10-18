import { NIGERIA_STATES, stateForCity } from "@/lib/nigeria-places";

const field = "mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm";
const lbl = "text-[11px] font-semibold text-muted-foreground uppercase";

/** State → City → Neighbourhood, the same structure partner stays use. */
export const PlaceFields = ({
  state, city, neighborhood, onChange,
}: {
  state: string; city: string; neighborhood: string;
  onChange: (patch: { state?: string; city?: string; neighborhood?: string }) => void;
}) => (
  <div className="space-y-4">
    <label className="block">
      <span className={lbl}>State</span>
      <select value={state} onChange={(e) => onChange({ state: e.target.value })} className={field}>
        <option value="">Choose a state</option>
        {NIGERIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
    <label className="block">
      <span className={lbl}>City</span>
      <input
        value={city}
        onChange={(e) => {
          const c = e.target.value;
          const guess = stateForCity(c);
          onChange(!state && guess ? { city: c, state: guess } : { city: c });
        }}
        placeholder="e.g. Lekki, Ikeja, Abuja"
        className={field}
      />
    </label>
    <label className="block">
      <span className={lbl}>Neighbourhood <span className="normal-case font-normal">(optional)</span></span>
      <input value={neighborhood} onChange={(e) => onChange({ neighborhood: e.target.value })} placeholder="e.g. Chevron, Phase 1, Magodo GRA" className={field} />
    </label>
  </div>
);
