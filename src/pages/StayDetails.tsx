import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getStay, stays } from "@/data/stays";
import { Button } from "@/components/ui/button";
import {
  Star,
  MapPin,
  Heart,
  Share,
  Wifi,
  Car,
  Utensils,
  Waves,
  Wind,
  Tv,
  Award,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const amenities = [
  { icon: Wifi, label: "Fast Wi-Fi" },
  { icon: Waves, label: "Private pool" },
  { icon: Utensils, label: "Chef kitchen" },
  { icon: Wind, label: "Air conditioning" },
  { icon: Car, label: "Free parking" },
  { icon: Tv, label: "Smart TV" },
];

const reviews = [
  { name: "Amara O.", date: "October 2024", text: "An absolute dream. The host welcomed us like family and the views at sunset were unforgettable.", rating: 5 },
  { name: "Thabo M.", date: "September 2024", text: "Stylish, spacious, and incredibly thoughtful touches everywhere. Would book again in a heartbeat.", rating: 5 },
  { name: "Fatima K.", date: "August 2024", text: "Perfect base to explore. Spotless, calm, and the breakfast was the highlight of our trip.", rating: 5 },
  { name: "Liam W.", date: "July 2024", text: "Photos don't do it justice. The team made every detail effortless.", rating: 5 },
];

const StayDetails = () => {
  const { id } = useParams();
  const stay = getStay(id || "") || stays[0];
  const [liked, setLiked] = useState(false);
  const gallery = [stay.img, ...stays.filter((s) => s.id !== stay.id).slice(0, 4).map((s) => s.img)];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container pt-4 md:pt-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-base md:hidden mb-3">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {/* Title block */}
        <div className="hidden md:block">
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            {stay.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-foreground" />
                <span className="font-semibold">{stay.rating.toFixed(2)}</span>
                <span className="text-muted-foreground">({stay.reviews} reviews)</span>
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {stay.location}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm">
                <Share className="h-4 w-4" /> Share
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLiked((v) => !v)}
              >
                <Heart className={cn("h-4 w-4 transition-base", liked && "fill-primary text-primary")} />
                Save
              </Button>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div className="mt-4 grid gap-2 md:mt-6 md:grid-cols-4 md:grid-rows-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl md:col-span-2 md:row-span-2 md:aspect-auto md:rounded-[2rem]">
            <img src={gallery[0]} alt={stay.title} className="h-full w-full object-cover" />
            {stay.badge && (
              <span className="absolute left-4 top-4 rounded-full bg-background/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-soft md:hidden">
                {stay.badge}
              </span>
            )}
          </div>
          {gallery.slice(1, 5).map((img, i) => (
            <div key={i} className="hidden md:block relative aspect-square overflow-hidden rounded-2xl">
              <img src={img} alt={`${stay.title} ${i + 2}`} loading="lazy" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>

        {/* Mobile title */}
        <div className="mt-5 md:hidden">
          <h1 className="font-display text-2xl font-bold text-foreground">{stay.title}</h1>
          <div className="mt-1 flex items-center gap-x-3 gap-y-1 flex-wrap text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-foreground">
              <Star className="h-3.5 w-3.5 fill-foreground" />
              <span className="font-semibold">{stay.rating.toFixed(2)}</span>
            </span>
            <span>{stay.reviews} reviews</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {stay.location}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="mt-8 grid gap-10 md:mt-12 md:grid-cols-[1fr_380px] md:gap-14">
          <div className="space-y-10">
            {/* Host */}
            <div className="flex items-center justify-between border-b border-border pb-8">
              <div>
                <h2 className="font-display text-xl font-semibold md:text-2xl">
                  Hosted by Adaeze
                </h2>
                <p className="text-sm text-muted-foreground">Superhost · 4 years hosting</p>
              </div>
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-sunset font-display text-xl font-bold text-primary-foreground shadow-soft">
                  A
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-secondary">
                  <Award className="h-3 w-3 text-gold" />
                </div>
              </div>
            </div>

            {/* About */}
            <div>
              <h3 className="font-display text-xl font-semibold mb-3">About this stay</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                Tucked into one of the continent's most loved neighbourhoods, this home is a calm
                escape designed around natural light, locally crafted furniture, and quiet evenings
                under the stars. Perfect for slow mornings, long dinners with friends, and waking up
                to a view that reminds you why you came.
              </p>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="font-display text-xl font-semibold mb-5">What this place offers</h3>
              <div className="grid grid-cols-2 gap-4">
                {amenities.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div>
              <h3 className="font-display text-xl font-semibold mb-5 flex items-center gap-2">
                <Star className="h-5 w-5 fill-foreground" />
                {stay.rating.toFixed(2)} · {stay.reviews} reviews
              </h3>
              <div className="grid gap-5 sm:grid-cols-2">
                {reviews.map((r) => (
                  <div key={r.name} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-semibold">
                        {r.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.date}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Booking widget (desktop) */}
          <div className="hidden md:block">
            <div className="sticky top-28">
              <BookingCard price={stay.price} rating={stay.rating} reviews={stay.reviews} />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile sticky bar */}
      <div className="sticky bottom-0 z-40 mt-10 border-t border-border bg-background/95 px-5 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">
              ${stay.price}<span className="text-sm font-normal text-muted-foreground"> /night</span>
            </p>
            <p className="text-xs text-muted-foreground">Oct 14 – 19</p>
          </div>
          <Button variant="hero" size="lg">Reserve</Button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

const BookingCard = ({ price, rating, reviews }: { price: number; rating: number; reviews: number }) => {
  const nights = 5;
  const subtotal = price * nights;
  const cleaning = 35;
  const service = Math.round(subtotal * 0.12);
  const total = subtotal + cleaning + service;

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant">
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-semibold text-foreground">
          ${price}
          <span className="text-base font-normal text-muted-foreground"> / night</span>
        </p>
        <span className="inline-flex items-center gap-1 text-sm">
          <Star className="h-3.5 w-3.5 fill-foreground" />
          <span className="font-medium">{rating.toFixed(2)}</span>
          <span className="text-muted-foreground">· {reviews}</span>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-border">
        <div className="border-r border-border p-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Check-in</p>
          <p className="text-sm font-medium text-foreground mt-0.5">Oct 14, 2025</p>
        </div>
        <div className="p-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Check-out</p>
          <p className="text-sm font-medium text-foreground mt-0.5">Oct 19, 2025</p>
        </div>
        <div className="col-span-2 border-t border-border p-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Guests</p>
          <p className="text-sm font-medium text-foreground mt-0.5">2 adults</p>
        </div>
      </div>

      <Button variant="hero" size="lg" className="mt-4 w-full">
        Reserve
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">You won't be charged yet</p>

      <div className="mt-5 space-y-2 text-sm">
        <Row label={`$${price} × ${nights} nights`} value={`$${subtotal}`} />
        <Row label="Cleaning fee" value={`$${cleaning}`} />
        <Row label="Service fee" value={`$${service}`} />
        <div className="my-3 border-t border-border" />
        <Row label="Total before taxes" value={`$${total}`} bold />
      </div>
    </div>
  );
};

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="flex justify-between">
    <span className={cn("text-muted-foreground", bold && "font-semibold text-foreground")}>{label}</span>
    <span className={cn("text-foreground", bold && "font-semibold")}>{value}</span>
  </div>
);

export default StayDetails;
