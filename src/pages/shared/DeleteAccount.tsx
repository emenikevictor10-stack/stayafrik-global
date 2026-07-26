import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const DeleteAccount = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [confirm, setConfirm] = useState("");
  const [finalOpen, setFinalOpen] = useState(false);
  const [finalConfirm, setFinalConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const openFinal = () => {
    if (confirm !== "DELETE") {
      toast.error('Please type "DELETE" to confirm');
      return;
    }
    setFinalConfirm("");
    setFinalOpen(true);
  };

  const handleDelete = async () => {
    if (finalConfirm !== "DELETE") {
      toast.error('Type "DELETE" one more time to permanently remove your account');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      toast.success("Account deleted");
      await signOut();
      navigate("/auth", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Failed to delete account");
    } finally {
      setLoading(false);
      setFinalOpen(false);
    }
  };

  return (
    <main className="px-5 pt-6 pb-32 max-w-md mx-auto">
      <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ChevronLeft className="w-4 h-4" /> Back
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight mb-2">Delete account</h1>
      <p className="text-sm text-muted-foreground mb-6">
        This action is permanent. Your profile, listings, bookings, messages, and reviews will be removed.
      </p>

      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 mb-6 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <p className="font-bold text-destructive mb-1">Before you delete</p>
          <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
            <li>Any active bookings or escrow payouts must be settled first.</li>
            <li>Hosts should remove or transfer live listings.</li>
            <li>This cannot be undone. You'll need to sign up again to return.</li>
          </ul>
        </div>
      </div>

      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Signed in as
      </label>
      <p className="text-sm mb-4">{user?.email}</p>

      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Type <span className="text-destructive">DELETE</span> to confirm
      </label>
      <Input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="DELETE"
        className="mt-2 mb-6"
      />

      <Button
        onClick={openFinal}
        disabled={loading || confirm !== "DELETE"}
        className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-2xl h-12 font-bold"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Continue to permanent deletion
      </Button>

      <button
        onClick={() => navigate("/profile")}
        className="w-full text-sm text-muted-foreground mt-3 py-2"
      >
        Cancel
      </button>

      <AlertDialog open={finalOpen} onOpenChange={setFinalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Final confirmation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2">
              <span className="block">
                This is <strong>irreversible</strong>. Once you continue, your account and all
                associated data will be permanently deleted and cannot be recovered.
              </span>
              <span className="block">
                Type <strong className="text-destructive">DELETE</strong> below to confirm.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={finalConfirm}
            onChange={(e) => setFinalConfirm(e.target.value)}
            placeholder="DELETE"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={loading || finalConfirm !== "DELETE"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting…" : "Delete forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default DeleteAccount;
