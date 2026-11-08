import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, CalendarDays, Banknote, ShieldCheck, ArrowRight, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";

type Stat = { label: string; value: string | number; href: string; Icon: any; hint?: string };

const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [pendingListings, totalListings, totalUsers, escrowAgg, pendingPayouts, pendingKyc, needsReply] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("verified", false),
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("bookings").select("total_price").eq("status", "confirmed" as any),
        supabase.from("payouts" as any).select("amount").eq("status", "pending"),
        (supabase.from("kyc_submissions") as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_issues").select("reply_due_at").in("status", ["received", "in_progress"]),
      ]);
      const waiting = needsReply.data || [];
      const overdue = waiting.filter((r) => new Date(r.reply_due_at).getTime() < Date.now()).length;
      const escrowHeld = (escrowAgg.data || []).reduce((s: number, r: any) => s + Number(r.total_price || 0), 0);
      const payoutsDue = ((pendingPayouts.data as any[]) || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      setStats([
        { label: "Problems waiting for a reply", value: waiting.length, href: "/admin/support", Icon: LifeBuoy, hint: overdue ? `${overdue} overdue` : "None overdue" },
        { label: "Pending listings", value: pendingListings.count ?? 0, href: "/admin/listings", Icon: Building2, hint: "Awaiting approval" },
        { label: "Total listings", value: totalListings.count ?? 0, href: "/admin/listings", Icon: Building2 },
        { label: "Users", value: totalUsers.count ?? 0, href: "/admin/users", Icon: Users },
        { label: "Escrow held", value: formatNaira(escrowHeld), href: "/admin/bookings", Icon: CalendarDays, hint: "Confirmed bookings" },
        { label: "Payouts due", value: formatNaira(payoutsDue), href: "/admin/payouts", Icon: Banknote },
        { label: "KYC pending", value: pendingKyc.count ?? 0, href: "/admin/kyc", Icon: ShieldCheck },
      ]);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <Seo title="Admin overview | Stay" description="Operational overview for the Stay admin team." noindex />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold">Overview</h1>
        <p className="text-sm text-muted-foreground">Operational snapshot across the platform.</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.map(({ label, value, href, Icon, hint }) => (
            <Link
              key={label}
              to={href}
              className="group rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="mt-3 text-2xl font-extrabold">{value}</p>
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
