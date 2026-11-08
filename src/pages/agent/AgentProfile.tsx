import { TopBar } from "@/components/shell/TopBar";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, Camera, MapPin, Phone, Mail, Globe, Star, Pencil, BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const AgentProfile = () => {
  const { user } = useRole();
  const { profile, user: authUser } = useAuth();

  const stats = [
    { l: "Listings", v: "12" },
    { l: "Sold", v: "47" },
    { l: "Rating", v: "4.9" },
    { l: "Years", v: "6" },
  ];

  const specialties = ["Luxury", "Lekki", "Land", "Off-plan", "Short-let"];

  return (
    <>
      <TopBar title="Agent profile" subtitle="Manage your public page" />
      <main className="px-5 pt-4 pb-8">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to profile
        </Link>

        {/* Hero card */}
        <section className="relative rounded-3xl overflow-hidden border border-border">
          <div className="h-28 bg-gradient-to-br from-primary/40 via-primary/15 to-card relative">
            <div className="absolute inset-0 bg-grid opacity-30" />
            <button
              onClick={() => toast.success("Cover photo updater coming soon")}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/70 backdrop-blur flex items-center justify-center text-foreground"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-card px-5 pt-0 pb-5 -mt-10 relative">
            <div className="flex items-end gap-3">
              <div className="w-20 h-20 rounded-2xl bg-primary/20 border-4 border-card flex items-center justify-center text-4xl shadow-card overflow-hidden">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl font-extrabold text-primary">{user.initials}</span>}
              </div>
              <div className="flex-1 pb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 border border-success/30 text-xs font-bold text-success">
                  <BadgeCheck className="w-3 h-3" /> Verified · Tier 2
                </span>
              </div>
              <Link
                to="/profile/edit"
                className="mb-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" /> Edit
              </Link>
            </div>
            <h2 className="mt-3 text-lg font-extrabold">{user.name}</h2>
            <p className="text-xs text-muted-foreground">Senior Agent · Stay Pro</p>
            <div className="flex items-center gap-1 mt-1.5">
              <Star className="w-3.5 h-3.5 fill-primary text-primary" />
              <span className="text-xs font-bold">4.9</span>
              <span className="text-xs text-muted-foreground">· 132 reviews · 47 closed deals</span>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-4 gap-2 mt-4">
          {stats.map((s) => (
            <div key={s.l} className="rounded-xl bg-card border border-border py-3 text-center">
              <div className="text-primary font-extrabold text-base">{s.v}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.l}</div>
            </div>
          ))}
        </section>

        {/* Bio */}
        <section className="mt-5 rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold">About</h3>
            <Link to="/profile/edit" className="text-xs text-primary font-semibold">Edit</Link>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Lagos-based real-estate specialist focused on Lekki, Ikoyi & VI. I help diaspora buyers secure
            verified properties end-to-end — from inspection to escrow release.
          </p>
        </section>

        {/* Specialties */}
        <section className="mt-4 rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-bold mb-3">Specialties</h3>
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => (
              <span
                key={s}
                className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-semibold text-primary"
              >
                {s}
              </span>
            ))}
            <button
              onClick={() => toast.success("Add specialty coming soon")}
              className="px-3 py-1 rounded-full border border-dashed border-border text-xs text-muted-foreground"
            >
              + Add
            </button>
          </div>
        </section>

        {/* Contact */}
        <section className="mt-4 rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
          {[
            { i: Phone, l: profile?.phone || "Add phone number", s: "Mobile" },
            { i: Mail, l: profile?.email || authUser?.email || "Add email", s: "Email" },
            { i: MapPin, l: "Lekki Phase 1, Lagos", s: "Office" },
            { i: Globe, l: `stay.com/${user.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "agent"}`, s: "Public page" },
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center">
                <c.i className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">{c.s}</div>
                <div className="text-sm font-semibold truncate">{c.l}</div>
              </div>
            </div>
          ))}
        </section>

        <button
          onClick={() => toast.success("Profile saved")}
          className="mt-5 w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-bold text-sm shadow-glow"
        >
          Save changes
        </button>
      </main>
    </>
  );
};

export default AgentProfile;
