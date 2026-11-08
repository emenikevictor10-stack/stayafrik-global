const KEY = "stay:recently-viewed:v1";

export const recentlyViewed = (): string[] => {
  try { return (JSON.parse(localStorage.getItem(KEY) || "[]") as string[]).slice(0, 8); } catch { return []; }
};

export const rememberViewed = (id: string) => {
  try {
    localStorage.setItem(KEY, JSON.stringify([id, ...recentlyViewed().filter((x) => x !== id)].slice(0, 8)));
  } catch { /* ignore */ }
};
