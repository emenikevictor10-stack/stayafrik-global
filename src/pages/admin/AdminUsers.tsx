import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ShieldCheck, ShieldOff, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { logAdminAction } from "@/lib/admin-audit";

type Row = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_host: boolean;
  created_at: string;
  roles: string[];
};

const AdminUsers = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone, is_host, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    const ids = (profs || []).map((p) => p.user_id);
    const { data: roles } = ids.length
      ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] as any[] };
    const byUser = new Map<string, string[]>();
    (roles || []).forEach((r: any) => {
      byUser.set(r.user_id, [...(byUser.get(r.user_id) || []), r.role]);
    });
    setRows((profs || []).map((p) => ({ ...p, roles: byUser.get(p.user_id) || [] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const [pendingId, setPendingId] = useState<string | null>(null);

  const toggleAdmin = async (row: Row) => {
    const isAdmin = row.roles.includes("admin");
    const action = isAdmin ? "revoke" : "grant";
    if (!confirm(`${isAdmin ? "Revoke admin from" : "Grant admin to"} ${row.full_name || row.email}?`)) return;
    setPendingId(row.user_id);
    const { data, error } = await supabase.functions.invoke("admin-set-role", {
      body: { user_id: row.user_id, role: "admin", action },
    });
    setPendingId(null);
    if (error || (data as any)?.error) {
      return toast.error((data as any)?.error || error?.message || "Failed");
    }
    toast.success(isAdmin ? "Admin revoked" : "Admin granted");
    load();
  };

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.full_name || "").toLowerCase().includes(s) || (r.email || "").toLowerCase().includes(s);
  });

  return (
    <>
      <Seo title="Users | Stay admin" description="Manage users and roles." noindex />
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Users</h1>
          <p className="text-sm text-muted-foreground">{rows.length} accounts</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email"
            className="pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm w-64"
          />
        </div>
      </header>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Email</th>
              <th className="text-left px-4 py-2.5">Roles</th>
              <th className="text-left px-4 py-2.5">Joined</th>
              <th className="text-right px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No users</td></tr>
            ) : filtered.map((r) => {
              const isAdmin = r.roles.includes("admin");
              return (
                <tr key={r.user_id} className="border-t border-border">
                  <td className="px-4 py-2.5 font-semibold">{r.full_name || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {(r.roles.length ? r.roles : ["client"]).map((role) => (
                        <span key={role} className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${role === "admin" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>{role}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => toggleAdmin(r)}
                        disabled={pendingId === r.user_id}
                        className={`text-xs font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border disabled:opacity-50 ${isAdmin ? "border-destructive/40 text-destructive hover:bg-destructive/10" : "border-primary/40 text-primary hover:bg-primary/10"}`}
                      >
                        {pendingId === r.user_id ? "Working…" : isAdmin ? <><ShieldOff className="w-3.5 h-3.5" /> Revoke admin</> : <><ShieldCheck className="w-3.5 h-3.5" /> Make admin</>}
                      </button>
                      <Link
                        to={`/admin/users/${r.user_id}`}
                        className="text-xs font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-foreground hover:bg-secondary"
                      >
                        View more <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AdminUsers;
