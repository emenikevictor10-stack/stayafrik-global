import { TopBar } from "@/components/shell/TopBar";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronRight,
  LogOut,
  Pencil,
  IdCard,
  CreditCard,
  ShieldCheck,
  Heart,
  Globe,
  LifeBuoy,
  BadgeCheck,
  Wallet,
  Banknote,
  TrendingUp,
  User,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

type Item = { Icon: LucideIcon; l: string; to: string };

const clientItems: Item[] = [
  { Icon: IdCard, l: "Personal info", to: "/profile/edit" },
  { Icon: CreditCard, l: "Payment methods", to: "/profile/edit" },
  { Icon: ShieldCheck, l: "Escrow history", to: "/bookings" },
  { Icon: Heart, l: "Saved properties", to: "/explore" },
  { Icon: Globe, l: "Language & currency", to: "/profile/language" },
  { Icon: LifeBuoy, l: "Help & support", to: "/profile/help" },
];

const agentItems: Item[] = [
  { Icon: IdCard, l: "Agent profile", to: "/profile/agent" },
  { Icon: BadgeCheck, l: "Verification status", to: "/profile/verification" },
  { Icon: Wallet, l: "Commission & payouts", to: "/profile/commission" },
  { Icon: Banknote, l: "Payout accounts", to: "/profile/payout" },
  { Icon: TrendingUp, l: "Performance", to: "/profile/performance" },
  { Icon: Globe, l: "Language & currency", to: "/profile/language" },
  { Icon: LifeBuoy, l: "Help & support", to: "/profile/help" },
];

const Profile = () => {
  const { role, user, setRole } = useRole();
  const navigate = useNavigate();
  const { signOut, user: authUser } = useAuth();
  const items = role === "client" ? clientItems : agentItems;

  return (
    <>
      <TopBar title="Profile" />
      <main className="px-5 pt-5 pb-8">
        <section className="rounded-2xl bg-card border border-border p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-3xl overflow-hidden">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-xl font-extrabold text-primary">{user.initials}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold flex items-center gap-1.5">
              {user.name}
              {authUser?.email_confirmed_at && (
                <span className="text-[10px] text-primary font-bold">✓ Verified</span>
              )}
            </h2>
            <p className="text-[11px] text-muted-foreground truncate">{authUser?.email}</p>
            <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
              {role} account ·{" "}
              {authUser && localStorage.getItem(`stay:onboarded:${authUser.id}`) === "1"
                ? "Onboarding complete"
                : "Onboarding pending"}
            </p>
          </div>
          <Link to="/profile/edit" className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Pencil className="w-4 h-4" />
          </Link>
        </section>

        <button
          onClick={() => {
            setRole(role === "client" ? "agent" : "client");
            toast.success(`Switched to ${role === "client" ? "Agent" : "Client"} mode`);
          }}
          className="mt-4 w-full rounded-2xl border border-primary/40 bg-primary/10 text-primary py-3 text-sm font-bold hover:bg-primary/15"
        >
          Switch to <span className="inline-flex items-center gap-1">{role === "client" ? <><Briefcase className="w-3.5 h-3.5" /> Agent</> : <><User className="w-3.5 h-3.5" /> Client</>}</span> mode
        </button>

        <section className="mt-5 rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
          {items.map(({ Icon, l, to }) => (
            <Link key={l} to={to} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary text-left">
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-sm flex-1">{l}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
        </section>

        <button
          onClick={async () => {
            await signOut();
            toast.success("Signed out");
            navigate("/auth", { replace: true });
          }}
          className="mt-5 w-full flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive py-3.5 text-sm font-bold"
        >
          <LogOut className="w-4 h-4" /> Log out
        </button>

        <p className="text-center text-[10px] text-muted-foreground mt-6">Stay · v0.1 · Africa 🌍</p>
      </main>
    </>
  );
};

export default Profile;
