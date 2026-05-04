import { TopBar } from "@/components/shell/TopBar";
import { ChevronLeft, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const LANGS = [
  { c: "en", l: "English", n: "English", f: "🇬🇧" },
  { c: "fr", l: "French", n: "Français", f: "🇫🇷" },
  { c: "pt", l: "Portuguese", n: "Português", f: "🇵🇹" },
  { c: "sw", l: "Swahili", n: "Kiswahili", f: "🇰🇪" },
  { c: "ar", l: "Arabic", n: "العربية", f: "🇪🇬" },
  { c: "yo", l: "Yoruba", n: "Yorùbá", f: "🇳🇬" },
];

const CURRS = [
  { c: "NGN", n: "Nigerian Naira", s: "₦" },
  { c: "USD", n: "US Dollar", s: "$" },
  { c: "EUR", n: "Euro", s: "€" },
  { c: "GBP", n: "British Pound", s: "£" },
  { c: "GHS", n: "Ghana Cedi", s: "₵" },
  { c: "KES", n: "Kenyan Shilling", s: "KSh" },
  { c: "ZAR", n: "South African Rand", s: "R" },
];

const LanguageCurrency = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState("en");
  const [curr, setCurr] = useState("NGN");
  const [tab, setTab] = useState<"lang" | "curr">("lang");

  const save = () => {
    toast.success("Preferences saved");
    navigate("/profile");
  };

  return (
    <>
      <TopBar title="Language & currency" />
      <main className="px-5 pt-4 pb-32">
        <Link to="/profile" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Link>

        <div className="grid grid-cols-2 gap-2 p-1 bg-card rounded-2xl border border-border mb-4">
          {(["lang", "curr"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-2.5 rounded-xl text-xs font-bold ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {t === "lang" ? "🌍 Language" : "💱 Currency"}
            </button>
          ))}
        </div>

        {tab === "lang" && (
          <section className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
            {LANGS.map((l) => (
              <button key={l.c} onClick={() => setLang(l.c)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary">
                <span className="text-xl">{l.f}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{l.l}</div>
                  <div className="text-[11px] text-muted-foreground">{l.n}</div>
                </div>
                {lang === l.c && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </section>
        )}

        {tab === "curr" && (
          <section className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
            {CURRS.map((c) => (
              <button key={c.c} onClick={() => setCurr(c.c)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary">
                <span className="w-8 text-center font-bold text-primary">{c.s}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{c.c}</div>
                  <div className="text-[11px] text-muted-foreground">{c.n}</div>
                </div>
                {curr === c.c && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </section>
        )}

        <p className="text-[11px] text-muted-foreground text-center mt-4">
          Prices and content will display in <span className="text-foreground font-semibold">{LANGS.find(l=>l.c===lang)?.l}</span> · <span className="text-foreground font-semibold">{curr}</span>
        </p>

        <button onClick={save} className="mt-6 w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-bold text-sm shadow-glow">
          Save preferences
        </button>
      </main>
    </>
  );
};

export default LanguageCurrency;
