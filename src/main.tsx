import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// PWA service worker — only register on the published site (never inside the editor preview iframe).
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const host = window.location.hostname;
const isPreviewHost =
  host.includes("lovableproject.com") ||
  host.includes("id-preview--") ||
  host === "localhost" ||
  host === "127.0.0.1";

if ("serviceWorker" in navigator) {
  if (isInIframe || isPreviewHost || !import.meta.env.PROD) {
    // Make sure no stale worker hijacks the preview.
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* noop — install will retry on next visit */
      });
    });
  }
}
