import { useEffect, useState } from "react";
import { COMPARE_MAX, parseCompareIds } from "@/lib/compare";

export { COMPARE_MAX };
const KEY = "sg-compare";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const write = (next: string[]) => { localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event("sg-compare")); };

/** Device-local compare picks (max 3), shown on /compare. */
export const useCompare = () => {
  const [ids, setIds] = useState<string[]>(read);
  useEffect(() => {
    const on = () => setIds(read());
    window.addEventListener("sg-compare", on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener("sg-compare", on); window.removeEventListener("storage", on); };
  }, []);
  const toggle = (id: string): boolean => {
    const cur = read();
    if (cur.includes(id)) write(cur.filter((x) => x !== id));
    else if (cur.length >= COMPARE_MAX) return false;
    else write([...cur, id]);
    return true;
  };
  const setAll = (list: string[]) => write(parseCompareIds(list.join(",")));
  return { ids, has: (id: string) => ids.includes(id), toggle, setAll, clear: () => write([]) };
};
