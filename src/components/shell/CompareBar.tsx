import { Link, useLocation } from "react-router-dom";
import { GitCompare } from "lucide-react";
import { useCompare } from "@/hooks/useCompare";
import { compareLink } from "@/lib/compare";

const SHOW_ON = ["/", "/home", "/explore", "/search", "/results", "/saved"];

/** Floating "Compare (N)" bar once 2+ stays are picked. */
export const CompareBar = () => {
  const { ids, clear } = useCompare();
  const { pathname } = useLocation();
  if (ids.length < 2 || !SHOW_ON.some((p) => pathname === p || (p === "/saved" && pathname.startsWith("/saved")))) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-[86px] xl:bottom-6 z-40 flex items-center gap-2 whitespace-nowrap rounded-full bg-foreground text-background shadow-search pl-4 pr-1.5 py-1.5">
      <GitCompare className="w-4 h-4" aria-hidden />
      <span className="text-[13px] font-semibold">{ids.length} stays picked</span>
      <button type="button" onClick={clear} className="min-h-11 px-3 text-[13px] underline">Clear</button>
      <Link to={compareLink(ids)} className="min-h-11 px-4 inline-flex items-center rounded-full bg-primary text-primary-foreground text-[13px] font-semibold">Compare ({ids.length})</Link>
    </div>
  );
};
