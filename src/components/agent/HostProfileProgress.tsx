import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, UserCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Step = { key: string; label: string; done: boolean; to: string };

export const HostProfileProgress = () => {
  const { user, profile } = useAuth();
  const [hasPayout, setHasPayout] = useState<boolean | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: pm }, { data: prof }] = await Promise.all([
        supabase.from("payment_methods").select("id").eq("user_id", user.id).limit(1),
        supabase.from("profiles").select("whatsapp").eq("user_id", user.id).maybeSingle() as any,
      ]);
      setHasPayout((pm?.length ?? 0) > 0);
      setWhatsapp((prof as any)?.whatsapp ?? null);
    })();
  }, [user, profile?.avatar_url, profile?.full_name]);

  const steps: Step[] = [
    { key: "name", label: "Add your full name", done: !!profile?.full_name?.trim(), to: "/profile/edit" },
    { key: "avatar", label: "Upload a profile photo", done: !!profile?.avatar_url, to: "/profile/edit" },
    {
      key: "whatsapp",
      label: "Add WhatsApp number (required)",
      done: !!(whatsapp && whatsapp.trim()),
      to: "/profile/edit",
    },
    { key: "payout", label: "Add payout bank account", done: !!hasPayout, to: "/profile/payout" },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  if (pct === 100) return null;

  const next = steps.find((s) => !s.done);

  return (
    <section className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
          <UserCircle2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-sm">Complete your host profile</h3>
            <span className="text-xs font-extrabold text-primary">{pct}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            A complete profile builds trust and helps support reach you.
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-xs">
            {s.done ? (
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <span className={s.done ? "text-muted-foreground line-through" : "font-semibold"}>
              {s.label}
            </span>
          </li>
        ))}
      </ul>

      {next && (
        <Link
          to={next.to}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-extrabold"
        >
          {next.label} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </section>
  );
};
