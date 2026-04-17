import { TopBar } from "@/components/shell/TopBar";
import { useRole } from "@/contexts/RoleContext";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

const clientItems = [
  { e: "🪪", l: "Personal info" },
  { e: "💳", l: "Payment methods" },
  { e: "🔐", l: "Escrow history" },
  { e: "❤️", l: "Saved properties" },
  { e: "🌍", l: "Language & currency" },
  { e: "🛟", l: "Help & support" },
];

const agentItems = [
  { e: "🪪", l: "Agent profile" },
  { e: "📜", l: "Verification status" },
  { e: "💼", l: "Commission & payouts" },
  { e: "📈", l: "Performance" },
  { e: "🛟", l: "Help & support" },
];

const Profile = () => {
  const { role, user, setRole } = useRole();
  const items = role === "client" ? clientItems : agentItems;

  return (
    <>
      <TopBar title="Profile" />
      <main className="px-5 pt-5 pb-8">
        <section className="rounded-2xl bg-card border border-border p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-3xl">
            {user.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold">{user.name}</h2>
            <p className="text-xs text-success font-medium">✓ ID verified</p>
            <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{role} account</p>
          </div>
        </section>

        <button
          onClick={() => {
            setRole(role === "client" ? "agent" : "client");
            toast.success(`Switched to ${role === "client" ? "Agent" : "Client"} mode`);
          }}
          className="mt-4 w-full rounded-2xl border border-primary/40 bg-primary/10 text-primary py-3 text-sm font-bold hover:bg-primary/15"
        >
          Switch to {role === "client" ? "🧑‍💼 Agent" : "👤 Client"} mode
        </button>

        <section className="mt-5 rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
          {items.map((i) => (
            <button
              key={i.l}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary text-left"
            >
              <span className="text-lg">{i.e}</span>
              <span className="text-sm flex-1">{i.l}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </section>

        <p className="text-center text-[10px] text-muted-foreground mt-6">Stayafrik · v0.1 · Africa 🌍</p>
      </main>
    </>
  );
};

export default Profile;
