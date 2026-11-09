export const COMPARE_MAX = 3;

/** Parse a `?ids=a,b,c` compare link: trimmed, no repeats, at most COMPARE_MAX. */
export const parseCompareIds = (raw: string | null | undefined): string[] => {
  const out: string[] = [];
  for (const s of (raw || "").split(",")) {
    const id = s.trim();
    if (id && !out.includes(id)) out.push(id);
    if (out.length >= COMPARE_MAX) break;
  }
  return out;
};

export const compareLink = (ids: string[]) => `/compare?ids=${parseCompareIds(ids.join(",")).map(encodeURIComponent).join(",")}`;
