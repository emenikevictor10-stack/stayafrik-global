import { TopBar } from "@/components/shell/TopBar";
import { PROPERTIES } from "@/data/properties";
import { Link } from "react-router-dom";

const bookings = [
  { propId: "p1", status: "Confirmed", dates: "Apr 22 – Apr 25", code: "SA-BK-8421" },
  { propId: "p2", status: "Awaiting check-in", dates: "May 3 – May 7", code: "SA-BK-8512" },
  { propId: "p4", status: "Inspection scheduled", dates: "Apr 28, 11:00am", code: "SA-IN-2210" },
];

const statusStyle: Record<string, string> = {
  Confirmed: "bg-success/15 text-success border-success/30",
  "Awaiting check-in": "bg-info/15 text-info border-info/30",
  "Inspection scheduled": "bg-primary/15 text-primary border-primary/30",
};

const Bookings = () => {
  return (
    <>
      <TopBar title="My bookings" subtitle={`${bookings.length} active`} />
      <main className="px-5 pt-5 pb-8 space-y-3">
        {bookings.map((b) => {
          const p = PROPERTIES.find((x) => x.id === b.propId)!;
          return (
            <Link
              key={b.code}
              to={`/property/${p.id}`}
              className="flex gap-3 rounded-2xl bg-card border border-border p-3 hover:border-primary/50"
            >
              <img
                src={p.image}
                alt={p.title}
                width={120}
                height={120}
                loading="lazy"
                className="w-24 h-24 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">📍 {p.location}</p>
                <p className="text-xs mt-2">🗓️ {b.dates}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${statusStyle[b.status]}`}>
                    {b.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">{b.code}</span>
                </div>
              </div>
            </Link>
          );
        })}

        <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center">
          <div className="text-3xl mb-1">🧳</div>
          <p className="text-xs text-muted-foreground">Past trips will appear here.</p>
        </div>
      </main>
    </>
  );
};

export default Bookings;
