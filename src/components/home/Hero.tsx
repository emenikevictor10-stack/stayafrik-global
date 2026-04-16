import { Search, MapPin, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-villa.jpg";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[88vh] min-h-[560px] w-full">
        <img
          src={heroImg}
          alt="Luxury African villa at sunset"
          className="absolute inset-0 h-full w-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-hero-overlay" />

        <div className="container relative z-10 flex h-full flex-col justify-end pb-10 md:pb-20">
          <div className="max-w-2xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-background/15 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-primary-foreground border border-primary-foreground/20">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
              Authentic stays, hosted by Africa
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] text-primary-foreground md:text-6xl lg:text-7xl text-balance">
              Where the continent <em className="not-italic text-gold">welcomes</em> you home.
            </h1>
            <p className="mt-4 max-w-lg text-base text-primary-foreground/85 md:text-lg">
              From Marrakech riads to Zanzibar shores — discover handpicked homes that breathe African soul.
            </p>
          </div>

          <SearchBar />
        </div>
      </div>
    </section>
  );
};

const SearchBar = () => (
  <div className="relative z-10 mt-6 animate-scale-in md:mt-10">
    <div className="rounded-3xl border border-border/40 bg-card/95 p-2 shadow-elegant backdrop-blur-xl md:rounded-full md:p-1.5">
      <div className="grid grid-cols-1 gap-1 md:grid-cols-[1.4fr_1fr_1fr_auto]">
        <SearchField icon={<MapPin className="h-4 w-4" />} label="Destination" value="Anywhere in Africa" />
        <SearchField icon={<Calendar className="h-4 w-4" />} label="Dates" value="Any week" />
        <SearchField icon={<Users className="h-4 w-4" />} label="Guests" value="Add guests" />
        <Button variant="hero" size="lg" className="md:rounded-full md:h-12 md:w-12 md:p-0">
          <Search className="h-5 w-5" />
          <span className="md:hidden">Search</span>
        </Button>
      </div>
    </div>
  </div>
);

const SearchField = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <button className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-base hover:bg-muted md:rounded-full">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
      {icon}
    </span>
    <span className="flex flex-col min-w-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-sm font-medium text-foreground">{value}</span>
    </span>
  </button>
);
