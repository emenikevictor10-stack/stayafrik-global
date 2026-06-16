import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CheckCircle2, ShieldX, Loader2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Seo } from "@/components/seo/Seo";

type ListingRow = {
  id: string;
  title: string;
  city: string | null;
  address: string | null;
  price_per_night: number;
  images: string[];
  video_url: string | null;
  bedrooms: number;
  bathrooms: number;
  verified: boolean;
  is_available: boolean;
  created_at: string;
  host_id: string;
};

const AdminListings = () => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin" as any)
        .maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [user]);

  const load = async () => {
    setBusy(true);
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("verified", false)
      .order("created_at", { ascending: false });
    setRows((data as ListingRow[]) || []);
    setBusy(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const approve = async (id: string) => {
    const { error } = await supabase
      .from("listings")
      .update({ verified: true, is_available: true })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Listing approved and live");
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const reject = async (id: string) => {
    if (!confirm("Reject and delete this listing?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Listing removed");
    setRows((r) => r.filter((x) => x.id !== id));
  };

  if (loading || isAdmin === null) {
    return <main className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></main>;
  }
  if (!user) return <Navigate to="/auth?mode=signin" replace />;
  if (!isAdmin) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <ShieldX className="w-12 h-12 text-destructive mb-3" />
        <h1 className="text-xl font-extrabold">Admin only</h1>
        <p className="text-sm text-muted-foreground mt-2">You need the admin role to view this page.</p>
        <Link to="/" className="mt-6 text-primary text-sm font-bold">← Back home</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-12">
      <Seo title="Admin · listing approvals" description="Approve or reject host listings before they go live." noindex />
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border px-5 py-3 flex items-center gap-3">
        <Link to="/" className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-base font-extrabold">Listing approvals</h1>
          <p className="text-[11px] text-muted-foreground">{rows.length} pending review</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 pt-5 space-y-3">
        {busy && <div className="text-center py-8 text-sm text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}
        {!busy && rows.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" /> All caught up.
          </div>
        )}
        {rows.map((r) => (
          <article key={r.id} className="rounded-2xl border border-border bg-card overflow-hidden">
            {r.images?.[0] && <img src={r.images[0]} alt={r.title} className="w-full h-44 object-cover" />}
            <div className="p-4 space-y-2">
              <h2 className="text-base font-bold">{r.title}</h2>
              <p className="text-xs text-muted-foreground">{r.address || r.city || "—"}</p>
              <p className="text-xs">₦{Number(r.price_per_night).toLocaleString()} / night · {r.bedrooms} bed · {r.bathrooms} bath</p>
              <p className="text-[11px] text-muted-foreground">{r.images?.length || 0} photos · {r.video_url ? "video included" : "no video"}</p>
              {r.video_url && (
                <video src={r.video_url} controls className="w-full rounded-xl bg-black aspect-video" />
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => reject(r.id)} className="flex-1 rounded-xl border border-destructive/40 text-destructive py-2 text-xs font-bold">Reject</button>
                <button onClick={() => approve(r.id)} className="flex-1 rounded-xl bg-success text-white py-2 text-xs font-bold">Approve & publish</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
};

export default AdminListings;
