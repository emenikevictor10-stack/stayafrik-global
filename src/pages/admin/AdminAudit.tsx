import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";

type Row = {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: any;
  created_at: string;
};

const AdminAudit = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_audit_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows(((data as any) || []) as Row[]);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <Seo title="Audit log | Stay admin" description="History of admin actions." noindex />
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold">Audit log</h1>
        <p className="text-sm text-muted-foreground">Every admin action, immutable history.</p>
      </header>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5">When</th>
              <th className="text-left px-4 py-2.5">Actor</th>
              <th className="text-left px-4 py-2.5">Action</th>
              <th className="text-left px-4 py-2.5">Entity</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No actions yet</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{r.actor_id.slice(0, 8)}…</td>
                <td className="px-4 py-2.5 font-semibold">{r.action}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.entity_type ? `${r.entity_type}/${r.entity_id?.slice(0, 8)}…` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AdminAudit;
