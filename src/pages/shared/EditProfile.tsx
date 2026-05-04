import { TopBar } from "@/components/shell/TopBar";
import { useRole } from "@/contexts/RoleContext";
import { ChevronLeft, Camera } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const EditProfile = () => {
  const { user, role } = useRole();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(role === "agent" ? "emeka@stayafrik.com" : "adaeze@example.com");
  const [phone, setPhone] = useState("+234 803 555 0123");
  const [bio, setBio] = useState(role === "agent" ? "Lagos-based agent · Lekki, Ikoyi, VI." : "Diaspora traveller — love verified shortlets in Lagos.");
  const [city, setCity] = useState("Lagos");

  const save = () => {
    toast.success("Profile updated");
    navigate("/profile");
  };

  return (
    <>
      <TopBar title="Edit profile" />
      <main className="px-5 pt-4 pb-32">
        <Link to="/profile" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Link>

        {/* Avatar */}
        <section className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center text-5xl">
              {user.emoji}
            </div>
            <button onClick={() => toast.success("Photo picker coming soon")}
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => toast.success("Photo picker coming soon")} className="mt-3 text-xs text-primary font-bold">Change profile picture</button>
        </section>

        {/* Form */}
        <section className="space-y-4">
          {[
            { l: "Full name", v: name, set: setName, type: "text" },
            { l: "Email", v: email, set: setEmail, type: "email" },
            { l: "Phone", v: phone, set: setPhone, type: "tel" },
            { l: "City", v: city, set: setCity, type: "text" },
          ].map((f) => (
            <label key={f.l} className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{f.l}</span>
              <input type={f.type} value={f.v} onChange={(e) => f.set(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm" />
            </label>
          ))}
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Bio</span>
            <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm resize-none" />
          </label>
        </section>

        <button onClick={save} className="mt-6 w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-bold text-sm shadow-glow">
          Save changes
        </button>
        <button onClick={() => navigate(-1)} className="mt-3 w-full rounded-2xl border border-border bg-card py-3.5 font-bold text-sm">
          Cancel
        </button>
      </main>
    </>
  );
};

export default EditProfile;
