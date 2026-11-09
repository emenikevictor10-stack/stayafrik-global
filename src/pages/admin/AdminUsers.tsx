import { Tag } from "@/ui/kit";
import { ErrorState } from "@/ui/kit";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronRight, Mail, Phone, MessageCircle, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { Input } from "@/components/ui/input";

type Row = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  is_host: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  roles: string[];
  listings: number;
  bookings: number;
};

const FILTERS = ["all", "guests", "hosts"] as const;
const TEAM = ["admin", "support", "finance", "listings"];

const AdminUsers = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: profs, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone, whatsapp, avatar_url, is_host, email_verified, phone_verified, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    setLoadError(!!error);
    if (error) toast.error(error.message);
    const ids = (profs || []).map((p) => p.user_id);
    const [{ data: roles }, { data: lst }, { data: bks }] = ids.length
      ? await Promise.all([
          supabase.from("user_roles").select("user_id, role").in("user_id", ids),
          supabase.from("listings").select("host_id").in("host_id", ids),
          supabase.from("bookings").select("guest_id").in("guest_id", ids),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }] as any;
    const count = (arr: any[] | null, key: string) => {
      const m = new Map<string, number>();
      (arr || []).forEach((r) => m.set(r[key], (m.get(r[key]) || 0) + 1));
      return m;
    };
    const byRole = new Map<string, string[]>();
    (roles || []).forEach((r: any) => byRole.set(r.user_id, [...(byRole.get(r.user_id) || []), r.role]));
    const lc = count(lst, "host_id"), bc = count(bks, "guest_id");
    // Team members live on the Team page, not here.
    setRows((profs || []).map((p: any) => ({
      ...p, roles: byRole.get(p.user_id) || [], listings: lc.get(p.user_id) || 0, bookings: bc.get(p.user_id) || 0,
    })).filter((r: Row) => !r.roles.some((x) => TEAM.includes(x))));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const isHost = (r: Row) => r.is_host || r.roles.includes("agent");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = s.replace(/\D/g, "");
    return rows.filter((r) => {
      if (filter === "hosts" && !isHost(r)) return false;
      if (filter === "guests" && isHost(r)) return false;
      if (!s) return true;
      return [r.full_name, r.email, r.user_id, ...r.roles].some((v) => (v || "").toLowerCase().includes(s))
        || (digits.length >= 3 && [r.phone, r.whatsapp].some((v) => (v || "").replace(/\D/g, "").includes(digits)));
    });
  }, [rows, q, filter]);

  const counts = {
    all: rows.length,
    guests: rows.filter((r) => !isHost(r)).length,
    hosts: rows.filter(isHost).length,
  };

  return (
    <>
      <Seo title="Users | Stay admin" description="People who signed up to Stay." noindex />
      <header className="mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Users</h1>
          <p className="text-sm text-muted-foreground">{rows.length} accounts</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone or user ID" className="pl-9" />
        </div>
      </header>

      <div className="flex gap-1 flex-wrap mb-4">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {f} · {counts[f]}
          </button>
        ))}
      </div>

      {loadError ? <ErrorState message="This list didn't load." onRetry={() => load()} /> : loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No users match.</div>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => {
            const host = isHost(r);
            const hostIncomplete = host && (!r.whatsapp || !r.phone);
            return (
              <div key={r.user_id} className="rounded-xl border border-border bg-card p-3 md:px-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {r.avatar_url
                    ? <img src={r.avatar_url} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} className="w-10 h-10 rounded-full object-cover shrink-0 bg-secondary" />
                    : <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm shrink-0">{(r.full_name || r.email || "?")[0]?.toUpperCase()}</div>}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold truncate">{r.full_name || "—"}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${host ? "bg-accent/20 text-foreground" : "bg-secondary text-muted-foreground"}`}>{host ? "Host" : "Guest"}</span>
                      {hostIncomplete && <Tag tone="act">Profile incomplete</Tag>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                      {r.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{r.email}{r.email_verified && <BadgeCheck className="w-3 h-3 text-primary" />}</span>}
                      {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}{r.phone_verified && <BadgeCheck className="w-3 h-3 text-primary" />}</span>}
                      {r.whatsapp && <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{r.whatsapp}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(r.created_at).toLocaleDateString()} · {r.bookings} booking{r.bookings === 1 ? "" : "s"}{host ? ` · ${r.listings} listing${r.listings === 1 ? "" : "s"}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 md:justify-end">
                  <Link to={`/admin/users/${r.user_id}`} className="text-xs font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border hover:bg-secondary">
                    View more <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default AdminUsers;
