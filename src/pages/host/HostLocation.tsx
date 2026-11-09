import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { Button, ListSkeleton } from "@/ui/kit";
import { PinPicker, findAddress } from "@/components/map/PinPicker";
import { hasCoords } from "@/lib/map-pins";

/** /host/location/:id — host places their stay's real pin (guests only ever see the area until they pay). */
const HostLocation = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [row, setRow] = useState<{ title: string; address: string | null; city: string | null; neighborhood: string | null } | null>(null);
  const [pt, setPt] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [finding, setFinding] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("listings").select("title,address,city,neighborhood,lat,lng").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setRow(data);
      if (hasCoords(data)) setPt({ lat: data.lat!, lng: data.lng! });
    });
  }, [id]);

  const find = async () => {
    if (!row) return;
    setFinding(true);
    try { setPt(await findAddress([row.address, row.neighborhood, row.city].filter(Boolean).join(", "))); toast.success("Found — drag the pin onto your building"); }
    catch (e: any) { toast.error(e.message); }
    finally { setFinding(false); }
  };

  const save = async () => {
    if (!pt || !id) return;
    setBusy(true);
    const { error } = await supabase.from("listings").update({ lat: pt.lat, lng: pt.lng }).eq("id", id);
    setBusy(false);
    if (error) return toast.error("Couldn't save the location");
    toast.success("Location saved");
    nav("/host");
  };

  return (
    <>
      <TopBar title="Stay location" />
      <main className="px-4 pt-4 pb-8 max-w-2xl mx-auto space-y-3">
        {!row ? <ListSkeleton rows={2} /> : (
          <>
            <h1 className="text-xl font-semibold">{row.title}</h1>
            <p className="text-[13px] text-muted-foreground">{[row.address, row.neighborhood, row.city].filter(Boolean).join(", ")}</p>
            <button type="button" onClick={find} disabled={finding}
              className="w-full min-h-11 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
              {finding ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />} Find my address on the map
            </button>
            <PinPicker value={pt} onChange={(lat, lng) => setPt({ lat, lng })} height={320} />
            <p className="text-xs text-muted-foreground">Tap the map or drag the pin onto your building. Guests only see the general area until they've paid.</p>
            <div className="flex justify-end gap-2">
              <Link to="/host" className="min-h-11 px-4 inline-flex items-center rounded-lg border border-border text-sm font-semibold">Cancel</Link>
              <Button disabled={!pt} loading={busy} onClick={save}>Save location</Button>
            </div>
          </>
        )}
      </main>
    </>
  );
};

export default HostLocation;
