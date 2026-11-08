import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronRight,
  LogOut,
  Pencil,
  Home,
  Star,
  CreditCard,
  ShieldCheck,
  Heart,
  Globe,
  LifeBuoy,
  Clock,
  Wallet,
  Banknote,
  TrendingUp,
  User,
  Briefcase,
  Lock,
  Camera,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

type Item = { Icon: LucideIcon; title: string; subtitle: string; to: string };

const clientItems: Item[] = [
  { Icon: Heart, title: "Saved properties", subtitle: "Your favourite stays", to: "/explore" },
  { Icon: CreditCard, title: "Payment methods", subtitle: "Cards & escrow", to: "/profile/payments" },
  { Icon: Clock, title: "Reservations", subtitle: "Viewing holds (4h)", to: "/reservations" },
  { Icon: ShieldCheck, title: "Escrow history", subtitle: "Past protected payments", to: "/bookings" },
  { Icon: Lock, title: "Unlock PIN", subtitle: "App lock & security", to: "/profile/pin" },
  { Icon: Globe, title: "Language & currency", subtitle: "Regional preferences", to: "/profile/language" },
  { Icon: LifeBuoy, title: "Your problems", subtitle: "Issues you reported during a stay", to: "/issues" },
  { Icon: LifeBuoy, title: "Help & support", subtitle: "Get assistance", to: "/profile/help" },
];

const agentItems: Item[] = [
  { Icon: Home, title: "My Listings", subtitle: "Manage your properties", to: "/listings" },
  { Icon: Star, title: "Reviews", subtitle: "See your reviews", to: "/profile/performance" },
  { Icon: TrendingUp, title: "Performance", subtitle: "Bookings & insights", to: "/profile/performance" },
  { Icon: Clock, title: "Viewing requests", subtitle: "Approve 4h holds", to: "/reservations" },
  { Icon: Wallet, title: "Commission & payouts", subtitle: "Earnings overview", to: "/profile/commission" },
  { Icon: Banknote, title: "Payout accounts", subtitle: "Bank details", to: "/profile/payout" },
  { Icon: Lock, title: "Unlock PIN", subtitle: "App lock & security", to: "/profile/pin" },
  { Icon: Globe, title: "Language & currency", subtitle: "Regional preferences", to: "/profile/language" },
  { Icon: LifeBuoy, title: "Help & support", subtitle: "Get assistance", to: "/profile/help" },
];

/** Shared row style used by every action on this page. */
const Row = ({
  Icon,
  title,
  subtitle,
  tone = "default",
  to,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  tone?: "default" | "danger";
  to?: string;
  onClick?: () => void;
}) => {
  const inner = (
    <>
      <div className="w-11 h-11 rounded-2xl bg-background flex items-center justify-center shrink-0">
        <Icon className={cn("w-5 h-5", tone === "danger" ? "text-destructive" : "text-primary")} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className={cn("font-bold text-[15px] leading-tight", tone === "danger" && "text-destructive")}>
          {title}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </>
  );

  const className =
    "flex items-center gap-4 rounded-2xl bg-card px-4 py-3.5 hover:bg-secondary transition-colors w-full";

  return to ? (
    <Link to={to} className={className}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
};

const Profile = () => {
  const { role, user, setRole } = useRole();
  const navigate = useNavigate();
  const { signOut, user: authUser, refreshProfile } = useAuth();
  const items = role === "client" ? clientItems : agentItems;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatar = async (file: File) => {
    if (!authUser) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${authUser.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: pub.publicUrl })
        .eq("user_id", authUser.id);
      if (dbErr) throw dbErr;
      await refreshProfile();
      toast.success("Profile picture updated");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const otherRole = role === "client" ? "agent" : "client";
  const switchRole = () => {
    setRole(otherRole);
    toast.success(`Switched to ${otherRole === "agent" ? "Host" : "Client"} mode`);
    navigate("/", { replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/auth", { replace: true });
  };

  return (
    <main className="px-5 pt-6 pb-32">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Profile</h1>
      </header>

      {/* Identity */}
      <section className="flex items-center gap-4 mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-card border-2 border-primary/40 overflow-hidden flex items-center justify-center">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-extrabold text-primary">{user.initials}</span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Change profile picture"
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center disabled:opacity-60"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleAvatar(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-extrabold truncate">{user.name}</h2>
          <p className="text-sm text-muted-foreground truncate">{authUser?.email}</p>
          <p className="text-xs text-primary font-bold mt-0.5 capitalize">
            {role === "agent" ? "Host" : "Client"}
          </p>
        </div>
      </section>

      {/* Actions — every button uses the same row style */}
      <section className="space-y-3">
        <Row
          Icon={role === "client" ? Briefcase : User}
          title={role === "client" ? "Become a Host" : "Switch to Guest"}
          subtitle={
            role === "client"
              ? "List your property and start earning on Stay"
              : "Explore stays and book trips as a client"
          }
          onClick={() => (role === "client" ? navigate("/become-host") : switchRole())}
        />
        <Row Icon={Pencil} title="Edit profile" subtitle="Name, photo & details" to="/profile/edit" />

        {items.map(({ Icon, title, subtitle, to }) => (
          <Row key={title} Icon={Icon} title={title} subtitle={subtitle} to={to} />
        ))}

        <ThemeChoice />
        <Row
          Icon={LogOut}
          title="Log out"
          subtitle="Sign out of this device"
          tone="danger"
          onClick={handleSignOut}
        />
        <Row
          Icon={Trash2}
          title="Delete account"
          subtitle="Permanently remove your account"
          tone="danger"
          to="/profile/delete"
        />
      </section>

      <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span>Stay · v0.1 · Africa 🌍</span>
        <Link to="/privacy-policy" className="hover:text-primary transition-colors underline">Privacy</Link>
        <Link to="/terms" className="hover:text-primary transition-colors underline">Terms</Link>
      </div>
    </main>
  );
};

const ThemeChoice = () => {
  const [theme, setTheme] = useTheme();
  return (
    <div className="rounded-xl border border-border p-4 flex items-center gap-3">
      <div className="flex-1">
        <p className="text-base font-semibold">Appearance</p>
        <p className="text-sm text-muted-foreground">Light is the default</p>
      </div>
      <div className="flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Appearance">
        {(["light", "dark"] as const).map((t) => (
          <button key={t} role="radio" aria-checked={theme === t} onClick={() => setTheme(t)}
            className={cn("h-11 px-4 rounded-md text-sm font-semibold capitalize", theme === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Profile;
