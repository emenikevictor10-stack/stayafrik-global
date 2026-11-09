import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/ui/kit";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/shell/TopBar";
import { StayById } from "@/components/property/StayById";
import { EmptyState, ListSkeleton } from "@/ui/kit";
import { Seo } from "@/components/seo/Seo";

/** Read-only view of a shared list; signed-in people can join it. */
const SharedList = () => {
  const { token } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const join = async () => {
    const { data, error } = await supabase.rpc("join_wishlist", { _token: token || "" });
    if (error) return toast.error("Couldn't join this list");
    toast.success("You joined the list"); navigate(`/saved/${data}`);
  };
  const [state, setState] = useState<{ name: string; refs: string[] } | null | undefined>(undefined);
  useEffect(() => {
    supabase.rpc("get_shared_wishlist", { _token: token || "" }).then(({ data }) => {
      const row = (data as { name: string; listing_refs: string[] }[] | null)?.[0];
      setState(row ? { name: row.name, refs: row.listing_refs } : null);
    });
  }, [token]);
  return (
    <>
      <Seo title={state?.name ? `${state.name} · Shared stays | Stay` : "Shared stays | Stay"} description="A list of stays shared with you on Stay." noindex />
      <TopBar title={state?.name || "Shared list"} />
      <main className="px-4 md:px-0 py-5">
        {state === undefined && <ListSkeleton />}
        {state === null && <EmptyState title="This list isn't available" body="The link may be wrong or the list was removed." action={<Link to="/" className="underline font-semibold">Find stays</Link>} />}
        {state && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h1 className="text-xl font-semibold mr-auto">{state.name}</h1>
              {user ? <Button onClick={() => void join()}>Join this list</Button> : <span className="text-[13px] text-muted-foreground">Sign in to join this list</span>}
            </div>
            {state.refs.length === 0 ? <EmptyState title="No stays in this list yet" /> : (
              <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{state.refs.map((id) => <StayById key={id} id={id} />)}</div>
            )}
          </>
        )}
      </main>
    </>
  );
};
export default SharedList;
