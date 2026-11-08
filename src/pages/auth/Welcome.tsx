import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/ui/kit";
import { ShieldCheck, MapPin, Wallet, Sparkles } from "lucide-react";

const slides = [
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: "Welcome to Stay",
    body: "Africa's verified property platform — shortlets, homes and land you can trust.",
    img: "🌍",
  },
  {
    icon: <ShieldCheck className="w-8 h-8" />,
    title: "Every listing verified",
    body: "Our team independently inspects each property. No catfish listings, ever.",
    img: "✅",
  },
  {
    icon: <Wallet className="w-8 h-8" />,
    title: "Escrow-protected payments",
    body: "Your money is held safely until 24h after check-in. Pay with card, transfer or USSD.",
    img: "🔐",
  },
  {
    icon: <MapPin className="w-8 h-8" />,
    title: "Across the continent",
    body: "Lagos, Accra, Nairobi, Cape Town and beyond. Your next stay is waiting.",
    img: "📍",
  },
];

const Welcome = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { role } = useRole();
  const { setIsNewUser, user } = useAuth();
  const s = slides[step];

  const finish = () => {
    setIsNewUser(false);
    if (user) localStorage.setItem(`stay:onboarded:${user.id}`, "1");
    navigate(role === "agent" ? "/listings" : "/explore", { replace: true });
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col max-w-md mx-auto px-6 pt-12 pb-8">
      <div className="flex items-center gap-2 mb-10">
        <Logo />
        <span className="font-extrabold tracking-tight">Stay</span>
      </div>

      <div className="flex-1 flex flex-col justify-center text-center">
        <div className="mx-auto w-32 h-32 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-6xl mb-8">
          {s.img}
        </div>
        <div className="mx-auto w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-4">
          {s.icon}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">{s.title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.body}</p>
      </div>

      <div className="flex justify-center gap-1.5 my-6">
        {slides.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : "w-1.5 bg-border"}`} />
        ))}
      </div>

      <div className="flex items-center gap-3">
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)} className="rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-semibold">
            Back
          </button>
        ) : (
          <button onClick={finish} className="rounded-xl px-5 py-3.5 text-sm font-semibold text-muted-foreground">
            Skip
          </button>
        )}
        <button
          onClick={() => (step < slides.length - 1 ? setStep(step + 1) : finish())}
          className="flex-1 rounded-xl bg-primary text-primary-foreground font-bold py-3.5 text-sm"
        >
          {step < slides.length - 1 ? "Continue" : role === "agent" ? "Start listing" : "Start exploring"}
        </button>
      </div>
    </main>
  );
};

export default Welcome;
