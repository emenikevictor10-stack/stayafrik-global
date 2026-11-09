import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TopBar } from "@/components/shell/TopBar";
import { useWishlist } from "@/hooks/useWishlist";
import { useCompare } from "@/hooks/useCompare";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { StayById } from "@/components/property/StayById";
import { EmptyState, Button } from "@/ui/kit";
import { Seo } from "@/components/seo/Seo";
import { Share2, Plus, GitCompare, Pencil, Trash2, LogOut, Users } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { compareLink } from "@/lib/compare";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type List = { id: string; user_id: string; name: string; is_default: boolean; share_token: string | null; items: string[]; members: string[] };

const token = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

const Saved = () => {
  const { ids } = useWishlist();
  const { user } = useAuth();
  const compare = useCompare();
  const [lists, setLists] = useState<List[]>([]);
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const active = routeId || "saved";
  const setActive = (id: string) => navigate(id === "saved" ? "/saved" : `/saved/${id}`);
  const [confirm, setConfirm] = useState<null | "delete" | "leave">(null);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    if (!user) return setLists([]);
    const { data } = await supabase.from("wishlists").select("id,user_id,name,is_default,share_token,wishlist_items(listing_ref),wishlist_members(user_id)").order("created_at");
    setLists(((data as unknown as (Omit<List, "items" | "members"> & { wishlist_items: { listing_ref: string }[]; wishlist_members: { user_id: string }[] })[]) || [])
      .map((l) => ({ ...l, items: l.wishlist_items.map((i) => i.listing_ref), members: (l.wishlist_members || []).map((m) => m.user_id) })));
  }, [user]);
  useEffect(() => { void load(); }, [load, ids.length]);

  const named = lists.filter((l) => !(l.is_default && l.user_id === user?.id));
  const owns = (l: List | null) => !!l && l.user_id === user?.id;
  const current = active === "saved" ? null : named.find((l) => l.id === active) || null;
  const shown = current ? current.items : [...ids].reverse();

  const createList = async () => {
    if (!user || !newName.trim()) return;
    const { error } = await supabase.from("wishlists").insert({ user_id: user.id, name: newName.trim().slice(0, 60) });
    if (error) return toast.error("Couldn't create the list");
    setNewName(""); void load();
  };
  const share = async () => {
    const def = lists.find((l) => (current ? l.id === current.id : l.is_default && l.user_id === user?.id));
    if (!def) return toast.message("Sign in to share your lists");
    let t = def.share_token;
    if (!t) { if (!owns(def)) return toast.message("Only the owner can share this list"); t = token(); await supabase.from("wishlists").update({ share_token: t }).eq("id", def.id); void load(); }
    const url = `${window.location.origin}/w/${t}`;
    try { if (navigator.share) await navigator.share({ title: `${def.name} · Stay`, url }); else { await navigator.clipboard.writeText(url); toast.success("Share link copied"); } } catch { /* cancelled */ }
  };
  const rename = async () => {
    if (!current) return;
    const name = window.prompt("Rename list", current.name)?.trim().slice(0, 60);
    if (!name || name === current.name) return;
    const { error } = await supabase.from("wishlists").update({ name }).eq("id", current.id);
    if (error) return toast.error("Couldn't rename the list");
    toast.success("List renamed"); void load();
  };
  const removeList = async () => {
    if (!current) return;
    const { error } = confirm === "leave"
      ? await supabase.from("wishlist_members").delete().eq("wishlist_id", current.id).eq("user_id", user!.id)
      : await supabase.from("wishlists").delete().eq("id", current.id);
    setConfirm(null);
    if (error) return toast.error("Something went wrong. Try again.");
    toast.success(confirm === "leave" ? "You left the list" : "List deleted"); setActive("saved"); void load();
  };
  const removeMember = async (uid: string) => {
    if (!current) return;
    await supabase.from("wishlist_members").delete().eq("wishlist_id", current.id).eq("user_id", uid);
    toast.success("Member removed"); void load();
  };
  const addTo = async (listId: string, ref: string) => {
    await supabase.from("wishlist_items").upsert({ wishlist_id: listId, listing_ref: ref }, { onConflict: "wishlist_id,listing_ref", ignoreDuplicates: true });
    toast.success("Added to list"); void load();
  };

  return (
    <>
      <Seo title="Saved stays · Stay" description="Stays you saved on Stay." />
      <TopBar title="Saved" />
      <main className="px-4 md:px-0 py-5">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <h1 className="hidden xl:block text-2xl font-semibold mr-auto">Saved</h1>
          {compare.ids.length >= 2 && <Link to={compareLink(compare.ids)} className="min-h-11 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-border text-[13px] font-semibold"><GitCompare className="w-4 h-4" /> Compare {compare.ids.length}</Link>}
          {user && <button type="button" onClick={share} className="min-h-11 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-border text-[13px] font-semibold"><Share2 className="w-4 h-4" /> Share list</button>}
        </div>

        {user && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
            {[{ id: "saved", name: "All saved" }, ...named].map((l) => (
              <button key={l.id} type="button" onClick={() => setActive(l.id)} aria-pressed={active === l.id}
                className={cn("shrink-0 min-h-11 px-3.5 rounded-lg border text-[13px] font-medium", active === l.id ? "border-foreground bg-surface" : "border-border")}>{l.name}</button>
            ))}
            <form onSubmit={(e) => { e.preventDefault(); void createList(); }} className="shrink-0 flex gap-1">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New list" aria-label="New list name" maxLength={60}
                className="h-11 w-32 rounded-lg border border-border bg-background px-3 text-[13px]" />
              <button type="submit" aria-label="Create list" className="w-11 h-11 rounded-lg border border-border flex items-center justify-center"><Plus className="w-4 h-4" /></button>
            </form>
          </div>
        )}
        {current && (
          <div className="flex items-center gap-2 flex-wrap mb-4 text-[13px]">
            {owns(current) ? <>
              <button type="button" onClick={rename} className="min-h-11 px-3 inline-flex items-center gap-1.5 rounded-lg border border-border font-semibold"><Pencil className="w-4 h-4" />Rename</button>
              <button type="button" onClick={() => setConfirm("delete")} className="min-h-11 px-3 inline-flex items-center gap-1.5 rounded-lg border border-border font-semibold text-destructive"><Trash2 className="w-4 h-4" />Delete list</button>
              {current.members.length > 0 && <span className="inline-flex items-center gap-1 text-muted-foreground"><Users className="w-4 h-4" />{current.members.length} joined</span>}
              {current.members.map((m, i) => <button key={m} type="button" onClick={() => void removeMember(m)} className="min-h-11 px-3 rounded-lg border border-border">Remove member {i + 1}</button>)}
            </> : <button type="button" onClick={() => setConfirm("leave")} className="min-h-11 px-3 inline-flex items-center gap-1.5 rounded-lg border border-border font-semibold"><LogOut className="w-4 h-4" />Leave list</button>}
          </div>
        )}
        <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm === "leave" ? "Leave this list?" : "Delete this list?"}</AlertDialogTitle>
              <AlertDialogDescription>{confirm === "leave" ? "You'll stop seeing it. You can join again with the link." : "The list and its share link will be removed. Your hearted stays stay saved."}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep</AlertDialogCancel>
              <AlertDialogAction onClick={() => void removeList()}>{confirm === "leave" ? "Leave" : "Delete"}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {!user && ids.length > 0 && <p className="text-[13px] text-muted-foreground mb-4">Saved on this device. Sign in when you book and they'll follow you to any device.</p>}

        {shown.length === 0 ? (
          <EmptyState title={current ? "This list is empty" : "Nothing saved yet"} body="Tap the heart on any stay to keep it here."
            action={<Link to="/" className="h-11 px-4 inline-flex items-center rounded-lg bg-primary text-primary-foreground text-base font-semibold">Find stays</Link>} />
        ) : (
          <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {shown.map((id) => (
              <div key={id}>
                <StayById id={id} />
                {user && !current && named.length > 0 && (
                  <select aria-label="Add to list" defaultValue="" onChange={(e) => { if (e.target.value) void addTo(e.target.value, id); e.target.value = ""; }}
                    className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-2 text-[13px]">
                    <option value="">Add to a list…</option>
                    {named.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                )}
                {current && <Button variant="text" className="mt-1" onClick={async () => { await supabase.from("wishlist_items").delete().eq("wishlist_id", current.id).eq("listing_ref", id); void load(); }}>Remove from list</Button>}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
};

export default Saved;
