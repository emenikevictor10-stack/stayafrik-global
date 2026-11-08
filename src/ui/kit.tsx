import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import logoLight from "@/assets/stay-logo-light.png";
import logoDark from "@/assets/stay-logo-2.png";
import { StatusDot } from "@/components/support/SupportBits";
import type { DotTone } from "@/lib/support";
export { StatusDot as Tag, UnderlineTabs as Tabs } from "@/components/support/SupportBits";

/** StayGlobal wordmark image — never typed text. */
export const Logo = ({ className }: { className?: string }) => {
  const [theme] = useTheme();
  return <img src={theme === "dark" ? logoDark : logoLight} alt="Stay" className={cn("h-7 w-auto object-contain", className)} />;
};

type BtnVariant = "primary" | "secondary" | "text" | "danger";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-blue-hover",
  secondary: "bg-background text-foreground border border-border hover:bg-surface",
  text: "text-primary hover:bg-surface",
  danger: "bg-destructive text-destructive-foreground hover:opacity-90",
};

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }>(
  ({ variant = "primary", loading, className, children, disabled, ...p }, ref) => (
    <button ref={ref} disabled={disabled || loading}
      className={cn("inline-flex items-center justify-center gap-2 h-[46px] md:h-11 px-4 rounded-lg text-base font-semibold transition-colors disabled:opacity-50", BTN[variant], className)} {...p}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export const Header = ({ title, right }: { title?: React.ReactNode; right?: React.ReactNode }) => (
  <header className="h-[52px] px-4 flex items-center gap-3 border-b border-border bg-background">
    <Logo />
    {title && <h1 className="text-base font-semibold truncate flex-1">{title}</h1>}
    <div className="ml-auto flex items-center gap-2">{right}</div>
  </header>
);

/** Bottom sheet on phone, dialog on PC. */
export const Sheet = ({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: React.ReactNode }) => {
  const mobile = useIsMobile();
  if (mobile) return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-2xl px-4 pb-6"><DrawerTitle className="text-base font-semibold py-3">{title}</DrawerTitle>{children}</DrawerContent>
    </Drawer>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl"><DialogTitle className="text-base font-semibold">{title}</DialogTitle>{children}</DialogContent>
    </Dialog>
  );
};

export const Notice = ({ tone = "info", children }: { tone?: "info" | "warn" | "danger"; children: React.ReactNode }) => (
  <div className={cn("rounded-xl px-4 py-3 text-sm",
    tone === "warn" && "bg-warn-bg text-warn-fg",
    tone === "danger" && "bg-destructive/10 text-destructive",
    tone === "info" && "bg-surface text-foreground")}>{children}</div>
);

export const EmptyState = ({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) => (
  <div className="text-center py-12 px-4">
    <p className="text-base font-semibold">{title}</p>
    {body && <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{body}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const ErrorState = ({ message = "Something went wrong.", onRetry }: { message?: string; onRetry?: () => void }) => (
  <div className="text-center py-12 px-4">
    <p className="text-base font-semibold">{message}</p>
    {onRetry && <Button variant="secondary" className="mt-4" onClick={onRetry}>Try again</Button>}
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-lg bg-surface", className)} aria-hidden />
);

export const ListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
);

/** Admin next-step box: status dot + words, one sentence, one button. Tinted only when staff must act. */
export const NextStep = ({ tone, status, sentence, action }: { tone: DotTone; status: string; sentence: string; action?: React.ReactNode }) => {
  return (
    <div className={cn("rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3", tone === "act" ? "bg-warn-bg border-orange/30" : tone === "broken" ? "bg-destructive/5 border-destructive/30" : "bg-card border-border")}>
      <div className="flex-1 min-w-0">
        <StatusDot tone={tone}>{status}</StatusDot>
        <p className="text-sm mt-1">{sentence}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
