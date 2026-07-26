import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import propLekki from "@/assets/prop-lekki.jpg";
import propIkoyi from "@/assets/prop-ikoyi.jpg";
import propVi from "@/assets/prop-vi.jpg";
import propMaitama from "@/assets/prop-maitama.jpg";

const FLAG = "stay:splash-seen";

export const hasSeenSplash = () =>
  typeof window !== "undefined" && localStorage.getItem(FLAG) === "1";

type Slide = {
  image: string;
  eyebrow: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    image: propLekki,
    eyebrow: "Welcome to Stay",
    title: "Find shortlets you can trust",
    body: "Verified apartments across Nigeria — real photos, real hosts, no stories.",
  },
  {
    image: propMaitama,
    eyebrow: "Know before you book",
    title: "Power, water, Wi-Fi & security at a glance",
    body: "Every listing spells out what actually works, plus a real video walkthrough.",
  },
  {
    image: propVi,
    eyebrow: "Pay with confidence",
    title: "Your money stays in escrow",
    body: "Funds are only released to the host after you've checked in successfully.",
  },
];

export const SplashSequence = ({ onDone }: { onDone: () => void }) => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // preload next image
    const next = SLIDES[step + 1];
    if (next) {
      const img = new Image();
      img.src = next.image;
    }
  }, [step]);

  const finish = () => {
    try { localStorage.setItem(FLAG, "1"); } catch {}
    onDone();
    navigate("/auth?mode=signup", { replace: true });
  };

  const advance = () => (step < SLIDES.length - 1 ? setStep(step + 1) : finish());

  const slide = SLIDES[step];

  return (
    <div className="fixed inset-0 z-[100] bg-background text-foreground overflow-hidden flex items-center justify-center">
      <div className="relative w-full h-full sm:max-w-[420px] sm:h-[860px] sm:max-h-[95vh] sm:rounded-[2.5rem] sm:overflow-hidden sm:shadow-2xl sm:border sm:border-white/5 bg-background flex flex-col">

        {/* Hero photo */}
        <div key={step} className="relative flex-1 overflow-hidden animate-[splashFade_500ms_ease-out]">
          <img
            src={slide.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover animate-[splashZoom_6000ms_ease-out]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/20" />

          {/* Skip */}
          <button
            onClick={finish}
            className="absolute top-5 right-5 z-10 text-white/90 text-sm font-semibold px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md"
            aria-label="Skip intro"
          >
            Skip
          </button>
        </div>

        {/* Content card */}
        <div className="relative -mt-32 px-6 pb-8 z-10 text-white">
          <div className="animate-[splashRise_500ms_ease-out]">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/70">
              {slide.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight leading-[1.15]">
              {slide.title}
            </h2>
            <p className="mt-3 text-sm text-white/80 leading-relaxed max-w-[32ch]">
              {slide.body}
            </p>
          </div>

          {/* Progress + CTA */}
          <div className="mt-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? "w-8 bg-white" : "w-1.5 bg-white/35"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={advance}
              className="rounded-full bg-primary text-primary-foreground font-bold px-6 py-3 text-sm shadow-glow"
            >
              {step === SLIDES.length - 1 ? "Get started" : "Continue"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes splashFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes splashZoom { from { transform: scale(1.12) } to { transform: scale(1) } }
        @keyframes splashRise { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
};
