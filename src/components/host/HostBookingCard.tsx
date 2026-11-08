import { Tag } from "@/ui/kit";
import type { HostBookingRow } from "@/hooks/useHostBookings";
import { hostShare } from "@/lib/host-portal";

const fmt = (n: number) => "₦" + Math.round(n).toLocaleString();
const TONE: Record<string, "act" | "done" | "fact" | "broken"> = {
  awaiting_host: "act", confirmed: "fact", released: "done", completed: "done", cancelled: "broken", declined: "broken", refunded: "broken",
};
const WORDS: Record<string, string> = {
  awaiting_host: "Waiting for you", confirmed: "Confirmed", released: "Checked in, payout due", completed: "Stay done",
  cancelled: "Cancelled", declined: "Declined", refunded: "Refunded",
};

export const HostBookingCard = ({ r, children }: { r: HostBookingRow; children?: React.ReactNode }) => (
  <article className="rounded-xl bg-card border border-border p-4 space-y-2">
    <div className="flex gap-3">
      {r.listings?.images?.[0]
        ? <img src={r.listings.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" loading="lazy" />
        : <div className="w-14 h-14 rounded-lg bg-surface shrink-0" aria-hidden />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{r.listings?.title || "Stay"}</p>
        <p className="text-xs text-muted-foreground">{r.check_in_date} → {r.check_out_date}{r.guest_count ? ` · ${r.guest_count} guest${r.guest_count > 1 ? "s" : ""}` : ""}</p>
        <p className="text-xs text-muted-foreground">{r.guest_name}{r.guest_phone ? ` · ${r.guest_phone}` : ""}{r.listing_code ? ` · ${r.listing_code}` : ""}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold">{fmt(hostShare(r))}</p>
        <p className="text-xs text-muted-foreground">your share</p>
      </div>
    </div>
    <Tag tone={TONE[r.status] ?? "fact"}>{WORDS[r.status] ?? r.status}</Tag>
    {children}
  </article>
);
