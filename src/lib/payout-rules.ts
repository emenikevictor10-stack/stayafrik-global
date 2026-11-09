/** Admin payout rules (mirror of payout_block_reason in the database). */
export type PayoutHostFacts = {
  suspended: boolean;
  hasBank: boolean;
  bankVerified: boolean;
  idRequired: boolean;
  idApproved: boolean;
};

export const payoutBlockReason = (h: PayoutHostFacts): string | null => {
  if (h.suspended) return "Host is suspended";
  if (!h.hasBank) return "No bank account added";
  if (!h.bankVerified) return "Bank account not checked";
  if (h.idRequired && !h.idApproved) return "ID not approved";
  return null;
};

/** Admin tabs → payout statuses. */
export const PAYOUT_TABS: { value: string; label: string; statuses: string[] }[] = [
  { value: "due", label: "Due", statuses: ["pending", "processing"] },
  { value: "on_hold", label: "On hold", statuses: ["on_hold"] },
  { value: "paid", label: "Paid", statuses: ["paid"] },
  { value: "failed", label: "Failed", statuses: ["failed", "cancelled"] },
];

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export type PayoutCsvRow = {
  id: string; status: string; amount: number; host: string; email: string | null; bank: string | null;
  listing_code: string | null; check_in: string | null; due_at: string | null; paid_reference: string | null; hold_reason: string | null;
};

export const payoutsCsv = (rows: PayoutCsvRow[]) => {
  const head = ["Payout ID", "Status", "Amount (NGN)", "Host", "Email", "Bank", "Listing ID", "Check-in", "Due", "Paid reference", "Hold reason"];
  const body = rows.map((r) => [r.id, r.status, r.amount, r.host, r.email, r.bank, r.listing_code, r.check_in, r.due_at, r.paid_reference, r.hold_reason].map(cell).join(","));
  return [head.join(","), ...body].join("\n");
};
