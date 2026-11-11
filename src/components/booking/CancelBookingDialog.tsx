import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const naira = (n: number) => `₦${Math.round(n).toLocaleString()}`;

/** Staff or host cancel window: shows the refund, needs a reason and the word CANCEL. */
export function CancelBookingDialog({ bookingId, total, as, open, onOpenChange, onDone }: {
  bookingId: string; total: number; as: "admin" | "host"; open: boolean;
  onOpenChange: (v: boolean) => void; onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [policy, setPolicy] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason(""); setWord(""); setPolicy(null);
    const body = { booking_id: bookingId, preview: true, ...(as === "admin" ? { as: "admin" } : {}) };
    supabase.functions.invoke("cancel-booking", { body }).then(({ data }) => {
      if (data && typeof data.amount === "number") { setPolicy(data.amount); setAmount(String(data.amount)); }
    });
  }, [open, bookingId, as]);

  const n = Number(amount.replace(/[^\d.]/g, ""));
  const validAmount = as === "host" || (Number.isFinite(n) && n >= 0 && n <= total);
  const ok = validAmount && reason.trim().length >= 3 && word.trim().toUpperCase() === "CANCEL" && policy !== null;

  const submit = async () => {
    setBusy(true);
    const body = as === "admin" ? { booking_id: bookingId, as: "admin", amount: n, reason: reason.trim() } : { booking_id: bookingId, reason: reason.trim() };
    const { data, error } = await supabase.functions.invoke("cancel-booking", { body });
    setBusy(false);
    if (error || data?.error) return toast.error(data?.error || "Could not cancel right now");
    toast.success(data.amount > 0 ? `Cancelled. ${naira(data.amount)} refund started.` : "Cancelled.");
    onOpenChange(false); onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>
            {as === "host" ? "The guest gets a full refund and our team is told. This can't be undone."
              : `Policy refund is ${policy === null ? "…" : naira(policy)} of ${naira(total)}. You can change it. This can't be undone.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {as === "admin" && (
            <label className="block text-[13px] font-semibold">Refund amount (₦, max {naira(total)})
              <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
            </label>
          )}
          <label className="block text-[13px] font-semibold">Reason
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-[13px] font-normal" />
          </label>
          <label className="block text-[13px] font-semibold">Type CANCEL to confirm
            <Input value={word} onChange={(e) => setWord(e.target.value)} className="mt-1" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Keep booking</Button>
          <Button variant="destructive" disabled={!ok || busy} onClick={submit}>{busy ? "Cancelling…" : "Cancel booking"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
