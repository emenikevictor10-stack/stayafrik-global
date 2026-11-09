import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState, ErrorState, ListSkeleton, Tag } from "@/ui/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TEAM_ROLES, type TeamRole } from "@/components/admin/adminNav";
import { useStaffRoles } from "@/components/admin/RequireAdmin";
import { Seo } from "@/components/seo/Seo";

type Member = { user_id: string; full_name: string | null; email: string | null; roles: TeamRole[]; since: string };
type Invite = { id: string; email: string; roles: TeamRole[]; created_at: string };

const label = (r: string) => TEAM_ROLES.find((t) => t.role === r)?.label ?? r;
const errMsg = (e: any) => String(e?.message || e || "Something went wrong").replace(/^.*?: /, "");

const RolePicker = ({ value, onChange }: { value: TeamRole[]; onChange: (v: TeamRole[]) => void }) => (
  <div className="space-y-2">
    {TEAM_ROLES.map((t) => (
      <label key={t.role} className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer">
        <Checkbox checked={value.includes(t.role)} className="mt-0.5"
          onCheckedChange={(c) => onChange(c ? [...value, t.role] : value.filter((x) => x !== t.role))} />
        <span><span className="block text-sm font-semibold">{t.label}</span><span className="block text-xs text-muted-foreground">{t.hint}</span></span>
      </label>
    ))}
  </div>
);

/** /admin/team — staff only. Invite, set roles, remove (admins only; server enforces). */
export const AdminTeam = () => {
  const { user } = useAuth();
  const isAdmin = useStaffRoles().includes("admin");
  const [rows, setRows] = useState<Member[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [err, setErr] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [newRoles, setNewRoles] = useState<TeamRole[]>(["support"]);
  const [edit, setEdit] = useState<Member | null>(null);
  const [editRoles, setEditRoles] = useState<TeamRole[]>([]);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(false);
    const [{ data, error }, { data: inv }] = await Promise.all([
      supabase.rpc("staff_team_list" as any),
      supabase.from("team_invites" as any).select("id,email,roles,created_at").eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    if (error) return setErr(true);
    setRows((data as any) || []);
    setInvites((inv as any) || []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => PromiseLike<{ error: any }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return false; }
    toast.success(ok); void load(); return true;
  };

  const sendInvite = async () => {
    if (!newRoles.length) return toast.error("Pick at least one role");
    if (await run(() => supabase.rpc("staff_team_invite" as any, { _email: email.trim(), _roles: newRoles }), "Invite sent")) {
      setInviteOpen(false); setEmail(""); setNewRoles(["support"]);
    }
  };

  if (!isAdmin) {
    return <EmptyState title="Only admins manage the team" />;
  }

  return (
    <div className="space-y-5">
      <Seo title="Team | Stay admin" description="Team members and their roles." noindex />
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Team</h1>
          <p className="text-sm text-muted-foreground">People who run Stay. Each role opens only its own admin pages.</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}><UserPlus className="w-4 h-4" /> Invite team member</Button>
      </header>

      {invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Pending invites</h2>
          <div className="rounded-xl border border-border divide-y divide-border">
            {invites.map((i) => (
              <div key={i.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold break-all">{i.email}</p>
                  <p className="text-xs text-muted-foreground">Invited {new Date(i.created_at).toLocaleDateString()} · {i.roles.map(label).join(", ")}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => supabase.rpc("staff_team_resend_invite" as any, { _id: i.id }), "Invite sent again")}>Resend</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => supabase.rpc("staff_team_cancel_invite" as any, { _id: i.id }), "Invite cancelled")}>Cancel</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Members</h2>
        {err ? <ErrorState onRetry={load} /> : rows === null ? <ListSkeleton /> : !rows.length ? <EmptyState title="No team members yet" /> : (
          <div className="rounded-xl border border-border divide-y divide-border">
            {rows.map((m) => {
              const me = m.user_id === user?.id;
              return (
                <div key={m.user_id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{m.full_name || "—"}{me && <span className="text-muted-foreground font-normal"> (you)</span>}</p>
                    <p className="text-xs text-muted-foreground break-all">{m.email}</p>
                    <div className="flex flex-wrap gap-1 mt-1">{m.roles.map((r) => <Tag key={r} tone="done">{label(r)}</Tag>)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEdit(m); setEditRoles(m.roles); }}>Change roles</Button>
                    {!me && <Button size="sm" variant="outline" className="text-destructive" onClick={() => setRemoving(m)}>Remove</Button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>They join when they sign in with Google using this email.</DialogDescription>
          </DialogHeader>
          <Input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <RolePicker value={newRoles} onChange={setNewRoles} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button disabled={busy || !email.trim()} onClick={sendInvite}>{busy ? "Sending…" : "Send invite"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change roles</DialogTitle>
            <DialogDescription>{edit?.full_name || edit?.email}</DialogDescription>
          </DialogHeader>
          <RolePicker value={editRoles} onChange={setEditRoles} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button disabled={busy || !editRoles.length} onClick={async () => {
              if (edit && await run(() => supabase.rpc("staff_team_set_roles" as any, { _user_id: edit.user_id, _roles: editRoles }), "Roles saved")) setEdit(null);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.full_name || removing?.email} from the team?</AlertDialogTitle>
            <AlertDialogDescription>They lose all admin access right away. Their normal Stay account stays.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
              if (removing) await run(() => supabase.rpc("staff_team_remove" as any, { _user_id: removing.user_id }), "Removed from team");
              setRemoving(null);
            }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
