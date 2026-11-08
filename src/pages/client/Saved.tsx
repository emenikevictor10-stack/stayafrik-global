import { Link } from "react-router-dom";
import { TopBar } from "@/components/shell/TopBar";
import { useWishlist } from "@/hooks/useWishlist";
import { StayById } from "@/components/property/StayById";
import { EmptyState } from "@/ui/kit";
import { Seo } from "@/components/seo/Seo";

const Saved = () => {
  const { ids } = useWishlist();
  return (
    <>
      <Seo title="Saved stays · Stay" description="Stays you saved on Stay."/>
      <TopBar title="Saved" />
      <main className="px-4 md:px-0 py-5">
        <h1 className="hidden xl:block text-2xl font-semibold mb-4">Saved</h1>
        {ids.length === 0 ? (
          <EmptyState title="Nothing saved yet" body="Tap the heart on any stay to keep it here."
            action={<Link to="/explore" className="h-11 px-4 inline-flex items-center rounded-lg bg-primary text-primary-foreground text-base font-semibold">Explore stays</Link>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {[...ids].reverse().map((id) => <StayById key={id} id={id} />)}
          </div>
        )}
      </main>
    </>
  );
};

export default Saved;
