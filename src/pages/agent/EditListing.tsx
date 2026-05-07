import { TopBar } from "@/components/shell/TopBar";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useListing } from "@/hooks/useListings";
import { ChevronLeft, Eye, EyeOff, Trash2, ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const EditListing = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: p, loading } = useListing(id);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [beds, setBeds] = useState(0);
  const [baths, setBaths] = useState(0);
  const [area, setArea] = useState("");
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (!p) return;
    setTitle(p.title);
    setPrice(p.priceNum.toString());
    setDesc(p.desc);
    setBeds(p.beds);
    setBaths(p.baths);
    setArea(p.area);
  }, [p]);

  if (loading) return <main className="p-8 text-center"><div className="w-8 h-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" /></main>;
  if (!p) return <main className="p-8">Listing not found</main>;

  const save = async () => {
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
      })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Listing updated");
    nav("/listings");
  };

  const remove = async () => {
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

        {/* Status */}
        <section className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${live ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
            {live ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold">{live ? "Live" : "Hidden"}</div>
            <div className="text-[11px] text-muted-foreground">{live ? "Visible to clients" : "Only you can see this"}</div>
          </div>
          <button onClick={() => setLive((v) => !v)}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary text-primary-foreground">
            {live ? "Unpublish" : "Publish"}
          </button>
        </section>

        {/* Photos */}
        <section className="rounded-2xl bg-card border border-border p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Photos</h3>
            <button className="text-[11px] text-primary font-semibold">Reorder</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <img src={p.image} alt="" className="aspect-square w-full rounded-lg object-cover ring-2 ring-primary" />
            {[1, 2, 3].map((i) => (
              <img key={i} src={p.image} alt="" className="aspect-square w-full rounded-lg object-cover opacity-80" />
            ))}
            <button className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground">
              <ImagePlus className="w-5 h-5" />
              <span className="text-[10px] mt-1">Add</span>
            </button>
          </div>
        </section>

        {/* Form */}
        <section className="space-y-4">
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Price (₦)</span>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm font-bold" />
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
            <textarea rows={5} value={desc} onChange={(e) => setDesc(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm resize-none" />
          </label>
        </section>

        <button onClick={save} className="mt-6 w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-bold text-sm shadow-glow">
          Save changes
        </button>
        <button onClick={remove}
          className="mt-3 w-full rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive py-3 font-bold text-sm flex items-center justify-center gap-2">
          <Trash2 className="w-4 h-4" /> Delete listing
        </button>
      </main>
    </>
  );
};

export default EditListing;
