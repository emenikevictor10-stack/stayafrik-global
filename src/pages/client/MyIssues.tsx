import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { categoryLabel, guestStatusText, type IssueStatus } from "@/lib/support";
import { StatusDot } from "@/components/support/SupportBits";

const MyIssues = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("support_issues").select("id,ref,category,status,urgent,created_at,bookings(partner_title,listings(title))")
      .eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, [user?.id]);

  return (
    <>
      <TopBar title="Your problems" />
      <main className="px-4 pt-4 pb-10 max-w-xl mx-auto space-y-2">
        {!rows ? <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-[15px] font-semibold">No problems reported</p>
            <p className="text-[13px] text-muted-foreground mt-1">If something goes wrong during a stay, open the trip and tap "Report a problem".</p>
            <Link to="/bookings" className="inline-block mt-3 text-[15px] font-semibold text-primary">Go to trips</Link>
          </div>
        ) : rows.map((r) => (
          <Link key={r.id} to={`/issues/${r.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold truncate">{categoryLabel(r.category)} · {r.bookings?.listings?.title || r.bookings?.partner_title || "Stay"}</p>
              <p className="text-[12px] text-muted-foreground">{r.ref} · {new Date(r.created_at).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}</p>
              <StatusDot className="mt-1" tone={r.status === "asked_fixed" ? "act" : r.status === "closed" ? "done" : "fact"}>{guestStatusText[r.status as IssueStatus]}</StatusDot>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </main>
    </>
  );
};

export default MyIssues;
