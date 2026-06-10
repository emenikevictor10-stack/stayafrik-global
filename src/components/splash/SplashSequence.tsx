import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoFull from "@/assets/stay-logo-2.png";
import logoMark from "@/assets/stay-icon.png";
import propLekki from "@/assets/prop-lekki.jpg";
import propIkoyi from "@/assets/prop-ikoyi.jpg";
import propVi from "@/assets/prop-vi.jpg";
import propMaitama from "@/assets/prop-maitama.jpg";

const FLAG = "stay:splash-seen";

export const hasSeenSplash = () =>
  typeof window !== "undefined" && localStorage.getItem(FLAG) === "1";

export const SplashSequence = ({ onDone }: { onDone: () => void }) => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 1700);
      return () => clearTimeout(t);
    }
    if (step === 1) {
      const t = setTimeout(() => setStep(2), 2400);
      return () => clearTimeout(t);
    }
  }, [step]);

  const finish = (goToSignup = true) => {
    try { localStorage.setItem(FLAG, "1"); } catch {}
    onDone();
    if (goToSignup) navigate("/auth?mode=signup", { replace: true });
  };
  const next = () => (step < 3 ? setStep(step + 1) : finish(true));

  return (
    <div className="fixed inset-0 z-[100] bg-background text-foreground overflow-hidden flex items-center justify-center">
      <div className="relative w-full h-full sm:max-w-[420px] sm:h-[860px] sm:max-h-[95vh] sm:rounded-[2.5rem] sm:overflow-hidden sm:shadow-2xl sm:border sm:border-white/5 bg-background">

        {/* Step 0 — Loader */}
        {step === 0 && (
          <div className="absolute inset-0 flex items-center justify-center animate-[splashFade_500ms_ease-out]">
            <img
              src={logoFull}
              alt="Stay"
              className="w-[clamp(9rem,42vw,12rem)] h-auto animate-[splashLogo_900ms_cubic-bezier(.2,.7,.2,1)]"
            />
          </div>
        )}

        {/* Step 1 — Stay without stories collage */}
        {step === 1 && (
          <div className="absolute inset-0 px-6 pt-12 pb-8 flex flex-col animate-[splashFade_500ms_ease-out]">
            <div className="relative">
              <h1
                className="text-primary leading-none font-normal tracking-tight"
                style={{ fontFamily: "'Brush Script MT','Snell Roundhand','Apple Chancery',cursive", fontSize: "clamp(5.5rem,22vw,8rem)" }}
              >
                Stay
              </h1>
            </div>

            <div className="relative flex-1 mt-2">
              {/* Top-left image */}
              <div className="absolute left-0 top-0 w-[62%] aspect-[4/3] rounded-2xl overflow-hidden shadow-card animate-[splashRise_700ms_ease-out]">
                <img src={propLekki} alt="" className="w-full h-full object-cover" />
              </div>

              {/* Tagline */}
              <p
                className="absolute left-1/2 -translate-x-1/2 top-[44%] text-primary italic text-lg sm:text-xl"
                style={{ fontFamily: "'Brush Script MT','Snell Roundhand',cursive" }}
              >
                without stories
              </p>

              {/* Right-middle image */}
              <div className="absolute right-0 top-[52%] w-[55%] aspect-[4/3] rounded-2xl overflow-hidden shadow-card animate-[splashRise_900ms_ease-out]">
                <img src={propMaitama} alt="" className="w-full h-full object-cover" />
              </div>

              {/* Bottom-left image */}
              <div className="absolute left-0 bottom-0 w-[48%] aspect-[4/3] rounded-2xl overflow-hidden shadow-card animate-[splashRise_1100ms_ease-out]">
                <img src={propIkoyi} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        )}

        {/* Steps 2 & 3 — Feature slides */}
        {(step === 2 || step === 3) && (
          <div className="absolute inset-0 flex flex-col px-6 pt-12 pb-8 animate-[splashFade_500ms_ease-out]">
            {/* Header */}
            <div className="flex items-center justify-between">
              <img src={logoMark} alt="" className="h-8 w-auto" />
              <button
                onClick={finish}
                className="text-primary font-bold text-base inline-flex items-center gap-1"
                aria-label="Skip"
              >
                Skip <span aria-hidden>›</span>
              </button>
            </div>

            {/* Title + subtitle */}
            <div className="mt-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {step === 2 ? "Know Before You Book" : "Pay Securely"}
              </h2>
              <p className="mt-2 text-muted-foreground text-sm sm:text-base leading-relaxed">
                {step === 2
                  ? "See Power setup, Utilities, Internet speed, security and Real video walkthroughs"
                  : "Your payment stays protected until you check in successfully"}
              </p>
            </div>

            {/* Hero image */}
            <div className="relative flex-1 mt-6 rounded-3xl overflow-hidden shadow-card animate-[splashRise_700ms_ease-out]">
              <img
                src={step === 2 ? propVi : propIkoyi}
                alt=""
                className="absolute inset-0 w-full h-full object-cover animate-[splashZoom_2000ms_ease-out]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              {/* Progress dots */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-24 flex items-center gap-2">
                <span className={`h-1.5 rounded-full transition-all ${step === 2 ? "w-8 bg-white" : "w-2 bg-white/40"}`} />
                <span className={`h-1.5 rounded-full transition-all ${step === 3 ? "w-8 bg-white" : "w-2 bg-white/40"}`} />
              </div>

              {/* CTA */}
              <button
                onClick={next}
                className="absolute inset-x-6 bottom-6 rounded-2xl bg-primary text-primary-foreground font-bold py-4 text-base shadow-glow animate-[splashRise_600ms_ease-out]"
              >
                {step === 3 ? "Get started" : "Next"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes splashFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes splashLogo {
          0% { opacity: 0; transform: scale(.85) }
          60% { opacity: 1; transform: scale(1.03) }
          100% { opacity: 1; transform: scale(1) }
        }
        @keyframes splashZoom { from { transform: scale(1.08) } to { transform: scale(1) } }
        @keyframes splashRise { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
};
