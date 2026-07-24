import { TopBar } from "@/components/shell/TopBar";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Camera } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { toWebp } from "@/lib/media";

const EditProfile = () => {
  const { user } = useRole();
  const { user: authUser, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(authUser?.email || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isHost = !!profile?.is_host;

  useEffect(() => {
    setName(user.name);
    setEmail(profile?.email || authUser?.email || "");
    setPhone(profile?.phone || "");
    setWhatsapp(((profile as any)?.whatsapp as string) || "");
    setBio(((profile as any)?.bio as string) || "");
  }, [authUser?.email, profile?.email, profile?.phone, (profile as any)?.whatsapp, (profile as any)?.bio, user.name]);

  const uploadAvatar = async (file: File) => {
    if (!authUser) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Image must be under 10MB");
    setUploading(true);
    try {
      const light = await toWebp(file);
      const path = `${authUser.id}/avatar-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, light, {
        cacheControl: "3600",
        upsert: true,
        contentType: light.type,
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

  const save = async () => {
    if (!authUser) return;
    if (isHost && !whatsapp.trim()) {
      return toast.error("WhatsApp number is required for hosts");
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { user_id: authUser.id, full_name: name.trim(), email, phone, whatsapp: whatsapp.trim() || null, bio: bio.trim() || null } as any,
        { onConflict: "user_id" },
      );
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
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
            <div className="w-24 h-24 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center text-5xl overflow-hidden">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl font-extrabold text-primary">{user.initials}</span>}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center disabled:opacity-60"
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
                if (f) uploadAvatar(f);
                e.target.value = "";
              }}
            />
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-3 text-xs text-primary font-bold disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Change profile picture"}
          </button>
        </section>

        {/* Form */}
        <section className="space-y-4">
          {[
            { l: "Full name", v: name, set: setName, type: "text" },
            { l: "Email", v: email, set: setEmail, type: "email" },
            { l: "Phone", v: phone, set: setPhone, type: "tel" },
          ].map((f) => (
            <label key={f.l} className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{f.l}</span>
              <input type={f.type} value={f.v} onChange={(e) => f.set(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm" />
            </label>
          ))}
        </section>

        <button onClick={save} disabled={saving} className="mt-6 w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-bold text-sm shadow-glow disabled:opacity-60">
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button onClick={() => navigate(-1)} className="mt-3 w-full rounded-2xl border border-border bg-card py-3.5 font-bold text-sm">
          Cancel
        </button>
      </main>
    </>
  );
};

export default EditProfile;
