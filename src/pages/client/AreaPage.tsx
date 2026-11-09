import { Link, Navigate, useParams } from "react-router-dom";
import { useLocations } from "@/hooks/useLocations";
import { Seo } from "@/components/seo/Seo";
import { TopBar } from "@/components/shell/TopBar";
import { Skeleton, EmptyState } from "@/ui/kit";

/** SEO landing page for a place (/stays-in/:slug) that hands off to results for that place. */
const AreaPage = () => {
  const { slug } = useParams();
  const { all, byId } = useLocations();
  if (!all.length) return <main className="p-6"><Skeleton className="h-8 w-60" /></main>;
  const place = all.find((l) => l.slug === slug);
  if (!place) return <main className="p-6"><EmptyState title="Place not found" action={<Link to="/" className="underline">Find stays</Link>} /></main>;
  const parent = place.parent_id ? byId.get(place.parent_id) : undefined;
  const label = parent && place.type !== "state" ? `${place.name}, ${parent.name}` : place.name;
  const to = `/results?where=${encodeURIComponent(place.name)}&loc=${place.slug}&loc_type=${place.type}`;
  return (
    <>
      <Seo title={`Shortlets in ${label} | Stay`} description={`Book verified shortlet apartments in ${label}. See power, water and security up front; pay safely with Stay.`}
        jsonLd={{ "@context": "https://schema.org", "@type": "Place", name: label }} />
      <TopBar title={place.name} />
      <Navigate to={to} replace />
    </>
  );
};
export default AreaPage;
