import { Link, useLocation } from "react-router-dom";
import { Search, Menu, User, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-3 md:h-20">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-sunset shadow-soft">
            <span className="font-display text-lg font-bold text-primary-foreground">S</span>
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground hidden sm:inline">
            Stayafrik
          </span>
        </Link>

        {!isHome && (
          <button className="flex flex-1 max-w-md items-center gap-3 rounded-full border border-border bg-background px-4 py-2.5 shadow-card transition-base hover:shadow-soft">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground truncate">Where to next?</span>
          </button>
        )}

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="hidden md:inline-flex">
            Become a host
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
            <Globe className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1.5 shadow-card">
            <Menu className="h-4 w-4 text-foreground ml-1" />
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <User className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
