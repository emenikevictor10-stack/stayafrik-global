import { Instagram, Twitter, Facebook } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/40 mt-20">
      <div className="container py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-sunset">
                <span className="font-display text-lg font-bold text-primary-foreground">S</span>
              </div>
              <span className="font-display text-xl font-bold tracking-tight">Stayafrik</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Discover authentic stays across Africa, hosted by people who love their continent.
            </p>
          </div>

          <FooterCol
            title="Explore"
            links={["Destinations", "Experiences", "Gift cards", "City guides"]}
          />
          <FooterCol
            title="Hosting"
            links={["Become a host", "Hosting resources", "Community forum", "Host insurance"]}
          />
          <FooterCol
            title="Stayafrik"
            links={["About us", "Newsroom", "Careers", "Contact"]}
          />
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 md:flex-row md:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Stayafrik. Crafted with love across the continent.
          </p>
          <div className="flex items-center gap-3">
            <SocialIcon icon={<Instagram className="h-4 w-4" />} />
            <SocialIcon icon={<Twitter className="h-4 w-4" />} />
            <SocialIcon icon={<Facebook className="h-4 w-4" />} />
          </div>
        </div>
      </div>
    </footer>
  );
};

const FooterCol = ({ title, links }: { title: string; links: string[] }) => (
  <div>
    <h4 className="font-display text-sm font-semibold text-foreground mb-3">{title}</h4>
    <ul className="space-y-2">
      {links.map((l) => (
        <li key={l}>
          <Link to="/" className="text-sm text-muted-foreground transition-base hover:text-primary">
            {l}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const SocialIcon = ({ icon }: { icon: React.ReactNode }) => (
  <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-base hover:border-primary hover:text-primary">
    {icon}
  </button>
);
