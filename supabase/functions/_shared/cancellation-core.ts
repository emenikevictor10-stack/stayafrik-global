// Pure local-stay cancellation rules (no Deno APIs so vitest can import them).
// Policy: full refund 48h+ before check-in, 50% within 48h, none once check-in has passed.
export const CHECK_IN_HOUR = 14; // check-in time used for the 48h window (local day, 2pm)

export const refundPercent = (checkInDate: string, now: Date = new Date()): number => {
  const checkIn = new Date(`${checkInDate}T${String(CHECK_IN_HOUR).padStart(2, "0")}:00:00+01:00`);
  const hours = (checkIn.getTime() - now.getTime()) / 3_600_000;
  if (hours >= 48) return 100;
  if (hours > 0) return 50;
  return 0;
};

export const refundAmount = (total: number, checkInDate: string, now: Date = new Date()): number =>
  Math.round((Number(total) * refundPercent(checkInDate, now)) / 100);
