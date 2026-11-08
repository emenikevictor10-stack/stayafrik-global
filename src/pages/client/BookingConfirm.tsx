import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type State = "loading" | "ok" | "error";

type Booking = {
  id: string;
  listing_id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  status: string;
  payment_reference: string | null;
};

const BookingConfirm = () => {
  const [params] = useSearchParams();
  const reference = params.get("reference") || params.get("trxref") || "";
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string>("");
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!reference) {
      setState("error");
      setError("Missing payment reference");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("paystack-verify", {
          body: { reference },
        });
        if (error) throw new Error(error.message);
        if (!data?.booking) throw new Error(data?.error || "Could not verify payment");
        setBooking(data.booking as Booking);
        setState("ok");
      } catch (e: any) {
        setError(e.message || "Verification failed");
        setState("error");
      }
    })();
  }, [reference]);

  const fmt = (n: number) => "₦" + Math.round(Number(n || 0)).toLocaleString();

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md text-center">
        {state === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
            <h1 className="mt-5 text-xl font-extrabold">Confirming your booking…</h1>
            <p className="text-sm text-muted-foreground mt-1">Verifying with Paystack. Hang on.</p>
          </>
        )}

        {state === "ok" && booking && (
          <>
            <div className="w-20 h-20 rounded-full bg-success/15 border-2 border-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
              {booking.status === "confirmed" ? "Booking confirmed!" : "Payment received"}
            </h1>
            {booking.status !== "confirmed" && (
              <p className="text-sm text-muted-foreground mt-2">We're finalising your booking with the property and will email you shortly. Your payment is safe.</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Reference <span className="font-mono text-foreground">{booking.payment_reference}</span>
            </p>

            <div className="mt-6 rounded-2xl bg-card border border-border p-4 text-left text-sm space-y-2">
              <Row label="Check-in" value={booking.check_in_date} />
              <Row label="Check-out" value={booking.check_out_date} />
              <Row label="Status" value={booking.status === "needs_attention" ? "Paid — finalising with partner" : booking.status} />
              <div className="border-t border-border pt-2 flex justify-between font-extrabold">
                <span>Total paid</span>
                <span className="text-primary">{fmt(booking.total_price)}</span>
              </div>
            </div>

            <div className="mt-6 grid gap-2">
              <Link to="/trips" className="rounded-2xl bg-primary text-primary-foreground py-3 font-bold text-sm">
                View my bookings
              </Link>
              <Link to="/explore" className="rounded-2xl border border-border bg-card py-3 font-bold text-sm">
                Keep exploring
              </Link>
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <div className="w-20 h-20 rounded-full bg-destructive/15 border-2 border-destructive flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Payment not completed</h1>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <div className="mt-6 grid gap-2">
              <Link to="/explore" className="rounded-2xl bg-primary text-primary-foreground py-3 font-bold text-sm">
                Back to explore
              </Link>
              <Link to="/trips" className="rounded-2xl border border-border bg-card py-3 font-bold text-sm">
                View my bookings
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold capitalize">{value}</span>
  </div>
);

export default BookingConfirm;
