import { useParams, Link, useNavigate } from "react-router-dom";
import { useListing } from "@/hooks/useListings";
import { ChevronLeft, Heart, Share2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import { SinglePropertyMap } from "@/components/map/PropertyMap";

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useRole();
  const { data: p, loading } = useListing(id);

  if (loading) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </main>
    );
  }

  if (!p) {
    return (
      <main className="p-8 text-center">
        <div className="text-5xl mb-3">🤔</div>
        <h1 className="font-bold">Property not found</h1>
        <Link to="/explore" className="text-primary text-sm mt-3 inline-block">
          Back to explore
        </Link>
      </main>
    );
  }

  return (
    <main className="pb-32">
      {/* Image header */}
      <div className="relative aspect-[4/3] bg-secondary">
        <img
          src={p.image}
          alt={p.title}
          width={800}
          height={640}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-border flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => toast.success("Saved to favourites")}
              className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-border flex items-center justify-center"
            >
              <Heart className="w-4 h-4" />
            </button>
            <button
              onClick={() => toast.success("Link copied")}
              className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-border flex items-center justify-center"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/30 text-[10px] font-bold text-primary">
            {p.emoji} {p.type}
          </span>
          {p.verified && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success text-white text-[10px] font-bold">
              ✓ PropertyVerify™
            </span>
          )}
        </div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight leading-tight">{p.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">📍 {p.location}</p>
        <div className="flex items-center gap-2 mt-2 text-sm">
          <Star className="w-4 h-4 fill-primary text-primary" />
          <span className="font-semibold">{p.rating}</span>
          <span className="text-muted-foreground">· {p.reviews} reviews</span>
        </div>

        {p.beds > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <div className="text-xl">🛏️</div>
              <div className="text-sm font-bold mt-1">{p.beds}</div>
              <div className="text-[10px] text-muted-foreground">Bedrooms</div>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <div className="text-xl">🛁</div>
              <div className="text-sm font-bold mt-1">{p.baths}</div>
              <div className="text-[10px] text-muted-foreground">Bathrooms</div>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <div className="text-xl">📐</div>
              <div className="text-sm font-bold mt-1">{p.area}</div>
              <div className="text-[10px] text-muted-foreground">Area</div>
            </div>
          </div>
        )}

        {/* Agent */}
        <section className="mt-6 rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xl">
            {p.agentEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{p.agent}</div>
            <div className="text-[11px] text-success font-medium">✓ {p.agentTag}</div>
          </div>
          <Link
            to={`/messages/${p.agent.toLowerCase().replace(/\s+/g, "-")}?prop=${p.id}`}
            className="text-xs font-semibold text-primary px-3 py-2 rounded-full bg-primary/10 border border-primary/30"
          >
            💬 Chat
          </Link>
        </section>

        <section className="mt-6">
          <h2 className="font-bold text-sm mb-2">About this property</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
        </section>

        <section className="mt-6">
          <h2 className="font-bold text-sm mb-3">What's included</h2>
          <div className="grid grid-cols-2 gap-2">
            {p.amenities.map((a) => (
              <div
                key={a.label}
                className="flex items-center gap-2 rounded-xl bg-card border border-border p-3 text-xs"
              >
                <span className="text-base">{a.emoji}</span>
                {a.label}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="font-bold text-sm mb-3">Location</h2>
          <SinglePropertyMap p={p} height={220} />
          <p className="text-[11px] text-muted-foreground mt-2">📍 {p.location}</p>
        </section>

        <section className="mt-6 rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔐</span>
            <h3 className="font-bold text-sm">Secured by PropertyEscrow™</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your payment is held safely. {p.type === "Shortlet" ? "Released to the host 24h after check-in." : "Released only when you confirm receipt of original title documents."}
          </p>
        </section>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="max-w-md mx-auto px-5 py-3 pb-20 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-primary font-extrabold text-lg leading-none">{p.price}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {p.type === "Shortlet" ? "per night · taxes incl." : "Escrow protected"}
            </div>
          </div>
          {role === "agent" ? (
            <Button
              onClick={() => navigate(`/listings/${p.id}/edit`)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 h-12 font-bold"
            >
              ✏️ Edit listing
            </Button>
          ) : p.type === "Shortlet" ? (
            <Button
              onClick={() => navigate(`/property/${p.id}/book`)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 h-12 font-bold"
            >
              Book stay
            </Button>
          ) : (
            <Button
              onClick={() => toast.success("✓ Inspection request sent")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 h-12 font-bold"
            >
              Request inspection
            </Button>
          )}
        </div>
      </div>
    </main>
  );
};

export default PropertyDetail;
