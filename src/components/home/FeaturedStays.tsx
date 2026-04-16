import { stays } from "@/data/stays";
import { StayCard } from "@/components/stays/StayCard";
import { Button } from "@/components/ui/button";

const categories = ["Trending", "Beachfront", "Safari", "Cities", "Riads", "Mountains"];

export const FeaturedStays = () => {
  return (
    <section className="container pb-16 md:pb-24">
      <div className="flex items-end justify-between mb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Handpicked
          </span>
          <h2 className="mt-2 font-display text-3xl font-bold text-foreground md:text-5xl">
            Stays you'll love
          </h2>
        </div>
      </div>

      <div className="-mx-5 mb-8 flex gap-2 overflow-x-auto scrollbar-hide px-5 pb-1">
        {categories.map((c, i) => (
          <Button
            key={c}
            variant={i === 0 ? "secondary" : "soft"}
            size="sm"
            className="shrink-0"
          >
            {c}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stays.map((stay) => (
          <StayCard key={stay.id} stay={stay} />
        ))}
      </div>
    </section>
  );
};
