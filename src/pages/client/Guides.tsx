import { Link, useParams } from "react-router-dom";
import { TopBar } from "@/components/shell/TopBar";
import { Seo } from "@/components/seo/Seo";
import { EmptyState } from "@/ui/kit";
import { GUIDES } from "@/data/guides";

export const GuidesIndex = () => (
  <>
    <Seo title="Guides for shortlet stays in Nigeria | Stay" description="Simple guides to picking and booking a safe shortlet in Lagos, Abuja and across Nigeria." />
    <TopBar title="Guides" />
    <main className="px-4 md:px-0 py-5 max-w-[760px] mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Guides</h1>
      <ul className="space-y-3">
        {GUIDES.map((g) => (
          <li key={g.slug}><Link to={`/guides/${g.slug}`} className="block rounded-xl border border-border p-4 hover:bg-surface">
            <p className="text-[15px] font-semibold">{g.title}</p><p className="text-[13px] text-muted-foreground mt-1">{g.summary}</p>
          </Link></li>
        ))}
      </ul>
    </main>
  </>
);

export const GuidePage = () => {
  const { slug } = useParams();
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) return <main className="p-6"><EmptyState title="Guide not found" action={<Link to="/guides" className="underline">All guides</Link>} /></main>;
  return (
    <>
      <Seo title={`${g.title} | Stay`} description={g.summary} type="article"
        jsonLd={{ "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.summary, publisher: { "@type": "Organization", name: "StayGlobal" } }} />
      <TopBar title="Guide" />
      <main className="px-4 md:px-0 py-5 max-w-[760px] mx-auto">
        <h1 className="text-2xl font-semibold">{g.title}</h1>
        <p className="text-[15px] text-muted-foreground mt-2">{g.summary}</p>
        <div className="mt-5 space-y-3 text-[15px] leading-relaxed">{g.body.map((p) => <p key={p}>{p}</p>)}</div>
        <Link to="/" className="mt-6 inline-flex min-h-11 items-center px-4 rounded-lg bg-primary text-primary-foreground font-semibold">Find a stay</Link>
      </main>
    </>
  );
};
