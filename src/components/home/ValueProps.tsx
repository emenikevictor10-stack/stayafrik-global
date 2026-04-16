import { Shield, Globe, Heart } from "lucide-react";

const items = [
  {
    icon: Globe,
    title: "Curated across 30+ countries",
    desc: "Every home is personally vetted by our local Stayafrik scouts.",
  },
  {
    icon: Shield,
    title: "Booked with confidence",
    desc: "Secure payments, verified hosts, and 24/7 support in every timezone.",
  },
  {
    icon: Heart,
    title: "Hosting that gives back",
    desc: "A share of every booking funds community-led tourism projects.",
  },
];

export const ValueProps = () => {
  return (
    <section className="bg-secondary text-secondary-foreground">
      <div className="container py-16 md:py-24">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-gold">
            Why Stayafrik
          </span>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-5xl text-balance">
            A stay is just the start of the story.
          </h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-3xl border border-secondary-foreground/10 bg-secondary-foreground/5 p-6 backdrop-blur transition-base hover:bg-secondary-foreground/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-sunset shadow-glow">
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-secondary-foreground/75">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
