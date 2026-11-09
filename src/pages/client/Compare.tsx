import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { X, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { parseCompareIds, compareLink } from "@/lib/compare";
import { TopBar } from "@/components/shell/TopBar";
import { Seo } from "@/components/seo/Seo";
import { EmptyState, Skeleton } from "@/ui/kit";
import { useCompare } from "@/hooks/useCompare";
import { useListing } from "@/hooks/useListings";
import { factualTitle, essentials } from "@/lib/stay-facts";

const Column = ({ id, onRemove }: { id: string; onRemove: () => void }) => {
  const { data: p, loading } = useListing(id);
  if (loading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!p) return null;
  const e = essentials(p);
  const rows: [string, string][] = [
    ["Price / night", p.price],
    ["Area", p.neighborhood || p.city || p.location],
    ["Bedrooms", p.beds ? String(p.beds) : "—"],
    ["Bathrooms", p.baths ? String(p.baths) : "—"],
    ["Guests", p.maxGuests ? String(p.maxGuests) : "—"],
    ["Rating", p.rating ? `★ ${p.rating} (${p.reviews})` : "New"],
    ["Power", e.power || "Not stated"],
    ["Water", e.water || "Not stated"],
    ["Security", e.security || "Not stated"],
    ["Verified", p.verified ? "Yes" : "No"],
  ];
  return (
    <div className="min-w-[240px] flex-1 rounded-xl border border-border overflow-hidden">
      <div className="relative">
        <img src={p.image} alt="" className="h-40 w-full object-cover" loading="lazy" />
        <button type="button" onClick={onRemove} aria-label="Remove from compare" className="absolute top-2 right-2 w-11 h-11 rounded-full bg-background/90 flex items-center justify-center"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-3">
        <Link to={`/stays/${p.id}`} className="text-[15px] font-semibold hover:underline">{factualTitle(p)}</Link>
        <dl className="mt-2 divide-y divide-border">
          {rows.map(([k, v]) => <div key={k} className="py-1.5 flex justify-between gap-3 text-[13px]"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium text-right">{v}</dd></div>)}
        </dl>
      </div>
    </div>
  );
};

/** Side-by-side compare (up to 3 stays picked with the compare button on cards). */
const Compare = () => {
  const { ids, toggle, setAll } = useCompare();
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const fromLink = parseCompareIds(params.get("ids"));
    if (fromLink.length) setAll(fromLink);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ids.length) setParams({ ids: ids.join(",") }, { replace: true }); }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps
  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.origin + compareLink(ids)); toast.success("Compare link copied"); } catch { toast.error("Couldn't copy the link"); }
  };
  return (
    <>
      <Seo title="Compare stays · Stay" description="Compare stays side by side." noindex />
      <TopBar title="Compare" />
      <main className="px-4 md:px-0 py-5">
        <div className="flex items-center gap-2 mb-4">
          <h1 className="text-xl font-semibold mr-auto">Compare stays</h1>
          {ids.length > 0 && <button type="button" onClick={copy} className="min-h-11 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-border text-[13px] font-semibold"><LinkIcon className="w-4 h-4" />Copy link</button>}
        </div>
        {ids.length === 0 ? (
          <EmptyState title="Nothing to compare yet" body="Tap the compare button on up to 3 stays." action={<Link to="/" className="underline font-semibold">Find stays</Link>} />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">{ids.map((id) => <Column key={id} id={id} onRemove={() => toggle(id)} />)}</div>
        )}
      </main>
    </>
  );
};
export default Compare;
