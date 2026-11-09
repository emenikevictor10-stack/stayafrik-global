import { useSettings } from "@/hooks/useSettings";
import { Tag } from "@/ui/kit";
import { TopBar } from "@/components/shell/TopBar";
import { rememberViewed } from "@/hooks/useRecentlyViewed";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useListing } from "@/hooks/useListings";
import { ChevronLeft, Heart, Share2, Star, User, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { StayAreaMap } from "@/components/map/StayAreaMap";
import { quoteRayProp } from "@/lib/rayprop";
import { Seo } from "@/components/seo/Seo";
import { ImageGallery } from "@/components/property/ImageGallery";
import { ReviewsSection } from "@/components/property/ReviewsSection";
import { NearbyServices } from "@/components/property/NearbyServices";
import { ReserveDialog } from "@/components/property/ReserveDialog";
import { useEffect, useState } from "react";

import { useWishlist } from "@/hooks/useWishlist";
import { useListingAccess, approxLocation } from "@/hooks/useListingAccess";
import { cn } from "@/lib/utils";
import { useRatePlan } from "@/hooks/useRatePlan";
import { recallSearch } from "@/lib/search-state";
import { quoteLocalStay } from "../../../supabase/functions/_shared/booking-core";
import { koboToNaira } from "@/lib/rayprop-map";
import { factualTitle, essentials, cancellationLines } from "@/lib/stay-facts";
import { Images, Play } from "lucide-react";
import { StayVideos } from "@/components/property/StayVideos";


/** Live price for the searched dates (local stays): nightly breakdown, cleaning, discounts, fee, total. */
const StayQuote = ({ p, feeBps }: { p: import("@/data/properties").Property; feeBps: number }) => {
  const plan = useRatePlan(p.source === "rayprop" ? undefined : p.id, p.source === "rayprop");
  const s = recallSearch();
  if (p.source === "rayprop") return s?.checkIn && s?.checkOut ? <PartnerQuote p={p} checkIn={s.checkIn} checkOut={s.checkOut} guests={Math.max(1, (s.adults || 0) + (s.children || 0))} /> : null;
  if (!s?.checkIn || !s?.checkOut) return null;
  const q = quoteLocalStay(s.checkIn, s.checkOut, plan ?? { price_per_night: p.priceNum }, feeBps);
  if (q.ok === false) return <p className="mt-3 text-[13px] text-muted-foreground">{q.error}</p>;
  const n = (k: number) => "₦" + Math.round(koboToNaira(k)).toLocaleString();
  const nights = q.nights?.length ?? 0;
  return (
    <div className="mt-4 rounded-xl border border-border p-3 text-[13px] space-y-1">
      <p className="font-semibold">Your dates: {s.checkIn} → {s.checkOut}</p>
      <div className="flex justify-between"><span>{nights} night{nights === 1 ? "" : "s"}</span><span>{n(q.nights_kobo)}</span></div>
      {!!q.discount_kobo && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>−{n(q.discount_kobo)}</span></div>}
      {!!q.cleaning_kobo && <div className="flex justify-between"><span>Cleaning fee</span><span>{n(q.cleaning_kobo)}</span></div>}
      <div className="flex justify-between"><span>Service fee</span><span>{n(q.fee_kobo)}</span></div>
      <div className="flex justify-between font-semibold border-t border-border pt-1"><span>Total</span><span>{n(q.total_kobo)}</span></div>
    </div>
  );
};

/** Partner stay price for the searched dates, from the partner's own quote. */
const PartnerQuote = ({ p, checkIn, checkOut, guests }: { p: import("@/data/properties").Property; checkIn: string; checkOut: string; guests: number }) => {
  const [q, setQ] = useState<Awaited<ReturnType<typeof quoteRayProp>> | null | "none">(null);
  useEffect(() => {
    let off = false;
    quoteRayProp({ listing_id: p.raypropListingId || p.id, check_in: checkIn, check_out: checkOut, guests })
      .then((r) => { if (!off) setQ(r); }).catch(() => { if (!off) setQ("none"); });
    return () => { off = true; };
  }, [p.id, p.raypropListingId, checkIn, checkOut, guests]);
  const n = (k: number) => "₦" + Math.round(koboToNaira(k)).toLocaleString();
  if (q === null) return <p className="mt-4 text-[13px] text-muted-foreground">Checking the price for {checkIn} → {checkOut}…</p>;
  if (q === "none") return <p className="mt-4 text-[13px] text-muted-foreground">Your dates: {checkIn} → {checkOut}. Price confirmed at checkout.</p>;
  return (
    <div className="mt-4 rounded-xl border border-border p-3 text-[13px] space-y-1">
      <p className="font-semibold">Your dates: {checkIn} → {checkOut}</p>
      <div className="flex justify-between"><span>{q.nights} night{q.nights === 1 ? "" : "s"}</span><span>{n(q.subtotalKobo || q.totalKobo - q.vatKobo)}</span></div>
      {!!q.vatKobo && <div className="flex justify-between"><span>VAT</span><span>{n(q.vatKobo)}</span></div>}
      <div className="flex justify-between font-semibold border-t border-border pt-1"><span>Total</span><span>{n(q.totalKobo)}</span></div>
    </div>
  );
};

const PropertyDetail = () => {
  const { features, serviceFeeBps } = useSettings();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useRole();
  const { session } = useAuth();
  const { data: p, loading } = useListing(id);
  useEffect(() => { if (id) rememberViewed(id); }, [id]);
  const { has, toggle } = useWishlist();
  const [reserveOpen, setReserveOpen] = useState(false);
  const { unlocked } = useListingAccess(p?.id, p?.hostId);
  const shownLocation = p ? (unlocked ? p.location : approxLocation(p.location)) : "";



  // No sign-in here: checkout asks for it only at Pay.
  const handleBook = () => navigate(`/property/${id}/book`);

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
        {id?.startsWith("rp_") ? (
          <>
            <h1 className="font-bold">This stay is temporarily unavailable</h1>
            <p className="text-sm text-muted-foreground mt-1">Please check back soon, or browse other stays.</p>
          </>
        ) : (
          <h1 className="font-bold">Property not found</h1>
        )}
        <Link to="/explore" className="text-primary text-sm mt-3 inline-block">
          Browse other stays
        </Link>
      </main>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.desc || `${p.type} in ${p.location}`,
    image: p.image,
    category: p.type,
    aggregateRating: p.reviews
      ? { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews }
      : undefined,
    offers: {
      "@type": "Offer",
      price: p.priceNum,
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
    <TopBar title={factualTitle(p)} />
    <main className="pb-32">
      <Seo
        title={`${p.title} — ${p.location} | Stay`}
        description={(p.desc || `Verified ${p.type.toLowerCase()} in ${p.location}.`).slice(0, 160)}
        image={p.image}
        type="product"
        jsonLd={jsonLd}
      />
      {/* Image header */}
      <div className="relative">
        {p.videoOnly && p.videos ? <div className="pt-16 px-4 lg:px-0 max-w-[960px] mx-auto"><StayVideos videos={p.videos.slice(0, 1)} /></div>
          : <ImageGallery images={p.images && p.images.length ? p.images : [p.image]} alt={factualTitle(p)} />}
        {!!p.videos?.length && !(p.videoOnly && p.videos.length === 1) && (
          <Link to={`/stays/${p.id}/media`} className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-lg bg-background/90 border border-border text-[13px] font-semibold">
            <Play className="w-4 h-4 fill-current" aria-hidden /> Video
          </Link>
        )}
        {!p.videoOnly && (p.images?.length || 0) > 1 && (
          <Link to={`/stays/${p.id}/media`} className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-lg bg-background/90 border border-border text-[13px] font-semibold">
            <Images className="w-4 h-4" aria-hidden /> All {p.images!.length} photos
          </Link>
        )}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/70 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-border flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const saved = toggle(p.id);
                toast.success(saved ? "Saved to wishlist" : "Removed from wishlist");
              }}
              aria-label={has(p.id) ? "Remove from saved" : "Save property"}
              className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-border flex items-center justify-center"
            >
              <Heart className={cn("w-4 h-4", has(p.id) && "fill-primary text-primary")} />
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
                toast.success("Link copied");
              }}
              aria-label="Share"
              className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-border flex items-center justify-center"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>


      <div className="px-5 pt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 lg:items-start">
        <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Tag tone="fact">{p.emoji} {p.type}</Tag>
          {p.verified && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success text-primary-foreground text-xs font-bold">
              ✓ PropertyVerify™
            </span>
          )}
        </div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight leading-tight">{factualTitle(p)}</h1>
        {p.title && p.title !== factualTitle(p) && <p className="text-[13px] text-muted-foreground mt-0.5">{p.title}</p>}
        <p className="text-sm text-muted-foreground mt-1">📍 {shownLocation}{!unlocked && <span className="ml-1 text-xs">· exact address after booking</span>}</p>
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
              <div className="text-xs text-muted-foreground">Bedrooms</div>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <div className="text-xl">🛁</div>
              <div className="text-sm font-bold mt-1">{p.baths}</div>
              <div className="text-xs text-muted-foreground">Bathrooms</div>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <div className="text-xl">📐</div>
              <div className="text-sm font-bold mt-1">{p.area}</div>
              <div className="text-xs text-muted-foreground">Area</div>
            </div>
          </div>
        )}

        {/* Host */}
        <section className="mt-6 rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
              {p.hostAvatar ? (
                <img src={p.hostAvatar} alt={p.agent} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Hosted by</div>
              <div className="font-bold text-sm truncate">{p.agent}</div>
              <div className="text-xs text-success font-medium inline-flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" /> {p.agentTag}
              </div>
            </div>
          </div>
          <div className="mt-3">
            {p.hostId && (
              <Link
                to={`/messages/${p.hostId}?listing=${p.id}`}
                onClick={(e) => {
                  if (!session) {
                    e.preventDefault();
                    toast.message("Sign in to message the host");
                    navigate(`/auth?mode=signin`, { state: { from: `/messages/${p.hostId}?listing=${p.id}` } });
                  }
                }}
                className="block w-full text-center text-xs font-bold text-primary px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/30"
              >
                💬 Message host in app
              </Link>
            )}
            <p className="mt-2 text-xs text-muted-foreground text-center">
              For your safety, all conversations stay inside Stay. Hosts are alerted instantly.
            </p>
          </div>

        </section>

        <section className="mt-6">
          <h2 className="font-bold text-sm mb-2">About this property</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
        </section>

        {(p.maxGuests || p.checkInTime || p.checkOutTime || (p.houseRules && p.houseRules.length > 0)) && (
          <section className="mt-6">
            <h2 className="font-bold text-sm mb-3">Good to know</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              {p.maxGuests ? <div className="rounded-xl bg-card border border-border p-2"><div className="text-xs text-muted-foreground">Max guests</div><div className="text-sm font-bold">{p.maxGuests}</div></div> : null}
              {p.checkInTime ? <div className="rounded-xl bg-card border border-border p-2"><div className="text-xs text-muted-foreground">Check-in</div><div className="text-sm font-bold">{p.checkInTime}</div></div> : null}
              {p.checkOutTime ? <div className="rounded-xl bg-card border border-border p-2"><div className="text-xs text-muted-foreground">Check-out</div><div className="text-sm font-bold">{p.checkOutTime}</div></div> : null}
            </div>
            {p.houseRules && p.houseRules.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {p.houseRules.map((r) => <li key={r}>• {r}</li>)}
              </ul>
            )}
          </section>
        )}

        {p.listingCode && (
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(p.listingCode!); toast.success("Listing ID copied"); }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-1.5 text-xs"
          >
            <span className="text-muted-foreground">{p.source === "rayprop" ? "RayProp listing ID" : "Listing ID"}</span>
            <span className="font-mono font-bold">{p.listingCode.replace(/^RP[-·]/, "")}</span>
          </button>
        )}

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

        {(() => {
          const e = essentials(p);
          return (
            <section className="mt-6">
              <h2 className="font-bold text-sm mb-3">Power, water and security</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {([["Power", e.power], ["Water", e.water], ["Security", e.security]] as const).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-border p-3">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="text-[13px] font-semibold mt-0.5">{v || "Not stated — ask before booking"}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })()}

        <section className="mt-6">
          <h2 className="font-bold text-sm mb-2">Cancellation policy</h2>
          <ul className="text-[13px] text-muted-foreground space-y-1">{cancellationLines(p).map((l) => <li key={l}>• {l}</li>)}</ul>
        </section>

        <ReviewsSection listingId={p.id} rating={p.rating} reviewsCount={p.reviews} />

        <div className="lg:hidden"><StayQuote p={p} feeBps={serviceFeeBps} /></div>

        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm">Location & neighbourhood</h2>
            {unlocked && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-primary inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30"
              >
                🧭 Get directions
              </a>
            )}
          </div>
          {features.map && <StayAreaMap p={p} height={220} approximate={!unlocked} />}
          <p className="text-xs text-muted-foreground mt-2">📍 {shownLocation}</p>
          {!unlocked && (
            <div className="mt-2 rounded-xl bg-card border border-border p-3 text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-sm">🔒</span>
              <span>
                For host safety we only show the approximate area. The exact address and directions
                are unlocked as soon as your payment is confirmed.
              </span>
            </div>
          )}

          <div className="mt-4">
            <h3 className="text-xs font-bold text-muted-foreground mb-2">What's nearby</h3>
            <NearbyServices p={p} />
          </div>
        </section>


        {role !== "agent" && p.type === "Shortlet" && p.hostId && (
          <section className="mt-6 rounded-2xl bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🕓</span>
              <h3 className="font-bold text-sm">Coming to town? Reserve for viewing</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Request a 4-hour hold so you can visit the apartment before booking. The host must approve — you'll be notified instantly.
            </p>
            <Button
              onClick={() => {
                if (!session) {
                  toast.message("Sign in to reserve for viewing");
                  navigate(`/auth?mode=signin`, { state: { from: location.pathname } });
                  return;
                }
                setReserveOpen(true);
              }}
              variant="outline"
              className="w-full rounded-xl h-11 font-bold border-primary/40 text-primary hover:bg-primary/10"
            >
              Reserve for viewing (4h hold)
            </Button>
          </section>
        )}

        <section className="mt-6 rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔐</span>
            <h3 className="font-bold text-sm">Secure Escrow</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your payment is held safely until 24h after check-in.
          </p>
        </section>
        </div>

        {/* Desktop booking card */}
        <aside className="hidden lg:block sticky top-24">
          <div className="rounded-2xl bg-card border border-border p-5 shadow-xl">
            <div className="text-primary font-extrabold text-2xl leading-none">{p.price}</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {p.type === "Shortlet" ? "per night · taxes incl." : "Escrow protected"}
            </div>
            <div className="flex items-center gap-2 mt-3 text-sm">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span className="font-semibold">{p.rating}</span>
              <span className="text-muted-foreground">· {p.reviews} reviews</span>
            </div>
            {role === "agent" ? (
              <Button
                onClick={() => navigate(`/listings/${p.id}/edit`)}
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12 font-bold"
              >
                ✏️ Edit listing
              </Button>
            ) : p.type === "Shortlet" ? (
              <>
              <StayQuote p={p} feeBps={serviceFeeBps} />
              <Button
                onClick={handleBook}
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12 font-bold"
              >
                Book stay
              </Button>
              </>
            ) : (
              <Button
                onClick={() => toast.success("✓ Inspection request sent")}
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12 font-bold"
              >
                Request inspection
              </Button>
            )}
            <p className="mt-3 text-xs text-muted-foreground text-center">
              🔐 Secure Escrow — payment held safely until 24h after check-in.
            </p>
          </div>
        </aside>
      </div>

      {session && p.hostId && (
        <ReserveDialog
          open={reserveOpen}
          onOpenChange={setReserveOpen}
          listingId={p.id}
          hostId={p.hostId}
          guestId={session.user.id}
          title={p.title}
        />
      )}


      {/* Sticky CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="max-w-md mx-auto px-5 py-3 pb-20 xl:pb-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-primary font-extrabold text-lg leading-none">{p.price}</div>
            <div className="text-xs text-muted-foreground mt-1">
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
              onClick={handleBook}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 h-12 font-bold whitespace-nowrap"
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
    </>
  );
};

export default PropertyDetail;
