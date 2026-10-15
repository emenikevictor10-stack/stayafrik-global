import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { AIAssistant } from "@/components/ai/AIAssistant";

export const MobileShell = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SideNav />
      <div className="max-w-md mx-auto pb-20 relative md:max-w-3xl md:pl-60 md:pb-8 md:mx-0 lg:max-w-none lg:pr-8">
        <div className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-6xl md:px-6">
          <Outlet />
        </div>
      </div>
      <BottomNav />
      <AIAssistant />
    </div>
  );
};
