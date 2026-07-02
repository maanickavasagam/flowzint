"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, Home, Users, Sparkles } from "lucide-react";
import { BrandMark, BrandWordmark } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/[0.06] bg-background/60 px-4 py-6 md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2">
        <BrandMark />
        <BrandWordmark className="text-lg" />
      </Link>

      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Workspace
      </p>
      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
              )}
            >
              <n.icon
                className={cn("h-4.5 w-4.5", active && "text-primary")}
              />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
        >
          <Home className="h-4.5 w-4.5" />
          Marketing site
        </Link>
        <div className="mt-4 rounded-2xl border border-white/[0.06] bg-card/50 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Demo mode</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Live data from your chat sessions and seed set.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function MobileTopNav() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-secondary/40 p-1 md:hidden">
      {[{ href: "/crm", label: "CRM", icon: LayoutDashboard }, ...NAV.slice(1)].map(
        (n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              <n.icon className="h-3.5 w-3.5" />
              {n.label}
            </Link>
          );
        }
      )}
    </div>
  );
}
