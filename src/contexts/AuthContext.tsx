import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  is_host: boolean;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profileLoading: boolean;
  loading: boolean;
  isNewUser: boolean;
  setIsNewUser: (v: boolean) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const ensureProfile = async (authUser: User) => {
    const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "";
    const avatarUrl = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null;
    const role = authUser.user_metadata?.role === "agent" ? "agent" : "client";

    await supabase.from("profiles").upsert(
      {
        user_id: authUser.id,
        full_name: fullName,
        avatar_url: avatarUrl,
        email: authUser.email ?? null,
        is_host: role === "agent",
      },
      { onConflict: "user_id", ignoreDuplicates: false },
    );

    await supabase.from("user_roles").upsert(
      { user_id: authUser.id, role },
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );
  };

  const refreshProfile = async () => {
    const authUser = session?.user;
    if (!authUser) {
      setProfile(null);
      return;
    }

    setProfileLoading(true);
    try {
      let { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, email, phone, is_host")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (!data) {
        await ensureProfile(authUser);
        const result = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, email, phone, is_host")
          .eq("user_id", authUser.id)
          .maybeSingle();
        data = result.data;
      }

      setProfile((data as Profile | null) ?? null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Team sign-in return: go back to the admin page asked for, once the session exists.
  useEffect(() => {
    if (!session) return;
    const back = sessionStorage.getItem("sg-admin-return");
    if (!back) return;
    sessionStorage.removeItem("sg-admin-return");
    if (back.startsWith("/admin") && window.location.pathname !== back) window.location.assign(back);
  }, [session]);

  useEffect(() => {
    refreshProfile();
  }, [session?.user?.id]);

  const signOut = async () => {
    setProfile(null);
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, profile, profileLoading, loading, isNewUser, setIsNewUser, refreshProfile, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
};
