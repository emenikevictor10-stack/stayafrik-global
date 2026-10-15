import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { AIAssistant } from "@/components/ai/AIAssistant";

export const MobileShell = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative pb-20 md:pb-8">
        <div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-7xl md:px-6">
          <Outlet />
        </div>
      </div>
      <BottomNav />
      <AIAssistant />
    </div>
  );
};
