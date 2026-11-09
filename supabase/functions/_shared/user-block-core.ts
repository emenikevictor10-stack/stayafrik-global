/** Pure blocked-account rules (no Deno APIs) shared by edge functions and tests. */
export type UserStatusRow = { blocked_at: string | null } | null | undefined;

export const isBlocked = (row: UserStatusRow): boolean => !!row?.blocked_at;

export const blockedMessage = (supportEmail: string) =>
  `Your account can't make bookings right now. Contact ${supportEmail || "support@stayglobal.app"} for help.`;

/** Staff replies: trimmed, max 1000 chars; empty means "remove the reply". */
export const normaliseReply = (body: string): string | null => {
  const t = (body || "").trim();
  return t ? t.slice(0, 1000) : null;
};
