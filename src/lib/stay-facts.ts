import type { Property } from "@/data/properties";
import { powerTags, hasWater, stayKind, POWER } from "@/lib/results";

/** Title built from facts ("2-bed apartment in Lekki Phase 1"); partner titles are often templates. */
export const factualTitle = (p: Property): string => {
  const kind = stayKind(p) || "apartment";
  const area = p.neighborhood || p.city || (p.location || "").split(",")[0].trim();
  const beds = p.beds > 0 ? (kind === "studio" ? "" : `${p.beds}-bed `) : "";
  const label = `${beds}${kind}`;
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}${area ? ` in ${area}` : ""}`;
};

const amen = (p: Property) => p.amenities.map((a) => a.label.toLowerCase()).join(" | ");

/** Plain-words essentials guests in Nigeria ask about first. Empty string means "not stated". */
export const essentials = (p: Property) => {
  const pw = powerTags(p);
  const t = amen(p);
  const security = [/security|guard/.test(t) && "Security guard", /cctv|camera/.test(t) && "CCTV", /gated|estate/.test(t) && "Gated estate"]
    .filter(Boolean) as string[];
  return {
    power: pw.length ? POWER.filter((x) => pw.includes(x.key)).map((x) => x.label).join(", ") : "",
    water: hasWater(p) ? (/borehole/.test(t) ? "Borehole water" : "Running water") : "",
    security: security.join(", "),
  };
};

/** Cancellation wording: local stays follow StayGlobal's policy; partner stays follow the partner's terms. */
export const cancellationLines = (p: Property): string[] =>
  p.source === "rayprop"
    ? ["Cancellation follows the partner's terms, shown before you pay.", "Contact support and we'll handle it with the partner."]
    : ["Full refund if you cancel 48 hours or more before check-in.", "50% refund if you cancel less than 48 hours before check-in.", "No refund after check-in."];
