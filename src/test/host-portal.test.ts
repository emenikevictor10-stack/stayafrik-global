import { describe, it, expect } from "vitest";
import { groupBookings, payoutTotals, guestDisplayName, timeLeft } from "@/lib/host-portal";

const b = (id: string, status: string, ci: string, co: string, payout: number | null = null, total = 0) =>
  ({ id, status, check_in_date: ci, check_out_date: co, total_price: total, host_payout_kobo: payout });

describe("host portal", () => {
  it("groups stays into upcoming, current and past by date", () => {
    const g = groupBookings([
      b("up", "confirmed", "2026-12-10", "2026-12-12"),
      b("now", "released", "2026-11-07", "2026-11-10"),
      b("past", "completed", "2026-11-01", "2026-11-08"),
      b("req", "awaiting_host", "2026-12-01", "2026-12-02"),
    ], "2026-11-08");
    expect(g.upcoming.map((x) => x.id)).toEqual(["up"]);
    expect(g.current.map((x) => x.id)).toEqual(["now"]);
    expect(g.past.map((x) => x.id)).toEqual(["past"]);
  });
  it("payout totals use the host share saved on each booking, not the guest total", () => {
    const t = payoutTotals([b("a", "confirmed", "", "", 27_000_000, 291_600), b("c", "released", "", "", 10_000_000, 108_000), b("d", "completed", "", "", null, 50_000)]);
    expect(t).toEqual({ held: 270_000, due: 100_000, done: 50_000 });
  });
  it("shows first name only before the booking is confirmed", () => {
    expect(guestDisplayName("Ada Obi", "awaiting_host")).toBe("Ada");
    expect(guestDisplayName("Ada Obi", "confirmed")).toBe("Ada Obi");
    expect(guestDisplayName("", "confirmed")).toBe("Guest");
  });
  it("counts down to the reply deadline", () => {
    const now = Date.parse("2026-11-08T10:00:00Z");
    expect(timeLeft("2026-11-08T15:12:00Z", now)).toBe("5h 12m left");
    expect(timeLeft("2026-11-08T09:00:00Z", now)).toBe("Time is up");
  });
});
