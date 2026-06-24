import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronLeft, ShieldCheck, ShieldOff, Mail, Phone, BadgeCheck, Building2,
  CalendarDays, Banknote, CreditCard, ScrollText, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { logAdminAction } from "@/lib/admin-audit";

type Profile = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_host: boolean;
  email_verified?: boolean | null;
  phone_verified?: boolean | null;
  created_at: string;
};

type Kyc = {
  id: string; id_type: string; id_number: string; id_image_url: string | null;
  status: string; reviewer_notes: string | null; created_at: string; reviewed_at: string | null;
};

type Pm = {
  id: string; brand: string | null; last4: string | null; bank_code: string | null;
  account_number: string | null; holder_name: string | null; is_default: boolean; created_at: string;
};

type Counts = { listings: number; bookings: number; payouts: number; messages: number };

const Section = ({ title, icon: Icon, count, children, defaultOpen = false }: any) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/40"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">{title}</span>
          {typeof count === "number" && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{count}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </div>
  );
};

const AdminUserDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [kyc, setKyc] = useState<Kyc[]>([]);
  const [pms, setPms] = useState<Pm[]>([]);
  const [counts, setCounts] = useState<Counts>({ listings: 0, bookings: 0, payouts: 0, messages: 0 });
  const [audit, setAudit] = useState<any[]>([]);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [p, r, k, pm, l, b, po, m, a] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id),
      supabase.from("kyc_submissions").select("*").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("payment_methods").select("*").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("host_id", id),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("guest_id", id),
      supabase.from("payouts").select("id", { count: "exact", head: true }).eq("host_id", id),
      supabase.from("messages").select("id", { count: "exact", head: true }).or(`sender_id.eq.${id},receiver_id.eq.${id}`),
      supabase.from("admin_audit_log" as any).select("*").eq("entity_id", id).order("created_at", { ascending: false }).limit(50),
    ]);
    setProfile((p.data as any) ?? null);
    setRoles((r.data || []).map((x: any) => x.role));
    setKyc((k.data as any) || []);
    setPms((pm.data as any) || []);
    setCounts({
      listings: l.count ?? 0,
      bookings: b.count ?? 0,
      payouts: po.count ?? 0,
      messages: m.count ?? 0,
    });
    setAudit((a.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const toggleAdmin = async () => {
    if (!id) return;
    const isAdmin = roles.includes("admin");
    if (isAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin" as any);
      if (error) return toast.error(error.message);
      await logAdminAction({ action: "revoke_admin", entityType: "user", entityId: id });
      toast.success("Admin revoked");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: id, role: "admin" as any });
      if (error) return toast.error(error.message);
      await logAdminAction({ action: "grant_admin", entityType: "user", entityId: id });
      toast.success("Admin granted");
    }
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-muted-foreground">User not found.</p>;
  }

  const isAdmin = roles.includes("admin");

  return (
    <>
      <Seo title={`${profile.full_name || "User"} | Stay admin`} description="User profile, KYC, activity and audit." noindex />

      <Link to="/admin/users" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to users
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-5 mb-5 flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center text-lg font-bold">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name || ""} className="w-full h-full object-cover" />
          ) : (
            (profile.full_name || profile.email || "?").slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-extrabold truncate">{profile.full_name || "—"}</h1>
            {(roles.length ? roles : ["client"]).map((role) => (
              <span key={role} className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${role === "admin" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>{role}</span>
            ))}
            {profile.is_host && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-success/15 text-success">Host</span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {profile.email || "—"}{profile.email_verified && <BadgeCheck className="w-3 h-3 text-success" />}</span>
            <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {profile.phone || "—"}{profile.phone_verified && <BadgeCheck className="w-3 h-3 text-success" />}</span>
            <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <button
          onClick={toggleAdmin}
          className={`text-xs font-semibold inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border ${isAdmin ? "border-destructive/40 text-destructive hover:bg-destructive/10" : "border-primary/40 text-primary hover:bg-primary/10"}`}
        >
          {isAdmin ? <><ShieldOff className="w-3.5 h-3.5" /> Revoke admin</> : <><ShieldCheck className="w-3.5 h-3.5" /> Make admin</>}
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Listings", value: counts.listings, Icon: Building2 },
          { label: "Bookings", value: counts.bookings, Icon: CalendarDays },
          { label: "Payouts", value: counts.payouts, Icon: Banknote },
          { label: "Messages", value: counts.messages, Icon: ScrollText },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="w-3.5 h-3.5" />{label}</div>
            <p className="text-xl font-extrabold mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Collapsible "view more" sections */}
      <div className="space-y-3">
        <Section title="Account details" icon={BadgeCheck}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted-foreground">User ID</dt><dd className="font-mono text-xs break-all">{profile.user_id}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Email verified</dt><dd>{profile.email_verified ? "Yes" : "No"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Phone verified</dt><dd>{profile.phone_verified ? "Yes" : "No"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Roles</dt><dd>{(roles.length ? roles : ["client"]).join(", ")}</dd></div>
          </dl>
        </Section>

        <Section title="KYC submissions" icon={ShieldCheck} count={kyc.length}>
          {kyc.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <ul className="space-y-2">
              {kyc.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-3 border border-border rounded-lg p-3">
                  <div>
                    <p className="text-sm font-semibold">{k.id_type} · {k.id_number}</p>
                    <p className="text-xs text-muted-foreground">{new Date(k.created_at).toLocaleString()}</p>
                    {k.reviewer_notes && <p className="text-xs text-muted-foreground mt-1">Notes: {k.reviewer_notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${k.status === "approved" ? "bg-success/15 text-success" : k.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-secondary text-muted-foreground"}`}>{k.status}</span>
                    {k.id_image_url && <a href={k.id_image_url} target="_blank" rel="noreferrer" className="text-xs text-primary font-semibold">View ID</a>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Payout & payment accounts" icon={CreditCard} count={pms.length}>
          {pms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved accounts.</p>
          ) : (
            <ul className="space-y-2">
              {pms.map((p) => (
                <li key={p.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {p.bank_code ? `Bank ${p.bank_code}` : p.brand || "Card"}
                      {p.account_number ? ` · ****${p.account_number.slice(-4)}` : p.last4 ? ` · ****${p.last4}` : ""}
                    </p>
                    {p.is_default && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary">Default</span>}
                  </div>
                  {p.holder_name && <p className="text-xs text-muted-foreground mt-0.5">Holder: {p.holder_name}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">Added {new Date(p.created_at).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Admin audit history" icon={ScrollText} count={audit.length}>
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admin actions recorded for this user.</p>
          ) : (
            <ul className="space-y-1.5">
              {audit.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-xs border-b border-border pb-1.5 last:border-0">
                  <span className="font-semibold">{a.action}</span>
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
};

export default AdminUserDetail;
