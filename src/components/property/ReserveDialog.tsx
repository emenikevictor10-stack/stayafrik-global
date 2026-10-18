import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createReservation } from "@/hooks/useReservations";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  listingId: string;
  hostId: string;
  guestId: string;
  title: string;
};

export const ReserveDialog = ({ open, onOpenChange, listingId, hostId, guestId, title }: Props) => {
  const [visitAt, setVisitAt] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const { error } = await createReservation({
      listing_id: listingId,
      guest_id: guestId,
      host_id: hostId,
      visit_at: visitAt ? new Date(visitAt).toISOString() : null,
      note: note.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error((error as any).code === "23505"
        ? "You already have an open viewing request for this stay"
        : error.message || "Could not send request");
      return;
    }
    toast.success("Request sent — host has 4h to approve 🕓");
    setVisitAt(""); setNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reserve for viewing</DialogTitle>
          <DialogDescription>
            Request a 4-hour hold on <span className="font-semibold">{title}</span>. Once the host approves, the apartment is reserved for you for 4 hours.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="visit_at" className="text-xs">Preferred visit time (optional)</Label>
            <Input
              id="visit_at"
              type="datetime-local"
              value={visitAt}
              onChange={(e) => setVisitAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="note" className="text-xs">Message to host (optional)</Label>
            <Textarea
              id="note"
              placeholder="Hi! I'm in town and would love to view the apartment."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
