/** Loads Paystack's inline checkout script once. */
export const loadPaystackInline = () =>
  new Promise<void>((resolve, reject) => {
    if ((window as any).PaystackPop) return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-paystack-inline]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Paystack")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v2/inline.js";
    s.async = true;
    s.dataset.paystackInline = "true";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Paystack"));
    document.head.appendChild(s);
  });
