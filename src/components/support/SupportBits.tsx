import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { DotTone } from "@/lib/support";
import { toWebp } from "@/lib/media";

const TONE: Record<DotTone, string> = {
  act: "bg-orange",
  broken: "bg-destructive",
  done: "bg-primary",
  fact: "bg-muted-foreground",
};

/** Status as a dot plus words — never a filled badge block. */
export const StatusDot = ({ tone, children, className }: { tone: DotTone; children: React.ReactNode; className?: string }) => (
  <span className={cn("inline-flex items-center gap-1.5 text-[13px] text-foreground", className)}>
    <span className={cn("w-2 h-2 rounded-full shrink-0", TONE[tone])} aria-hidden />
    {children}
  </span>
);

/** Shows private problem photos through short-lived signed links. */
export const IssuePhotos = ({ paths }: { paths: string[] }) => {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    if (!paths?.length) return setUrls([]);
    supabase.storage.from("issue-photos").createSignedUrls(paths, 600).then(({ data }) => {
      setUrls((data || []).map((d) => d.signedUrl).filter(Boolean) as string[]);
    });
  }, [paths?.join("|")]);
  if (!urls.length) return null;
  return (
    <div className="flex gap-2 flex-wrap mt-2">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer">
          <img src={u} alt="Problem photo" className="w-20 h-20 rounded-lg object-cover border border-border" loading="lazy" />
        </a>
      ))}
    </div>
  );
};

/** Converts and uploads photos into the signed-in guest's own folder. */
export const uploadIssuePhotos = async (userId: string, files: File[]) => {
  const out: string[] = [];
  for (const f of files) {
    const webp = await toWebp(f);
    const ext = webp.type === "image/webp" ? "webp" : (webp.name.split(".").pop() || "jpg");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("issue-photos").upload(path, webp, { contentType: webp.type || "image/jpeg" });
    if (error) throw new Error("A photo could not upload. Try again.");
    out.push(path);
  }
  return out;
};

export const UnderlineTabs = <T extends string>({ tabs, value, onChange }: {
  tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void;
}) => (
  <div className="flex gap-5 border-b border-border overflow-x-auto no-scrollbar" role="tablist">
    {tabs.map((t) => (
      <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
        className={cn("pb-2 -mb-px text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors",
          value === t.value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
        {t.label}{typeof t.count === "number" && t.count > 0 ? <span className="ml-1 text-muted-foreground">{t.count}</span> : null}
      </button>
    ))}
  </div>
);
