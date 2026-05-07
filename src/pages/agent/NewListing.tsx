import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check, ImagePlus, Home, MapPin, DollarSign, FileText, Sparkles, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LocationPicker } from "@/components/map/PropertyMap";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TYPES = [
  { e: "🏖️", l: "Shortlet", d: "Nightly stays" },
  { e: "🏡", l: "Home for sale", d: "House or apartment" },
  { e: "🌱", l: "Land", d: "Plot or estate" },
  { e: "🏢", l: "Commercial", d: "Office, retail, mixed" },
];

const AMENITIES = ["Wi-Fi", "AC", "Generator", "Pool", "Gym", "Parking", "Security", "Kitchen", "Hot water", "Pet-friendly"];

const NewListing = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [beds, setBeds] = useState(2);
  const [baths, setBaths] = useState(2);
  const [area, setArea] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [amen, setAmen] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 6.5244, lng: 3.3792 });

  const TOTAL = 7;
  const next = () => setStep((s) => Math.min(TOTAL, s + 1));
  const back = () => (step === 1 ? nav(-1) : setStep((s) => s - 1));

  const toggleAmen = (a: string) =>
    setAmen((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("listing-images").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      setPhotos((p) => [...p, ...uploaded]);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (url: string) => setPhotos((p) => p.filter((x) => x !== url));

  const publish = async () => {
    if (!user) return toast.error("Please sign in");
    setPublishing(true);
    try {
      const dbType =
        type === "Home for sale" ? "For Sale" : type === "Shortlet" ? "Shortlet" : type;
      const { error } = await supabase.from("listings").insert({
        host_id: user.id,
        title: title || "Untitled listing",
        description: desc,
        type: dbType,
        price_per_night: Number(price) || 0,
        location: [address, city].filter(Boolean).join(", "),
        address,
        city,
        images: photos,
        bedrooms: beds,
        bathrooms: baths,
        area,
        amenities: amen,
        lat: coords.lat,
        lng: coords.lng,
      });
      if (error) throw error;
      toast.success("🎉 Listing submitted for verification");
      nav("/listings");
    } catch (err: any) {
      toast.error(err.message || "Could not publish");
    } finally {
      setPublishing(false);
    }
  };

  const stepTitle = [
    "What are you listing?",
    "Where is it located?",
    "Property details",
    "Add photos",
    "What's included?",
    "Set your price",
    "Review & publish",
  ][step - 1];

  return (
    <main className="pb-32 min-h-screen">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-5 py-3 flex items-center gap-3">
          <button onClick={back} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="text-[11px] text-muted-foreground">Step {step} of {TOTAL}</div>
            <div className="text-sm font-bold">{stepTitle}</div>
          </div>
        </div>
        <div className="h-1 bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>
      </header>

      <div className="px-5 pt-6">
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            {TYPES.map((t) => (
              <button key={t.l} onClick={() => setType(t.l)}
                className={`rounded-2xl border p-4 text-left ${type === t.l ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                <div className="text-3xl">{t.e}</div>
                <div className="text-sm font-bold mt-2">{t.l}</div>
                <div className="text-[11px] text-muted-foreground">{t.d}</div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">City</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lagos"
                className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Full address</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 Admiralty Way, Lekki Phase 1"
                className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm" />
            </label>
            <LocationPicker
              lat={coords.lat}
              lng={coords.lng}
              onChange={(lat, lng) => setCoords({ lat, lng })}
              height={220}
            />
            <p className="text-[11px] text-muted-foreground">Tap or drag the pin to set the exact location. Address only shown to guests after booking.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Listing title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Beautiful 3-bed in Lekki"
                className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm" />
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: "Beds", v: beds, set: setBeds },
                { l: "Baths", v: baths, set: setBaths },
              ].map((f) => (
                <div key={f.l} className="rounded-xl bg-card border border-border p-3 text-center col-span-1">
                  <div className="text-[10px] text-muted-foreground uppercase">{f.l}</div>
                  <div className="flex items-center justify-between mt-2">
                    <button onClick={() => f.set(Math.max(0, f.v - 1))} className="w-7 h-7 rounded-full bg-secondary border border-border">−</button>
                    <span className="font-extrabold">{f.v}</span>
                    <button onClick={() => f.set(f.v + 1)} className="w-7 h-7 rounded-full bg-secondary border border-border">+</button>
                  </div>
                </div>
              ))}
              <label className="block col-span-1">
                <span className="text-[10px] text-muted-foreground uppercase">Area</span>
                <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="180sqm"
                  className="mt-1 w-full rounded-xl bg-card border border-border px-2 py-2 text-sm text-center" />
              </label>
            </div>
            <label className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Description</span>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} placeholder="Tell guests what makes your place special…"
                className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm resize-none" />
            </label>
          </div>
        )}

        {step === 4 && (
          <div>
            <p className="text-xs text-muted-foreground mb-3">Add at least 5 photos. First one becomes the cover.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {photos.map((i) => (
                <div key={i} className="aspect-square rounded-xl bg-secondary border border-border flex items-center justify-center text-3xl">
                  📷
                </div>
              ))}
              <button onClick={() => setPhotos((p) => [...p, Date.now()])}
                className="aspect-square rounded-xl border-2 border-dashed border-border bg-card flex flex-col items-center justify-center gap-1 text-muted-foreground">
                <ImagePlus className="w-6 h-6" />
                <span className="text-[10px] font-semibold">Add photo</span>
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => (
              <button key={a} onClick={() => toggleAmen(a)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold border ${amen.includes(a) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>
                {amen.includes(a) && "✓ "}{a}
              </button>
            ))}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">{type === "Shortlet" ? "Price per night (₦)" : "Asking price (₦)"}</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="150000"
                className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-lg font-extrabold" />
            </label>
            <div className="rounded-2xl bg-card border border-border p-4 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Your price</span><span className="font-semibold">₦{price || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Stay commission (3%)</span><span className="font-semibold">−₦{Math.round(Number(price || 0) * 0.03).toLocaleString()}</span></div>
              <div className="border-t border-border pt-2 flex justify-between font-extrabold"><span>You earn</span><span className="text-primary">₦{Math.round(Number(price || 0) * 0.97).toLocaleString()}</span></div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-2"><Home className="w-4 h-4 text-primary" /><h3 className="text-sm font-bold">{title || "Untitled"}</h3></div>
              <div className="text-[11px] text-muted-foreground space-y-1">
                <div>{type} · {beds} bed · {baths} bath · {area || "—"}</div>
                <div>📍 {address || "—"}, {city || "—"}</div>
                <div className="text-primary font-extrabold text-sm">₦{Number(price || 0).toLocaleString()}</div>
              </div>
            </div>
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 flex gap-3">
              <Sparkles className="w-5 h-5 text-primary shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your listing will go through PropertyVerify™ within 24h. You'll be notified once it's live.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="max-w-md mx-auto px-5 py-3 pb-20">
          <button onClick={step === TOTAL ? publish : next}
            disabled={(step === 1 && !type)}
            className="w-full bg-primary text-primary-foreground rounded-2xl h-12 font-bold text-sm disabled:opacity-50">
            {step === TOTAL ? "🚀 Publish listing" : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
};

export default NewListing;
