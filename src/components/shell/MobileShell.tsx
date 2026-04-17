import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { AIAssistant } from "@/components/ai/AIAssistant";

export const MobileShell = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-md mx-auto pb-20 relative">
        <Outlet />
      </div>
      <BottomNav />
      <AIAssistant />
    </div>
  );
};
