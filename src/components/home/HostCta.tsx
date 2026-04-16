import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import accra from "@/assets/stay-accra.jpg";

export const HostCta = () => {
  return (
    <section className="container py-16 md:py-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-card shadow-elegant md:rounded-[2.5rem]">
        <div className="grid md:grid-cols-2">
          <div className="flex flex-col justify-center p-8 md:p-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              For hosts
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold text-foreground md:text-5xl text-balance">
              Open your home, open the continent.
            </h2>
            <p className="mt-4 text-base text-muted-foreground md:text-lg max-w-md">
              Earn on average $1,840 a month sharing your space with travellers who love Africa as much as you do.
            </p>
            <div className="mt-7">
              <Button variant="hero" size="lg">
                Start hosting <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[420px]">
            <img
              src={accra}
              alt="Become a host"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
