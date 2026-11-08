import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Problems needing a staff reply, and how many of those are late. */
export const useSupportQueueCount = () => {
  const [state, setState] = useState({ waiting: 0, overdue: 0 });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from("support_issues").select("reply_due_at").in("status", ["received", "in_progress"]);
      if (!alive) return;
      const rows = data || [];
      setState({ waiting: rows.length, overdue: rows.filter((r) => new Date(r.reply_due_at).getTime() < Date.now()).length });
    };
    load();
    const t = setInterval(load, 60_000);
    const ch = supabase.channel(`support-count-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_issues" }, load)
      .subscribe();
    return () => { alive = false; clearInterval(t); supabase.removeChannel(ch); };
  }, []);
  return state;
};
