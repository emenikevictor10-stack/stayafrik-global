import { Link } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { TopBar } from "@/components/shell/TopBar";

/** Public page explaining hosting on Stay. */
const ListYourPlace = () => {
  const { serviceFeeBps } = useSettings();
  const start = "/listings/new"; // signed-out visitors are sent to Google sign-in first
  const steps = [
    ["List your place", "Add photos, price and your area. It takes about 10 minutes."],
    ["We check it", "Our team approves every stay before guests can see it."],
    ["Guests book and pay", `Guests pay through Stay with secure escrow. Our fee is ${serviceFeeBps / 100}%, added to the guest's price.`],
    ["You get paid", "Your share is sent to your bank account the day after the guest checks in."],
  ];
  return (
    <>
      <TopBar title="List your place" />
      <main className="px-4 pt-6 pb-12 max-w-2xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Earn from your shortlet with Stay</h1>
          <p className="text-muted-foreground">Set your own prices and dates. Choose instant booking or approve each guest yourself.</p>
        </header>
        <ol className="space-y-3">
          {steps.map(([t, d], i) => (
            <li key={t} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <span className="w-8 h-8 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{i + 1}</span>
              <span><span className="block font-semibold">{t}</span><span className="text-sm text-muted-foreground">{d}</span></span>
            </li>
          ))}
        </ol>
        <Link to={start} className="flex min-h-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">Start listing</Link>
        <p className="text-xs text-muted-foreground text-center">Questions? Email support@stayglobal.app</p>
      </main>
    </>
  );
};
export default ListYourPlace;
