import { useEffect, useState } from "react";

const KEY = "sg-compare";
export const COMPARE_MAX = 4;
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };

/** Device-local compare picks (max 4) until the compare page lands. */
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
    let next: string[];
    if (cur.includes(id)) next = cur.filter((x) => x !== id);
    else if (cur.length >= COMPARE_MAX) return false;
    else next = [...cur, id];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("sg-compare"));
    return true;
  };
  return { ids, has: (id: string) => ids.includes(id), toggle };
};
