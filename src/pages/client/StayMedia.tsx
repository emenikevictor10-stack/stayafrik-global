import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useListing } from "@/hooks/useListings";
import { Seo } from "@/components/seo/Seo";
import { Skeleton, EmptyState } from "@/ui/kit";
import { factualTitle } from "@/lib/stay-facts";
import { StayImage } from "@/components/property/StayImage";
import { StayVideos } from "@/components/property/StayVideos";

/** All photos of a stay, stacked (PRD /stays/:id/media). */
const StayMedia = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: p, loading } = useListing(id);
  const photos = p && !p.videoOnly ? (p.images?.length ? p.images : [p.image]).filter(Boolean) : [];
  const vids = p?.videos?.length || 0;
  return (
    <main className="max-w-[960px] mx-auto px-4 pb-16">
      <header className="h-[52px] flex items-center gap-3 sticky top-0 bg-background z-10">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="w-11 h-11 rounded-full border border-border flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-semibold truncate">{p ? factualTitle(p) : "Photos"}</h1>
        {(photos.length > 0 || vids > 0) && <span className="ml-auto text-[13px] text-muted-foreground">{[photos.length && `${photos.length} photo${photos.length > 1 ? "s" : ""}`, vids && `${vids} video${vids > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}</span>}
      </header>
      {p && <Seo title={`Photos · ${factualTitle(p)} | Stay`} description={`All photos of ${factualTitle(p)}.`} />}
      {loading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}</div>}
      {!loading && !p && <EmptyState title="Stay not found" />}
      {p?.videos?.length ? <div className="mb-3"><StayVideos videos={p.videos} /></div> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {photos.map((src, i) => (
          <StayImage key={src + i} src={src} width={i % 3 === 0 ? 1280 : 800} alt={`Photo ${i + 1}`} loading={i < 2 ? "eager" : "lazy"}
            className={i % 3 === 0 ? "md:col-span-2 w-full rounded-xl object-cover max-h-[560px]" : "w-full rounded-xl object-cover aspect-[4/3]"} />
        ))}
      </div>
    </main>
  );
};
export default StayMedia;
