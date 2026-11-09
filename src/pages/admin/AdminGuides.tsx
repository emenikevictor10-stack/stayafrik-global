import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button, ErrorState, ListSkeleton, Tag } from "@/ui/kit";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { logAdminAction } from "@/lib/admin-audit";

type G = { id?: string; slug: string; title: string; summary: string; body: string[]; published: boolean; sort: number };
const blank: G = { slug: "", title: "", summary: "", body: [], published: false, sort: 0 };
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const AdminGuides = () => {
  const qc = useQueryClient();
  const [rows, setRows] = useState<G[] | null>(null);
  const [err, setErr] = useState(false);
  const [edit, setEdit] = useState<G | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setErr(false);
    const { data, error } = await supabase.from("help_guides").select("id,slug,title,summary,body,published,sort").order("sort").order("created_at");
    if (error) return setErr(true);
    setRows(data as G[]);
  };
  useEffect(() => { load(); }, []);

  const open = (g: G) => { setEdit(g); setText(g.body.join("\n\n")); };

  const save = async () => {
    if (!edit) return;
    const slug = slugify(edit.slug || edit.title);
    if (!edit.title.trim() || !slug) return toast.error("Add a title");
    const row = { slug, title: edit.title.trim(), summary: edit.summary.trim(), published: edit.published, sort: edit.sort,
      body: text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean), updated_at: new Date().toISOString() };
    setSaving(true);
    const { error } = edit.id
      ? await supabase.from("help_guides").update(row).eq("id", edit.id)
      : await supabase.from("help_guides").insert(row);
    setSaving(false);
    if (error) return toast.error(error.message.includes("duplicate") ? "Another guide already uses this link" : "Could not save guide");
    await logAdminAction({ action: edit.id ? "guide_updated" : "guide_created", entityType: "guide", entityId: slug, metadata: { published: row.published } });
    toast.success("Guide saved");
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["help_guides"] });
    load();
  };

  const remove = async (g: G) => {
    if (!g.id || !confirm(`Delete "${g.title}"? This can't be undone.`)) return;
    const { error } = await supabase.from("help_guides").delete().eq("id", g.id);
    if (error) return toast.error("Could not delete guide");
    await logAdminAction({ action: "guide_deleted", entityType: "guide", entityId: g.slug });
    qc.invalidateQueries({ queryKey: ["help_guides"] });
    load();
  };

  if (err) return <ErrorState message="Guides didn't load." onRetry={load} />;
  if (!rows) return <ListSkeleton rows={3} />;

  return (
    <div className="max-w-[760px] space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Guides</h1>
          <p className="text-[13px] text-muted-foreground">Help articles shown at /guides. Only published guides are visible to guests.</p>
        </div>
        {!edit && <Button onClick={() => open({ ...blank, sort: rows.length })}>New guide</Button>}
      </header>

      {edit ? (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div><label htmlFor="g-title" className="block text-[13px] font-semibold mb-1">Title</label>
            <Input id="g-title" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value, slug: edit.id ? edit.slug : slugify(e.target.value) })} /></div>
          <div><label htmlFor="g-slug" className="block text-[13px] font-semibold mb-1">Link</label>
            <div className="flex items-center gap-1 text-[13px] text-muted-foreground">/guides/<Input id="g-slug" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></div></div>
          <div><label htmlFor="g-sum" className="block text-[13px] font-semibold mb-1">Summary</label>
            <Input id="g-sum" value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} /></div>
          <div><label htmlFor="g-body" className="block text-[13px] font-semibold mb-1">Text</label>
            <Textarea id="g-body" rows={10} value={text} onChange={(e) => setText(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Leave an empty line between paragraphs.</p></div>
          <div className="flex items-center justify-between"><label htmlFor="g-pub" className="text-[15px]">Published</label>
            <Switch id="g-pub" checked={edit.published} onCheckedChange={(v) => setEdit({ ...edit, published: v })} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
            <Button loading={saving} onClick={save}>Save guide</Button>
          </div>
        </section>
      ) : (
        <ul className="rounded-xl border border-border bg-card divide-y divide-border">
          {rows.length === 0 && <li className="p-4 text-sm text-muted-foreground">No guides yet.</li>}
          {rows.map((g) => (
            <li key={g.id} className="p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><p className="text-[15px] font-semibold">{g.title}</p>
                  <Tag tone={g.published ? "done" : "fact"}>{g.published ? "Published" : "Draft"}</Tag></div>
                <p className="text-[13px] text-muted-foreground mt-1">{g.summary}</p>
              </div>
              <button onClick={() => open(g)} className="text-xs font-semibold underline">Edit</button>
              <button onClick={() => remove(g)} className="text-xs font-semibold underline text-destructive">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminGuides;
