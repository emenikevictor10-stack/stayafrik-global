import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Dock } from "./Dock";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { useNavPrefs } from "./navPrefs";
import { cn } from "@/lib/utils";

export const MobileShell = () => {
  const { edge, pinned } = useNavPrefs();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={cn("relative pb-[74px] xl:pb-8 xl:pt-6",
        pinned ? "xl:pl-64" : edge === "left" ? "xl:pl-24" : edge === "right" ? "xl:pr-24" : "xl:pb-28")}>
        <div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-[1360px] md:px-6">
          <Outlet />
        </div>
      </div>
      <BottomNav />
      <Dock />
      <AIAssistant />
    </div>
  );
};
