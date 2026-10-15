import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { AIAssistant } from "@/components/ai/AIAssistant";

export const MobileShell = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SideNav />
      <div className="relative pb-20 md:pb-8 md:pl-60">
        <div className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-6xl md:px-6">
          <Outlet />
        </div>
      </div>
      <BottomNav />
      <AIAssistant />
    </div>
  );
};
