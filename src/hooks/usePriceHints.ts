import { useEffect, useState } from "react";
import { addMonths, format } from "date-fns";
import { raypropAvailability } from "@/lib/rayprop";
import type { Property } from "@/data/properties";
import type { PriceHints } from "@/components/search/DatesCalendar";

const cache = new Map<string, PriceHints>();
const dayPrice = (d: any) => Number(d?.price ?? d?.price_per_night ?? d?.nightly_price ?? d?.rate ?? 0);

/** Green/red calendar tints from partner stays' per-day prices in the searched place (±15% of each stay's median). */
export const usePriceHints = (partner: Property[], place: string) => {
  const [hints, setHints] = useState<PriceHints>({});
  const ids = partner.slice(0, 10).map((p) => p.raypropListingId || p.id.replace(/^rp_/, ""));
  const key = `${place.toLowerCase()}|${ids.join(",")}`;

  useEffect(() => {
    if (!place.trim() || !ids.length) { setHints({}); return; }
    if (cache.has(key)) { setHints(cache.get(key)!); return; }
    let active = true;
    (async () => {
      const from = format(new Date(), "yyyy-MM-dd");
      const to = format(addMonths(new Date(), 3), "yyyy-MM-dd");
      const ratios = new Map<string, number[]>();
      await Promise.all(ids.map(async (id) => {
        try {
          const days = (await raypropAvailability(id, from, to)) as any[];
          const priced = (Array.isArray(days) ? days : []).filter((d) => d?.date && dayPrice(d) > 0 && d.available !== false);
          if (priced.length < 5) return;
          const sorted = priced.map(dayPrice).sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          for (const d of priced) {
            const arr = ratios.get(d.date) || [];
            arr.push(dayPrice(d) / median);
            ratios.set(d.date, arr);
          }
        } catch { /* hints are optional */ }
      }));
      const out: PriceHints = {};
      ratios.forEach((arr, date) => {
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        if (avg <= 0.85) out[date] = "low";
        else if (avg >= 1.15) out[date] = "high";
      });
      cache.set(key, out);
      if (active) setHints(out);
    })();
    return () => { active = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return hints;
};
