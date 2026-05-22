import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Browser/PWA notifications. When a new row hits `notifications` for the
 * current user we show a native Notification if permission was granted.
 * Works on Android Chrome PWAs out of the box.
 */
export const usePushNotifications = () => {
  const { user } = useAuth();
  const subbed = useRef(false);

  useEffect(() => {
    if (!user || subbed.current) return;
    if (!("Notification" in window)) return;
    subbed.current = true;

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    const show = (title: string, body: string | null, link: string | null) => {
      if (Notification.permission !== "granted") return;
      try {
        const n = new Notification(title, {
          body: body || "",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: link || title,
        });
        n.onclick = () => {
          window.focus();
          if (link) window.location.assign(link);
        };
      } catch { /* SW-only on some browsers */ }
    };

    const ch = supabase
      .channel(`push:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const n = payload.new;
          show(n.title, n.body, n.link);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); subbed.current = false; };
  }, [user]);
};

export const requestPushPermission = async () => {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "default") return await Notification.requestPermission();
  return Notification.permission;
};
