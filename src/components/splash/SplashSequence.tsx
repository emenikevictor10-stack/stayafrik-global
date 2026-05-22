import { useEffect, useState } from "react";
import loaderImg from "@/assets/splash/loader.png";
import splash1 from "@/assets/splash/splash-1.png";
import splash2 from "@/assets/splash/splash-2.png";
import splash3 from "@/assets/splash/splash-3.png";

const FLAG = "stay:splash-seen";

export const hasSeenSplash = () =>
  typeof window !== "undefined" && localStorage.getItem(FLAG) === "1";

export const SplashSequence = ({ onDone }: { onDone: () => void }) => {
  const [step, setStep] = useState(0); // 0: loader, 1: stay-without-stories, 2: know before, 3: pay securely

  // Auto-advance loader and stylized intro
  useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 1600);
      return () => clearTimeout(t);
    }
    if (step === 1) {
      const t = setTimeout(() => setStep(2), 1800);
      return () => clearTimeout(t);
    }
  }, [step]);

  const finish = () => {
    try { localStorage.setItem(FLAG, "1"); } catch {}
    onDone();
  };

  const next = () => {
    if (step < 3) setStep(step + 1);
    else finish();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white overflow-hidden">
      {step === 0 && (
        <div key="s0" className="w-full h-full flex items-center justify-center animate-[splashFade_500ms_ease-out]">
          <img
            src={loaderImg}
            alt="Stay"
            className="w-64 h-auto animate-[splashLogo_900ms_cubic-bezier(.2,.7,.2,1)]"
          />
        </div>
      )}

      {step === 1 && (
        <div key="s1" className="w-full h-full relative animate-[splashFade_500ms_ease-out]">
          <img
            src={splash1}
            alt="Stay without stories"
            className="w-full h-full object-cover object-center animate-[splashZoom_1800ms_ease-out]"
          />
          <button
            onClick={() => setStep(2)}
            aria-label="Skip"
            className="absolute top-6 right-6 text-primary text-sm font-semibold"
          >
            Skip ›
          </button>
        </div>
      )}

      {(step === 2 || step === 3) && (
        <div key={`s${step}`} className="w-full h-full relative animate-[splashFade_500ms_ease-out]">
          <img
            src={step === 2 ? splash2 : splash3}
            alt={step === 2 ? "Know before you book" : "Pay securely"}
            className="w-full h-full object-cover object-center"
          />
          <button
            onClick={finish}
            aria-label="Skip"
            className="absolute top-6 right-[72px] text-primary text-sm font-semibold"
          >
            Skip ›
          </button>
          <button
            onClick={next}
            aria-label={step === 3 ? "Get started" : "Next"}
            className="absolute inset-x-0 bottom-[7%] mx-auto block w-[70%] max-w-xs rounded-2xl bg-primary text-primary-foreground font-bold py-4 text-base shadow-lg animate-[splashRise_600ms_cubic-bezier(.2,.7,.2,1)]"
          >
            {step === 3 ? "Get started" : "Next"}
          </button>
        </div>
      )}

      <style>{`
        @keyframes splashFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes splashLogo {
          0% { opacity: 0; transform: scale(.85) }
          60% { opacity: 1; transform: scale(1.03) }
          100% { opacity: 1; transform: scale(1) }
        }
        @keyframes splashZoom { from { transform: scale(1.05) } to { transform: scale(1) } }
        @keyframes splashRise { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
};
