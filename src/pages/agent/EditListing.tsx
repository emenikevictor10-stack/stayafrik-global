import { TopBar } from "@/components/shell/TopBar";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useListing } from "@/hooks/useListings";
import { ChevronLeft, Eye, EyeOff, Trash2, ImagePlus, X, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const EditListing = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: p, loading } = useListing(id);
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [beds, setBeds] = useState(0);
  const [baths, setBaths] = useState(0);
  const [area, setArea] = useState("");
  const [live, setLive] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!p) return;
    setTitle(p.title);
    setPrice(p.priceNum.toString());
    setDesc(p.desc);
    setBeds(p.beds);
    setBaths(p.baths);
    setArea(p.area);
    // load images from db
    (async () => {
      const { data } = await supabase.from("listings").select("images, is_available").eq("id", p.id).maybeSingle();
      if (data) {
        setImages((data.images as string[]) || []);
        setLive(data.is_available);
      }
    })();
  }, [p]);

  if (loading) return <main className="p-8 text-center"><div className="w-8 h-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" /></main>;
  if (!p) return <main className="p-8">Listing not found</main>;

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    const paths: string[] = [];
    try {
      const uploaded: string[] = [];
      for (const raw of Array.from(files)) {
        const looksImage = raw.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i.test(raw.name);
        if (!looksImage) throw new Error("Image files only");
        const file = await toWebp(raw);
        const { ext, contentType } = inferUpload(file);
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("listing-images").upload(path, file, { upsert: false, contentType, cacheControl: "3600" });
        if (error) throw error;
        paths.push(path);
        const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      setImages((p) => [...p, ...uploaded]);
      if (fileInput.current) fileInput.current.value = "";
      toast.success(uploaded.length === 1 ? "Photo uploaded" : `${uploaded.length} photos uploaded`);
    } catch (e: any) {
      if (paths.length) {
        try { await supabase.storage.from("listing-images").remove(paths); } catch {}
      }
      if (fileInput.current) fileInput.current.value = "";
      toast.error((e?.message || "Upload failed") + " — none of the photos in that batch were kept, please try again");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) => setImages((p) => p.filter((x) => x !== url));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("listings")
      .update({
        title,
        price_per_night: Number(price) || 0,
        description: desc,
        bedrooms: beds,
        bathrooms: baths,
        area,
        is_available: live,
        images,
      })
      .eq("id", p.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Listing updated");
    nav("/listings");
  };

  const remove = async () => {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    const { error } = await supabase.from("listings").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Listing deleted");
    nav("/listings");
  };

  return (
    <>
      <TopBar title="Edit listing" subtitle={p.title} />
      <main className="px-5 pt-4 pb-32">
        <Link to="/listings" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to listings
        </Link>

        <section className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${live ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
            {live ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold">{live ? "Live" : "Hidden"}</div>
            <div className="text-[11px] text-muted-foreground">{live ? "Visible to guests" : "Only you can see this"}</div>
          </div>
          <button onClick={() => setLive((v) => !v)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary text-primary-foreground">
            {live ? "Unpublish" : "Publish"}
          </button>
        </section>

        <section className="rounded-2xl bg-card border border-border p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Photos ({images.length})</h3>
          </div>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
          <div className="grid grid-cols-3 gap-2">
            {images.map((url, i) => (
              <div key={url} className={`relative aspect-square rounded-lg overflow-hidden ${i === 0 ? "ring-2 ring-primary" : ""}`}>
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeImage(url)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button onClick={() => fileInput.current?.click()} disabled={uploading}
              className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground disabled:opacity-50">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
              <span className="text-[10px] mt-1">{uploading ? "Uploading…" : "Add"}</span>
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Price per night (₦)</span>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm font-bold" />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block"><span className="text-[10px] text-muted-foreground uppercase">Beds</span>
              <input type="number" value={beds} onChange={(e) => setBeds(Number(e.target.value))} className="mt-1 w-full rounded-xl bg-card border border-border px-3 py-2 text-sm text-center" /></label>
            <label className="block"><span className="text-[10px] text-muted-foreground uppercase">Baths</span>
              <input type="number" value={baths} onChange={(e) => setBaths(Number(e.target.value))} className="mt-1 w-full rounded-xl bg-card border border-border px-3 py-2 text-sm text-center" /></label>
            <label className="block"><span className="text-[10px] text-muted-foreground uppercase">Area</span>
              <input value={area} onChange={(e) => setArea(e.target.value)} className="mt-1 w-full rounded-xl bg-card border border-border px-3 py-2 text-sm text-center" /></label>
          </div>
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Description</span>
            <textarea rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm resize-none" />
          </label>
        </section>

        <button onClick={save} disabled={saving} className="mt-6 w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-bold text-sm shadow-glow disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button onClick={remove} className="mt-3 w-full rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive py-3 font-bold text-sm flex items-center justify-center gap-2">
          <Trash2 className="w-4 h-4" /> Delete listing
        </button>
      </main>
    </>
  );
};

export default EditListing;
