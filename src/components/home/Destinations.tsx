import marrakech from "@/assets/dest-marrakech.jpg";
import zanzibar from "@/assets/dest-zanzibar.jpg";
import capetown from "@/assets/dest-capetown.jpg";
import serengeti from "@/assets/dest-serengeti.jpg";

const destinations = [
  { name: "Marrakech", country: "Morocco", img: marrakech, stays: 248 },
  { name: "Zanzibar", country: "Tanzania", img: zanzibar, stays: 162 },
  { name: "Cape Town", country: "South Africa", img: capetown, stays: 391 },
  { name: "Serengeti", country: "Tanzania", img: serengeti, stays: 87 },
];

export const Destinations = () => {
  return (
    <section className="container py-16 md:py-24">
      <div className="flex items-end justify-between mb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Trending
          </span>
          <h2 className="mt-2 font-display text-3xl font-bold text-foreground md:text-5xl">
            Explore destinations
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
        {destinations.map((d, i) => (
          <button
            key={d.name}
            className="group relative overflow-hidden rounded-3xl shadow-card transition-base hover:shadow-elegant"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="aspect-[4/5] overflow-hidden">
              <img
                src={d.img}
                alt={`${d.name}, ${d.country}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-left md:p-5">
              <p className="text-xs font-medium text-primary-foreground/80">{d.country}</p>
              <h3 className="font-display text-lg font-bold text-primary-foreground md:text-2xl">
                {d.name}
              </h3>
              <p className="mt-1 text-xs text-primary-foreground/70">{d.stays} stays</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
