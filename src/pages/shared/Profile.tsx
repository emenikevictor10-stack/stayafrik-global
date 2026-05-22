import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronRight,
  LogOut,
  Pencil,
  Home,
  Star,
  Settings,
  CreditCard,
  ShieldCheck,
  Heart,
  Globe,
  LifeBuoy,
  Wallet,
  Banknote,
  TrendingUp,
  User,
  Briefcase,
  Lock,
  Camera,
  type LucideIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Item = { Icon: LucideIcon; title: string; subtitle: string; to: string };

const clientItems: Item[] = [
  { Icon: Heart, title: "Saved properties", subtitle: "Your favourite stays", to: "/explore" },
  { Icon: CreditCard, title: "Payment methods", subtitle: "Cards & escrow", to: "/profile/payments" },
  { Icon: ShieldCheck, title: "Escrow history", subtitle: "Past protected payments", to: "/bookings" },
  { Icon: Lock, title: "Unlock PIN", subtitle: "App lock & security", to: "/profile/pin" },
  { Icon: Globe, title: "Language & currency", subtitle: "Regional preferences", to: "/profile/language" },
  { Icon: LifeBuoy, title: "Help & support", subtitle: "Get assistance", to: "/profile/help" },
  { Icon: Settings, title: "Settings", subtitle: "Account & preferences", to: "/profile/edit" },
];

const agentItems: Item[] = [
  { Icon: Home, title: "My Listings", subtitle: "Manage your properties", to: "/listings" },
  { Icon: Star, title: "Reviews", subtitle: "See your reviews", to: "/profile/performance" },
  { Icon: TrendingUp, title: "Performance", subtitle: "Bookings & insights", to: "/profile/performance" },
  { Icon: Wallet, title: "Commission & payouts", subtitle: "Earnings overview", to: "/profile/commission" },
  { Icon: Banknote, title: "Payout accounts", subtitle: "Bank details", to: "/profile/payout" },
  { Icon: Lock, title: "Unlock PIN", subtitle: "App lock & security", to: "/profile/pin" },
  { Icon: Globe, title: "Language & currency", subtitle: "Regional preferences", to: "/profile/language" },
  { Icon: LifeBuoy, title: "Help & support", subtitle: "Get assistance", to: "/profile/help" },
  { Icon: Settings, title: "Settings", subtitle: "Account & preferences", to: "/profile/edit" },
];

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

  return (
    <main className="px-5 pt-6 pb-32">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Profile</h1>
        <Link to="/profile/edit" className="flex items-center gap-1.5 text-primary text-sm font-bold">
          <Pencil className="w-4 h-4" /> Edit
        </Link>
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

      {/* Become a Host / Switch mode promo card */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-5 mb-7">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
        <div className="relative">
          <h3 className="text-lg font-extrabold mb-1">
            {role === "client" ? "Become a Host" : "Switch to Guest"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-[280px]">
            {role === "client"
              ? "List your property and start earning on Stay"
              : "Explore stays and book trips as a client"}
          </p>
          <button
            onClick={switchRole}
            className="rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-extrabold shadow-glow inline-flex items-center gap-2"
          >
            {role === "client" ? (
              <>
                <Briefcase className="w-4 h-4" /> List your place
              </>
            ) : (
              <>
                <User className="w-4 h-4" /> Browse as client
              </>
            )}
          </button>
        </div>
      </section>

      {/* Menu list */}
      <section className="space-y-3">
        {items.map(({ Icon, title, subtitle, to }) => (
          <Link
            key={title}
            to={to}
            className="flex items-center gap-4 rounded-2xl bg-card border border-border/60 px-4 py-3.5 hover:bg-secondary transition-colors border-none"
          >
            <div className="w-11 h-11 rounded-2xl bg-background flex items-center justify-center border border-border/60 border-none">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[15px] leading-tight">{title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
            </div>
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
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive py-3.5 text-sm font-bold"
      >
        <LogOut className="w-4 h-4" /> Log out
      </button>

      <p className="text-center text-[10px] text-muted-foreground mt-6">Stay · v0.1 · Africa 🌍</p>
    </main>
  );
};

export default Profile;
