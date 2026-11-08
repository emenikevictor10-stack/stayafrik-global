import { Star } from "lucide-react";
import { useReviews } from "@/hooks/useReviews";

const initials = (n: string) =>
  n.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "G";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { month: "short", year: "numeric" });

export const ReviewsSection = ({
  listingId,
  rating,
  reviewsCount,
}: {
  listingId: string;
  rating: number;
  reviewsCount: number;
}) => {
  const { data, loading } = useReviews(listingId);

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm inline-flex items-center gap-2">
          <Star className="w-4 h-4 fill-primary text-primary" />
          <span>{Number(rating).toFixed(2)}</span>
          <span className="text-muted-foreground font-normal">· {reviewsCount} reviews</span>
        </h2>
      </div>

      {loading && (
        <div className="text-xs text-muted-foreground">Loading reviews…</div>
      )}

      {!loading && data.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-4 text-xs text-muted-foreground">
          No reviews yet. Be the first to share your experience after your stay.
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
          {data.map((r) => (
            <article
              key={r.id}
              className="shrink-0 w-72 rounded-2xl bg-card border border-border p-4"
            >
              <header className="flex items-center gap-3">
                {r.guest_avatar ? (
                  <img
                    src={r.guest_avatar}
                    alt={r.guest_name}
                    className="w-9 h-9 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                    {initials(r.guest_name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{r.guest_name}</div>
                  <div className="text-xs text-success font-medium">✓ Verified stay · {fmtDate(r.created_at)}</div>
                </div>
              </header>
              <div className="mt-2 flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={
                      i < r.rating ? "w-3.5 h-3.5 fill-primary text-primary" : "w-3.5 h-3.5 text-muted-foreground/40"
                    }
                  />
                ))}
              </div>
              {r.comment && (
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-5">
                  {r.comment}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
