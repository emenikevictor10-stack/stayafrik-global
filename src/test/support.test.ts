import { describe, it, expect } from "vitest";
import { replyTargetMinutes, slaState, sortQueue, queueTab } from "@/lib/support";

describe("support reply targets", () => {
  it("urgent problems need a reply within 15 minutes", () => expect(replyTargetMinutes(true)).toBe(15));
  it("normal problems need a reply within 60 minutes", () => expect(replyTargetMinutes(false)).toBe(60));

  it("an unanswered problem past its due time is overdue", () => {
    const now = Date.parse("2026-11-08T12:00:00Z");
    expect(slaState({ status: "received", reply_due_at: "2026-11-08T11:50:00Z" }, now).overdue).toBe(true);
  });
  it("a problem waiting on the guest is never overdue for staff", () => {
    const now = Date.parse("2026-11-08T12:00:00Z");
    expect(slaState({ status: "waiting_guest", reply_due_at: "2026-11-08T11:00:00Z" }, now).overdue).toBe(false);
  });

  it("queue puts urgent first, then soonest due", () => {
    const rows = [
      { id: "a", urgent: false, reply_due_at: "2026-11-08T12:05:00Z" },
      { id: "b", urgent: true, reply_due_at: "2026-11-08T12:30:00Z" },
      { id: "c", urgent: false, reply_due_at: "2026-11-08T12:01:00Z" },
    ];
    expect(sortQueue(rows).map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("asked-if-fixed sits in the Waiting tab", () => expect(queueTab("asked_fixed")).toBe("waiting"));
});

import { shouldAutoClose, shouldAlertOverdue } from "@/lib/support";
describe("support automatic jobs", () => {
  const now = Date.parse("2026-11-09T12:00:00Z");
  it("closes 'Is it fixed?' after more than 24 h unanswered", () =>
    expect(shouldAutoClose({ status: "asked_fixed", asked_fixed_at: "2026-11-08T11:59:00Z" }, now)).toBe(true));
  it("does not close at 23 h", () =>
    expect(shouldAutoClose({ status: "asked_fixed", asked_fixed_at: "2026-11-08T13:00:00Z" }, now)).toBe(false));
  it("alerts staff for a late reply", () =>
    expect(shouldAlertOverdue({ status: "received", reply_due_at: "2026-11-09T11:00:00Z", overdue_alerted_at: null }, now)).toBe(true));
  it("alerts only once", () =>
    expect(shouldAlertOverdue({ status: "received", reply_due_at: "2026-11-09T11:00:00Z", overdue_alerted_at: "2026-11-09T11:05:00Z" }, now)).toBe(false));
});
