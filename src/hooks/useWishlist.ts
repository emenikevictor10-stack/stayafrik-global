import { useCallback, useEffect, useState } from "react";

const KEY = "stay:wishlist:v1";

const read = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const emitter = new EventTarget();

export const useWishlist = () => {
  const [ids, setIds] = useState<string[]>(() => read());

  useEffect(() => {
    const onChange = () => setIds(read());
    emitter.addEventListener("change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      emitter.removeEventListener("change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    localStorage.setItem(KEY, JSON.stringify(next));
    emitter.dispatchEvent(new Event("change"));
    return !current.includes(id);
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, has, toggle };
};
