import { useEffect, useState } from "react";

export type DockEdge = "left" | "right" | "bottom";
const EDGE = "sg-dock-edge";
const PIN = "sg-nav-pinned";
const EVT = "sg-nav-prefs";

const read = () => ({
  edge: ((["left", "right", "bottom"] as const).find((e) => e === localStorage.getItem(EDGE)) || "right") as DockEdge,
  pinned: localStorage.getItem(PIN) === "1",
});

export const setDockEdge = (e: DockEdge) => { localStorage.setItem(EDGE, e); window.dispatchEvent(new Event(EVT)); };
export const setPinned = (p: boolean) => { localStorage.setItem(PIN, p ? "1" : "0"); window.dispatchEvent(new Event(EVT)); };

/** Nearest edge to a drop point (bottom only when clearly in the lower band). */
export const nearestEdge = (x: number, y: number, w: number, h: number): DockEdge => {
  if (y > h * 0.75) return "bottom";
  return x < w / 2 ? "left" : "right";
};

export const useNavPrefs = () => {
  const [prefs, setPrefs] = useState(read);
  useEffect(() => {
    const on = () => setPrefs(read());
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return prefs;
};
