import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ImagePlus, Home, Sparkles, X, Loader2, MapPin, Video } from "lucide-react";
import { toast } from "sonner";
import { LocationPicker, loadMaps } from "@/components/map/PropertyMap";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";

const AMENITIES = ["Wi-Fi", "AC", "Generator", "Pool", "Gym", "Parking", "Security", "Kitchen", "Hot water", "Pet-friendly"];

const geocode = async (address: string) => {
  const g = await loadMaps();
  const geocoder = new g.maps.Geocoder();
  const res = await geocoder.geocode({ address });
  const r = res.results?.[0];
  if (!r) throw new Error("No result");
  const loc = r.geometry.location;
  return { lat: loc.lat(), lng: loc.lng(), formatted: r.formatted_address as string };
};

const NewListing = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const { setRole } = useRole();
  const fileInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
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
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 6.5244, lng: 3.3792 });
  const [pinned, setPinned] = useState(false);

  const findOnMap = async () => {
    const q = [address, city].filter(Boolean).join(", ");
    if (!q) return toast.error("Enter an address or city first");
    setGeocoding(true);
    try {
      const r = await geocode(q);
      setCoords({ lat: r.lat, lng: r.lng });
      setPinned(true);
      toast.success("Pinned on map");
    } catch (err: any) {
      toast.error(err.message || "Could not find that address");
    } finally { setGeocoding(false); }
  };

  if (typeof window !== "undefined") {
    try { window.localStorage.setItem("stay:role", "agent"); } catch {}
  }

  // Step order: 1 location, 2 details, 3 photos, 4 video, 5 amenities, 6 price, 7 review
  const TOTAL = 7;

  const stepError = (s: number): string | null => {
    if (s === 1) {
      if (!city.trim()) return "Add the city";
      if (!address.trim()) return "Add the full address";
      if (!pinned) return "Tap 'Find on map' or drag the pin to set the location";
      return null;
    }
    if (s === 2) {
      if (!title.trim() || title.trim().length < 5) return "Give your listing a clear title (min 5 chars)";
      if (beds < 1) return "Add at least 1 bed";
      if (baths < 1) return "Add at least 1 bath";
      if (!desc.trim() || desc.trim().length < 30) return "Write a description (min 30 chars)";
      return null;
    }
    if (s === 3) {
      if (photos.length < 3) return `Add at least 3 photos (you have ${photos.length})`;
      return null;
    }
    if (s === 4) {
      if (!videoUrl) return "Upload a short property video (max 5MB, ~1 min)";
      return null;
    }
    if (s === 5) {
      if (amen.length < 2) return "Pick at least 2 amenities";
      return null;
    }
    if (s === 6) {
      const n = Number(price);
      if (!n || n < 5000) return "Set a nightly price of at least ₦5,000";
      return null;
    }
    return null;
  };

  const tryNext = () => {
    const err = stepError(step);
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(TOTAL, s + 1));
  };
  const back = () => (step === 1 ? nav(-1) : setStep((s) => s - 1));

  const toggleAmen = (a: string) =>
    setAmen((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  const handleVideo = async (file: File | undefined) => {
    if (!file || !user) return;
    if (!file.type.startsWith("video/")) return toast.error("Please upload a video file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Video must be 5MB or less");
    setUploadingVideo(true);
    try {
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("listing-videos").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("listing-videos").getPublicUrl(path);
      setVideoUrl(data.publicUrl);
      toast.success("Video uploaded");
    } catch (err: any) {
      toast.error(err.message || "Video upload failed");
    } finally {
      setUploadingVideo(false);
      if (videoInput.current) videoInput.current.value = "";
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) throw new Error("Please upload image files only");
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("listing-images").upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
        if (error) throw error;
        const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      setPhotos((p) => [...p, ...uploaded]);
      if (fileInput.current) fileInput.current.value = "";
      toast.success(uploaded.length === 1 ? "Photo uploaded" : `${uploaded.length} photos uploaded`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (url: string) => setPhotos((p) => p.filter((x) => x !== url));

  const publish = async () => {
    if (!user) return toast.error("Please sign in");
    if (!title.trim()) return toast.error("Add a listing title");
    if (!city.trim() && !address.trim()) return toast.error("Add a city or address");
    if (photos.length === 0) return toast.error("Add at least one photo");
    if (!price) return toast.error("Set a nightly price");
    setPublishing(true);
    try {
      const { data, error } = await supabase.from("listings").insert({
        host_id: user.id,
        title: title.trim(),
        description: desc,
        type: "Shortlet",
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
      }).select("id").single();
      if (error) throw error;
      toast.success("Listing submitted for verification");
      setRole("agent");
      nav(data?.id ? `/listings/${data.id}/edit` : "/listings");
    } catch (err: any) {
      toast.error(err.message || "Could not publish");
    } finally {
      setPublishing(false);
    }
  };

  const stepTitle = [
    "Where is your shortlet?",
    "Property details",
    "Add photos",
    "Add a short video tour",
    "What's included?",
    "Set your nightly price",
    "Review & submit",
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
            <button type="button" onClick={findOnMap} disabled={geocoding}
              className="w-full rounded-xl border border-primary/30 bg-primary/10 text-primary py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
              {geocoding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
              {geocoding ? "Locating…" : "Find on map"}
            </button>
            <LocationPicker
              lat={coords.lat}
              lng={coords.lng}
              onChange={(lat, lng) => setCoords({ lat, lng })}
              height={220}
            />
            <p className="text-[11px] text-muted-foreground">Tap "Find on map" or drag the pin to set the exact location. Full address only shown to guests after booking.</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Listing title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cozy 2-bed in Lekki"
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

        {step === 3 && (
          <div>
            <p className="text-xs text-muted-foreground mb-3">Add at least 1 photo. First one becomes the cover.</p>
            <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <div className="grid grid-cols-2 gap-2.5">
              {photos.map((url) => (
                <div key={url} className="relative aspect-square rounded-xl bg-secondary border border-border overflow-hidden">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(url)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
                    aria-label="Remove photo">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-border bg-card flex flex-col items-center justify-center gap-1 text-muted-foreground disabled:opacity-50">
                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
                <span className="text-[10px] font-semibold">{uploading ? "Uploading…" : "Add photo"}</span>
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => (
              <button key={a} onClick={() => toggleAmen(a)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold border ${amen.includes(a) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>
                {amen.includes(a) && "✓ "}{a}
              </button>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Price per night (₦)</span>
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

        {step === 6 && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-2"><Home className="w-4 h-4 text-primary" /><h3 className="text-sm font-bold">{title || "Untitled"}</h3></div>
              <div className="text-[11px] text-muted-foreground space-y-1">
                <div>Shortlet · {beds} bed · {baths} bath · {area || "—"}</div>
                <div>{address || "—"}, {city || "—"}</div>
                <div className="text-primary font-extrabold text-sm">₦{Number(price || 0).toLocaleString()} / night</div>
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
          <button onClick={step === TOTAL ? publish : next} disabled={publishing}
            className="w-full bg-primary text-primary-foreground rounded-2xl h-12 font-bold text-sm disabled:opacity-50">
            {step === TOTAL ? (publishing ? "Publishing…" : "Publish listing") : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
};

export default NewListing;
