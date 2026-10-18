/** Nigeria place structure, matching RayProp: State → City → Neighbourhood. */
export const NIGERIA_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi",
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
] as const;

const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
export const titleCase = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** "fct", "Federal Capital Territory", "Lagos State" → canonical state name; unknown → title-cased input. */
export const normalizeState = (raw?: string | null): string => {
  const s = n(raw || "").replace(/\bstate\b/g, "").trim();
  if (!s) return "";
  if (s === "fct" || s.includes("federal capital") || s === "abuja" || s === "fct abuja") return "FCT Abuja";
  const hit = NIGERIA_STATES.find((st) => n(st) === s);
  return hit || titleCase(s);
};

const CITY_STATE: Record<string, string> = {
  lagos: "Lagos", lekki: "Lagos", ikoyi: "Lagos", "victoria island": "Lagos", vi: "Lagos", ikeja: "Lagos", maryland: "Lagos",
  ogudu: "Lagos", yaba: "Lagos", surulere: "Lagos", ajah: "Lagos", gbagada: "Lagos", magodo: "Lagos", oniru: "Lagos",
  ilupeju: "Lagos", chevron: "Lagos", sangotedo: "Lagos", festac: "Lagos", ikorodu: "Lagos", "banana island": "Lagos",
  abuja: "FCT Abuja", maitama: "FCT Abuja", wuse: "FCT Abuja", asokoro: "FCT Abuja", garki: "FCT Abuja", gwarinpa: "FCT Abuja",
  jabi: "FCT Abuja", lifecamp: "FCT Abuja", "life camp": "FCT Abuja", katampe: "FCT Abuja", utako: "FCT Abuja", kubwa: "FCT Abuja",
  "port harcourt": "Rivers", enugu: "Enugu", ibadan: "Oyo", uyo: "Akwa Ibom", owerri: "Imo", calabar: "Cross River",
  "benin city": "Edo", benin: "Edo", kano: "Kano", kaduna: "Kaduna", jos: "Plateau", abeokuta: "Ogun", ilorin: "Kwara",
  akure: "Ondo", asaba: "Delta", warri: "Delta",
};

/** Best-guess state for a city or area name (used when a listing has no state yet). */
export const stateForCity = (city?: string | null): string => CITY_STATE[n(city || "")] || "";
