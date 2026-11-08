import { describe, it, expect } from "vitest";
import { quoteLocalStay, isWeekendNight, canMove } from "../../supabase/functions/_shared/booking-core";
import { parseIcalBusy } from "../../supabase/functions/_shared/ical-core";

const base = { price_per_night: 100_000 };

describe("host price rules", () => {
  it("weekend price applies to Friday and Saturday nights only", () => {
    // 2026-12-03 is a Thursday: Thu, Fri, Sat, Sun nights
    const q = quoteLocalStay("2026-12-03", "2026-12-07", { ...base, weekend_price: 150_000 }, 0);
    expect(q.ok && q.nights.map((n) => n.kobo / 100)).toEqual([100_000, 150_000, 150_000, 100_000]);
    expect(isWeekendNight("2026-12-04")).toBe(true);
    expect(isWeekendNight("2026-12-06")).toBe(false);
  });
  it("a date price overrides weekend and base prices", () => {
    const q = quoteLocalStay("2026-12-04", "2026-12-05", { ...base, weekend_price: 150_000, date_prices: { "2026-12-04": 200_000 } }, 0);
    expect(q.ok && q.nights_kobo).toBe(20_000_000);
  });
  it("weekly discount from 7 nights, not 6", () => {
    const six = quoteLocalStay("2026-12-01", "2026-12-07", { ...base, weekly_discount_pct: 10 }, 0);
    const seven = quoteLocalStay("2026-12-01", "2026-12-08", { ...base, weekly_discount_pct: 10 }, 0);
    expect(six.ok && six.discount_kobo).toBe(0);
    expect(seven.ok && seven.discount_kobo).toBe(7_000_000);
  });
  it("monthly discount replaces weekly from 28 nights", () => {
    const q = quoteLocalStay("2026-12-01", "2026-12-29", { ...base, weekly_discount_pct: 10, monthly_discount_pct: 25 }, 0);
    expect(q.ok && q.discount_pct).toBe(25);
  });
  it("cleaning fee charged once; 8% fee on the whole subtotal; host gets subtotal", () => {
    const q = quoteLocalStay("2026-12-01", "2026-12-04", { ...base, cleaning_fee: 20_000 }, 800);
    expect(q.ok && q.subtotal_kobo).toBe(32_000_000);
    expect(q.ok && q.fee_kobo).toBe(2_560_000);
    expect(q.ok && q.host_payout_kobo).toBe(32_000_000);
  });
  it("refuses stays shorter than minimum or longer than maximum", () => {
    expect(quoteLocalStay("2026-12-01", "2026-12-02", { ...base, min_nights: 2 }, 0).ok).toBe(false);
    expect(quoteLocalStay("2026-12-01", "2026-12-06", { ...base, max_nights: 4 }, 0).ok).toBe(false);
    expect(quoteLocalStay("2026-12-01", "2026-12-03", { ...base, min_nights: 2, max_nights: 4 }, 0).ok).toBe(true);
  });
});

describe("request to book", () => {
  it("paid request waits for host, then confirms or declines to a refund", () => {
    expect(canMove("held", "awaiting_host")).toBe(true);
    expect(canMove("awaiting_host", "confirmed")).toBe(true);
    expect(canMove("awaiting_host", "declined")).toBe(true);
    expect(canMove("declined", "refunded")).toBe(true);
    expect(canMove("awaiting_host", "released")).toBe(false);
  });
});

describe("calendar import", () => {
  it("reads busy ranges and skips past events", () => {
    const ics = "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261210\r\nDTEND;VALUE=DATE:20261213\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART:20250101\r\nDTEND:20250102\r\nEND:VEVENT\r\nEND:VCALENDAR";
    expect(parseIcalBusy(ics, "2026-11-08")).toEqual([{ start_date: "2026-12-10", end_date: "2026-12-13" }]);
  });
});
