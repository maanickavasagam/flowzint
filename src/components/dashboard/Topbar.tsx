"use client";

import { usePathname } from "next/navigation";
import { NotificationBell } from "./NotificationBell";
import { MobileTopNav } from "./Sidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/crm": {
    title: "CRM",
    subtitle: "Every contact, lead and opportunity — synced from live chats.",
  },
  "/analytics": {
    title: "Analytics",
    subtitle: "How visitors move from first hello to closed opportunity.",
  },
  "/rubric": {
    title: "Scoring rubric",
    subtitle: "Tune how leads are scored — every lead re-scores instantly.",
  },
};

export function Topbar() {
  const pathname = usePathname();
  const meta = TITLES[pathname] || { title: "Dashboard", subtitle: "" };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-8">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight md:text-2xl">
            {meta.title}
          </h1>
          <p className="hidden truncate text-sm text-muted-foreground sm:block">
            {meta.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MobileTopNav />
          <ThemeToggle />
          <NotificationBell />
          <Avatar className="h-10 w-10 border border-border">
            <AvatarFallback className="bg-gradient-to-br from-violet to-[hsl(280_90%_60%)] text-white">
              SB
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
