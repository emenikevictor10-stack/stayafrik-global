export const ISSUE_CATEGORIES = [
  { value: "power", label: "Power" },
  { value: "water", label: "Water" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "access", label: "Getting in" },
  { value: "noise", label: "Noise" },
  { value: "safety", label: "Safety" },
  { value: "other", label: "Something else" },
] as const;

export type IssueStatus = "received" | "in_progress" | "waiting_host" | "waiting_guest" | "asked_fixed" | "closed";

export const categoryLabel = (c: string) => ISSUE_CATEGORIES.find((x) => x.value === c)?.label ?? c;

/** Staff reply targets from the PRD: 15 min urgent, 60 min normal. */
export const replyTargetMinutes = (urgent: boolean) => (urgent ? 15 : 60);

/** Tone for a status dot: act (orange), broken (red), done (blue), fact (grey). */
export type DotTone = "act" | "broken" | "done" | "fact";

/** Plain words a guest sees for each status. */
export const guestStatusText: Record<IssueStatus, string> = {
  received: "We've got it",
  in_progress: "We're on it",
  waiting_host: "Waiting on the host",
  waiting_guest: "We replied",
  asked_fixed: "Is it fixed?",
  closed: "Closed",
};

export const staffStatusText: Record<IssueStatus, string> = {
  received: "New",
  in_progress: "In progress",
  waiting_host: "Waiting on host",
  waiting_guest: "Waiting on guest",
  asked_fixed: "Asked if fixed",
  closed: "Closed",
};

/** Is staff on the hook to reply, and is it late? */
export const slaState = (
  i: { status: string; reply_due_at: string },
  now = Date.now(),
): { needsReply: boolean; overdue: boolean; minutesLeft: number } => {
  const needsReply = i.status === "received" || i.status === "in_progress";
  const minutesLeft = Math.round((new Date(i.reply_due_at).getTime() - now) / 60000);
  return { needsReply, overdue: needsReply && minutesLeft < 0, minutesLeft };
};

export const staffTone = (i: { status: string; reply_due_at: string }, now = Date.now()): DotTone => {
  if (i.status === "closed") return "done";
  const s = slaState(i, now);
  if (s.overdue) return "broken";
  if (s.needsReply) return "act";
  return "fact";
};

/** Queue order: urgent first, then soonest reply due. */
export const sortQueue = <T extends { urgent: boolean; reply_due_at: string }>(rows: T[]) =>
  [...rows].sort((a, b) =>
    a.urgent !== b.urgent ? (a.urgent ? -1 : 1) : new Date(a.reply_due_at).getTime() - new Date(b.reply_due_at).getTime(),
  );

export const queueTab = (status: string): "open" | "waiting" | "closed" =>
  status === "closed" ? "closed" : status === "waiting_guest" || status === "waiting_host" || status === "asked_fixed" ? "waiting" : "open";

export const dueText = (minutesLeft: number) => {
  const m = Math.abs(minutesLeft);
  const t = m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
  return minutesLeft < 0 ? `${t} late` : `due in ${t}`;
};
