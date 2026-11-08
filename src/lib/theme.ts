import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "sg-theme";

/** Light is default; dark only when the user picks it (never follows the phone). */
export const getTheme = (): Theme => (localStorage.getItem(KEY) === "dark" ? "dark" : "light");

export const applyTheme = (t: Theme) => {
  document.documentElement.classList.toggle("dark", t === "dark");
  window.dispatchEvent(new CustomEvent("sg-theme", { detail: t }));
};

export const setTheme = (t: Theme) => {
  localStorage.setItem(KEY, t);
  applyTheme(t);
};

export const useTheme = () => {
  const [theme, set] = useState<Theme>(getTheme);
  useEffect(() => {
    const on = (e: Event) => set((e as CustomEvent<Theme>).detail);
    window.addEventListener("sg-theme", on);
    return () => window.removeEventListener("sg-theme", on);
  }, []);
  return [theme, setTheme] as const;
};
